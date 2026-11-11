import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Language } from '@prisma/client';
import { buildRunnerConfig, RunnerConfig } from '../../config/runner.config';
import { PistonCircuitBreaker } from './circuit-breaker';

export type SandboxResultKind =
  | 'passed'
  | 'failed'
  | 'compile_error'
  | 'runtime_error'
  | 'timeout'
  | 'signal'
  | 'output_limit'
  | 'sandbox_unavailable'
  | 'unsupported';

export interface SandboxExecutionOptions {
  language: Language;
  code: string;
  testScript: string;
  hiddenTests?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
}

export interface SandboxTestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  stdout?: string;
  stderr?: string;
  errorMessage?: string;
  isHidden?: boolean;
  kind?: SandboxResultKind;
}

export interface SandboxExecutionResult {
  status: 'passed' | 'failed' | 'error';
  kind?: SandboxResultKind;
  score: number;
  maxScore: number;
  durationMs: number;
  logs?: string;
  errorMessage?: string;
  testCases: SandboxTestResult[];
}

export interface RunnerExecuteOptions {
  timeLimitMs?: number;
  memoryLimitMb?: number;
  stdin?: string;
}

export interface RunnerExecution {
  kind: SandboxResultKind;
  status: 'passed' | 'failed' | 'error';
  durationMs: number;
  stdout: string;
  stderr: string;
  errorMessage?: string;
}

export interface RunnerService {
  executeInSandbox(options: SandboxExecutionOptions): Promise<SandboxExecutionResult>;
  execute(
    language: Language,
    code: string,
    options?: RunnerExecuteOptions,
  ): Promise<RunnerExecution>;
}

interface PistonStage {
  stdout?: string | null;
  stderr?: string | null;
  code?: number | null;
  signal?: string | null;
  message?: string | null;
  status?: string | null;
}

interface PistonExecuteResponse {
  compile?: PistonStage;
  run?: PistonStage;
}

const PISTON_LANGUAGE: Partial<Record<Language, string>> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  portugol: 'portugol',
};

const PISTON_FILE_NAME: Partial<Record<Language, string>> = {
  javascript: 'main.js',
  typescript: 'main.ts',
  python: 'main.py',
  java: 'Solution.java',
  portugol: 'programa.por',
};

const DEFAULT_TIME_LIMIT_MS = 5_000;
const DEFAULT_MEMORY_LIMIT_MB = 256;
/**
 * A3 — teto de execuções Piston simultâneas no lado da API.
 *
 * Sem este limite, cada job do worker dispara 1 HTTP por caso de teste e
 * nada impede N jobs de baterem no Piston ao mesmo tempo. O número é
 * CASADO com o `concurrency: 4` do worker (`submission.processor.ts`):
 * 4 jobs em paralelo x 1 execução Piston por vez cada = no máximo 4
 * HTTPs simultâneos no Piston. Para mudar o teto, troque os DOIS juntos:
 * `PISTON_MAX_CONCURRENT` (aqui, via env) e o `concurrency` do @Processor.
 * Default 4. Valores inválidos (< 1 / não numéricos) caem para 4.
 */
const DEFAULT_PISTON_MAX_CONCURRENT = 4;

/**
 * Semáforo FIFO em-processo (sem dependência nova: `p-limit` é só
 * transitiva no lockfile, não é dependência direta da API).
 */
export class PistonConcurrencyLimiter {
  private running = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly max: number) {}

  get maxConcurrency(): number {
    return this.max;
  }

  get currentConcurrency(): number {
    return this.running;
  }

  async acquire(): Promise<() => void> {
    if (this.running < this.max) {
      this.running++;
      return () => this.release();
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.running++;
    return () => this.release();
  }

  private release(): void {
    this.running--;
    const next = this.waiters.shift();
    if (next) next();
  }
}
const RUN_TIMEOUT_MIN_MS = 100;
const ERROR_MESSAGE_MAX_CHARS = 2_000;
const CIRCUIT_BREAKER_OPEN_MESSAGE =
  'O sandbox de execução está temporariamente indisponível (circuit breaker aberto após falhas consecutivas no Piston). Tente novamente mais tarde.';

/**
 * ─── Portugol (Sprint 23): modo programa inteiro, entrada→saída ──────
 *
 * Portugol NÃO usa o modelo de expressão por linha das outras
 * linguagens: um programa Portugol precisa estar completo
 * (`programa { funcao inicio() { ... } }`). Cada caso de teste é uma
 * execução inteira do programa do aluno, com o `stdin` do caso
 * alimentando `leia` e o `stdout` comparado com o esperado.
 *
 * Formato dos casos em `testCode` (visíveis) e `hiddenTests`
 * (ocultos): um array JSON de objetos
 *   [{ "stdin": "3\n4\n", "expected": "Soma: 7" }, ...]
 * - `expected` (string, obrigatório): o stdout esperado do programa.
 * - `stdin` (string, opcional, default ""): a entrada do caso. No
 *   console oficial, cada `leia` consome UMA LINHA inteira por
 *   variável — um valor por linha (verificado no spike da Sprint 23).
 *
 * O executor é o `portugol-console` oficial (UNIVALI-LITE, LGPL-3.0)
 * rodando como pacote próprio do nosso Piston
 * (infra/piston/packages/portugol). Ele anexa ao stdout, ao final de
 * TODA execução, o sufixo "\nPressione ENTER para continuar\n" — e,
 * quando o programa termina com sucesso, "\nPrograma finalizado\n"
 * antes dele. A comparação remove esse sufixo e ignora whitespace no
 * FIM das duas saídas (o restante é comparação exata). Erros de
 * compilação do console chegam pelo stderr prefixados com "ERRO:";
 * erros de execução, com "Erro de execução:" — é assim que o modo
 * distingue compile_error de runtime_error mesmo com tudo rodando no
 * estágio `run` do Piston.
 *
 * Correção 23.1 (D1): em alguns erros de execução o console injeta o
 * nome cru da exceção Java na mensagem (EOF do `leia` ⇒
 * "java.util.NoSuchElementException: No line found"; `leia` de número
 * com texto ⇒ "java.lang.NumberFormatException: ..."). As exceções
 * conhecidas de PORTUGOL_KNOWN_EXCEPTION_MESSAGES viram frases em
 * português na mensagem ao aluno (linha/coluna preservadas); as
 * demais seguem com a primeira linha do console.
 *
 * Correção 23.1 (D3): na mensagem de divergência (Esperado×Obtido),
 * caracteres de controle invisíveis da saída (ex.: o ESC que o
 * `limpa()` injeta) são exibidos escapados (<ESC>, <0xNN>) e a
 * mensagem ganha uma nota explicando a presença deles — a regra de
 * comparação não muda (saída com controle continua divergindo).
 */
