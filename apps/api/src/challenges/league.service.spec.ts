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
    challenge: { findUnique: jest.fn(), findFirst: jest.fn() },
    submission: { findMany: jest.fn() },
    leagueSeason: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
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
    // Sem desafio na janela: fallback para os pontos armazenados.
    mockPrisma.challenge.findFirst.mockResolvedValue(null);
    mockPrisma.userBadge.findUnique.mockResolvedValue(null);
    mockPrisma.userBadge.create.mockResolvedValue({ id: 'b1' });
    const closed = await service.closeExpiredSeasons();
    expect(closed).toEqual([{ seasonId: 's1', tier: 'bronze', winnerId: 'winner' }]);
    expect(mockPrisma.userBadge.create).toHaveBeenCalledTimes(1);

    mockPrisma.userBadge.findUnique.mockResolvedValue({ id: 'b1' });
    await service.closeExpiredSeasons();
    expect(mockPrisma.userBadge.create).toHaveBeenCalledTimes(1);
  });

  it('D1: fechamento SEM visita prévia ao ranking premia o líder verdadeiro', async () => {
    // Reprodução do QA: pontos armazenados defasados — X=50 na frente
    // de Y=0 — mas Y tem passed 95 na janela (verdadeiro 105), e
    // ninguém chamou o leaderboard antes do fechamento. O fechamento
    // deve recalcular e premiar Y, não X.
    const startsAt = new Date('2026-10-20');
    const endsAt = new Date('2026-10-27');
    mockPrisma.leagueSeason.findMany.mockResolvedValue([
      {
        id: 's1',
        tier: 'bronze',
        startsAt,
        endsAt,
        entries: [
          { id: 'e-x', userId: 'user-x' },
          { id: 'e-y', userId: 'user-y' },
        ],
      },
    ]);
    mockPrisma.challenge.findFirst.mockResolvedValue({ id: 'ch-1' });
    // refreshEntriesForChallenge + computePoints: mesma janela/atividade
    // em ambas as leituras do desafio.
    mockPrisma.challenge.findUnique.mockResolvedValue({
      id: 'ch-1',
      activityId: 'act-1',
      startsAt,
      endsAt,
    });
    mockPrisma.submission.findMany.mockImplementation(({ where }: any) =>
      Promise.resolve(
        where.userId === 'user-y'
          ? [{ status: 'passed', score: 95 }]
          : [{ status: 'passed', score: 40 }],
      ),
    );
    mockPrisma.leagueEntry.update.mockResolvedValue({});
    // Entradas relidas após o refresh, já ordenadas pelos pontos novos.
    mockPrisma.leagueSeason.findUnique.mockResolvedValue({
      id: 's1',
      entries: [{ userId: 'user-y' }, { userId: 'user-x' }],
    });
    mockPrisma.userBadge.findUnique.mockResolvedValue(null);
    mockPrisma.userBadge.create.mockResolvedValue({ id: 'b1' });

    const closed = await service.closeExpiredSeasons();

    expect(closed).toEqual([{ seasonId: 's1', tier: 'bronze', winnerId: 'user-y' }]);
    expect(mockPrisma.userBadge.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-y', badgeCode: 'league_champion' }),
      }),
    );
    // O refresh recalculou ambas as entradas (X: 10+40=50, Y: 10+95=105).
    expect(mockPrisma.leagueEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'e-x' }, data: { points: 50 } }),
    );
    expect(mockPrisma.leagueEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'e-y' }, data: { points: 105 } }),
    );
  });
});
