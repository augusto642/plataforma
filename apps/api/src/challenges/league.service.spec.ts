import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { LeagueService, PARTICIPATION_BONUS } from './league.service';

/**
 * Fase 3 premium — ligas por nível e pontuação derivada:
 * - liga base por CareerTier (beginner→bronze, junior→silver, mid→gold);
 * - promoção do top 3 da season encerrada mais recente; rebaixamento
 *   só com 6+ entradas (não rebaixa metade de liga pequena);
 * - pontos = bônus de participação + melhor nota APROVADA na janela
 *   (reprovada conta só o bônus; fora da janela, nada);
 * - fechamento idempotente (badge único por usuário).
 */
describe('LeagueService', () => {
  let service: LeagueService;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
    userBadge: { findUnique: jest.fn(), create: jest.fn() },
    challenge: { findUnique: jest.fn() },
    submission: { findMany: jest.fn() },
    leagueSeason: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    leagueEntry: { findMany: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeagueService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<LeagueService>(LeagueService);
  });

  it('liga base: beginner→bronze, junior→silver, mid/senior→gold', () => {
    expect(service.tierForCareerTier('beginner' as any)).toBe('bronze');
    expect(service.tierForCareerTier('junior' as any)).toBe('silver');
    expect(service.tierForCareerTier('mid' as any)).toBe('gold');
    expect(service.tierForCareerTier('senior' as any)).toBe('gold');
  });

  it('sem season encerrada, vale a liga base do CareerTier', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ careerTier: 'beginner' });
    mockPrisma.leagueSeason.findFirst.mockResolvedValue(null);
    await expect(service.resolveTier('user-1')).resolves.toBe('bronze');
  });

  it('top 3 da season anterior sobe uma liga (junior silver → gold)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ careerTier: 'junior' });
    mockPrisma.leagueSeason.findFirst.mockResolvedValue({
      entries: [{ userId: 'user-1' }, { userId: 'u2' }, { userId: 'u3' }, { userId: 'u4' }],
    });
    await expect(service.resolveTier('user-1')).resolves.toBe('gold');
  });

  it('último de liga pequena (4 entradas) NÃO é rebaixado', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ careerTier: 'junior' });
    mockPrisma.leagueSeason.findFirst.mockResolvedValue({
      entries: [{ userId: 'u1' }, { userId: 'u2' }, { userId: 'u3' }, { userId: 'user-1' }],
    });
    await expect(service.resolveTier('user-1')).resolves.toBe('silver');
  });

  it('último de liga com 6+ entradas é rebaixado (junior silver → bronze)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ careerTier: 'junior' });
    mockPrisma.leagueSeason.findFirst.mockResolvedValue({
      entries: [
        { userId: 'u1' },
        { userId: 'u2' },
        { userId: 'u3' },
        { userId: 'u4' },
        { userId: 'u5' },
        { userId: 'user-1' },
      ],
    });
    await expect(service.resolveTier('user-1')).resolves.toBe('bronze');
  });

  it('pontos: bônus de participação + melhor nota aprovada (reprovada não soma nota)', async () => {
    mockPrisma.challenge.findUnique.mockResolvedValue({
      activityId: 'act-1',
      startsAt: new Date('2026-10-20'),
      endsAt: new Date('2026-10-27'),
    });
    mockPrisma.submission.findMany.mockResolvedValue([
      { status: 'failed', score: 50 },
      { status: 'passed', score: 80 },
      { status: 'passed', score: 60 },
    ]);
    await expect(service.computePoints('ch-1', 'user-1')).resolves.toBe(
      PARTICIPATION_BONUS + 80,
    );
    expect(mockPrisma.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          activityId: 'act-1',
          userId: 'user-1',
          createdAt: expect.anything(),
        }),
      }),
    );
  });

  it('sem submissão na janela: 0 pontos (nem bônus)', async () => {
    mockPrisma.challenge.findUnique.mockResolvedValue({
      activityId: 'act-1',
      startsAt: new Date(),
      endsAt: new Date(),
    });
    mockPrisma.submission.findMany.mockResolvedValue([]);
    await expect(service.computePoints('ch-1', 'user-1')).resolves.toBe(0);
  });

  it('só tentativa reprovada: só o bônus de participação', async () => {
    mockPrisma.challenge.findUnique.mockResolvedValue({
      activityId: 'act-1',
      startsAt: new Date(),
      endsAt: new Date(),
    });
    mockPrisma.submission.findMany.mockResolvedValue([{ status: 'failed', score: 40 }]);
    await expect(service.computePoints('ch-1', 'user-1')).resolves.toBe(PARTICIPATION_BONUS);
  });

  it('fechamento premia o campeão só se ainda não tem o badge', async () => {
    mockPrisma.leagueSeason.findMany.mockResolvedValue([
      { id: 's1', tier: 'bronze', entries: [{ userId: 'winner' }, { userId: 'u2' }] },
    ]);
    mockPrisma.userBadge.findUnique.mockResolvedValue(null);
    mockPrisma.userBadge.create.mockResolvedValue({ id: 'b1' });
    const closed = await service.closeExpiredSeasons();
    expect(closed).toEqual([{ seasonId: 's1', tier: 'bronze', winnerId: 'winner' }]);
    expect(mockPrisma.userBadge.create).toHaveBeenCalledTimes(1);

    mockPrisma.userBadge.findUnique.mockResolvedValue({ id: 'b1' });
    await service.closeExpiredSeasons();
    expect(mockPrisma.userBadge.create).toHaveBeenCalledTimes(1);
  });
});
