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
};

const PISTON_FILE_NAME: Partial<Record<Language, string>> = {
  javascript: 'main.js',
  typescript: 'main.ts',
  python: 'main.py',
  java: 'Solution.java',
};

const DEFAULT_TIME_LIMIT_MS = 5_000;
const DEFAULT_MEMORY_LIMIT_MB = 256;
const RUN_TIMEOUT_MIN_MS = 100;
const RUN_TIMEOUT_MAX_MS = 15_000;
const COMPILE_TIMEOUT_MS = 10_000;
const ERROR_MESSAGE_MAX_CHARS = 2_000;

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
      return {
        status: 'failed',
        kind: 'unsupported',
        score: 0,
        maxScore: 100,
        durationMs: Date.now() - start,
        errorMessage:
          'Portugol ainda não é executado no sandbox da plataforma. Submeta o código em uma das linguagens suportadas (JavaScript, TypeScript, Python ou Java).',
        logs: 'Caso de Teste 1: FAIL (linguagem não suportada)',
        testCases: [
          {
            name: 'Verificação de Suporte',
            passed: false,
            durationMs: 0,
            isHidden: false,
            kind: 'unsupported',
            errorMessage: UNSUPPORTED_LANGUAGE_MESSAGE,
          },
        ],
      };
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

    const passedCount = testCases.filter((t) => t.passed).length;
    const status =
      fatalKind === 'sandbox_unavailable'
        ? 'error'
        : passedCount === testCases.length
          ? 'passed'
          : 'failed';
    const kind = this.aggregateKind(testCases, fatalKind);
    const worstTest = testCases.find((t) => t.kind && t.kind !== 'passed');
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
        (status === 'passed' ? undefined : worstTest?.errorMessage) ||
        (status === 'failed' ? 'Os testes não passaram.' : undefined),
      testCases,
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
        ? Math.floor(rawMemoryMb)
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
    switch (language) {
      case 'javascript':
        return `"use strict";\n${code}${expr}`;
      case 'typescript':
        return `${code}${expr}`;
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