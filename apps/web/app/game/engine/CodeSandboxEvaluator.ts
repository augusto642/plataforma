/**
 * CodeSandboxEvaluator.ts
 * NEXUS CODE - In-Browser Sandbox Code Evaluator (Hardened Web Worker Edition)
 * 
 * Execução segura e isolada de código para batalhas em tempo real:
 * - Isolamento em Web Worker dedicado (sem acesso a DOM, cookies ou storages)
 * - Cancelamento forçado de execução com timeout de 1500ms (proteção contra while(true))
 * - Mascaramento estrito de APIs sensíveis (fetch, XMLHttpRequest, WebSocket, indexedDB)
 * - Validação de igualdade profunda (Deep Equality)
 * - Suporte a testes confidenciais anti-cheat (hidden test cases)
 * - Fallback gracioso para ambientes SSR / Node.js
 */

import { BattleChallenge, TestCase } from './BattleChallenges';

export interface TestOutcome {
  id: string;
  name: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  error?: string;
  hidden?: boolean;
}

export interface ExecutionOutcome {
  allPassed: boolean;
  testsPassed: number;
  totalTests: number;
  testResults: TestOutcome[];
  stdout: string;
  executionTimeMs: number;
  syntaxError?: string;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    const valA = (a as Record<string, unknown>)[key];
    const valB = (b as Record<string, unknown>)[key];
    if (!deepEqual(valA, valB)) return false;
  }

  return true;
}

/**
 * Script do Web Worker embutido como string para criação dinâmica de Blob
 */
const WORKER_SCRIPT = `
self.onmessage = function (e) {
  var data = e.data;
  var userCode = data.userCode;
  var functionName = data.functionName;
  var testCases = data.testCases;

  var capturedLogs = [];
  var mockConsole = {
    log: function () {
      var args = Array.prototype.slice.call(arguments);
      capturedLogs.push(
        args
          .map(function (arg) {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
          })
          .join(' ')
      );
    },
    warn: function () {
      var args = Array.prototype.slice.call(arguments);
      mockConsole.log.apply(null, ['[WARN]'].concat(args));
    },
    error: function () {
      var args = Array.prototype.slice.call(arguments);
      mockConsole.log.apply(null, ['[ERROR]'].concat(args));
    },
  };

  function deepEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
      return false;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    var keysA = Object.keys(a);
    var keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (var k = 0; k < keysA.length; k++) {
      var key = keysA[k];
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  try {
    // Mascara APIs no escopo do worker
    var fetch = undefined;
    var XMLHttpRequest = undefined;
    var WebSocket = undefined;
    var indexedDB = undefined;
    var importScripts = undefined;

    var scopedBuilder = new Function(
      'console',
      'fetch',
      'XMLHttpRequest',
      'WebSocket',
      'indexedDB',
      'importScripts',
      userCode +
        '\\nif (typeof ' +
        functionName +
        ' !== "function") {\\n' +
        '  throw new Error("A função \\'' +
        functionName +
        '\\' não foi definida.");\\n' +
        '}\\nreturn ' +
        functionName +
        ';'
    );

    var fn = scopedBuilder(mockConsole, undefined, undefined, undefined, undefined, undefined);

    var testResults = [];
    for (var i = 0; i < testCases.length; i++) {
      var tc = testCases[i];
      try {
        var args = JSON.parse(JSON.stringify(tc.inputArgs));
        var actual = fn.apply(null, args);
        var passed = deepEqual(actual, tc.expected);
        testResults.push({
          id: tc.id,
          name: tc.name,
          passed: passed,
          expected: tc.expected,
          actual: actual,
          hidden: !!tc.hidden,
        });
      } catch (err) {
        testResults.push({
          id: tc.id,
          name: tc.name,
          passed: false,
          expected: tc.expected,
          actual: undefined,
          hidden: !!tc.hidden,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    var testsPassed = testResults.filter(function (t) { return t.passed; }).length;
    var allPassed = testsPassed === testCases.length;

    self.postMessage({
      success: true,
      allPassed: allPassed,
      testsPassed: testsPassed,
      totalTests: testCases.length,
      testResults: testResults,
      stdout: capturedLogs.join('\\n'),
    });
  } catch (err) {
    self.postMessage({
      success: false,
      syntaxError: err instanceof Error ? err.message : String(err),
      stdout: capturedLogs.join('\\n'),
    });
  }
};
`;

