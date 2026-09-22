import 'reflect-metadata';
import assert from 'node:assert/strict';
import { EvaluatorService } from './evaluator.service';
import type { SandboxExecutionResult } from '../runner/runner.service';

type AnyFn = (...args: any[]) => any;

function mockFn<F extends AnyFn>(impl: F): F & { calls: any[][] } {
  const calls: any[][] = [];
  const fn = Object.assign(
    (...args: any[]) => {
      calls.push(args);
      return impl(...args);
    },
    { calls },
  );
  return fn as F & { calls: any[][] };
}

function makeSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub-1',
    activityId: 'act-1',
    userId: 'user-1',
    codeSnapshot: 'console.log(1)',
    status: 'running',
    xpAwarded: false,
    activity: {
      id: 'act-1',
      language: 'javascript',
      testCode: 'console.log(1)',
      hiddenTests: null,
      timeLimitMs: 5000,
      memoryLimitMb: 256,
    },
    ...overrides,
  };
}

function evaluation(overrides: Partial<SandboxExecutionResult>): SandboxExecutionResult {
  return {
    status: 'passed',
    kind: 'passed',
    score: 100,
    maxScore: 100,
    durationMs: 42,
    logs: 'Caso de Teste 1: PASS',
    testCases: [
      {
        name: 'Caso de Teste 1',
        passed: true,
        durationMs: 10,
        stdout: 'ok\n',
        isHidden: false,
        kind: 'passed',
      },
    ],
    ...overrides,
  };
}

interface Harness {
  evaluator: EvaluatorService;
  runnerMock: {
    executeInSandbox: ReturnType<typeof mockFn<AnyFn>>;
    execute: ReturnType<typeof mockFn<AnyFn>>;
  };
  gamificationMock: { awardSubmissionXp: ReturnType<typeof mockFn<AnyFn>> };
  prismaMock: any;
  txMock: {
    submission: {
      update: ReturnType<typeof mockFn<AnyFn>>;
      updateMany: ReturnType<typeof mockFn<AnyFn>>;
    };
    testCaseResult: {
      deleteMany: ReturnType<typeof mockFn<AnyFn>>;
      createMany: ReturnType<typeof mockFn<AnyFn>>;
    };
  };
  updateArgs: any[];
}

function buildHarness(submissionOverrides: Record<string, unknown> = {}): Harness {
  const updateArgs: any[] = [];
  const gamificationMock = {
    awardSubmissionXp: mockFn<AnyFn>(async () => null),
  };
  const runnerMock = {
    executeInSandbox: mockFn<AnyFn>(async () => evaluation({})),
    execute: mockFn<AnyFn>(async () => ({
      kind: 'passed',
      status: 'passed',
      durationMs: 1,
      stdout: '',
      stderr: '',
    })),
  };
  // Estado "persistido" da submissão para simular o compare-and-set do updateMany
  const dbState = { xpAwarded: Boolean((submissionOverrides as any).xpAwarded) };
  const txMock = {
    testCaseResult: {
      deleteMany: mockFn<AnyFn>(async () => ({ count: 0 })),
      createMany: mockFn<AnyFn>(async (args: any) => ({ count: args.data.length })),
    },
    submission: {
      update: mockFn<AnyFn>(async (args: any) => {
        updateArgs.push(args);
        return args.data;
      }),
      updateMany: mockFn<AnyFn>(async (args: any) => {
        updateArgs.push(args);
        // CAS real: só atualiza (count=1) se o where casar com o estado do "banco"
        const matches =
          args.where?.xpAwarded === undefined ||
          args.where.xpAwarded === dbState.xpAwarded;
        if (!matches) return { count: 0 };
        dbState.xpAwarded = Boolean(args.data?.xpAwarded);
        return { count: 1 };
      }),
    },
  };
  const prismaMock = {
    submission: {
      findUnique: mockFn<AnyFn>(async () => makeSubmission(submissionOverrides)),
      update: mockFn<AnyFn>(async (args: any) => args.data),
    },
    $transaction: mockFn<AnyFn>(async (cb: any) => cb(txMock)),
  };
  const evaluator = new EvaluatorService(
    prismaMock as any,
    runnerMock as any,
    gamificationMock as any,
  );
  return { evaluator, runnerMock, gamificationMock, prismaMock, txMock, updateArgs };
}

const lastSubmissionUpdate = (h: Harness) => h.updateArgs[h.updateArgs.length - 1];

