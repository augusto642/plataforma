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
    // M7 — timeout único: compile usa o canônico (default 30 s), não
    // mais o fixo de 10 s.
    assert.equal(payload.compile_timeout, 30000);
    assert.equal(payload.compile_cpu_time, 30000);
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

  it('returns unsupported for portugol without hitting the network', async () => {
    const runner = newRunner();

    const result = await runner.execute('portugol', 'algoritmo "x"');

    assert.equal(result.kind, 'unsupported');
    assert.equal(result.status, 'failed');
    assert.equal(calls.length, 0);
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
  it('returns unsupported for portugol without calling the network', async () => {
    const runner = newRunner();
    const result = await runner.executeInSandbox({
      language: 'portugol',
      code: 'algoritmo "soma"',
      testScript: 'escreva(1)',
    });

    assert.equal(result.kind, 'unsupported');
    assert.equal(result.status, 'failed');
    assert.equal(result.score, 0);
    assert.equal(calls.length, 0);
    assert.equal(result.testCases[0].kind, 'unsupported');
    assert.ok(result.errorMessage);
  });

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
describe('PistonRunnerService piston concurrency (A3)', () => {
  it('caps simultaneous Piston executions at 4 while still running in parallel', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    fetchStub = async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 30));
      inFlight--;
      return okResponse({ run: runStage({}) });
    };
    const runner = newRunner();

    assert.equal(runner.maxPistonConcurrency, 4);
    await Promise.all(
      Array.from({ length: 8 }, () =>
        runner.execute('javascript', 'console.log(1)'),
      ),
    );

    assert.ok(maxInFlight > 1, `expected jobs to run in parallel, saw max ${maxInFlight}`);
    assert.ok(maxInFlight <= 4, `expected at most 4 concurrent Piston calls, saw ${maxInFlight}`);
    assert.equal(runner.currentPistonConcurrency, 0);
  });

  it('honors PISTON_MAX_CONCURRENT=2', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    fetchStub = async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inFlight--;
      return okResponse({ run: runStage({}) });
    };
    const runner = newRunner({ PISTON_MAX_CONCURRENT: '2' });

    assert.equal(runner.maxPistonConcurrency, 2);
    await Promise.all(
      Array.from({ length: 6 }, () =>
        runner.execute('javascript', 'console.log(1)'),
      ),
    );

    assert.ok(maxInFlight <= 2, `expected at most 2 concurrent Piston calls, saw ${maxInFlight}`);
    assert.equal(runner.currentPistonConcurrency, 0);
  });

  it('releases the slot when the Piston call fails', async () => {
    fetchStub = async () => {
      throw new Error('connection reset');
    };
    const runner = newRunner();

    const result = await runner.execute('javascript', 'console.log(1)');
    assert.equal(result.kind, 'sandbox_unavailable');
    assert.equal(runner.currentPistonConcurrency, 0);

    // O slot liberado permite a próxima execução normalmente.
    fetchStub = async () => okResponse({ run: runStage({}) });
    const ok = await runner.execute('javascript', 'console.log(1)');
    assert.equal(ok.kind, 'passed');
    assert.equal(runner.currentPistonConcurrency, 0);
  });
});

describe('PistonRunnerService unified timeout (M7)', () => {
  it('uses the single canonical timeout for run and compile, and clamps the per-run limit to it', async () => {
    fetchStub = async () => okResponse({ run: runStage({}) });
    const runner = newRunner();

    assert.equal(runner.executionTimeoutMs, 30000);
    assert.equal(runner.pistonHttpTimeoutMs, 32000);

    await runner.execute('python', 'print(1)', { timeLimitMs: 99999 });

    const payload = assertExecutePayload(calls[0]);
    assert.equal(payload.run_timeout, 30000);
    assert.equal(payload.run_cpu_time, 30000);
    assert.equal(payload.compile_timeout, 30000);
    assert.equal(payload.compile_cpu_time, 30000);
  });

  it('honors a smaller PISTON_TIMEOUT_MS as the single timeout everywhere', async () => {
    fetchStub = async () => okResponse({ run: runStage({}) });
    const runner = newRunner({ PISTON_TIMEOUT_MS: '8000' });

    assert.equal(runner.executionTimeoutMs, 8000);
    assert.equal(runner.pistonHttpTimeoutMs, 10000);

    await runner.execute('python', 'print(1)', { timeLimitMs: 99999 });

    const payload = assertExecutePayload(calls[0]);
    assert.equal(payload.run_timeout, 8000);
    assert.equal(payload.compile_timeout, 8000);
  });
});