const PORTUGOL_SUCCESS_SUFFIX =
  '\nPrograma finalizado\n\nPressione ENTER para continuar\n';
const PORTUGOL_PROMPT_SUFFIX = '\nPressione ENTER para continuar\n';
/**
 * Piso de tempo por execução Portugol: a partida da JVM + a compilação
 * interna do núcleo levam segundos (medido no spike: ~4s a quente,
 * mais a frio), muito acima do default de 5s das outras linguagens.
 * O teto continua sendo o clamp da plataforma em execute() (15s).
 */
const PORTUGOL_DEFAULT_TIME_LIMIT_MS = 12_000;

/**
 * Exceções Java conhecidas do console → frase em português para o
 * aluno (Correção 23.1, D1). A chave é o nome simples da exceção,
 * como ela aparece no início da linha após "Erro de execução:".
 */
const PORTUGOL_KNOWN_EXCEPTION_MESSAGES: Record<string, string> = {
  NoSuchElementException:
    'O programa tentou ler um valor, mas a entrada do caso acabou — não havia mais valores para ler.',
  NumberFormatException:
    'O programa tentou ler um número, mas o valor lido não é um número válido.',
};

/**
 * Caracteres de controle invisíveis (C0 sem \n/\t, e DEL) — ex.: o
 * ESC que o `limpa()` injeta no stdout (Correção 23.1, D3).
 */
const PORTUGOL_INVISIBLE_CONTROL_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const PORTUGOL_INVISIBLE_CONTROL_TEST =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

interface PortugolTestCase {
  stdin: string;
  expected: string;
  hidden: boolean;
}

const KIND_PRECEDENCE: SandboxResultKind[] = [
  'sandbox_unavailable',
  'unsupported',
  'compile_error',
  'output_limit',
  'timeout',
  'signal',
  'runtime_error',
  'failed',
  'passed',
];

const UNSUPPORTED_LANGUAGE_MESSAGE =
  'Esta linguagem ainda não é suportada pelo sandbox de execução.';
const SANDBOX_UNAVAILABLE_MESSAGE =
  'O sandbox de execução está temporariamente indisponível. Tente novamente mais tarde.';

/**
 * Mensagem genérica exibida ao aluno quando quem falha é um teste OCULTO.
 * O errorMessage bruto de um teste oculto nasce do stderr do harness
 * (run.message || run.stderr) e carrega traceback/assert com a entrada e o
 * valor esperado do teste — ou seja, o próprio gabarito. Por isso ele nunca
 * pode aparecer em respostas ao aluno: nem por caso de teste (serialização
 * em SubmissionsService) nem agregado na mensagem da execução (aqui). O
 * detalhe completo permanece nos registros persistidos (TestCaseResult),
 * visíveis apenas a instrutor/admin.
 */
export const HIDDEN_TEST_FAILED_MESSAGE =
  'Um teste oculto não passou. Revise sua solução e tente novamente.';

@Injectable()
export class PistonRunnerService implements RunnerService {
  private readonly logger = new Logger(PistonRunnerService.name);
  private readonly config: RunnerConfig;
  private readonly pistonLimiter: PistonConcurrencyLimiter;
  private readonly breaker: PistonCircuitBreaker;

  constructor(configService: ConfigService) {
    this.config = buildRunnerConfig({
      PISTON_URL: configService.get<string>('PISTON_URL'),
      PISTON_TIMEOUT_MS: configService.get<string>('PISTON_TIMEOUT_MS'),
      PISTON_MAX_OUTPUT_CHARS: configService.get<string>(
        'PISTON_MAX_OUTPUT_CHARS',
      ),
      PISTON_BREAKER_FAILURE_THRESHOLD: configService.get<string>(
        'PISTON_BREAKER_FAILURE_THRESHOLD',
      ),
      PISTON_BREAKER_OPEN_MS: configService.get<string>(
        'PISTON_BREAKER_OPEN_MS',
      ),
      PISTON_HTTP_GRACE_MS: configService.get<string>('PISTON_HTTP_GRACE_MS'),
    });
    // A3: lê PISTON_MAX_CONCURRENT (default 4, casado com o worker).
    const rawMax = Number(configService.get<string>('PISTON_MAX_CONCURRENT'));
    const maxConcurrent =
      Number.isFinite(rawMax) && rawMax >= 1
        ? Math.floor(rawMax)
        : DEFAULT_PISTON_MAX_CONCURRENT;
    this.pistonLimiter = new PistonConcurrencyLimiter(maxConcurrent);
    // M7: circuit breaker em-processo (mesma limitação do semáforo A3:
    // cada réplica da API tem o seu).
    this.breaker = new PistonCircuitBreaker(
      this.config.breakerFailureThreshold,
      this.config.breakerOpenMs,
    );
  }

  /** Teto de execuções Piston simultâneas (para testes/monitoramento). */
  get maxPistonConcurrency(): number {
    return this.pistonLimiter.maxConcurrency;
  }