describe('EvaluatorService', () => {
  it('awards XP when the submission passes', async () => {
    const h = buildHarness();
    await h.evaluator.processSubmission('sub-1');

    assert.equal(lastSubmissionUpdate(h).data.status, 'passed');
    assert.equal(lastSubmissionUpdate(h).data.xpAwarded, true);
    assert.equal(h.gamificationMock.awardSubmissionXp.calls.length, 1);
    const [userId, activityId, passed, score] = h.gamificationMock.awardSubmissionXp.calls[0];
    assert.equal(userId, 'user-1');
    assert.equal(activityId, 'act-1');
    assert.equal(passed, true);
    assert.equal(score, 100);
  });

  it('awards no XP for unsupported and marks submission failed with pedagogical message', async () => {
    const h = buildHarness();
    h.runnerMock.executeInSandbox = mockFn<AnyFn>(async () =>
      evaluation({
        status: 'failed',
        kind: 'unsupported',
        score: 0,
        errorMessage: 'Portugol ainda não é executado no sandbox da plataforma.',
        testCases: [
          {
            name: 'Verificação de Suporte',
            passed: false,
            durationMs: 0,
            isHidden: false,
            kind: 'unsupported',
          },
        ],
      }),
    );

    await h.evaluator.processSubmission('sub-1');

    assert.equal(lastSubmissionUpdate(h).data.status, 'failed');
    assert.equal(lastSubmissionUpdate(h).data.xpAwarded, false);
    assert.equal(h.gamificationMock.awardSubmissionXp.calls.length, 0);
    assert.ok(lastSubmissionUpdate(h).data.errorMessage);
  });

  it('awards no XP for sandbox_unavailable and marks submission error', async () => {
    const h = buildHarness();
    h.runnerMock.executeInSandbox = mockFn<AnyFn>(async () =>
      evaluation({
        status: 'error',
        kind: 'sandbox_unavailable',
        score: 0,
        errorMessage: 'O sandbox de execução está temporariamente indisponível.',
        testCases: [],
      }),
    );

    await h.evaluator.processSubmission('sub-1');

    assert.equal(lastSubmissionUpdate(h).data.status, 'error');
    assert.equal(lastSubmissionUpdate(h).data.xpAwarded, false);
    assert.equal(h.gamificationMock.awardSubmissionXp.calls.length, 0);
  });

  it('awards no XP for compile_error and marks submission failed', async () => {
    const h = buildHarness();
    h.runnerMock.executeInSandbox = mockFn<AnyFn>(async () =>
      evaluation({
        status: 'failed',
        kind: 'compile_error',
        score: 0,
        errorMessage: 'O código não compilou.',
        testCases: [
          {
            name: 'Caso de Teste 1',
            passed: false,
            durationMs: 10,
            isHidden: false,
            kind: 'compile_error',
            errorMessage: 'O código não compilou.',
          },
        ],
      }),
    );

    await h.evaluator.processSubmission('sub-1');

    assert.equal(lastSubmissionUpdate(h).data.status, 'failed');
    assert.equal(lastSubmissionUpdate(h).data.xpAwarded, false);
    assert.equal(h.gamificationMock.awardSubmissionXp.calls.length, 0);
    assert.ok(lastSubmissionUpdate(h).data.errorMessage);
  });

  it('awards XP (failed flag) for runtime failures with partial score', async () => {
    const h = buildHarness();
    h.runnerMock.executeInSandbox = mockFn<AnyFn>(async () =>
      evaluation({
        status: 'failed',
        kind: 'runtime_error',
        score: 50,
        errorMessage: 'ReferenceError: x is not defined',
        testCases: [
          { name: 'Caso de Teste 1', passed: true, durationMs: 10, isHidden: false, kind: 'passed' },
          { name: 'Caso de Teste 2', passed: false, durationMs: 10, isHidden: false, kind: 'runtime_error' },
        ],
      }),
    );

    await h.evaluator.processSubmission('sub-1');

    assert.equal(lastSubmissionUpdate(h).data.status, 'failed');
    assert.equal(lastSubmissionUpdate(h).data.xpAwarded, true);
    assert.equal(h.gamificationMock.awardSubmissionXp.calls.length, 1);
    const [, , passed, score] = h.gamificationMock.awardSubmissionXp.calls[0];
    assert.equal(passed, false);
    assert.equal(score, 50);
  });

  it('does not re-award XP when already awarded', async () => {
    const h = buildHarness({ xpAwarded: true });
    await h.evaluator.processSubmission('sub-1');

    // CAS perdeu (where xpAwarded:false não casa): updateMany conta 0 e o
    // resultado é persistido via update sem tocar no flag nem premiar XP.
    const casArgs = h.txMock.submission.updateMany.calls[0][0];
    assert.equal(casArgs.where.xpAwarded, false);
    assert.equal(h.gamificationMock.awardSubmissionXp.calls.length, 0);
    const fallback = lastSubmissionUpdate(h);
    assert.equal(fallback.data.status, 'passed');
    assert.equal(fallback.data.xpAwarded, undefined);
  });

  it('awards XP exactly once when two concurrent workers process the same submission', async () => {
    // Simula BullMQ attempts:2 / duas réplicas: ambos os workers leem
    // xpAwarded:false ANTES da transação; apenas o vencedor do
    // compare-and-set (updateMany count===1) pode premiar.
    const sharedState = { xpAwarded: false };
    const gamificationMock = {
      awardSubmissionXp: mockFn<AnyFn>(async () => null),
    };
    const runnerMock = {
      executeInSandbox: mockFn<AnyFn>(async () => evaluation({})),
      execute: mockFn<AnyFn>(async () => ({ kind: 'passed', status: 'passed' })),
    };
    const txMock = {
      testCaseResult: {
        deleteMany: mockFn<AnyFn>(async () => ({ count: 0 })),
        createMany: mockFn<AnyFn>(async () => ({ count: 0 })),
      },
      submission: {
        update: mockFn<AnyFn>(async (args: any) => args.data),
        updateMany: mockFn<AnyFn>(async (args: any) => {
          const matches = args.where.xpAwarded === sharedState.xpAwarded;
          if (!matches) return { count: 0 };
          sharedState.xpAwarded = true;
          return { count: 1 };
        }),
      },
    };
    const prismaMock = {
      submission: {
        // AMBOS os workers leem o flag como false (stale read pré-transação)
        findUnique: mockFn<AnyFn>(async () => makeSubmission({ xpAwarded: false })),
        update: mockFn<AnyFn>(async (args: any) => args.data),
      },
      $transaction: mockFn<AnyFn>(async (cb: any) => cb(txMock)),
    };
    const evaluator = new EvaluatorService(
      prismaMock as any,
      runnerMock as any,
      gamificationMock as any,
    );

    await Promise.all([
      evaluator.processSubmission('sub-1'),
      evaluator.processSubmission('sub-1'),
    ]);

    assert.equal(sharedState.xpAwarded, true);
    assert.equal(
      gamificationMock.awardSubmissionXp.calls.length,
      1,
      'XP must be awarded exactly once even with two concurrent processors',
    );
  });

  it('persists test case results inside the transaction', async () => {
    const h = buildHarness();
    await h.evaluator.processSubmission('sub-1');

    assert.equal(h.txMock.testCaseResult.deleteMany.calls.length, 1);
    assert.equal(h.txMock.testCaseResult.createMany.calls.length, 1);
    const created = h.txMock.testCaseResult.createMany.calls[0][0];
    assert.equal(created.data.length, 1);
    assert.equal(created.data[0].submissionId, 'sub-1');
    assert.equal(created.data[0].stdout, 'ok\n');
    assert.equal(created.data[0].isHidden, false);
  });

  it('falls back to a neutral kind when kind is absent from evaluation', async () => {
    const h = buildHarness();
    h.runnerMock.executeInSandbox = mockFn<AnyFn>(async () =>
      evaluation({ status: 'failed', kind: undefined, score: 0 }),
    );

    await h.evaluator.processSubmission('sub-1');

    assert.equal(lastSubmissionUpdate(h).data.status, 'failed');
    assert.equal(lastSubmissionUpdate(h).data.xpAwarded, true);
  });

  it('marks submission as error when the runner throws', async () => {
    const h = buildHarness();
    h.runnerMock.executeInSandbox = mockFn<AnyFn>(async () => {
      throw new Error('runner exploded');
    });

    await h.evaluator.processSubmission('sub-1');

    const running = h.prismaMock.submission.update.calls[0][0];
    const errorUpdate = h.prismaMock.submission.update.calls[1][0];
    assert.equal(running.data.status, 'running');
    assert.equal(errorUpdate.data.status, 'error');
    assert.match(errorUpdate.data.errorMessage, /runner exploded/);
  });

  it('does nothing when the submission is not found', async () => {
    const h = buildHarness();
    h.prismaMock.submission.findUnique = mockFn<AnyFn>(async () => null);

    await h.evaluator.processSubmission('missing');

    assert.equal(h.updateArgs.length, 0);
    assert.equal(h.gamificationMock.awardSubmissionXp.calls.length, 0);
  });
});