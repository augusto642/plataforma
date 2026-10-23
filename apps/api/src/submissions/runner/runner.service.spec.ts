import 'reflect-metadata';
import assert from 'node:assert/strict';
import { Language } from '@prisma/client';
import type { ConfigService } from '@nestjs/config';
import { PistonRunnerService } from './runner.service';
import { HIDDEN_TEST_FAILED_MESSAGE } from './runner.service';
import type { SandboxExecutionResult } from './runner.service';

interface FetchCall {
  url: string;
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  };
}

function makeConfigService(
  env: Record<string, string | undefined> = {},
): ConfigService {
  return {
    get: (key: string) => env[key],
  } as unknown as ConfigService;
}

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, { status });
}

function runStage(overrides: Record<string, unknown> = {}) {
  return {
    stdout: 'saida\n',
    stderr: '',
    code: 0,
    signal: null,
    message: null,
    status: null,
    cpu_time: 20,
    wall_time: 30,
    memory: 2048,
    ...overrides,
  };
}

let calls: FetchCall[] = [];
let fetchStub: ((input: any, init?: any) => Promise<Response>) | null = null;
let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  calls = [];
  originalFetch = globalThis.fetch;
  fetchStub = null;
  (globalThis as any).fetch = async (input: any, init: any) => {
    calls.push({ url: String(input), init });
    if (fetchStub) return fetchStub(input, init);
    throw new Error('no fetch stub configured');
  };
});

afterEach(() => {
  (globalThis as any).fetch = originalFetch;
});

function newRunner(env: Record<string, string | undefined> = {}) {
  return new PistonRunnerService(makeConfigService(env));
}

function assertExecutePayload(call: FetchCall) {
  assert.equal(call.url, 'http://piston:2000/api/v2/execute');
  assert.equal(call.init.method, 'POST');
  return JSON.parse(call.init.body);
}

