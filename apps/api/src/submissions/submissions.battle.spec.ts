import { createHash } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { BattleRunDto } from './dto/battle-run.dto';

/**
 * C7 (Lote 1) — battleRun assíncrono via BullMQ.
 * - battleRun() só valida + enfileira (202-shape) com jobId estável;
 * - executeBattleRun() é o worker: CAS + combate + prêmio em 1 transação;
 * - dois battle-runs paralelos com o mesmo commit/código premiam UMA vez.
 */
describe('SubmissionsService - Battle Run (async, C7)', () => {
  let service: SubmissionsService;
  let prisma: any;
  let evaluator: any;
  let runner: any;
  let queue: any;
  let redisLock: any;
  let cache: any;

  // "Estado do banco" mutável para simular increments atômicos e o CAS
  let dbUser: any;
  let dbCompanion: any;
  let dbSubmission: any;

  const mockUser = {
    id: 'user-1',
    name: 'Player One',
    xp: 50,
    level: 1,
    bitsBalance: 100,
  };
  const mockActivity = {
    id: 'act-1',
    courseId: 'course-1',
    title: 'Desafio do Boss',
    language: 'javascript',
    testCode: 'test("foo", () => {});',
    hiddenTests: 'test("bar", () => {});',
    timeLimitMs: 5000,
    memoryLimitMb: 256,
    isBossFight: true,
    bossMetadata: {
      name: 'Cyber Kraken',
      maxHp: 100,
      attack: 20,
      xpReward: 80,
      bitsReward: 60,
    },
  };

  const mockCompanion = {
    id: 'comp-1',
    userId: 'user-1',
    starterName: 'pythox',
    currentStage: 1,
    xp: 40,
  };

  const codeHash = (code: string) =>
    createHash('sha256').update(code).digest('hex').slice(0, 16);

  const dto = (overrides: Partial<BattleRunDto> = {}): BattleRunDto => ({
    activityId: 'act-1',
    companionId: 'comp-1',
    code: 'function solve() { return true; }',
    language: 'javascript' as any,
    ...overrides,
  });

  beforeEach(() => {
    dbUser = { ...mockUser };
    dbCompanion = { ...mockCompanion };
    dbSubmission = null;

    prisma = {
      activity: { findUnique: jest.fn().mockResolvedValue(mockActivity) },
      userCompanion: { findFirst: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn().mockResolvedValue(dbUser), update: jest.fn() },
      submission: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      testCaseResult: { createMany: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    prisma.userCompanion.findFirst.mockResolvedValue({ ...mockCompanion });
    prisma.user.findUnique.mockResolvedValue(dbUser);
    prisma.submission.create.mockImplementation(async ({ data }: any) => {
      dbSubmission = { id: 'sub-1', status: 'queued', ...data };
      return dbSubmission;
    });
    prisma.submission.findUnique.mockImplementation(async () => dbSubmission);
    // CAS queued->running: mutação síncrona antes de resolver, para o teste
    // de corrida ver o segundo claim falhar de forma determinística.
    prisma.submission.updateMany.mockImplementation(({ where, data }: any) => {
      if (
        dbSubmission &&
        (where.status?.in ?? [where.status]).includes(dbSubmission.status)
      ) {
        dbSubmission.status = data.status;
        return Promise.resolve({ count: 1 });
      }
      return Promise.resolve({ count: 0 });
    });
    prisma.submission.update.mockImplementation(async ({ data }: any) => {
      Object.assign(dbSubmission, data);
      return dbSubmission;
    });

    // user.update simula o {increment} atômico do Prisma
    prisma.user.update.mockImplementation(({ data }: any) => {
      if (data.xp && typeof data.xp.increment === 'number') {
        dbUser.xp += data.xp.increment;
      }
      if (data.bitsBalance && typeof data.bitsBalance.increment === 'number') {
        dbUser.bitsBalance += data.bitsBalance.increment;
      }
      if (typeof data.level === 'number') {
        dbUser.level = data.level;
      }
      return Promise.resolve({ ...dbUser });
    });

    // userCompanion.update simula o {increment} atômico do Prisma
    prisma.userCompanion.update.mockImplementation(({ data }: any) => {
      if (data.xp && typeof data.xp.increment === 'number') {
        dbCompanion.xp += data.xp.increment;
      }
      if (typeof data.currentStage === 'number') {
        dbCompanion.currentStage = data.currentStage;
      }
      return Promise.resolve({ ...dbCompanion });
    });

    // Default: sem submissões anteriores (boss com HP cheio)
    prisma.submission.findMany.mockResolvedValue([]);

    evaluator = { processSubmission: jest.fn() };
    runner = { executeInSandbox: jest.fn() };
    queue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    redisLock = {
      usingLock: jest.fn((_key, _ttl, action) => action()),
    };
    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      delPattern: jest.fn().mockResolvedValue(undefined),
    };

    service = new SubmissionsService(prisma, evaluator, runner, queue, redisLock, cache);
  });

  const passingRun = () => {
    runner.executeInSandbox.mockResolvedValue({
      status: 'passed',
      testCases: [
        { name: 'Test 1', passed: true, durationMs: 20 },
        { name: 'Hidden Test 2', passed: true, durationMs: 15, isHidden: true },
      ],
      durationMs: 35,
      logs: 'Test 1: PASS\nHidden Test 2: PASS',
    });
  };

  describe('battleRun (enqueue)', () => {
    it('throws NotFoundException when activity does not exist', async () => {
      prisma.activity.findUnique.mockResolvedValue(null);
      await expect(service.battleRun('user-1', dto())).rejects.toThrow(NotFoundException);
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when companion does not belong to user', async () => {
      prisma.userCompanion.findFirst.mockResolvedValue(null);
      await expect(service.battleRun('user-1', dto())).rejects.toThrow(
        'Companion not found or does not belong to user',
      );
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('enqueues with stable jobId battle:{userId}:{activityId}:{codeHash} and returns 202-shape', async () => {
      const res = await service.battleRun('user-1', dto());

      expect(res).toEqual({
        submissionId: 'sub-1',
        status: 'queued',
        jobId: `battle:user-1:act-1:${codeHash(dto().code)}`,
      });
      expect(queue.add).toHaveBeenCalledWith(
        'battle-run',
        expect.objectContaining({
          submissionId: 'sub-1',
          userId: 'user-1',
          activityId: 'act-1',
          companionId: 'comp-1',
        }),
        expect.objectContaining({
          jobId: `battle:user-1:act-1:${codeHash(dto().code)}`,
          attempts: 2,
        }),
      );
      // A submissão nasce marcada como battle (o watchdog nunca a re-enfileira
      // como 'evaluate' e a reconciliação de XP a trata à parte).
      expect(prisma.submission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isBattleRun: true, status: 'queued' }),
        }),
      );
      // Nada é executado na requisição: sem sandbox, sem prêmio.
      expect(runner.executeInSandbox).not.toHaveBeenCalled();
      expect(dbUser.xp).toBe(50);
    });

    it('uses dto.commitSha in the stable jobId when provided', async () => {
      const res = await service.battleRun('user-1', dto({ commitSha: 'abc123' }));

      expect(res.jobId).toBe('battle:user-1:act-1:abc123');
      expect(queue.add).toHaveBeenCalledWith(
        'battle-run',
        expect.anything(),
        expect.objectContaining({ jobId: 'battle:user-1:act-1:abc123' }),
      );
    });

    it('second identical battle-run returns the in-flight submission without a second job', async () => {
      const first = await service.battleRun('user-1', dto());
      prisma.submission.findFirst.mockResolvedValue({ id: 'sub-1', status: 'queued' });

      const second = await service.battleRun('user-1', dto());

      expect(first.submissionId).toBe('sub-1');
      expect(second.submissionId).toBe('sub-1');
      expect(second.jobId).toBe(first.jobId);
      expect(queue.add).toHaveBeenCalledTimes(1);
      expect(prisma.submission.create).toHaveBeenCalledTimes(1);
    });

    it('two parallel identical battle-runs enqueue a single job', async () => {
      // A segunda chamada enxerga a submissão criada pela primeira.
      prisma.submission.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ id: 'sub-1', status: 'queued' });

      const [first, second] = await Promise.all([
        service.battleRun('user-1', dto()),
        service.battleRun('user-1', dto()),
      ]);

      expect(first.submissionId).toBe('sub-1');
      expect(second.submissionId).toBe('sub-1');
      expect(queue.add).toHaveBeenCalledTimes(1);
    });

    it('returns the existing submission on P2002 instead of throwing (commitSha dedupe)', async () => {
      prisma.submission.create.mockRejectedValueOnce({ code: 'P2002', message: 'unique' });
      prisma.submission.findFirst.mockResolvedValue({ id: 'sub-existing', status: 'queued' });

      const res = await service.battleRun('user-1', dto({ commitSha: 'abc123' }));

      expect(res.submissionId).toBe('sub-existing');
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('fail-closed: marks submission as error when the queue is down', async () => {
      queue.add.mockRejectedValue(new Error('redis down'));

      const res = await service.battleRun('user-1', dto());

      expect(res.status).toBe('error');
      expect(prisma.submission.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: expect.objectContaining({ status: 'error' }),
      });
      expect(runner.executeInSandbox).not.toHaveBeenCalled();
    });
  });

  describe('executeBattleRun (worker)', () => {
    const jobData = (overrides: Record<string, unknown> = {}) => ({
      submissionId: 'sub-1',
      userId: 'user-1',
      activityId: 'act-1',
      companionId: 'comp-1',
      code: 'function solve() { return true; }',
      language: 'javascript' as any,
      ...overrides,
    });

    beforeEach(() => {
      dbSubmission = { id: 'sub-1', status: 'queued', isBattleRun: true };
    });

    it('executes full pass, defeats boss, evolves companion and persists battleResult', async () => {
      passingRun();

      const res = await service.executeBattleRun(jobData());

      expect(res.allPassed).toBe(true);
      expect(res.isVictory).toBe(true);
      expect(res.xpGained).toBe(80);
      expect(res.bitsGained).toBe(60);
      expect(res.companion.currentStage).toBe(2);
      expect(res.companion.evolved).toBe(true);
      expect(res.combatLog).toContain('METAMORFOSE');
      // Incrementos atômicos aplicados no "banco" uma única vez
      expect(dbUser.xp).toBe(50 + 80);
      expect(dbUser.bitsBalance).toBe(100 + 60);
      expect(dbCompanion.xp).toBe(120);
      // Resultado persistido na submissão para GET /:id/battle
      expect(dbSubmission.status).toBe('passed');
      expect(dbSubmission.xpAwarded).toBe(true);
      expect(dbSubmission.battleResult).toEqual(
        expect.objectContaining({ isVictory: true, xpGained: 80 }),
      );
      // A4: o combate premiou XP — o cache do ranking do curso é invalidado.
      expect(cache.delPattern).toHaveBeenCalledWith('leaderboard:course-1:*');
    });

    it('handles partial test pass with partial boss damage and recoil damage', async () => {
      runner.executeInSandbox.mockResolvedValue({
        status: 'failed',
        testCases: [
          { name: 'Test 1', passed: true, durationMs: 20 },
          { name: 'Test 2', passed: false, durationMs: 15, errorMessage: 'Expected 2 but got 1' },
        ],
        durationMs: 35,
      });

      const res = await service.executeBattleRun(jobData());

      expect(res.allPassed).toBe(false);
      expect(res.isVictory).toBe(false);
      expect(res.testsPassed).toBe(1);
      expect(res.damageDealt).toBeGreaterThan(0);
      expect(res.recoilDamage).toBe(10); // 50% of boss attack 20
      expect(res.remainingBossHp).toBeGreaterThan(0);
      expect(res.combatLog).toContain('contra-atacou');
    });

    it('handles full test failure: 0 damage, full recoil, 0 XP', async () => {
      runner.executeInSandbox.mockResolvedValue({
        status: 'failed',
        testCases: [
          { name: 'Test 1', passed: false, durationMs: 10 },
          { name: 'Test 2', passed: false, durationMs: 10 },
        ],
        durationMs: 20,
      });

      const res = await service.executeBattleRun(jobData());

      expect(res.allPassed).toBe(false);
      expect(res.damageDealt).toBe(0);
      expect(res.recoilDamage).toBe(20);
      expect(res.remainingBossHp).toBe(100);
      expect(res.xpGained).toBe(0);
      expect(res.bitsGained).toBe(0);
      expect(dbUser.xp).toBe(50);
    });

    it('evolves companion from Stage 2 to Stage 3 when crossing 300 XP', async () => {
      dbCompanion = { ...mockCompanion, currentStage: 2, xp: 250 };
      passingRun();

      const res = await service.executeBattleRun(jobData());

      expect(res.companion.currentStage).toBe(3);
      expect(res.companion.evolved).toBe(true);
      expect(res.combatLog).toContain('Estágio 3');
    });

    it('two parallel workers for the same submission credit the boss reward ONCE', async () => {
      passingRun();

      const [first, second] = await Promise.all([
        service.executeBattleRun(jobData()),
        service.executeBattleRun(jobData()),
      ]);

      // Um worker vence o CAS e premia; o outro desiste sem tocar no XP.
      const results = [first, second].filter(Boolean);
      expect(results).toHaveLength(1);
      expect(results[0].isVictory).toBe(true);
      expect(dbUser.xp).toBe(50 + 80);
      expect(dbUser.bitsBalance).toBe(100 + 60);
      expect(runner.executeInSandbox).toHaveBeenCalledTimes(1);
    });

    it('skips execution when the submission is already terminal (BullMQ retry)', async () => {
      dbSubmission.status = 'passed';
      dbSubmission.battleResult = { isVictory: true };

      const res = await service.executeBattleRun(jobData());

      expect(res).toEqual({ isVictory: true });
      expect(runner.executeInSandbox).not.toHaveBeenCalled();
      expect(dbUser.xp).toBe(50);
    });

    describe('server-side boss HP (anti-cheat)', () => {
      it('does not re-grant full boss rewards when the boss was already defeated', async () => {
        passingRun();
        prisma.submission.findMany.mockResolvedValue([{ status: 'passed', score: 100 }]);

        const res = await service.executeBattleRun(jobData());

        expect(res.remainingBossHp).toBe(0);
        expect(res.isVictory).toBe(false);
        expect(res.xpGained).toBe(25); // apenas o XP parcial padrão, não os 80 do boss
        expect(res.bitsGained).toBe(10);
        expect(res.damageDealt).toBe(0);
      });

      it('carries accumulated partial damage from prior failed runs into boss HP', async () => {
        passingRun();
        prisma.submission.findMany.mockResolvedValue([{ status: 'failed', score: 100 }]);

        const res = await service.executeBattleRun(jobData());

        expect(res.damageDealt).toBeGreaterThanOrEqual(50);
        expect(res.remainingBossHp).toBe(0);
        expect(res.isVictory).toBe(true);
      });
    });
  });

  describe('getBattleResult', () => {
    it('returns null result while queued and the stored result when done', async () => {
      dbSubmission = { id: 'sub-1', status: 'queued', userId: 'user-1', battleResult: null, activity: { course: { instructorId: 'other' } } };
      prisma.submission.findUnique.mockImplementation(async () => dbSubmission);

      const queued = await service.getBattleResult('sub-1', 'user-1');
      expect(queued).toEqual({ status: 'queued', result: null });

      dbSubmission.status = 'passed';
      dbSubmission.battleResult = { isVictory: true, xpGained: 80 };
      const done = await service.getBattleResult('sub-1', 'user-1');
      expect(done).toEqual({ status: 'passed', result: { isVictory: true, xpGained: 80 } });
    });

    it('throws NotFoundException for another student (anti-IDOR)', async () => {
      dbSubmission = { id: 'sub-1', status: 'passed', userId: 'user-1', battleResult: {}, activity: { course: { instructorId: 'other' } } };
      prisma.submission.findUnique.mockImplementation(async () => dbSubmission);

      await expect(service.getBattleResult('sub-1', 'user-2')).rejects.toThrow(NotFoundException);
    });
  });
});
