import { Test, TestingModule } from '@nestjs/testing';
import { GamificationService } from './gamification.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GamificationService', () => {
  let service: GamificationService;
  let prisma: PrismaService;

  const mockUser = {
    id: '11111111-1111-1111-1111-111111111111',
    xp: 150,
    level: 1,
    streakDays: 2,
    lastActiveAt: new Date(Date.now() - 22 * 60 * 60 * 1000), // 22 hours ago
    badges: [],
  };

  const mockPrismaService = {
    $transaction: jest.fn().mockImplementation(async (callback) => {
      const mockTx = {
        user: {
          findUnique: jest.fn().mockResolvedValue(mockUser),
          // Emula o Prisma: {increment} soma ao XP atual e os demais
          // campos do data sobrescrevem (level/streakDays/lastActiveAt).
          // Sem isso, o update devolveria `xp: { increment: N }` e o
          // nível calculado do XP novo (M4) seria NaN no teste.
          update: jest.fn().mockImplementation(({ data }: any) => {
            const next: any = { ...mockUser };
            if (data.xp?.increment) next.xp = mockUser.xp + data.xp.increment;
            if (typeof data.level === 'number') next.level = data.level;
            if (typeof data.streakDays === 'number') next.streakDays = data.streakDays;
            if (data.lastActiveAt) next.lastActiveAt = data.lastActiveAt;
            return Promise.resolve(next);
          }),
        },
        userBadge: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return callback(mockTx);
    }),
    userBadge: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GamificationService>(GamificationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should award XP and update streak within transaction for passed submission', async () => {
    const result = await service.awardSubmissionXp(
      mockUser.id,
      'activity-1',
      true,
      100, // perfect score
    );

    expect(result).toBeDefined();
    expect(result?.xpGained).toBe(120); // 70 passed + 50 perfect bonus
    expect(result?.totalXp).toBe(270);
    expect(result?.level).toBe(2);
    expect(result?.streak).toBe(3);
  });

  it('should award partial XP for failed submission without perfect bonus', async () => {
    const result = await service.awardSubmissionXp(
      mockUser.id,
      'activity-1',
      false,
      30,
    );

    expect(result).toBeDefined();
    expect(result?.xpGained).toBe(20);
    expect(result?.totalXp).toBe(170);
  });

  it('calls user.update with xp increment delta instead of absolute value', async () => {
    const updates: any[] = [];
    const txWithCapture = {
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
        // M4: agora são DOIS updates — o 1º incrementa o XP e devolve o
        // valor novo (o nível deriva dele); o 2º grava nível/streak.
        update: jest.fn().mockImplementation((args: any) => {
          updates.push(args);
          const next: any = { ...mockUser };
          if (args.data.xp?.increment) next.xp = mockUser.xp + args.data.xp.increment;
          if (typeof args.data.level === 'number') next.level = args.data.level;
          if (typeof args.data.streakDays === 'number') next.streakDays = args.data.streakDays;
          if (args.data.lastActiveAt) next.lastActiveAt = args.data.lastActiveAt;
          return Promise.resolve(next);
        }),
      },
      userBadge: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    (prisma as any).$transaction.mockImplementationOnce(async (cb: any) => cb(txWithCapture));

    const result = await service.awardSubmissionXp(mockUser.id, 'activity-1', true, 100);

    expect(result?.xpGained).toBe(120);
    // 1º update: só o increment (nunca valor absoluto) + lastActiveAt.
    expect(updates[0].data.xp).toEqual({ increment: 120 });
    expect(updates[0].data.level).toBeUndefined();
    // 2º update: nível derivado do XP pós-increment (150+120=270 -> 2).
    expect(updates[1].data.level).toBe(2);
    expect(result?.level).toBe(2);
    expect(result?.totalXp).toBe(270);
  });

  it('C8: awards badges with createMany({ skipDuplicates: true }) — race-safe on @@unique([userId, badgeCode])', async () => {
    let capturedCreateMany: any;
    const txWithCapture = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ ...mockUser, badges: [] }),
        update: jest.fn().mockImplementation((args: any) => {
          const next: any = { ...mockUser };
          if (args.data.xp?.increment) next.xp = mockUser.xp + args.data.xp.increment;
          if (typeof args.data.level === 'number') next.level = args.data.level;
          if (typeof args.data.streakDays === 'number') next.streakDays = args.data.streakDays;
          return Promise.resolve(next);
        }),
      },
      userBadge: {
        createMany: jest.fn().mockImplementation((args: any) => {
          capturedCreateMany = args;
          return Promise.resolve({ count: 1 });
        }),
      },
    };
    (prisma as any).$transaction.mockImplementationOnce(async (cb: any) => cb(txWithCapture));

    // Score 100 + streak 3: first_step + perfectionist + streak_3
    await service.awardSubmissionXp(mockUser.id, 'activity-1', true, 100);

    expect(capturedCreateMany.skipDuplicates).toBe(true);
    expect(capturedCreateMany.data.map((b: any) => b.badgeCode)).toEqual(
      expect.arrayContaining(['first_step', 'perfectionist', 'streak_3']),
    );
  });

  it('C8: with an external tx, errors propagate (the caller transaction rolls back) instead of returning null', async () => {
    const failingTx = {
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
        update: jest.fn().mockRejectedValue(new Error('db down')),
      },
      userBadge: { createMany: jest.fn() },
    };

    await expect(
      service.awardSubmissionXp(mockUser.id, 'activity-1', true, 100, failingTx as any),
    ).rejects.toThrow('db down');
    // Sem tx externa, o comportamento antigo (catch -> null) é preservado.
    (prisma as any).$transaction.mockRejectedValueOnce(new Error('db down'));
    await expect(
      service.awardSubmissionXp(mockUser.id, 'activity-1', true, 100),
    ).resolves.toBeNull();
  });
});

