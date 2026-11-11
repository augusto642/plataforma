import 'reflect-metadata';
import assert from 'node:assert/strict';
import { TX_LOCK_ORDER } from './tx-lock-order';
import { EvaluatorService } from '../submissions/evaluator/evaluator.service';
import { GamificationService } from '../gamification/gamification.service';
import { SubmissionsService } from '../submissions/submissions.service';

/**
 * M5 (Lote 4) — ordem canônica de aquisição de locks:
 * submissions → test_case_results → users → user_companions → user_badges.
 *
 * O spec prova a ordem nos DOIS caminhos transacionais que tocam essas
 * tabelas, com um mock de transação que REGISTRA a sequência de
 * escritas: se alguém reordenar um caminho, o teste quebra. Não prova
 * deadlock ao vivo (exigiria Postgres + 2 transações concorrentes) —
 * prova a invariante que o impede: a mesma ordem nos dois lados.
 */
describe('TX_LOCK_ORDER (M5)', () => {
  it('declares the canonical order submissions -> test_case_results -> users -> user_companions -> user_badges', () => {
    assert.deepEqual([...TX_LOCK_ORDER], [
      'submissions',
      'test_case_results',
      'users',
      'user_companions',
      'user_badges',
    ]);
  });

  it('evaluator locks in canonical order: submission -> testCaseResults -> user -> userBadge', async () => {
    const order: string[] = [];
    const dbUser = { id: 'user-1', xp: 150, level: 1, streakDays: 2, lastActiveAt: new Date(Date.now() - 22 * 60 * 60 * 1000) };
    const tx: any = {
      submission: {
        updateMany: async () => {
          order.push('submissions.updateMany');
          return { count: 1 };
        },
        update: async () => {
          order.push('submissions.update');
          return {};
        },
      },
      testCaseResult: {
        deleteMany: async () => {
          order.push('test_case_results.deleteMany');
          return { count: 0 };
        },
        createMany: async () => {
          order.push('test_case_results.createMany');
          return { count: 1 };
        },
      },
      user: {
        findUnique: async () => ({ ...dbUser, badges: [] }),
        update: async ({ data }: any) => {
          order.push('users.update');
          if (data.xp?.increment) dbUser.xp += data.xp.increment;
          if (typeof data.level === 'number') dbUser.level = data.level;
          if (typeof data.streakDays === 'number') dbUser.streakDays = data.streakDays;
          return { ...dbUser };
        },
      },
      userBadge: {
        createMany: async () => {
          order.push('user_badges.createMany');
          return { count: 1 };
        },
      },
    };
    const prismaMock: any = {
      submission: {
        findUnique: async () => ({
          id: 'sub-1',
          activityId: 'act-1',
          userId: 'user-1',
          codeSnapshot: 'console.log(1)',
          status: 'running',
          xpAwarded: false,
          activity: { id: 'act-1', courseId: 'course-1', language: 'javascript', testCode: 'console.log(1)', hiddenTests: null, timeLimitMs: 5000, memoryLimitMb: 256 },
        }),
        update: async () => ({}),
      },
      $transaction: async (cb: any) => cb(tx),
    };
    const runnerMock: any = {
      executeInSandbox: async () => ({
        status: 'passed',
        kind: 'passed',
        score: 100,
        maxScore: 100,
        durationMs: 42,
        logs: 'Caso de Teste 1: PASS',
        testCases: [{ name: 'Caso de Teste 1', passed: true, durationMs: 10, stdout: 'ok\n', isHidden: false, kind: 'passed' }],
      }),
    };
    const cacheMock: any = { delPattern: async () => undefined };
    // Gamificação REAL sobre o mesmo tx: é ela que trava `users` no award.
    const gamification = new GamificationService(prismaMock);
    const evaluator = new EvaluatorService(prismaMock, runnerMock, gamification, cacheMock);

    await evaluator.processSubmission('sub-1');

    const idx = (name: string) => order.indexOf(name);
    assert.ok(idx('submissions.updateMany') >= 0, `expected submission claim in ${order}`);
    assert.ok(idx('test_case_results.deleteMany') > idx('submissions.updateMany'), `order was ${order}`);
    assert.ok(idx('test_case_results.createMany') > idx('test_case_results.deleteMany'), `order was ${order}`);
    assert.ok(idx('users.update') > idx('test_case_results.createMany'), `order was ${order}`);
    assert.ok(idx('user_badges.createMany') > idx('users.update'), `order was ${order}`);
  });

  it('battleRun locks in canonical order: submission -> testCaseResults -> user -> companion', async () => {
    const order: string[] = [];
    const dbUser = { id: 'user-1', xp: 50, level: 1, bitsBalance: 100 };
    const dbCompanion = { id: 'comp-1', userId: 'user-1', starterName: 'pythox', currentStage: 1, xp: 40 };
    const dbSubmission: any = { id: 'sub-1', status: 'queued', xpAwarded: false };
    const tx: any = {
      submission: {
        update: async ({ data }: any) => {
          order.push('submissions.update');
          Object.assign(dbSubmission, data);
          return dbSubmission;
        },
      },
      testCaseResult: {
        createMany: async () => {
          order.push('test_case_results.createMany');
          return { count: 2 };
        },
      },
      user: {
        update: async ({ data }: any) => {
          order.push('users.update');
          if (data.xp?.increment) dbUser.xp += data.xp.increment;
          if (data.bitsBalance?.increment) dbUser.bitsBalance += data.bitsBalance.increment;
          if (typeof data.level === 'number') dbUser.level = data.level;
          return { ...dbUser };
        },
      },
      userCompanion: {
        update: async ({ data }: any) => {
          order.push('user_companions.update');
          if (data.xp?.increment) dbCompanion.xp += data.xp.increment;
          if (typeof data.currentStage === 'number') dbCompanion.currentStage = data.currentStage;
          return { ...dbCompanion };
        },
      },
    };
    const prismaMock: any = {
      activity: {
        findUnique: async () => ({
          id: 'act-1',
          courseId: 'course-1',
          title: 'Boss',
          language: 'javascript',
          testCode: 'test(1)',
          hiddenTests: null,
          timeLimitMs: 5000,
          memoryLimitMb: 256,
          bossMetadata: { name: 'Bug', maxHp: 100, attack: 20, xpReward: 80, bitsReward: 60 },
        }),
      },
      userCompanion: { findFirst: async () => ({ ...dbCompanion }) },
      user: { findUnique: async () => ({ ...dbUser }) },
      submission: {
        findUnique: async () => ({ ...dbSubmission }),
        findMany: async () => [],
        updateMany: async () => {
          dbSubmission.status = 'running';
          return { count: 1 };
        },
        update: async ({ data }: any) => Object.assign(dbSubmission, data),
      },
      testCaseResult: { createMany: async () => ({ count: 0 }) },
      $transaction: async (cb: any) => cb(tx),
    };
    const runnerMock: any = {
      executeInSandbox: async () => ({
        status: 'passed',
        testCases: [
          { name: 'Test 1', passed: true, durationMs: 20 },
          { name: 'Hidden Test 2', passed: true, durationMs: 15, isHidden: true },
        ],
        durationMs: 35,
        logs: 'Test 1: PASS',
      }),
    };
    const service = new SubmissionsService(
      prismaMock,
      { processSubmission: async () => undefined } as any,
      runnerMock,
      { add: async () => ({ id: 'job-1' }) } as any,
      { usingLock: async (_k: string, _t: number, action: any) => action() } as any,
      { delPattern: async () => undefined } as any,
    );

    const result = await service.executeBattleRun({
      submissionId: 'sub-1',
      userId: 'user-1',
      activityId: 'act-1',
      companionId: 'comp-1',
      code: 'function solve() { return true; }',
      language: 'javascript' as any,
    });

    assert.equal(result.isVictory, true);
    const idx = (name: string) => order.indexOf(name);
    assert.ok(idx('submissions.update') >= 0, `expected submission write in ${order}`);
    assert.ok(idx('test_case_results.createMany') > idx('submissions.update'), `order was ${order}`);
    assert.ok(idx('users.update') > idx('test_case_results.createMany'), `order was ${order}`);
    assert.ok(idx('user_companions.update') > idx('users.update'), `order was ${order}`);
    // Estado final idêntico ao da escrita única anterior: vitória com
    // recompensa cheia + companion evoluído (40+80=120 >= 100 -> estágio 2).
    assert.equal(dbSubmission.status, 'passed');
    assert.equal(dbSubmission.battleResult.xpGained, 80);
    assert.equal(dbCompanion.currentStage, 2);
  });
});
