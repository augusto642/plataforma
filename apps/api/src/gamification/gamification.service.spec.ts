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
});