describe('PistonRunnerService.execute', () => {
  it('maps run status null + code 0 to passed', async () => {
    fetchStub = async () => okResponse({ run: runStage({ stdout: '2\n' }) });
    const runner = newRunner();

    const result = await runner.execute('javascript', 'const a = 1;', {
      timeLimitMs: 3000,
      memoryLimitMb: 128,
    });

    assert.equal(result.kind, 'passed');
    assert.equal(result.status, 'passed');
    assert.equal(result.stdout, '2\n');
    const payload = assertExecutePayload(calls[0]);
    assert.equal(payload.language, 'javascript');
    assert.equal(payload.version, '*');
    assert.equal(payload.files[0].name, 'main.js');
    assert.equal(payload.files[0].content, 'const a = 1;');
    assert.equal(payload.stdin, '');
  });

  it('applies run_memory_limit (bytes) and run_timeout from the database limits', async () => {
    fetchStub = async () => okResponse({ run: runStage() });
    const runner = newRunner();

    await runner.execute('python', 'print(1)', {
      timeLimitMs: 7000,
      memoryLimitMb: 128,
    });

    const payload = assertExecutePayload(calls[0]);
    assert.equal(payload.run_memory_limit, 128 * 1024 * 1024);
    assert.equal(payload.compile_memory_limit, 128 * 1024 * 1024);
    assert.equal(payload.run_timeout, 7000);
    assert.equal(payload.run_cpu_time, 7000);
    assert.equal(payload.compile_timeout, 10000);
    assert.equal(payload.compile_cpu_time, 10000);
    assert.equal(payload.language, 'python');
  });

  it('maps TO status to timeout', async () => {
    fetchStub = async () =>
      okResponse({ run: runStage({ status: 'TO', message: 'Timeout' }) });
    const runner = newRunner();

    const result = await runner.execute('javascript', 'while(true) {}');

    assert.equal(result.kind, 'timeout');
    assert.equal(result.status, 'failed');
  });

  it('maps OL status to output_limit', async () => {
    fetchStub = async () =>
      okResponse({
        run: runStage({ status: 'OL', message: 'Output limit exceeded' }),
      });
    const runner = newRunner();

    const result = await runner.execute('javascript', 'while(true) console.log(1)');

    assert.equal(result.kind, 'output_limit');
    assert.equal(result.status, 'failed');
  });

  it('maps RE / non-zero code to runtime_error', async () => {
    fetchStub = async () =>
      okResponse({
        run: runStage({
          status: 'RE',
          code: 1,
          stderr: 'ReferenceError: x is not defined',
        }),
      });
    const runner = newRunner();

    const result = await runner.execute('javascript', 'console.log(x)');

    assert.equal(result.kind, 'runtime_error');
    assert.equal(result.status, 'failed');
    assert.match(result.errorMessage || '', /ReferenceError/);
  });

  it('maps SG status + signal to signal', async () => {
    fetchStub = async () =>
      okResponse({
        run: runStage({ status: 'SG', signal: 'SIGSEGV', code: 139 }),
      });
    const runner = newRunner();

    const result = await runner.execute('python', 'import ctypes; ctypes.string_at(0)');

    assert.equal(result.kind, 'signal');
    assert.equal(result.status, 'failed');
  });

  it('maps XX status to sandbox_unavailable (fail-closed)', async () => {
    fetchStub = async () =>
      okResponse({ run: runStage({ status: 'XX', message: 'Internal error' }) });
    const runner = newRunner();

    const result = await runner.execute('javascript', '1');

    assert.equal(result.kind, 'sandbox_unavailable');
    assert.equal(result.status, 'error');
  });

  it('maps compile failure to compile_error with sanitized message', async () => {
    fetchStub = async () =>
      okResponse({
        compile: {
          stdout: '',
          stderr: 'error: unknown identifier',
          code: 1,
          signal: null,
          message: 'Compilation failed: error: unknown identifier',
          status: null,
        },
      });
    const runner = newRunner();

    const result = await runner.execute('java', 'public class Solution {}');

    assert.equal(result.kind, 'compile_error');
    assert.equal(result.status, 'failed');
    assert.match(result.errorMessage || '', /Compilation failed/);
  });

  it('sends portugol to Piston as programa.por with stdin passthrough', async () => {
    fetchStub = async () =>
      okResponse({
        run: runStage({
          stdout: 'Olá Mundo\nPrograma finalizado\n\nPressione ENTER para continuar\n',
        }),
      });
    const runner = newRunner();

    const result = await runner.execute('portugol', 'programa { }', {
      stdin: '3\n4\n',
    });

    assert.equal(result.kind, 'passed');
    const payload = assertExecutePayload(calls[0]);
    assert.equal(payload.language, 'portugol');
    assert.equal(payload.files[0].name, 'programa.por');
    assert.equal(payload.files[0].content, 'programa { }');
    assert.equal(payload.stdin, '3\n4\n');
    // execute() NÃO remove o sufixo do console: a remoção é da
    // comparação de saída (executeInSandbox), não da execução crua.
    assert.match(result.stdout, /Pressione ENTER para continuar/);
  });

  it('maps network failure to sandbox_unavailable (never local fallback)', async () => {
    fetchStub = async () => {
      throw Object.assign(new Error('fetch failed: ECONNREFUSED piston:2000'), {
        cause: { code: 'ECONNREFUSED' },
      });
    };
    const runner = newRunner();

    const result = await runner.execute('javascript', '1');

    assert.equal(result.kind, 'sandbox_unavailable');
    assert.equal(result.status, 'error');
  });

  it('maps network timeout (AbortController) to sandbox_unavailable', async () => {
    fetchStub = (_input: any, init: any) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        });
      });
    const runner = newRunner({ PISTON_TIMEOUT_MS: '20' });

    const result = await runner.execute('javascript', '1');

    assert.equal(result.kind, 'sandbox_unavailable');
    assert.equal(result.status, 'error');
  });

  it('maps HTTP 4xx about unknown runtime to unsupported', async () => {
    fetchStub = async () =>
      textResponse('{"message":"Runtime not found for language typescript"}', 400);
    const runner = newRunner();

    const result = await runner.execute('typescript', 'const x: number = 1;');

    assert.equal(result.kind, 'unsupported');
    assert.equal(result.status, 'failed');
  });

  it('maps other HTTP errors to sandbox_unavailable', async () => {
    fetchStub = async () => textResponse('boom', 500);
    const runner = newRunner();

    const result = await runner.execute('javascript', '1');

    assert.equal(result.kind, 'sandbox_unavailable');
    assert.equal(result.status, 'error');
  });

  it('truncates stdout/stderr to PISTON_MAX_OUTPUT_CHARS and sanitizes CR/LF', async () => {
    const bigOutput = `${'a'.repeat(100)}\r\n${'b'.repeat(100)}\r`;
    fetchStub = async () =>
      okResponse({
        run: runStage({ stdout: bigOutput, stderr: `err\r\nline` }),
      });
    const runner = newRunner({ PISTON_MAX_OUTPUT_CHARS: '64' });

    const result = await runner.execute('javascript', 'console.log("x")');

    assert.ok(result.stdout.length <= 64);
    assert.ok(!result.stdout.includes('\r'));
    assert.ok(result.stdout.includes('[... saída truncada]'));
    assert.ok(!result.stderr.includes('\r'));
    assert.equal(result.stderr, 'err\nline');
  });

  it('limits errorMessage length', async () => {
    const hugeMessage = 'x'.repeat(5000);
    fetchStub = async () =>
      okResponse({
        run: runStage({ status: 'RE', code: 1, message: hugeMessage }),
      });
    const runner = newRunner();

    const result = await runner.execute('javascript', 'x');

    assert.ok((result.errorMessage || '').length <= 2000);
  });
});