  /** Execuções Piston em voo neste instante (para testes/monitoramento). */
  get currentPistonConcurrency(): number {
    return this.pistonLimiter.currentConcurrency;
  }

  /** M7 — timeout canônico de execução do Piston (PISTON_TIMEOUT_MS). */
  get executionTimeoutMs(): number {
    return this.config.timeoutMs;
  }

  /** M7 — timeout HTTP efetivo (canônico + folga de transporte). */
  get pistonHttpTimeoutMs(): number {
    return this.config.timeoutMs + this.config.httpGraceMs;
  }

  /** M7 — estado atual do circuit breaker (para testes/monitoramento). */
  get circuitBreakerState(): 'closed' | 'open' | 'half-open' {
    return this.breaker.state;
  }

  /** M7 — falhas consecutivas acumuladas no breaker. */
  get circuitBreakerFailureCount(): number {
    return this.breaker.failureCount;
  }

  async executeInSandbox(options: SandboxExecutionOptions): Promise<SandboxExecutionResult> {
    const start = Date.now();
    const { language, code } = options;

    if (language === 'portugol') {
      return this.executePortugolInSandbox(options, start);
    }

    const expressions = this.collectTestExpressions(options);

    if (expressions.length === 0) {
      return this.evaluateWithoutTests(language, code, options, start);
    }

    const testCases: SandboxTestResult[] = [];
    let fatalKind: SandboxResultKind | undefined;
    let fatalMessage: string | undefined;

    for (let idx = 0; idx < expressions.length; idx++) {
      const { expression, hidden } = expressions[idx];
      const tStart = Date.now();
      const name = `Caso de Teste ${testCases.length + 1}${hidden ? ' (Oculto)' : ''}`;

      let execution: RunnerExecution;
      try {
        execution = await this.execute(
          language,
          this.buildProgram(language, code, expression),
          {
            timeLimitMs: options.timeLimitMs,
            memoryLimitMb: options.memoryLimitMb,
          },
        );
      } catch (err: any) {
        this.logger.error(`Unexpected runner failure: ${err?.message}`);
        execution = {
          kind: 'sandbox_unavailable',
          status: 'error',
          durationMs: Math.max(1, Date.now() - tStart),
          stdout: '',
          stderr: '',
          errorMessage: SANDBOX_UNAVAILABLE_MESSAGE,
        };
      }

      const durationMs = Math.max(1, Date.now() - tStart);

      if (
        execution.kind === 'sandbox_unavailable' ||
        execution.kind === 'unsupported'
      ) {
        fatalKind = execution.kind;
        fatalMessage = execution.errorMessage;
        testCases.push({
          name,
          passed: false,
          durationMs,
          isHidden: hidden,
          kind: execution.kind,
          errorMessage:
            execution.kind === 'sandbox_unavailable'
              ? SANDBOX_UNAVAILABLE_MESSAGE
              : UNSUPPORTED_LANGUAGE_MESSAGE,
        });
        for (let rest = idx + 1; rest < expressions.length; rest++) {
          testCases.push({
            name: `Caso de Teste ${testCases.length + 1}${expressions[rest].hidden ? ' (Oculto)' : ''}`,
            passed: false,
            durationMs: 0,
            isHidden: expressions[rest].hidden,
            kind: execution.kind,
            errorMessage:
              execution.kind === 'sandbox_unavailable'
                ? 'Não executado: sandbox indisponível.'
                : 'Não executado: linguagem não suportada.',
          });
        }
        break;
      }

      if (execution.kind === 'compile_error') {
        testCases.push({
          name,
          passed: false,
          durationMs,
          isHidden: hidden,
          kind: 'compile_error',
          errorMessage: execution.errorMessage,
        });
        for (let rest = idx + 1; rest < expressions.length; rest++) {
          testCases.push({
            name: `Caso de Teste ${testCases.length + 1}${expressions[rest].hidden ? ' (Oculto)' : ''}`,
            passed: false,
            durationMs: 0,
            isHidden: expressions[rest].hidden,
            kind: 'compile_error',
            errorMessage: 'Não executado: erro de compilação.',
          });
        }
        break;
      }

      testCases.push({
        name,
        passed: execution.kind === 'passed',
        durationMs,
        stdout: execution.stdout || undefined,
        stderr: execution.stderr || undefined,
        errorMessage: execution.errorMessage,
        isHidden: hidden,
        kind: execution.kind,
      });
    }

    return this.buildAggregatedResult(testCases, fatalKind, fatalMessage, start);
  }

  /**
   * Agregação comum aos dois modos de teste (expressão por linha e
   * Portugol programa-inteiro): status, score, kind agregado e a
   * mensagem de erro da execução. Se o pior caso é oculto, a mensagem
   * agregada NÃO herda o errorMessage dele (que pode carregar entrada/
   * esperado do teste oculto). O detalhe fica apenas em testCases
   * (persistido p/ instrutor/admin e mascarado na serialização para o
   * aluno).
   */
  private buildAggregatedResult(
    testCases: SandboxTestResult[],
    fatalKind: SandboxResultKind | undefined,
    fatalMessage: string | undefined,
    start: number,
  ): SandboxExecutionResult {
    const passedCount = testCases.filter((t) => t.passed).length;
    const status =
      fatalKind === 'sandbox_unavailable'
        ? 'error'
        : passedCount === testCases.length
          ? 'passed'
          : 'failed';
    const kind = this.aggregateKind(testCases, fatalKind);
    const worstTest = testCases.find((t) => t.kind && t.kind !== 'passed');
    const worstErrorMessage = worstTest
      ? worstTest.isHidden
        ? HIDDEN_TEST_FAILED_MESSAGE
        : worstTest.errorMessage
      : undefined;
    const logs = testCases
      .map((t) => `${t.name}: ${t.passed ? 'PASS' : 'FAIL'}`)
      .join('\n');

    return {
      status,
      kind,
      score: testCases.length > 0 ? Math.round((passedCount / testCases.length) * 100) : 0,
      maxScore: 100,
      durationMs: Date.now() - start,
      logs,
      errorMessage:
        fatalMessage ||
        (status === 'passed' ? undefined : worstErrorMessage) ||
        (status === 'failed' ? 'Os testes não passaram.' : undefined),
      testCases,
    };
  }

