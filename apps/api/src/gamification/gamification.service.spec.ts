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
    // Exatamente 24h atrás = sempre o dia de calendário (UTC) anterior,
    // independente do horário em que a suíte roda (a regra de streak é por
    // dias de calendário, não por janela de horas).
    lastActiveAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    badges: [],
  };

  const mockPrismaService = {
    $transaction: jest.fn().mockImplementation(async (callback) => {
      const mockTx = {
        user: {
          findUnique: jest.fn().mockResolvedValue(mockUser),
          update: jest.fn().mockImplementation(({ data }) => ({
            ...mockUser,
            ...data,
          })),
        },
        userBadge: {
          create: jest.fn().mockResolvedValue({ id: 'badge-1' }),
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
    let capturedUpdate: any;
    const txWithCapture = {
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
        update: jest.fn().mockImplementation((args: any) => {
          capturedUpdate = args;
          return Promise.resolve({ ...mockUser, ...args.data });
        }),
      },
      userBadge: { create: jest.fn().mockResolvedValue({ id: 'badge-1' }) },
    };
    (prisma as any).$transaction.mockImplementationOnce(async (cb: any) => cb(txWithCapture));

    const result = await service.awardSubmissionXp(mockUser.id, 'activity-1', true, 100);

    expect(result?.xpGained).toBe(120);
    expect(capturedUpdate.data.xp).toEqual({ increment: 120 });
    expect(capturedUpdate.data.level).toBe(2);
  });

  describe('streak com dia de descanso (B15 — padrão Rocketseat)', () => {
    const startOfTodayUtc = () => {
      const n = new Date();
      return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
    };
    // Dia de calendário (UTC) `days` dias atrás, às 10:00 UTC — lacuna de
    // dias determinística em qualquer horário de execução da suíte.
    const daysAgoAt = (days: number, hourUtc = 10) =>
      new Date(startOfTodayUtc() - days * 86_400_000 + hourUtc * 3_600_000);

    async function awardWithUser(lastActiveAt: Date | null, streakDays: number) {
      const scenarioUser = {
        id: mockUser.id,
        xp: 0,
        level: 1,
        streakDays,
        lastActiveAt,
        badges: [],
      };
      const tx = {
        user: {
          findUnique: jest.fn().mockResolvedValue(scenarioUser),
          update: jest.fn().mockImplementation(({ data }: any) =>
            Promise.resolve({ ...scenarioUser, streakDays: data.streakDays }),
          ),
        },
        userBadge: { create: jest.fn().mockResolvedValue({ id: 'badge-x' }) },
      };
      (prisma as any).$transaction.mockImplementationOnce(async (cb: any) => cb(tx));
      return service.awardSubmissionXp(scenarioUser.id, 'activity-1', true, 50);
    }

    it('atividade no dia seguinte mantém e soma +1', async () => {
      const result = await awardWithUser(daysAgoAt(1), 4);
      expect(result?.streak).toBe(5);
    });

    it('atividade no mesmo dia não altera a sequência', async () => {
      const result = await awardWithUser(daysAgoAt(0, 1), 4);
      expect(result?.streak).toBe(4);
    });

    it('1 dia pulado (dia de descanso) preserva a sequência e soma +1', async () => {
      const result = await awardWithUser(daysAgoAt(2), 4);
      expect(result?.streak).toBe(5);
    });

    it('2 dias pulados quebram a sequência (recomeça em 1)', async () => {
      const result = await awardWithUser(daysAgoAt(3), 4);
      expect(result?.streak).toBe(1);
    });

    it('primeira atividade (sem lastActiveAt) começa em 1', async () => {
      const result = await awardWithUser(null, 0);
      expect(result?.streak).toBe(1);
    });

    it('virada de semana: pular o domingo e voltar na segunda mantém', async () => {
      jest.useFakeTimers();
      try {
        // Segunda-feira 2026-10-19, 12:00 UTC; última atividade no sábado.
        jest.setSystemTime(new Date(Date.UTC(2026, 9, 19, 12)));
        const result = await awardWithUser(new Date(Date.UTC(2026, 9, 17, 10)), 4);
        expect(result?.streak).toBe(5);
      } finally {
        jest.useRealTimers();
      }
    });

    it('virada de semana: pular a segunda e voltar na terça mantém', async () => {
      jest.useFakeTimers();
      try {
        // Terça-feira 2026-10-20, 12:00 UTC; última atividade no domingo.
        jest.setSystemTime(new Date(Date.UTC(2026, 9, 20, 12)));
        const result = await awardWithUser(new Date(Date.UTC(2026, 9, 18, 10)), 4);
        expect(result?.streak).toBe(5);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