describe('PistonRunnerService.executeInSandbox', () => {
  // O teste que aqui travava o Portugol como `unsupported` foi
  // substituído pela suíte dedicada mais abaixo (Sprint 23): Portugol
  // agora executa de verdade, no modo programa inteiro entrada→saída.

  it('runs each test expression as a separate Piston execution and aggregates score', async () => {
    fetchStub = async () => okResponse({ run: runStage() });
    const runner = newRunner();

    const result = await runner.executeInSandbox({
      language: 'javascript',
      code: 'function soma(a, b) { return a + b; }',
      testScript: 'console.log(soma(1, 2))\nconsole.log(soma(3, 4))',
      hiddenTests: 'console.log(soma(10, 20))',
    });

    assert.equal(result.status, 'passed');
    assert.equal(result.kind, 'passed');
    assert.equal(result.score, 100);
    assert.equal(result.testCases.length, 3);
    assert.equal(result.testCases[2].isHidden, true);
    assert.equal(calls.length, 3);
    for (const call of calls) {
      const payload = assertExecutePayload(call);
      assert.match(payload.files[0].content, /function soma\(a, b\)/);
      assert.match(payload.files[0].content, /console\.log\(soma/);
    }
  });

  it('marks failed tests accordingly and computes partial score', async () => {
    let idx = 0;
    fetchStub = async () => {
      idx += 1;
      if (idx === 2) {
        return okResponse({
          run: runStage({ status: 'TO', message: 'Timeout' }),
        });
      }
      return okResponse({ run: runStage() });
    };
    const runner = newRunner();

    const result = await runner.executeInSandbox({
      language: 'javascript',
      code: 'function f() { return 1; }',
      testScript: 'console.log(f())\nconsole.log(f())',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.kind, 'timeout');
    assert.equal(result.score, 50);
    assert.equal(result.testCases[0].passed, true);
    assert.equal(result.testCases[1].passed, false);
    assert.equal(result.testCases[1].kind, 'timeout');
  });

  it('masks the aggregated errorMessage when the failing test is hidden (no hidden stderr leak)', async () => {
    let idx = 0;
    fetchStub = async () => {
      idx += 1;
      if (idx === 2) {
        // Teste oculto: stderr do harness carrega entrada e valor esperado.
        return okResponse({
          run: runStage({
            status: 'RE',
            message: 'AssertionError: esperado 42 para a entrada secreta 7',
          }),
        });
      }
      return okResponse({ run: runStage() });
    };
    const runner = newRunner();

    const result = await runner.executeInSandbox({
      language: 'javascript',
      code: 'function soma(a, b) { return a + b; }',
      testScript: 'console.log(soma(1, 2))',
      hiddenTests: 'console.log(soma(35, 7))',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.score, 50);
    // Agregado (vai para Submission.errorMessage e respostas ao aluno):
    // apenas a mensagem genérica, sem rastro do assert oculto.
    assert.equal(result.errorMessage, HIDDEN_TEST_FAILED_MESSAGE);
    assert.doesNotMatch(result.errorMessage || '', /42|secreta/);
    // O detalhe por caso continua disponível internamente (persistido para
    // instrutor/admin; a serialização ao aluno é quem mascara).
    assert.match(result.testCases[1].errorMessage || '', /esperado 42/);
    assert.equal(result.testCases[1].isHidden, true);
  });

  it('keeps the detailed aggregated errorMessage when the failing test is visible', async () => {
    fetchStub = async () =>
      okResponse({
        run: runStage({
          status: 'RE',
          message: 'ReferenceError: soma is not defined',
        }),
      });
    const runner = newRunner();

    const result = await runner.executeInSandbox({
      language: 'javascript',
      code: 'soma(1, 2)',
      testScript: 'console.log(soma(1, 2))',
    });

    assert.equal(result.status, 'failed');
    assert.match(result.errorMessage || '', /ReferenceError/);
  });

  it('stops and marks remaining tests on compile_error', async () => {
    fetchStub = async () =>
      okResponse({
        compile: { stderr: 'syntax error', code: 1, status: null },
      });
    const runner = newRunner();

    const result = await runner.executeInSandbox({
      language: 'javascript',
      code: 'function broken( {',
      testScript: 'console.log(1)\nconsole.log(2)',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.kind, 'compile_error');
    assert.equal(result.testCases.length, 2);
    assert.equal(result.testCases[0].kind, 'compile_error');
    assert.equal(result.testCases[1].kind, 'compile_error');
    assert.match(result.testCases[1].errorMessage || '', /Não executado/);
    assert.equal(calls.length, 1);
  });

  it('fail-closes to status error when sandbox becomes unavailable mid-suite', async () => {
    fetchStub = async () => {
      throw new Error('ECONNREFUSED');
    };
    const runner = newRunner();

    const result = await runner.executeInSandbox({
      language: 'python',
      code: 'print(1)',
      testScript: 'assert True\nassert False',
    });

    assert.equal(result.status, 'error');
    assert.equal(result.kind, 'sandbox_unavailable');
    assert.equal(result.score, 0);
    assert.ok(
      result.testCases.every(
        (t) => t.passed === false && t.kind === 'sandbox_unavailable',
      ),
    );
  });

  it('preserves the Java Solution wrapper only when code has no class', async () => {
    fetchStub = async () => okResponse({ run: runStage() });
    const runner = newRunner();

    await runner.executeInSandbox({
      language: 'java',
      code: 'int soma(int a, int b) { return a + b; }',
      testScript: 'System.out.println(soma(1, 2));',
    });

    const payload = assertExecutePayload(calls[0]);
    assert.equal(payload.files[0].name, 'Solution.java');
    assert.match(payload.files[0].content, /public class Solution/);
    assert.match(payload.files[0].content, /System\.out\.println\(soma\(1, 2\)\)/);

    await runner.executeInSandbox({
      language: 'java',
      code: 'public class MeuCodigo { public static void main(String[] a) {} }',
      testScript: 'System.out.println("oi");',
    });

    const second = assertExecutePayload(calls[1]);
    assert.equal(second.files[0].content, 'public class MeuCodigo { public static void main(String[] a) {} }');
  });

  it('returns a single syntax-check case when there are no tests', async () => {
    fetchStub = async () => okResponse({ run: runStage({ stdout: '' }) });
    const runner = newRunner();

    const result: SandboxExecutionResult = await runner.executeInSandbox({
      language: 'javascript',
      code: 'console.log("hi")',
      testScript: '',
    });

    assert.equal(result.status, 'passed');
    assert.equal(result.testCases.length, 1);
    assert.equal(result.testCases[0].name, 'Verificação de Sintaxe');
  });

  it('rejects empty code on syntax check', async () => {
    const runner = newRunner();

    const result = await runner.executeInSandbox({
      language: 'javascript',
      code: '   ',
      testScript: '',
    });

    assert.equal(result.status, 'failed');
    assert.equal(calls.length, 0);
    assert.match(result.errorMessage || '', /vazio/);
  });
});

// ─── Sprint 23: Portugol, programa inteiro entrada→saída ────────────
// O executor fake abaixo simula o portugol-console OFICIAL (evidência
// do spike): anexa ao stdout o sufixo "\nPrograma finalizado\n\n
// Pressione ENTER para continuar\n" em sucesso, reporta erro de
// compilação no stderr com prefixo "ERRO:" e erro de execução com
// "Erro de execução:" — os dois com exit != 0.
describe('PistonRunnerService Portugol mode (Sprint 23)', () => {
  const CONSOLE_SUFFIX =
    '\nPrograma finalizado\n\nPressione ENTER para continuar\n';
  const PROMPT_ONLY = '\nPressione ENTER para continuar\n';

  const SOMA_CODE = [
    'programa',
    '{',
    '  funcao inicio()',
    '  {',
    '    inteiro a, b',
    '    leia(a)',
    '    leia(b)',
    '    escreva("Soma: ", a + b)',
    '  }',
    '}',
  ].join('\n');

  function consoleStub(
    behavior: (stdin: string, code: string) => Record<string, unknown>,
  ) {
    fetchStub = async (_url: string, init: any) => {
      const payload = JSON.parse(init.body);
      return okResponse({
        run: runStage(behavior(payload.stdin ?? '', payload.files[0].content)),
      });
    };
  }

  it('passes a case comparing stdout without the console suffix', async () => {
    consoleStub(() => ({ stdout: `Soma: 7${CONSOLE_SUFFIX}` }));
    const runner = newRunner();

    const result = await runner.executeInSandbox({
      language: 'portugol',
      code: SOMA_CODE,
      testScript: JSON.stringify([{ stdin: '3\n4\n', expected: 'Soma: 7' }]),
    });

    assert.equal(result.status, 'passed');
    assert.equal(result.score, 100);
    assert.equal(calls.length, 1);
    const payload = assertExecutePayload(calls[0]);
    assert.equal(payload.language, 'portugol');
    assert.equal(payload.files[0].name, 'programa.por');
    assert.equal(payload.stdin, '3\n4\n');
    // Piso de tempo do Portugol (partida da JVM): run_timeout = 12000.
    assert.equal(payload.run_timeout, 12000);
  });

  it('ignores trailing whitespace differences on both sides', async () => {
    consoleStub(() => ({ stdout: `Soma: 7\n\n\n${CONSOLE_SUFFIX}` }));
    const runner = newRunner();

    const result = await runner.executeInSandbox({
      language: 'portugol',
      code: SOMA_CODE,
      testScript: JSON.stringify([{ stdin: '3\n4\n', expected: 'Soma: 7\n' }]),
    });

    assert.equal(result.status, 'passed');
  });

  it('runs visible and hidden cases as full executions and aggregates partial score', async () => {
    consoleStub((stdin) => ({
      stdout: `${stdin === 'ok' ? 'certo' : 'errado'}${CONSOLE_SUFFIX}`,
    }));
    const runner = newRunner();

    const result = await runner.executeInSandbox({
      language: 'portugol',
      code: SOMA_CODE,
      testScript: JSON.stringify([
        { stdin: 'ok', expected: 'certo' },
        { stdin: 'x', expected: 'certo' },
      ]),
      hiddenTests: JSON.stringify([{ stdin: 'ok', expected: 'certo' }]),
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.score, 67);
    assert.equal(result.testCases.length, 3);
    assert.equal(result.testCases[2].isHidden, true);
    assert.equal(calls.length, 3);
  });

  it('shows expected vs obtained on a visible mismatch and masks the aggregate when the worst case is hidden', async () => {
    consoleStub(() => ({ stdout: `errado${CONSOLE_SUFFIX}` }));
    const runner = newRunner();

    const visibleOnly = await runner.executeInSandbox({
      language: 'portugol',
      code: SOMA_CODE,
      testScript: JSON.stringify([{ stdin: '', expected: 'certo' }]),
    });
    assert.match(visibleOnly.testCases[0].errorMessage || '', /Esperado: "certo"/);
    assert.match(visibleOnly.testCases[0].errorMessage || '', /Obtido: "errado"/);

    const withHidden = await runner.executeInSandbox({
      language: 'portugol',
      code: SOMA_CODE,
      testScript: JSON.stringify([{ stdin: '', expected: 'errado' }]),
      hiddenTests: JSON.stringify([{ stdin: '', expected: 'certo' }]),
    });
    assert.equal(
      withHidden.errorMessage,
      'Um teste oculto não passou. Revise sua solução e tente novamente.',
    );
    // O detalhe (esperado/obtido) fica no caso oculto p/ instrutor/admin.
    assert.match(withHidden.testCases[1].errorMessage || '', /Esperado: "certo"/);
  });

  it('classifies console compile errors as compile_error and skips remaining cases', async () => {
    consoleStub(() => ({
      code: 1,
      signal: null,
      stdout: PROMPT_ONLY,
      stderr: 'ERRO: Era esperado um abre chaves "{" mas foi encontrado algo diferente. Linha: 3, Coluna: 1\n',
    }));
    const runner = newRunner();

    const result = await runner.executeInSandbox({
      language: 'portugol',
      code: 'programa { funcao inicio( { } }',
      testScript: JSON.stringify([
        { stdin: '', expected: 'x' },
        { stdin: '', expected: 'y' },
      ]),
      hiddenTests: JSON.stringify([{ stdin: '', expected: 'z' }]),
    });

    assert.equal(result.kind, 'compile_error');
    assert.equal(calls.length, 1);
    assert.equal(result.testCases.length, 3);
    assert.equal(result.testCases[0].kind, 'compile_error');
    assert.match(result.testCases[0].errorMessage || '', /abre chaves/);
    assert.equal(result.testCases[1].kind, 'compile_error');
    assert.match(result.testCases[1].errorMessage || '', /Não executado/);
    assert.equal(result.testCases[2].isHidden, true);
  });

  it('treats runtime errors as per-case failures and keeps running other cases', async () => {
    consoleStub((stdin) =>
      stdin === 'boom'
        ? {
            code: 1,
            signal: null,
            stdout: PROMPT_ONLY,
            stderr:
              '\nErro de execução: Foi efetuada uma divisão por zero.\nLinha: 6, Coluna: 14\n\nPressione ENTER para continuar\n',
          }
        : { stdout: `certo${CONSOLE_SUFFIX}` },
    );
    const runner = newRunner();

    const result = await runner.executeInSandbox({
      language: 'portugol',
      code: SOMA_CODE,
      testScript: JSON.stringify([
        { stdin: 'boom', expected: 'certo' },
        { stdin: 'ok', expected: 'certo' },
      ]),
    });

    assert.equal(result.kind, 'runtime_error');
    assert.equal(result.testCases[0].kind, 'runtime_error');
    assert.match(result.testCases[0].errorMessage || '', /divisão por zero/);
    assert.match(result.testCases[0].errorMessage || '', /Linha: 6, Coluna: 14/);
    assert.equal(result.testCases[1].passed, true);
    assert.equal(calls.length, 2);
  });

  it('surfaces leia EOF (stdin shorter than the program reads) as runtime_error', async () => {
    consoleStub(() => ({
      code: 1,
      signal: null,
      stdout: PROMPT_ONLY,
      stderr:
        '\nErro de execução: java.util.NoSuchElementException: No line found\nLinha: 7, Coluna: 5\n\nPressione ENTER para continuar\n',
    }));
    const runner = newRunner();

    const result = await runner.executeInSandbox({
      language: 'portugol',
      code: SOMA_CODE,
      testScript: JSON.stringify([{ stdin: '3\n', expected: 'Soma: 7' }]),
    });

    assert.equal(result.testCases[0].kind, 'runtime_error');
    // Correção 23.1 (D1): a exceção conhecida vira frase em português,
    // sem o nome cru da exceção Java, mantendo linha/coluna do console.
    assert.match(
      result.testCases[0].errorMessage || '',
      /a entrada do caso acabou/,
    );
    assert.match(result.testCases[0].errorMessage || '', /Linha: 7, Coluna: 5/);
    assert.doesNotMatch(
      result.testCases[0].errorMessage || '',
      /NoSuchElementException|java\.util/,
    );
  });

  it('maps leia of a non-numeric value (NumberFormatException) to a Portuguese message', async () => {
    consoleStub(() => ({
      code: 1,
      signal: null,
      stdout: PROMPT_ONLY,
      stderr:
        '\nErro de execução: java.lang.NumberFormatException: For input string: "abc"\nLinha: 5, Coluna: 3\n\nPressione ENTER para continuar\n',
    }));
    const runner = newRunner();

    const result = await runner.executeInSandbox({
      language: 'portugol',
      code: SOMA_CODE,
      testScript: JSON.stringify([{ stdin: 'abc\n', expected: 'Soma: 7' }]),
    });

    assert.equal(result.testCases[0].kind, 'runtime_error');
    assert.match(
      result.testCases[0].errorMessage || '',
      /não é um número válido/,
    );
    assert.match(result.testCases[0].errorMessage || '', /Linha: 5, Coluna: 3/);
    assert.doesNotMatch(
      result.testCases[0].errorMessage || '',
      /NumberFormatException|java\.lang/,
    );
  });

  it('keeps unknown Java exceptions as the console first line (D1 fallback)', async () => {
    consoleStub(() => ({
      code: 1,
      signal: null,
      stdout: PROMPT_ONLY,
      stderr:
        '\nErro de execução: java.lang.IllegalStateException: estado inválido simulado\nLinha: 4, Coluna: 2\n\nPressione ENTER para continuar\n',
    }));
    const runner = newRunner();

    const result = await runner.executeInSandbox({
      language: 'portugol',
      code: SOMA_CODE,
      testScript: JSON.stringify([{ stdin: 'x\n', expected: 'Soma: 7' }]),
    });

    assert.equal(result.testCases[0].kind, 'runtime_error');
    assert.match(
      result.testCases[0].errorMessage || '',
      /IllegalStateException: estado inválido simulado/,
    );
    assert.match(result.testCases[0].errorMessage || '', /Linha: 4, Coluna: 2/);
  });

  it('escapes invisible control chars (limpa() ESC) in the mismatch message without changing the verdict', async () => {
    const ESC = String.fromCharCode(0x1b);
    consoleStub(() => ({ stdout: `antes${ESC}cdepois${CONSOLE_SUFFIX}` }));
    const runner = newRunner();

    const result = await runner.executeInSandbox({
      language: 'portugol',
      code: SOMA_CODE,
      testScript: JSON.stringify([{ stdin: '', expected: 'antesdepois' }]),
    });

    // A comparação não muda: saída com ESC continua divergindo…
    assert.equal(result.testCases[0].passed, false);
    const message = result.testCases[0].errorMessage || '';
    // …mas a mensagem mostra o ESC escapado, sem o byte cru, e
    // explica a presença de caracteres de controle (Correção 23.1, D3).
    assert.match(message, /Obtido: "antes<ESC>cdepois"/);
    assert.ok(!message.includes(ESC), 'mensagem não pode conter o byte ESC cru');
    assert.match(message, /caracteres de controle invisíveis/);

    // Divergência comum (sem controle) não ganha a observação.
    consoleStub(() => ({ stdout: `errado${CONSOLE_SUFFIX}` }));
    const plain = await runner.executeInSandbox({
      language: 'portugol',
      code: SOMA_CODE,
      testScript: JSON.stringify([{ stdin: '', expected: 'certo' }]),
    });
    assert.doesNotMatch(
      plain.testCases[0].errorMessage || '',
      /caracteres de controle/,
    );
  });

  it('propagates timeout per case without stopping the suite', async () => {
    consoleStub((stdin) =>
      stdin === 'loop' ? { status: 'TO', code: null } : { stdout: `certo${CONSOLE_SUFFIX}` },
    );
    const runner = newRunner();

    const result = await runner.executeInSandbox({
      language: 'portugol',
      code: SOMA_CODE,
      testScript: JSON.stringify([
        { stdin: 'loop', expected: 'certo' },
        { stdin: 'ok', expected: 'certo' },
      ]),
    });

    assert.equal(result.kind, 'timeout');
    assert.equal(result.testCases[0].kind, 'timeout');
    assert.equal(result.testCases[1].passed, true);
    assert.equal(calls.length, 2);
  });

  it('rejects malformed case JSON without calling the network', async () => {
    const runner = newRunner();

    const notJson = await runner.executeInSandbox({
      language: 'portugol',
      code: SOMA_CODE,
      testScript: 'escreva(1)',
    });
    assert.equal(notJson.status, 'failed');
    assert.match(notJson.errorMessage || '', /array JSON/);
    assert.equal(calls.length, 0);

    const missingExpected = await runner.executeInSandbox({
      language: 'portugol',
      code: SOMA_CODE,
      testScript: JSON.stringify([{ stdin: '3\n' }]),
    });
    assert.equal(missingExpected.status, 'failed');
    assert.match(missingExpected.errorMessage || '', /"expected"/);
    assert.equal(calls.length, 0);
  });

  it('falls back to a single syntax-check execution when there are no cases', async () => {
    consoleStub(() => ({ stdout: `Olá Mundo${CONSOLE_SUFFIX}` }));
    const runner = newRunner();

    const ok = await runner.executeInSandbox({
      language: 'portugol',
      code: SOMA_CODE,
      testScript: '',
    });
    assert.equal(ok.status, 'passed');
    assert.equal(ok.testCases[0].name, 'Verificação de Sintaxe');
    assert.equal(calls.length, 1);

    consoleStub(() => ({
      code: 1,
      signal: null,
      stdout: PROMPT_ONLY,
      stderr: 'ERRO: Erro de sintaxe simulado. Linha: 1, Coluna: 1\n',
    }));
    const bad = await runner.executeInSandbox({
      language: 'portugol',
      code: 'programa }',
      testScript: '[]',
    });
    assert.equal(bad.status, 'failed');
    assert.equal(bad.kind, 'compile_error');
    assert.match(bad.testCases[0].errorMessage || '', /Erro de sintaxe simulado/);
  });
});