describe('PistonRunnerService circuit breaker (M7)', () => {
  it('opens after N consecutive transport failures and fails fast without calling Piston', async () => {
    fetchStub = async () => {
      throw new Error('ECONNREFUSED');
    };
    const runner = newRunner({
      PISTON_BREAKER_FAILURE_THRESHOLD: '3',
      PISTON_BREAKER_OPEN_MS: '60000',
    });

    assert.equal(runner.circuitBreakerState, 'closed');
    for (let i = 0; i < 3; i++) {
      const result = await runner.execute('javascript', '1');
      assert.equal(result.kind, 'sandbox_unavailable');
    }
    assert.equal(calls.length, 3);
    assert.equal(runner.circuitBreakerState, 'open');
    assert.equal(runner.circuitBreakerFailureCount, 3);

    // Circuito aberto: falha rápido, sem HTTP e com erro explícito.
    const fast = await runner.execute('javascript', '1');
    assert.equal(fast.kind, 'sandbox_unavailable');
    assert.match(fast.errorMessage || '', /circuit breaker/i);
    assert.equal(calls.length, 3);
  });

  it('closes after a successful half-open trial once the cooldown elapses', async () => {
    let failuresLeft = 2;
    fetchStub = async () => {
      if (failuresLeft > 0) {
        failuresLeft--;
        throw new Error('ECONNREFUSED');
      }
      return okResponse({ run: runStage({}) });
    };
    const runner = newRunner({
      PISTON_BREAKER_FAILURE_THRESHOLD: '2',
      PISTON_BREAKER_OPEN_MS: '50',
    });

    await runner.execute('javascript', '1');
    await runner.execute('javascript', '1');
    assert.equal(runner.circuitBreakerState, 'open');

    // Ainda no cooldown: falha rápido, sem HTTP.
    const fast = await runner.execute('javascript', '1');
    assert.equal(calls.length, 2);
    assert.match(fast.errorMessage || '', /circuit breaker/i);

    // Cooldown decorrido: o trial passa, o Piston responde e o circuito fecha.
    await new Promise((resolve) => setTimeout(resolve, 70));
    const recovered = await runner.execute('javascript', '1');
    assert.equal(recovered.kind, 'passed');
    assert.equal(runner.circuitBreakerState, 'closed');
    assert.equal(runner.circuitBreakerFailureCount, 0);
    assert.equal(calls.length, 3);

    // E a próxima chamada vai ao Piston normalmente.
    const next = await runner.execute('javascript', '1');
    assert.equal(next.kind, 'passed');
    assert.equal(calls.length, 4);
  });

  it('counts HTTP 5xx as failures but not 4xx (Piston is up and answering)', async () => {
    fetchStub = async () => textResponse('boom', 500);
    const runner = newRunner({
      PISTON_BREAKER_FAILURE_THRESHOLD: '2',
      PISTON_BREAKER_OPEN_MS: '60000',
    });

    await runner.execute('javascript', '1');
    await runner.execute('javascript', '1');
    assert.equal(runner.circuitBreakerState, 'open');

    // 4xx: runtime não encontrado — o Piston respondeu, não é falha.
    fetchStub = async () =>
      textResponse('{"message":"Runtime not found for language typescript"}', 400);
    const runner2 = newRunner({
      PISTON_BREAKER_FAILURE_THRESHOLD: '2',
      PISTON_BREAKER_OPEN_MS: '60000',
    });
    const first = await runner2.execute('typescript', 'const x: number = 1;');
    assert.equal(first.kind, 'unsupported');
    const second = await runner2.execute('typescript', 'const x: number = 1;');
    assert.equal(second.kind, 'unsupported');
    assert.equal(runner2.circuitBreakerState, 'closed');
    assert.equal(runner2.circuitBreakerFailureCount, 0);
  });

  it('a single success resets the consecutive failure count', async () => {
    let calls_made = 0;
    fetchStub = async () => {
      calls_made++;
      if (calls_made <= 2) throw new Error('ECONNREFUSED');
      return okResponse({ run: runStage({}) });
    };
    const runner = newRunner({
      PISTON_BREAKER_FAILURE_THRESHOLD: '3',
      PISTON_BREAKER_OPEN_MS: '60000',
    });

    await runner.execute('javascript', '1');
    await runner.execute('javascript', '1');
    assert.equal(runner.circuitBreakerFailureCount, 2);
    const ok = await runner.execute('javascript', '1');
    assert.equal(ok.kind, 'passed');
    assert.equal(runner.circuitBreakerFailureCount, 0);
    assert.equal(runner.circuitBreakerState, 'closed');
  });
});