export class CodeSandboxEvaluator {
  /**
   * Avaliação assíncrona isolada em Web Worker com timeout garantido.
   * Recomendada para a UI do jogo.
   */
  public static async evaluateAsync(
    userCode: string,
    challenge: BattleChallenge,
    timeoutMs: number = 1500
  ): Promise<ExecutionOutcome> {
    const startTime = performance.now();

    // Se estiver no browser e houver suporte a Worker e Blob, usa Worker isolado
    if (
      typeof window !== 'undefined' &&
      typeof Worker !== 'undefined' &&
      typeof Blob !== 'undefined'
    ) {
      return new Promise<ExecutionOutcome>((resolve) => {
        let isDone = false;
        let worker: Worker | null = null;
        let blobUrl: string | null = null;
        let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

        const cleanup = () => {
          if (timeoutTimer) clearTimeout(timeoutTimer);
          if (worker) {
            worker.terminate();
            worker = null;
          }
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            blobUrl = null;
          }
        };

        try {
          const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
          blobUrl = URL.createObjectURL(blob);
          worker = new Worker(blobUrl);

          timeoutTimer = setTimeout(() => {
            if (isDone) return;
            isDone = true;
            cleanup();
            const elapsed = Math.round(performance.now() - startTime);
            resolve({
              allPassed: false,
              testsPassed: 0,
              totalTests: challenge.testCases.length,
              testResults: challenge.testCases.map((tc) => ({
                id: tc.id,
                name: tc.name,
                passed: false,
                expected: tc.expected,
                actual: undefined,
                hidden: tc.hidden,
                error: `Tempo limite de execução excedido (${timeoutMs}ms). Cuidado com laços infinitos.`,
              })),
              stdout: '',
              executionTimeMs: elapsed,
              syntaxError: `Tempo limite de execução excedido (${timeoutMs}ms). Cuidado com laços infinitos ou recursão não finalizada.`,
            });
          }, timeoutMs);

          worker.onmessage = (e: MessageEvent) => {
            if (isDone) return;
            isDone = true;
            cleanup();

            const elapsed = Math.round(performance.now() - startTime);
            const data = e.data;

            if (data.success) {
              resolve({
                allPassed: data.allPassed,
                testsPassed: data.testsPassed,
                totalTests: data.totalTests,
                testResults: data.testResults,
                stdout: data.stdout || '',
                executionTimeMs: elapsed,
              });
            } else {
              resolve({
                allPassed: false,
                testsPassed: 0,
                totalTests: challenge.testCases.length,
                testResults: challenge.testCases.map((tc) => ({
                  id: tc.id,
                  name: tc.name,
                  passed: false,
                  expected: tc.expected,
                  actual: undefined,
                  hidden: tc.hidden,
                  error: data.syntaxError,
                })),
                stdout: data.stdout || '',
                executionTimeMs: elapsed,
                syntaxError: data.syntaxError,
              });
            }
          };

          worker.onerror = (err: ErrorEvent) => {
            if (isDone) return;
            isDone = true;
            cleanup();
            const elapsed = Math.round(performance.now() - startTime);
            resolve({
              allPassed: false,
              testsPassed: 0,
              totalTests: challenge.testCases.length,
              testResults: challenge.testCases.map((tc) => ({
                id: tc.id,
                name: tc.name,
                passed: false,
                expected: tc.expected,
                actual: undefined,
                hidden: tc.hidden,
                error: err.message || 'Erro inesperado no Worker',
              })),
              stdout: '',
              executionTimeMs: elapsed,
              syntaxError: err.message || 'Erro durante a execução no Worker',
            });
          };

          // Envia o payload para processamento
          worker.postMessage({
            userCode,
            functionName: challenge.functionName,
            testCases: challenge.testCases,
          });
        } catch {
          // Fallback gracioso para a avaliação síncrona
          cleanup();
          resolve(CodeSandboxEvaluator.evaluate(userCode, challenge));
        }
      });
    }

    // Fallback para Node.js / SSR
    return Promise.resolve(CodeSandboxEvaluator.evaluate(userCode, challenge));
  }

  /**
   * Avaliação síncrona com escopo fechado e proteção por Deep Equality.
   * Utilizada em testes unitários determinísticos e ambientes headless.
   */
  public static evaluate(
    userCode: string,
    challenge: BattleChallenge
  ): ExecutionOutcome {
    const startTime = performance.now();
    const capturedLogs: string[] = [];
    const testResults: TestOutcome[] = [];

    const mockConsole = {
      log: (...args: unknown[]) => {
        capturedLogs.push(
          args
            .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
            .join(' ')
        );
      },
      warn: (...args: unknown[]) => mockConsole.log('[WARN]', ...args),
      error: (...args: unknown[]) => mockConsole.log('[ERROR]', ...args),
    };

    try {
      // 1. Compilação da função dentro de escopo restrito com shadowing
      // eslint-disable-next-line no-new-func
      const scopedBuilder = new Function(
        'console',
        'window',
        'document',
        'localStorage',
        'sessionStorage',
        'fetch',
        `
        ${userCode}
        if (typeof ${challenge.functionName} !== 'function') {
          throw new Error("A função '${challenge.functionName}' não foi definida.");
        }
        return ${challenge.functionName};
        `
      );

      const fn = scopedBuilder(
        mockConsole,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      ) as (...args: unknown[]) => unknown;

      // 2. Execução de cada caso de teste (incluindo testes ocultos)
      for (const tc of challenge.testCases) {
        try {
          const args = JSON.parse(JSON.stringify(tc.inputArgs)) as unknown[];
          const actual = fn(...args);

          const passed = deepEqual(actual, tc.expected);

          testResults.push({
            id: tc.id,
            name: tc.name,
            passed,
            expected: tc.expected,
            actual,
            hidden: tc.hidden,
          });
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          testResults.push({
            id: tc.id,
            name: tc.name,
            passed: false,
            expected: tc.expected,
            actual: undefined,
            hidden: tc.hidden,
            error: errorMsg,
          });
        }
      }

      const testsPassed = testResults.filter((t) => t.passed).length;
      const allPassed = testsPassed === challenge.testCases.length;
      const endTime = performance.now();

      return {
        allPassed,
        testsPassed,
        totalTests: challenge.testCases.length,
        testResults,
        stdout: capturedLogs.join('\n'),
        executionTimeMs: Math.round(endTime - startTime),
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const endTime = performance.now();

      return {
        allPassed: false,
        testsPassed: 0,
        totalTests: challenge.testCases.length,
        testResults: challenge.testCases.map((tc: TestCase) => ({
          id: tc.id,
          name: tc.name,
          passed: false,
          expected: tc.expected,
          actual: undefined,
          hidden: tc.hidden,
          error: errorMsg,
        })),
        stdout: capturedLogs.join('\n'),
        executionTimeMs: Math.round(endTime - startTime),
        syntaxError: errorMsg,
      };
    }
  }
}
