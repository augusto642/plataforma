import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Language } from '@prisma/client';
import { buildRunnerConfig, RunnerConfig } from '../../config/runner.config';

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
const RUN_TIMEOUT_MIN_MS = 100;
const RUN_TIMEOUT_MAX_MS = 15_000;
const COMPILE_TIMEOUT_MS = 10_000;
const ERROR_MESSAGE_MAX_CHARS = 2_000;

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

  constructor(configService: ConfigService) {
    this.config = buildRunnerConfig({
      PISTON_URL: configService.get<string>('PISTON_URL'),
      PISTON_TIMEOUT_MS: configService.get<string>('PISTON_TIMEOUT_MS'),
      PISTON_MAX_OUTPUT_CHARS: configService.get<string>(
        'PISTON_MAX_OUTPUT_CHARS',
      ),
    });
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

  /** Extrai a linha legível de um erro de execução do console. */
  private portugolRuntimeErrorMessage(execution: RunnerExecution): string {
    const stderr = execution.stderr || '';
    const lines = stderr.split('\n');
    const idx = lines.findIndex((line) => line.startsWith('Erro de execução:'));
    if (idx >= 0) {
      const where = lines
        .slice(idx + 1)
        .find((line) => line.startsWith('Linha:'));
      const firstLine = lines[idx].replace(/^Erro de execução:\s*/, '');
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

  private portugolMismatchMessage(actualStdout: string, expected: string): string {
    const actual = this.normalizePortugolOutput(
      this.stripPortugolConsoleSuffix(actualStdout),
    );
    const wanted = this.normalizePortugolOutput(expected);
    const slice = (value: string) =>
      value.length > 500 ? `${value.slice(0, 500)}[...]` : value;
    return this.sanitizeMessage(
      `A saída do programa foi diferente do esperado.\nEsperado: "${slice(wanted)}"\nObtido: "${slice(actual)}"`,
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

    const rawTimeLimit = options.timeLimitMs ?? DEFAULT_TIME_LIMIT_MS;
    const timeLimitMs = Math.min(
      RUN_TIMEOUT_MAX_MS,
      Math.max(RUN_TIMEOUT_MIN_MS, Number.isFinite(rawTimeLimit) ? rawTimeLimit : DEFAULT_TIME_LIMIT_MS),
    );
    const rawMemoryMb = options.memoryLimitMb ?? DEFAULT_MEMORY_LIMIT_MB;
    const memoryMb =
      Number.isFinite(rawMemoryMb) && rawMemoryMb > 0
        ? Math.min(512, Math.floor(rawMemoryMb))
        : DEFAULT_MEMORY_LIMIT_MB;
    const memoryBytes = memoryMb * 1024 * 1024;

    const payload = {
      language: pistonLanguage,
      version: '*',
      files: [{ name: PISTON_FILE_NAME[language], content: code }],
      stdin: options.stdin ?? '',
      compile_timeout: COMPILE_TIMEOUT_MS,
      run_timeout: timeLimitMs,
      compile_cpu_time: COMPILE_TIMEOUT_MS,
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
  }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
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
        return { httpStatus: res.status, body: null, errorDetail: detail };
      }
      let body: PistonExecuteResponse | null = null;
      try {
        body = (await res.json()) as PistonExecuteResponse;
      } catch {
        body = null;
      }
      return { httpStatus: res.status, body, errorDetail: null };
    } catch (err: any) {
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
    }
  }

  private mapPistonResponse(
    http: { httpStatus: number; body: PistonExecuteResponse | null; errorDetail: string | null },
    durationMs: number,
  ): RunnerExecution {
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