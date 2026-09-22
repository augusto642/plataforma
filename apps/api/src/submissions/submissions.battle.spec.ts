import { NotFoundException } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { BattleRunDto } from './dto/battle-run.dto';

describe('SubmissionsService - Battle Run', () => {
  let service: SubmissionsService;
  let prisma: any;
  let evaluator: any;
  let runner: any;
  let queue: any;
  let redisLock: any;

  // "Estado do banco" mutável para simular increments atômicos
  let dbUser: any;
  let dbCompanion: any;

  const mockUser = {
    id: 'user-1',
    name: 'Player One',
    xp: 50,
    level: 1,
    bitsBalance: 100,
  };
  const mockActivity = {
    id: 'act-1',
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

  beforeEach(() => {
    dbUser = { ...mockUser };
    dbCompanion = { ...mockCompanion };

    prisma = {
      activity: { findUnique: jest.fn() },
      userCompanion: { findFirst: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn(), update: jest.fn() },
      submission: { create: jest.fn(), findMany: jest.fn() },
      testCaseResult: { createMany: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

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
      return { ...dbUser };
    });

    // userCompanion.update simula o {increment} atômico do Prisma
    prisma.userCompanion.update.mockImplementation(({ data }: any) => {
      if (data.xp && typeof data.xp.increment === 'number') {
        dbCompanion.xp += data.xp.increment;
      }
      if (typeof data.currentStage === 'number') {
        dbCompanion.currentStage = data.currentStage;
      }
      return { ...dbCompanion };
    });

    // Default: sem submissões anteriores (boss com HP cheio)
    prisma.submission.findMany.mockResolvedValue([]);

    evaluator = {
      processSubmission: jest.fn(),
    };

    runner = {
      executeInSandbox: jest.fn(),
    };

    queue = {
      add: jest.fn(),
    };

    redisLock = {
      usingLock: jest.fn((_key, _ttl, action) => action()),
    };

    service = new SubmissionsService(prisma, evaluator, runner, queue, redisLock);
  });

  it('throws NotFoundException when activity does not exist', async () => {
    prisma.activity.findUnique.mockResolvedValue(null);

    const dto: BattleRunDto = {
      activityId: 'act-missing',
      companionId: 'comp-1',
      code: 'function test() {}',
      language: 'javascript' as any,
    };

    await expect(service.battleRun('user-1', dto)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when companion does not belong to user', async () => {
    prisma.activity.findUnique.mockResolvedValue(mockActivity);
    prisma.userCompanion.findFirst.mockResolvedValue(null);

    const dto: BattleRunDto = {
      activityId: 'act-1',
      companionId: 'comp-missing',
      code: 'function test() {}',
      language: 'javascript' as any,
    };

    await expect(service.battleRun('user-1', dto)).rejects.toThrow(
      'Companion not found or does not belong to user',
    );
  });

  it('executes full pass, inflicts critical damage, defeats boss and evolves companion (Stage 1 -> 2 at 100 XP)', async () => {
    prisma.activity.findUnique.mockResolvedValue(mockActivity);
    // Companion has 40 XP. With +80 XP from boss, will reach 120 XP >= 100 XP -> Metamorphosis to Stage 2!
    prisma.userCompanion.findFirst.mockResolvedValue({ ...mockCompanion, xp: 40, currentStage: 1 });
    prisma.user.findUnique.mockResolvedValue(dbUser);
    prisma.submission.create.mockResolvedValue({ id: 'sub-1' });

    runner.executeInSandbox.mockResolvedValue({
      status: 'passed',
      testCases: [
        { name: 'Test 1', passed: true, durationMs: 20 },
        { name: 'Hidden Test 2', passed: true, durationMs: 15, isHidden: true },
      ],
      durationMs: 35,
      logs: 'Test 1: PASS\nHidden Test 2: PASS',
    });

    const dto: BattleRunDto = {
      activityId: 'act-1',
      companionId: 'comp-1',
      code: 'function solve() { return true; }',
      language: 'javascript' as any,
    };

    const res = await service.battleRun('user-1', dto);

    expect(res.allPassed).toBe(true);
    expect(res.isVictory).toBe(true);
    expect(res.isCriticalHit).toBe(true);
    expect(res.recoilDamage).toBe(0);
    expect(res.remainingBossHp).toBe(0);
    expect(res.xpGained).toBe(80);
    expect(res.bitsGained).toBe(60);
    expect(res.companion.currentStage).toBe(2);
    expect(res.companion.evolved).toBe(true);
    expect(res.combatLog).toContain('METAMORFOSE');
    // Incrementos atômicos aplicados no "banco"
    expect(dbUser.xp).toBe(50 + 80);
    expect(dbUser.bitsBalance).toBe(100 + 60);
    expect(dbCompanion.xp).toBe(120);
  });

  it('handles partial test pass with partial boss damage and recoil damage to hero', async () => {
    prisma.activity.findUnique.mockResolvedValue(mockActivity);
    prisma.userCompanion.findFirst.mockResolvedValue(dbCompanion);
    prisma.user.findUnique.mockResolvedValue(dbUser);
    prisma.submission.create.mockResolvedValue({ id: 'sub-2' });

    runner.executeInSandbox.mockResolvedValue({
      status: 'failed',
      testCases: [
        { name: 'Test 1', passed: true, durationMs: 20 },
        { name: 'Test 2', passed: false, durationMs: 15, errorMessage: 'Expected 2 but got 1' },
      ],
      durationMs: 35,
    });

    const dto: BattleRunDto = {
      activityId: 'act-1',
      companionId: 'comp-1',
      code: 'function partial() {}',
      language: 'javascript' as any,
    };

    const res = await service.battleRun('user-1', dto);

    expect(res.allPassed).toBe(false);
    expect(res.isVictory).toBe(false);
    expect(res.testsPassed).toBe(1);
    expect(res.totalTests).toBe(2);
    expect(res.damageDealt).toBeGreaterThan(0);
    expect(res.recoilDamage).toBe(10); // 50% of boss attack 20
    expect(res.remainingBossHp).toBeGreaterThan(0);
    expect(res.combatLog).toContain('contra-atacou');
  });

  it('handles full test failure: 0 damage dealt, full boss recoil damage taken, 0 XP', async () => {
    prisma.activity.findUnique.mockResolvedValue(mockActivity);
    prisma.userCompanion.findFirst.mockResolvedValue(dbCompanion);
    prisma.user.findUnique.mockResolvedValue(dbUser);
    prisma.submission.create.mockResolvedValue({ id: 'sub-3' });

    runner.executeInSandbox.mockResolvedValue({
      status: 'failed',
      testCases: [
        { name: 'Test 1', passed: false, durationMs: 10 },
        { name: 'Test 2', passed: false, durationMs: 10 },
      ],
      durationMs: 20,
    });

    const dto: BattleRunDto = {
      activityId: 'act-1',
      companionId: 'comp-1',
      code: 'throw new Error();',
      language: 'javascript' as any,
    };

    const res = await service.battleRun('user-1', dto);

    expect(res.allPassed).toBe(false);
    expect(res.damageDealt).toBe(0);
    expect(res.recoilDamage).toBe(20); // full boss attack
    expect(res.remainingBossHp).toBe(100); // boss HP cheio derivado do servidor
    expect(res.xpGained).toBe(0);
    expect(res.bitsGained).toBe(0);
  });

  it('evolves companion from Stage 2 to Stage 3 when crossing 300 XP', async () => {
    prisma.activity.findUnique.mockResolvedValue(mockActivity);
    // Companion is at Stage 2 with 250 XP. +80 XP will give 330 XP >= 300 XP -> Stage 3 Metamorphosis!
    dbCompanion = { ...mockCompanion, currentStage: 2, xp: 250 };
    prisma.userCompanion.findFirst.mockResolvedValue(dbCompanion);
    prisma.user.findUnique.mockResolvedValue(dbUser);
    prisma.submission.create.mockResolvedValue({ id: 'sub-4' });

    runner.executeInSandbox.mockResolvedValue({
      status: 'passed',
      testCases: [{ name: 'Final Test', passed: true }],
      durationMs: 15,
    });

    const dto: BattleRunDto = {
      activityId: 'act-1',
      companionId: 'comp-1',
      code: 'return 42;',
      language: 'javascript' as any,
    };

    const res = await service.battleRun('user-1', dto);

    expect(res.companion.currentStage).toBe(3);
    expect(res.companion.evolved).toBe(true);
    expect(res.combatLog).toContain('Estágio 3');
  });

  describe('server-side boss HP (anti-cheat)', () => {
    beforeEach(() => {
      prisma.activity.findUnique.mockResolvedValue(mockActivity);
      prisma.userCompanion.findFirst.mockResolvedValue(dbCompanion);
      prisma.user.findUnique.mockResolvedValue(dbUser);
      prisma.submission.create.mockResolvedValue({ id: 'sub-x' });
    });

    const passingRun = () => {
      runner.executeInSandbox.mockResolvedValue({
        status: 'passed',
        testCases: [{ name: 'Final Test', passed: true }],
        durationMs: 15,
      });
    };

    it('ignores any client-supplied currentBossHp and derives HP from real submissions', async () => {
      passingRun();
      // Payload forjado como se o DTO ainda aceitasse currentBossHp
      const dto = {
        activityId: 'act-1',
        companionId: 'comp-1',
        code: 'return 42;',
        language: 'javascript' as any,
        currentBossHp: 0, // aluno tenta forjar boss com HP 0
      } as any;

      const res = await service.battleRun('user-1', dto);

      // Servidor derivou HP cheio (sem submissões anteriores) => vitória real,
      // não a forjada com HP 0. Dano = bossMaxHp (100), não 0.
      expect(res.damageDealt).toBe(100);
      expect(res.isVictory).toBe(true);
      expect(res.xpGained).toBe(80);
    });

    it('does not re-grant full boss rewards when the boss was already defeated', async () => {
      passingRun();
      // Submissão anterior 'passed' => boss já derrotado => HP atual 0
      prisma.submission.findMany.mockResolvedValue([
        { status: 'passed', score: 100 },
      ]);

      const dto: BattleRunDto = {
        activityId: 'act-1',
        companionId: 'comp-1',
        code: 'return 42;',
        language: 'javascript' as any,
      };

      const res = await service.battleRun('user-1', dto);

      expect(res.remainingBossHp).toBe(0);
      expect(res.isVictory).toBe(false); // sem transição HP>0 -> 0
      expect(res.xpGained).toBe(25); // apenas o XP parcial padrão, não os 80 do boss
      expect(res.bitsGained).toBe(10);
      expect(res.damageDealt).toBe(0);
    });

    it('carries accumulated partial damage from prior failed runs into boss HP', async () => {
      passingRun();
      // Tentativa anterior com score 100 em run falho => dano acumulado de
      // round(100 * 0.5 * 1.0) = 50 => boss entra com 50 HP.
      prisma.submission.findMany.mockResolvedValue([
        { status: 'failed', score: 100 },
      ]);

      const dto: BattleRunDto = {
        activityId: 'act-1',
        companionId: 'comp-1',
        code: 'return 42;',
        language: 'javascript' as any,
      };

      const res = await service.battleRun('user-1', dto);

      expect(res.damageDealt).toBeGreaterThanOrEqual(50);
      expect(res.remainingBossHp).toBe(0);
      expect(res.isVictory).toBe(true);
    });
  });
});