  // ─── Portugol: programa inteiro, entrada→saída ─────────────────────

  private parsePortugolCases(
    options: SandboxExecutionOptions,
  ): { cases: PortugolTestCase[] } | { error: string } {
    const cases: PortugolTestCase[] = [];
    const sources: Array<{ script: string | undefined; hidden: boolean; field: string }> = [
      { script: options.testScript, hidden: false, field: 'testCode' },
      { script: options.hiddenTests, hidden: true, field: 'hiddenTests' },
    ];
    for (const { script, hidden, field } of sources) {
      if (!script || !script.trim()) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(script);
      } catch {
        return {
          error: `Os casos de teste de Portugol (${field}) precisam ser um array JSON de objetos { "stdin", "expected" } — o conteúdo atual não é JSON válido.`,
        };
      }
      if (!Array.isArray(parsed)) {
        return {
          error: `Os casos de teste de Portugol (${field}) precisam ser um array JSON de objetos { "stdin", "expected" }.`,
        };
      }
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i] as Record<string, unknown> | null;
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return {
            error: `Caso ${i + 1} de ${field}: cada caso de Portugol deve ser um objeto { "stdin", "expected" }.`,
          };
        }
        if (typeof item.expected !== 'string') {
          return {
            error: `Caso ${i + 1} de ${field}: "expected" (a saída esperada do programa) é obrigatório e deve ser string.`,
          };
        }
        if (item.stdin !== undefined && typeof item.stdin !== 'string') {
          return {
            error: `Caso ${i + 1} de ${field}: "stdin" deve ser string (um valor por linha para cada leia).`,
          };
        }
        cases.push({
          stdin: typeof item.stdin === 'string' ? item.stdin : '',
          expected: item.expected,
          hidden,
        });
      }
    }
    return { cases };
  }

  /** Remove o sufixo que o portugol-console anexa a TODA execução. */
  private stripPortugolConsoleSuffix(stdout: string): string {
    if (stdout.endsWith(PORTUGOL_SUCCESS_SUFFIX)) {
      return stdout.slice(0, -PORTUGOL_SUCCESS_SUFFIX.length);
    }
    if (stdout.endsWith(PORTUGOL_PROMPT_SUFFIX)) {
      return stdout.slice(0, -PORTUGOL_PROMPT_SUFFIX.length);
    }
    return stdout;
  }

  /** Comparação de saída: exata, exceto whitespace no fim (e CRLF). */
  private normalizePortugolOutput(value: string): string {
    return value
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\s+$/, '');
  }

  private portugolOutputsMatch(actualStdout: string, expected: string): boolean {
    const actual = this.normalizePortugolOutput(
      this.stripPortugolConsoleSuffix(actualStdout),
    );
    return actual === this.normalizePortugolOutput(expected);
  }

  /**
   * O console oficial reporta erro de COMPILAÇÃO no stderr com o
   * prefixo "ERRO:" (ex.: "ERRO: ... Linha: 5, Coluna: 9"); erro de
   * EXECUÇÃO usa "Erro de execução:". A distinção é por esse prefixo.
   */
  private isPortugolCompileError(execution: RunnerExecution): boolean {
    const stderr = execution.stderr || '';
    return stderr.split('\n').some((line) => line.startsWith('ERRO:'));
  }

  /**
   * Se a primeira linha do erro de execução começa com o nome de uma
   * exceção Java conhecida do console (ex.:
   * "java.util.NoSuchElementException: No line found"), devolve a
   * frase em português equivalente (Correção 23.1, D1). Exceções
   * desconhecidas — e mensagens que já vêm em português do console —
   * passam inalteradas.
   */
  private mapPortugolExceptionMessage(firstLine: string): string {
    const match = firstLine.match(
      /^(?:[a-zA-Z_$][\w$]*\.)*([A-Z][\w$]*(?:Exception|Error))\b/,
    );
    if (!match) return firstLine;
    return PORTUGOL_KNOWN_EXCEPTION_MESSAGES[match[1]] ?? firstLine;
  }

  /** Extrai a linha legível de um erro de execução do console. */
  private portugolRuntimeErrorMessage(execution: RunnerExecution): string {
    const stderr = execution.stderr || '';
    const lines = stderr.split('\n');
    const idx = lines.findIndex((line) => line.startsWith('Erro de execução:'));
    if (idx >= 0) {
      const where = lines
        .slice(idx + 1)
        .find((line) => line.startsWith('Linha:'));
      const firstLine = this.mapPortugolExceptionMessage(
        lines[idx].replace(/^Erro de execução:\s*/, ''),
      );
      return this.sanitizeMessage(
        where ? `${firstLine} (${where.trim()})` : firstLine,
      );
    }
    return (
      execution.errorMessage ||
      'Erro em tempo de execução ao executar o programa Portugol.'
    );
  }

  private async executePortugolInSandbox(
    options: SandboxExecutionOptions,
    start: number,
  ): Promise<SandboxExecutionResult> {
    const { language, code } = options;
    // Piso de tempo do Portugol (partida da JVM); o teto é o clamp de
    // execute() (15s). Um limite maior vindo da atividade é respeitado
    // até esse teto.
    const timeLimitMs = Math.max(
      options.timeLimitMs ?? 0,
      PORTUGOL_DEFAULT_TIME_LIMIT_MS,
    );

    const parsed = this.parsePortugolCases(options);
    if ('error' in parsed) {
      // Formato de casos inválido é defeito de AUTORIA da atividade,
      // não do aluno: nenhum caso roda e a mensagem diz o que corrigir.
      return {
        status: 'failed',
        kind: 'failed',
        score: 0,
        maxScore: 100,
        durationMs: Date.now() - start,
        errorMessage: parsed.error,
        logs: 'Formato de Testes: FAIL (casos de Portugol inválidos)',
        testCases: [
          {
            name: 'Formato de Testes',
            passed: false,
            durationMs: 0,
            isHidden: false,
            kind: 'failed',
            errorMessage: parsed.error,
          },
        ],
      };
    }

    const cases = parsed.cases;

    if (cases.length === 0) {
      return this.evaluatePortugolWithoutTests(code, timeLimitMs, start);
    }

    const testCases: SandboxTestResult[] = [];
    let fatalKind: SandboxResultKind | undefined;
    let fatalMessage: string | undefined;

    for (let idx = 0; idx < cases.length; idx++) {
      const testCase = cases[idx];
      const tStart = Date.now();
      const name = `Caso de Teste ${testCases.length + 1}${testCase.hidden ? ' (Oculto)' : ''}`;

      let execution: RunnerExecution;
      try {
        execution = await this.execute(language, code, {
          stdin: testCase.stdin,
          timeLimitMs,
          memoryLimitMb: options.memoryLimitMb,
        });
      } catch (err: any) {
        this.logger.error(`Unexpected runner failure: ${err?.message}`);
        execution = {
          kind: 'sandbox_unavailable',
          status: 'error',
          durationMs: Math.max(1, Date.now() - tStart),
          stdout: '',
          stderr: '',
          errorMessage: SANDBOX_UNAVAILABLE_MESSAGE,
        };
      }

      const durationMs = Math.max(1, Date.now() - tStart);

      if (
        execution.kind === 'sandbox_unavailable' ||
        execution.kind === 'unsupported'
      ) {
        fatalKind = execution.kind;
        fatalMessage = execution.errorMessage;
        testCases.push({
          name,
          passed: false,
          durationMs,
          isHidden: testCase.hidden,
          kind: execution.kind,
          errorMessage:
            execution.kind === 'sandbox_unavailable'
              ? SANDBOX_UNAVAILABLE_MESSAGE
              : UNSUPPORTED_LANGUAGE_MESSAGE,
        });
        for (let rest = idx + 1; rest < cases.length; rest++) {
          testCases.push({
            name: `Caso de Teste ${testCases.length + 1}${cases[rest].hidden ? ' (Oculto)' : ''}`,
            passed: false,
            durationMs: 0,
            isHidden: cases[rest].hidden,
            kind: execution.kind,
            errorMessage:
              execution.kind === 'sandbox_unavailable'
                ? 'Não executado: sandbox indisponível.'
                : 'Não executado: linguagem não suportada.',
          });
        }
        break;
      }

      // Erro de compilação é independente do caso (o programa é o
      // mesmo): marca o caso e interrompe, como no modo por expressão.
      if (execution.kind !== 'passed' && this.isPortugolCompileError(execution)) {
        const detail = this.sanitizeMessage(
          (execution.stderr || '')
            .split('\n')
            .find((line) => line.startsWith('ERRO:')) ||
            execution.errorMessage ||
            'Erro de compilação.',
        );
        testCases.push({
          name,
          passed: false,
          durationMs,
          isHidden: testCase.hidden,
          kind: 'compile_error',
          errorMessage: detail,
          stdout: execution.stdout || undefined,
          stderr: execution.stderr || undefined,
        });
        for (let rest = idx + 1; rest < cases.length; rest++) {
          testCases.push({
            name: `Caso de Teste ${testCases.length + 1}${cases[rest].hidden ? ' (Oculto)' : ''}`,
            passed: false,
            durationMs: 0,
            isHidden: cases[rest].hidden,
            kind: 'compile_error',
            errorMessage: 'Não executado: erro de compilação.',
          });
        }
        break;
      }

      if (execution.kind === 'passed') {
        const matched = this.portugolOutputsMatch(
          execution.stdout,
          testCase.expected,
        );
        testCases.push({
          name,
          passed: matched,
          durationMs,
          stdout: execution.stdout || undefined,
          stderr: execution.stderr || undefined,
          errorMessage: matched
            ? undefined
            : this.portugolMismatchMessage(execution.stdout, testCase.expected),
          isHidden: testCase.hidden,
          kind: matched ? 'passed' : 'failed',
        });
        continue;
      }

      // timeout / output_limit / signal / runtime_error: a falha é do
      // CASO (depende do stdin dele) — os demais casos ainda rodam.
      testCases.push({
        name,
        passed: false,
        durationMs,
        stdout: execution.stdout || undefined,
        stderr: execution.stderr || undefined,
        errorMessage:
          execution.kind === 'runtime_error'
            ? this.portugolRuntimeErrorMessage(execution)
            : execution.errorMessage,
        isHidden: testCase.hidden,
        kind: execution.kind,
      });
    }

    return this.buildAggregatedResult(testCases, fatalKind, fatalMessage, start);
  }

  private hasInvisibleControlChars(value: string): boolean {
    return PORTUGOL_INVISIBLE_CONTROL_TEST.test(value);
  }

  /** ESC vira <ESC>; os demais controles invisíveis, <0xNN>. */
  private escapeControlChars(value: string): string {
    return value.replace(PORTUGOL_INVISIBLE_CONTROL_CHARS, (ch) =>
      ch === '\u001B'
        ? '<ESC>'
        : `<0x${ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}>`,
    );
  }

  private portugolMismatchMessage(actualStdout: string, expected: string): string {
    const actual = this.normalizePortugolOutput(
      this.stripPortugolConsoleSuffix(actualStdout),
    );
    const wanted = this.normalizePortugolOutput(expected);
    const slice = (value: string) =>
      value.length > 500 ? `${value.slice(0, 500)}[...]` : value;
    const show = (value: string) => slice(this.escapeControlChars(value));
    // A comparação NÃO muda (controle na saída continua divergindo);
    // o que muda é a legibilidade: sem o escape, Esperado e Obtido
    // pareciam idênticos ao aluno (Correção 23.1, D3).
    const controlNote =
      this.hasInvisibleControlChars(wanted) ||
      this.hasInvisibleControlChars(actual)
        ? '\nObservação: a saída contém caracteres de controle invisíveis (exibidos acima como <ESC> ou <0xNN>), que também contam na comparação. Comandos como limpa() geram esse tipo de caractere.'
        : '';
    return this.sanitizeMessage(
      `A saída do programa foi diferente do esperado.\nEsperado: "${show(wanted)}"\nObtido: "${show(actual)}"${controlNote}`,
    );
  }

  /** Sem casos de teste: uma execução com stdin vazio (checagem de sintaxe). */
  private async evaluatePortugolWithoutTests(
    code: string,
    timeLimitMs: number,
    start: number,
  ): Promise<SandboxExecutionResult> {
    if (!code.trim()) {
      return {
        status: 'failed',
        kind: 'failed',
        score: 0,
        maxScore: 100,
        durationMs: Date.now() - start,
        errorMessage: 'O código submetido está vazio.',
        logs: 'Verificação de Sintaxe: FAIL (código vazio)',
        testCases: [
          {
            name: 'Verificação de Sintaxe',
            passed: false,
            durationMs: 0,
            isHidden: false,
            kind: 'failed',
            errorMessage: 'O código submetido está vazio.',
          },
        ],
      };
    }

    const execution = await this.execute('portugol', code, {
      stdin: '',
      timeLimitMs,
    });

    const compileError =
      execution.kind !== 'passed' && this.isPortugolCompileError(execution);
    const kind: SandboxResultKind = compileError
      ? 'compile_error'
      : execution.kind;
    const passed = execution.kind === 'passed';
    const testCase: SandboxTestResult = {
      name: 'Verificação de Sintaxe',
      passed,
      durationMs: Math.max(1, execution.durationMs),
      stdout: execution.stdout || undefined,
      stderr: execution.stderr || undefined,
      errorMessage: passed
        ? undefined
        : compileError
          ? this.sanitizeMessage(
              (execution.stderr || '')
                .split('\n')
                .find((line) => line.startsWith('ERRO:')) ||
                execution.errorMessage ||
                'Erro de compilação.',
            )
          : execution.kind === 'runtime_error'
            ? this.portugolRuntimeErrorMessage(execution)
            : execution.errorMessage,
      isHidden: false,
      kind,
    };

    return {
      status: passed ? 'passed' : execution.status,
      kind,
      score: passed ? 100 : 0,
      maxScore: 100,
      durationMs: Date.now() - start,
      logs: `Verificação de Sintaxe: ${passed ? 'PASS' : 'FAIL'}`,
      errorMessage: passed
        ? undefined
        : testCase.errorMessage || 'Não foi possível verificar o código.',
      testCases: [testCase],
    };
  }

  async execute(
    language: Language,
    code: string,
    options: RunnerExecuteOptions = {},
  ): Promise<RunnerExecution> {
    const start = Date.now();
    const pistonLanguage = PISTON_LANGUAGE[language];

    if (!pistonLanguage) {
      return {
        kind: 'unsupported',
        status: 'failed',
        durationMs: Date.now() - start,
        stdout: '',
        stderr: '',
        errorMessage: UNSUPPORTED_LANGUAGE_MESSAGE,
      };
    }

    // M7 — timeout único: o teto do run_timeout por execução é o valor
    // canônico (config.timeoutMs, PISTON_TIMEOUT_MS). Antes, o teto era
    // um fixo de 15 s divergente do HTTP (30 s) e do compile (10 s).
    // O default por atividade continua 5 s (DEFAULT_TIME_LIMIT_MS); só
    // o TETO mudou — atividades existentes não mudam de comportamento.
    const rawTimeLimit = options.timeLimitMs ?? DEFAULT_TIME_LIMIT_MS;
    const timeLimitMs = Math.min(
      this.config.timeoutMs,
      Math.max(RUN_TIMEOUT_MIN_MS, Number.isFinite(rawTimeLimit) ? rawTimeLimit : DEFAULT_TIME_LIMIT_MS),
    );
    const rawMemoryMb = options.memoryLimitMb ?? DEFAULT_MEMORY_LIMIT_MB;
    const memoryMb =
      Number.isFinite(rawMemoryMb) && rawMemoryMb > 0
        ? Math.min(512, Math.floor(rawMemoryMb))
        : DEFAULT_MEMORY_LIMIT_MB;
    const memoryBytes = memoryMb * 1024 * 1024;

    // M7 — timeout único: run E compile usam o valor canônico
    // (config.timeoutMs). Antes: compile_timeout fixo de 10 s.
    const payload = {
      language: pistonLanguage,
      version: '*',
      files: [{ name: PISTON_FILE_NAME[language], content: code }],
      stdin: options.stdin ?? '',
      compile_timeout: this.config.timeoutMs,
      run_timeout: timeLimitMs,
      compile_cpu_time: this.config.timeoutMs,
      run_cpu_time: timeLimitMs,
      compile_memory_limit: memoryBytes,
      run_memory_limit: memoryBytes,
    };

    const http = await this.postToPiston(payload);
    return this.mapPistonResponse(http, Date.now() - start);
  }

  private async postToPiston(payload: unknown): Promise<{
    httpStatus: number;
    body: PistonExecuteResponse | null;
    errorDetail: string | null;
    breakerOpen?: boolean;
  }> {
    // M7 — circuito aberto: falha rápido SEM chamar o Piston (e sem
    // ocupar um slot do semáforo A3). O erro explícito chega ao aluno
    // via mapPistonResponse (kind sandbox_unavailable + mensagem do
    // breaker) em vez de um timeout de 30 s por tentativa.
    if (!this.breaker.allowRequest()) {
      this.logger.warn('Piston circuit breaker open — failing fast without calling Piston');
      return {
        httpStatus: 0,
        body: null,
        errorDetail: CIRCUIT_BREAKER_OPEN_MESSAGE,
        breakerOpen: true,
      };
    }
    // A3: o HTTP ao Piston só sai com um slot livre no semáforo — no
    // máximo PISTON_MAX_CONCURRENT execuções simultâneas por processo.
    const release = await this.pistonLimiter.acquire();
    // M7 — timeout HTTP = canônico + folga de transporte (ver
    // runner.config.ts): sem a folga, o abort poderia cortar a resposta
    // do Piston no instante em que ele mata a execução.
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs + this.config.httpGraceMs,
    );
    try {
      const res = await globalThis.fetch(
        `${this.config.url}/api/v2/execute`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
      if (!res.ok) {
        let detail: string | null = null;
        try {
          detail = (await res.text()).slice(0, ERROR_MESSAGE_MAX_CHARS) || null;
        } catch {
          detail = null;
        }
        // M7 — só 5xx conta como falha do Piston: 4xx é o Piston no ar
        // respondendo (ex.: runtime não encontrado). Qualquer resposta
        // não-5xx zera o contador de falhas consecutivas.
        if (res.status >= 500) {
          this.breaker.recordFailure();
        } else {
          this.breaker.recordSuccess();
        }
        return { httpStatus: res.status, body: null, errorDetail: detail };
      }
      let body: PistonExecuteResponse | null = null;
      try {
        body = (await res.json()) as PistonExecuteResponse;
      } catch {
        body = null;
      }
      this.breaker.recordSuccess();
      return { httpStatus: res.status, body, errorDetail: null };
    } catch (err: any) {
      // M7 — erro de transporte (incl. abort por timeout) conta como
      // falha consecutiva do breaker.
      this.breaker.recordFailure();
      if (err?.name === 'AbortError') {
        this.logger.warn('Piston execute timed out (network timeout)');
        return {
          httpStatus: 0,
          body: null,
          errorDetail: 'Piston request exceeded PISTON_TIMEOUT_MS',
        };
      }
      this.logger.warn(`Piston reachability failure: ${err?.message}`);
      return {
        httpStatus: 0,
        body: null,
        errorDetail: err?.message || 'network error',
      };
    } finally {
      clearTimeout(timer);
      release();
    }
  }

  private mapPistonResponse(
    http: { httpStatus: number; body: PistonExecuteResponse | null; errorDetail: string | null; breakerOpen?: boolean },
    durationMs: number,
  ): RunnerExecution {
    // M7 — circuito aberto: erro explícito (não a mensagem genérica de
    // indisponibilidade), para o aluno e os logs distinguirem "Piston
    // fora do ar há N falhas" de "falha isolada".
    if (http.breakerOpen) {
      return {
        kind: 'sandbox_unavailable',
        status: 'error',
        durationMs,
        stdout: '',
        stderr: '',
        errorMessage: CIRCUIT_BREAKER_OPEN_MESSAGE,
      };
    }
    if (!http.body) {
      if (
        http.httpStatus >= 400 &&
        http.httpStatus < 500 &&
        /(language|runtime)[^.]*(not found|invalid)|not found.*(language|runtime)|no runtime/i.test(
          http.errorDetail || '',
        )
      ) {
        return {
          kind: 'unsupported',
          status: 'failed',
          durationMs,
          stdout: '',
          stderr: '',
          errorMessage: `Runtime não encontrado no sandbox para esta linguagem. ${UNSUPPORTED_LANGUAGE_MESSAGE}`,
        };
      }
      return {
        kind: 'sandbox_unavailable',
        status: 'error',
        durationMs,
        stdout: '',
        stderr: '',
        errorMessage: SANDBOX_UNAVAILABLE_MESSAGE,
      };
    }

    const compile = http.body.compile;
    const run = http.body.run;

    if (compile && compile.code !== 0) {
      if (compile.status === 'XX') {
        return {
          kind: 'sandbox_unavailable',
          status: 'error',
          durationMs,
          stdout: '',
          stderr: '',
          errorMessage: SANDBOX_UNAVAILABLE_MESSAGE,
        };
      }
      const detail =
        compile.message ||
        compile.stderr ||
        'O código não compilou. Verifique os erros e tente novamente.';
      return {
        kind: 'compile_error',
        status: 'failed',
        durationMs,
        stdout: '',
        stderr: '',
        errorMessage: this.sanitizeMessage(detail),
      };
    }

    if (!run) {
      return {
        kind: 'sandbox_unavailable',
        status: 'error',
        durationMs,
        stdout: '',
        stderr: '',
        errorMessage: SANDBOX_UNAVAILABLE_MESSAGE,
      };
    }

    const kind = this.mapRunKind(run);
    const stdout = this.sanitizeOutput(run.stdout);
    const stderr = this.sanitizeOutput(run.stderr);

    if (kind === 'passed') {
      return { kind, status: 'passed', durationMs, stdout, stderr };
    }

    const runMessage =
      run.message || run.stderr || this.messageForFailedKind(kind);
    return {
      kind,
      status: kind === 'sandbox_unavailable' ? 'error' : 'failed',
      durationMs,
      stdout,
      stderr,
      errorMessage: this.sanitizeMessage(runMessage),
    };
  }

  private mapRunKind(run: PistonStage): SandboxResultKind {
    switch (run.status) {
      case 'XX':
        return 'sandbox_unavailable';
      case 'SG':
        return 'signal';
      case 'TO':
        return 'timeout';
      case 'OL':
      case 'EL':
        return 'output_limit';
      case 'RE':
        return 'runtime_error';
      default: {
        if (run.code === 0 || run.code === null || run.code === undefined) {
          return 'passed';
        }
        return 'runtime_error';
      }
    }
  }

  private buildProgram(
    language: Language,
    code: string,
    testExpression?: string,
  ): string {
    const expr = testExpression ? `\n${testExpression}` : '';
    const jsAssertShim = `if (typeof console !== 'undefined' && console.assert) {
  const _origAssert = console.assert;
  console.assert = function(assertion, ...args) {
    if (!assertion) {
      throw new Error('AssertionError: ' + (args.join(' ') || 'Assertion failed'));
    }
  };
}\n`;

    switch (language) {
      case 'javascript':
        return `"use strict";\n${jsAssertShim}${code}${expr}`;
      case 'typescript':
        return `${jsAssertShim}${code}${expr}`;
      case 'python':
        return `${code}${expr}`;
      case 'java':
        if (code.includes('class')) return code;
        if (testExpression) {
          return `public class Solution {\n${code}\npublic static void main(String[] args) {\n${testExpression}\n}\n}`;
        }
        return `public class Solution {\n${code}\npublic static void main(String[] args) {}\n}`;
      default:
        return code;
    }
  }

  private collectTestExpressions(options: SandboxExecutionOptions): Array<{
    expression: string;
    hidden: boolean;
  }> {
    const parse = (script: string | undefined, hidden: boolean) => {
      if (!script || !script.trim()) return [];

      // Suporte a delimitadores explícitos de blocos de teste: ---TEST--- ou \n---\n
      if (script.includes('---TEST---') || script.includes('\n---\n')) {
        const delimiter = script.includes('---TEST---') ? /---TEST---/g : /\n---\n/g;
        return script
          .split(delimiter)
          .map((b) => b.trim())
          .filter((b) => b.length > 0)
          .map((expression) => ({ expression, hidden }));
      }

      return script
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('#'))
        .map((expression) => ({ expression, hidden }));
    };
    return [...parse(options.testScript, false), ...parse(options.hiddenTests, true)];
  }

  private async evaluateWithoutTests(
    language: Language,
    code: string,
    options: SandboxExecutionOptions,
    start: number,
  ): Promise<SandboxExecutionResult> {
    if (!code.trim()) {
      return {
        status: 'failed',
        kind: 'failed',
        score: 0,
        maxScore: 100,
        durationMs: Date.now() - start,
        errorMessage: 'O código submetido está vazio.',
        logs: 'Verificação de Sintaxe: FAIL (código vazio)',
        testCases: [
          {
            name: 'Verificação de Sintaxe',
            passed: false,
            durationMs: 0,
            isHidden: false,
            kind: 'failed',
            errorMessage: 'O código submetido está vazio.',
          },
        ],
      };
    }

    const execution = await this.execute(
      language,
      this.buildProgram(language, code),
      { timeLimitMs: options.timeLimitMs, memoryLimitMb: options.memoryLimitMb },
    );

    const testCase: SandboxTestResult = {
      name: 'Verificação de Sintaxe',
      passed: execution.kind === 'passed',
      durationMs: Math.max(1, execution.durationMs),
      stdout: execution.stdout || undefined,
      stderr: execution.stderr || undefined,
      errorMessage: execution.errorMessage,
      isHidden: false,
      kind: execution.kind,
    };

    return {
      status: execution.status,
      kind: execution.kind,
      score: testCase.passed ? 100 : 0,
      maxScore: 100,
      durationMs: Date.now() - start,
      logs: `Verificação de Sintaxe: ${testCase.passed ? 'PASS' : 'FAIL'}`,
      errorMessage:
        execution.kind === 'passed'
          ? undefined
          : testCase.errorMessage || 'Não foi possível verificar o código.',
      testCases: [testCase],
    };
  }

  private aggregateKind(
    testCases: SandboxTestResult[],
    fatalKind?: SandboxResultKind,
  ): SandboxResultKind {
    if (fatalKind) return fatalKind;
    const kinds = testCases
      .map((t) => t.kind)
      .filter((k): k is SandboxResultKind => Boolean(k) && k !== 'passed');
    if (kinds.length === 0) return 'passed';
    return KIND_PRECEDENCE.reduce<SandboxResultKind>(
      (worst, candidate) => (kinds.includes(candidate) ? candidate : worst),
      'passed',
    );
  }

  private sanitizeOutput(value: string | null | undefined): string {
    if (!value) return '';
    return this.truncate(this.normalizeNewlines(String(value)), this.config.maxOutputChars);
  }

  private sanitizeMessage(value: string | null | undefined): string {
    if (!value) return this.messageForFailedKind('failed');
    return this.truncate(
      this.normalizeNewlines(String(value)),
      ERROR_MESSAGE_MAX_CHARS,
    );
  }

  private normalizeNewlines(value: string): string {
    return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  private truncate(value: string, maxChars: number): string {
    const marker = '\n[... saída truncada]';
    if (value.length <= maxChars) return value;
    return `${value.slice(0, maxChars - marker.length)}${marker}`;
  }

  private messageForFailedKind(kind: SandboxResultKind): string {
    switch (kind) {
      case 'timeout':
        return 'Tempo limite de execução excedido.';
      case 'signal':
        return 'O programa foi encerrado por um sinal do sistema.';
      case 'output_limit':
        return 'O programa excedeu o limite de saída.';
      case 'sandbox_unavailable':
        return SANDBOX_UNAVAILABLE_MESSAGE;
      case 'unsupported':
        return UNSUPPORTED_LANGUAGE_MESSAGE;
      case 'compile_error':
        return 'O código não compilou. Verifique os erros e tente novamente.';
      case 'runtime_error':
        return 'Erro em tempo de execução nos testes.';
      case 'failed':
        return 'Os testes não passaram.';
      default:
        return 'Falha na execução.';
    }
  }
}