/**
 * M4 (Lote 4) — nível/streak a partir do valor já travado/atualizado.
 * O bug: `level = floor((xp_lido + delta)/200)+1` com leitura sem lock.
 * Com xp 190 e dois prêmios de 120, o XP final é 430 (nível 3), mas o
 * código antigo gravava nível 2 nas duas corridas (190+120=310 -> 2).
 */
describe('GamificationService level/streak under concurrency (M4)', () => {
  let service: GamificationService;
  let prisma: PrismaService;

  // "Banco" mutável: o update aplica o {increment} ao estado atual e
  // devolve o valor novo (como o Prisma real); o findUnique sempre
  // devolve o snapshot STALE lido antes da corrida (xp 190).
  function buildConcurrentHarness() {
    const db = { xp: 190, level: 1, streakDays: 0 };
    const staleUser = {
      id: 'user-1',
      xp: 190,
      level: 1,
      streakDays: 0,
      lastActiveAt: null,
      badges: [],
    };
    const tx = {
      user: {
        findUnique: jest.fn().mockResolvedValue(staleUser),
        update: jest.fn().mockImplementation(({ data }: any) => {
          if (data.xp?.increment) db.xp += data.xp.increment;
          if (typeof data.level === 'number') db.level = data.level;
          if (typeof data.streakDays === 'number') db.streakDays = data.streakDays;
          return Promise.resolve({ ...staleUser, xp: db.xp, level: db.level });
        }),
      },
      userBadge: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const mockPrisma: any = {
      $transaction: jest.fn(async (cb: any) => cb(tx)),
      userBadge: { findMany: jest.fn().mockResolvedValue([]) },
    };
    return { db, mockPrisma };
  }

  beforeEach(async () => {
    const { mockPrisma } = buildConcurrentHarness();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<GamificationService>(GamificationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('two concurrent awards from the same stale read land on the correct final level (no lost level-up)', async () => {
    const { db } = buildConcurrentHarness();
    (prisma as any).$transaction.mockImplementation(async (cb: any) => cb({
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1', xp: 190, level: 1, streakDays: 0, lastActiveAt: null, badges: [],
        }),
        update: jest.fn().mockImplementation(({ data }: any) => {
          if (data.xp?.increment) db.xp += data.xp.increment;
          if (typeof data.level === 'number') db.level = data.level;
          if (typeof data.streakDays === 'number') db.streakDays = data.streakDays;
          return Promise.resolve({ id: 'user-1', xp: db.xp, level: db.level });
        }),
      },
      userBadge: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    }));

    const [first, second] = await Promise.all([
      service.awardSubmissionXp('user-1', 'act-1', true, 100),
      service.awardSubmissionXp('user-1', 'act-1', true, 100),
    ]);

    // Cada prêmio é 70 + 50 (score 100) = 120. A 1ª corrida vê 310
    // (nível 2); a 2ª vê 430 (nível 3). O código antigo daria nível 2
    // nas duas (190+120=310) e o nível 3 se perderia.
    expect(first?.totalXp).toBe(310);
    expect(first?.level).toBe(2);
    expect(second?.totalXp).toBe(430);
    expect(second?.level).toBe(3);
    expect(db.xp).toBe(430);
    expect(db.level).toBe(3);
  });

  it('streak resets to 1 after more than 48h without activity (1-day grace preserved)', async () => {
    const user50hAgo = {
      id: 'user-1',
      xp: 0,
      level: 1,
      streakDays: 5,
      lastActiveAt: new Date(Date.now() - 50 * 60 * 60 * 1000),
      badges: [],
    };
    const tx = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user50hAgo),
        update: jest.fn().mockImplementation(({ data }: any) => {
          const next: any = { ...user50hAgo };
          if (data.xp?.increment) next.xp = user50hAgo.xp + data.xp.increment;
          if (typeof data.level === 'number') next.level = data.level;
          if (typeof data.streakDays === 'number') next.streakDays = data.streakDays;
          return Promise.resolve(next);
        }),
      },
      userBadge: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    (prisma as any).$transaction.mockImplementation(async (cb: any) => cb(tx));

    const result = await service.awardSubmissionXp('user-1', 'act-1', true, 80);

    expect(result?.streak).toBe(1);
    expect(result?.totalXp).toBe(70);
  });

  it('streak is unchanged when the last activity was less than 20h ago (same day)', async () => {
    const user5hAgo = {
      id: 'user-1',
      xp: 0,
      level: 1,
      streakDays: 4,
      lastActiveAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      badges: [],
    };
    const updates: any[] = [];
    const tx = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user5hAgo),
        update: jest.fn().mockImplementation(({ data }: any) => {
          updates.push(data);
          const next: any = { ...user5hAgo };
          if (data.xp?.increment) next.xp = user5hAgo.xp + data.xp.increment;
          if (typeof data.level === 'number') next.level = data.level;
          if (typeof data.streakDays === 'number') next.streakDays = data.streakDays;
          return Promise.resolve(next);
        }),
      },
      userBadge: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    (prisma as any).$transaction.mockImplementation(async (cb: any) => cb(tx));

    const result = await service.awardSubmissionXp('user-1', 'act-1', false, 30);

    expect(result?.streak).toBe(4);
    // Nível (1) e streak (4) não mudaram: só o update do increment roda.
    expect(updates).toHaveLength(1);
    expect(updates[0].xp).toEqual({ increment: 20 });
  });
});
