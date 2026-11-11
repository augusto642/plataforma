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
 *
 * M3 (Lote 4) — o N+1 eliminado: `refreshEntriesForChallenge` fazia
 * 1 `findMany` + 1 `findUnique` + 1 `update` POR ENTRADA; `resolveTier`
 * carregava TODAS as entradas da season; `myLeagues` trazia todas as
 * entradas de cada season num `include` aninhado. Os testes abaixo
 * travam o nº de chamadas do Prisma (constante, não proporcional ao
 * nº de entradas/alunos) e a semântica idêntica de pontos/tiers.
 */
describe('LeagueService', () => {
  let service: LeagueService;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
    userBadge: { findUnique: jest.fn(), create: jest.fn() },
    challenge: { findUnique: jest.fn(), findFirst: jest.fn() },
    submission: { findMany: jest.fn() },
    leagueSeason: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    leagueEntry: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
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
      id: 's1',
      entries: [{ id: 'e-1', points: 100 }],
    });
    // 0 à frente (1º de 4) → rank 1 → promoção.
    mockPrisma.leagueEntry.count.mockImplementation(({ where }: any) =>
      Promise.resolve(where.OR ? 0 : 4),
    );
    await expect(service.resolveTier('user-1')).resolves.toBe('gold');
  });

  it('último de liga pequena (4 entradas) NÃO é rebaixado', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ careerTier: 'junior' });
    mockPrisma.leagueSeason.findFirst.mockResolvedValue({
      id: 's1',
      entries: [{ id: 'e-1', points: 10 }],
    });
    // 3 à frente (4º de 4) → rank 4, mas total < 6 → sem rebaixamento.
    mockPrisma.leagueEntry.count.mockImplementation(({ where }: any) =>
      Promise.resolve(where.OR ? 3 : 4),
    );
    await expect(service.resolveTier('user-1')).resolves.toBe('silver');
  });

  it('último de liga com 6+ entradas é rebaixado (junior silver → bronze)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ careerTier: 'junior' });
    mockPrisma.leagueSeason.findFirst.mockResolvedValue({
      id: 's1',
      entries: [{ id: 'e-1', points: 10 }],
    });
    // 5 à frente (6º de 6) → rank 6 > 6-3 → rebaixamento.
    mockPrisma.leagueEntry.count.mockImplementation(({ where }: any) =>
      Promise.resolve(where.OR ? 5 : 6),
    );
    await expect(service.resolveTier('user-1')).resolves.toBe('bronze');
  });

  it('M3: resolveTier NÃO carrega a season inteira (2 counts + entrada do aluno)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ careerTier: 'junior' });
    mockPrisma.leagueSeason.findFirst.mockResolvedValue({
      id: 's1',
      entries: [{ id: 'e-1', points: 50 }],
    });
    mockPrisma.leagueEntry.count.mockImplementation(({ where }: any) =>
      Promise.resolve(where.OR ? 1 : 4),
    );
    await service.resolveTier('user-1');

    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
    expect(mockPrisma.leagueSeason.findFirst).toHaveBeenCalledTimes(1);
    // A season vem com `select` (só a entrada do aluno) — nunca `include`
    // com todas as entradas.
    const findFirstArg = mockPrisma.leagueSeason.findFirst.mock.calls[0][0];
    expect(findFirstArg.select).toBeDefined();
    expect(findFirstArg.include).toBeUndefined();
    // Posição por contagem (à frente + total), não por varredura da lista.
    expect(mockPrisma.leagueEntry.count).toHaveBeenCalledTimes(2);
    expect(mockPrisma.leagueEntry.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          seasonId: 's1',
          OR: [
            { points: { gt: 50 } },
            { points: 50, id: { lt: 'e-1' } },
          ],
        }),
      }),
    );
  });

  it('pontos: bônus de participação + melhor nota aprovada (reprovada não soma nota)', async () => {
    mockPrisma.challenge.findUnique.mockResolvedValue({
      activityId: 'act-1',
      startsAt: new Date('2026-10-20'),
      endsAt: new Date('2026-10-27'),
    });
    mockPrisma.submission.findMany.mockResolvedValue([
      { userId: 'user-1', status: 'failed', score: 50 },
      { userId: 'user-1', status: 'passed', score: 80 },
      { userId: 'user-1', status: 'passed', score: 60 },
    ]);
    await expect(service.computePoints('ch-1', 'user-1')).resolves.toBe(
      PARTICIPATION_BONUS + 80,
    );
    expect(mockPrisma.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          activityId: 'act-1',
          userId: { in: ['user-1'] },
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
    mockPrisma.submission.findMany.mockResolvedValue([
      { userId: 'user-1', status: 'failed', score: 40 },
    ]);
    await expect(service.computePoints('ch-1', 'user-1')).resolves.toBe(PARTICIPATION_BONUS);
  });

  it('M3: computePointsMany calcula vários alunos com UMA leitura', async () => {
    mockPrisma.challenge.findUnique.mockResolvedValue({
      activityId: 'act-1',
      startsAt: new Date('2026-10-20'),
      endsAt: new Date('2026-10-27'),
    });
    mockPrisma.submission.findMany.mockResolvedValue([
      { userId: 'u1', status: 'passed', score: 80 },
      { userId: 'u1', status: 'failed', score: 50 },
      { userId: 'u2', status: 'failed', score: 40 },
    ]);
    const points = await service.computePointsMany('ch-1', ['u1', 'u2', 'u3']);

    expect(mockPrisma.challenge.findUnique).toHaveBeenCalledTimes(1);
    expect(mockPrisma.submission.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { in: ['u1', 'u2', 'u3'] } }),
      }),
    );
    expect(points.get('u1')).toBe(PARTICIPATION_BONUS + 80);
    expect(points.get('u2')).toBe(PARTICIPATION_BONUS);
    expect(points.get('u3')).toBe(0);
  });

  it('M3: refreshEntriesForChallenge usa nº CONSTANTE de chamadas (não N+1)', async () => {
    const startsAt = new Date('2026-10-20');
    const endsAt = new Date('2026-10-27');
    mockPrisma.challenge.findUnique.mockResolvedValue({
      id: 'ch-1',
      activityId: 'act-1',
      startsAt,
      endsAt,
    });
    // 2 seasons, 3 entradas — o nº de chamadas NÃO pode crescer com elas.
    mockPrisma.leagueSeason.findMany.mockResolvedValue([
      { id: 's1', entries: [{ id: 'e-1', userId: 'u1' }, { id: 'e-2', userId: 'u2' }] },
      { id: 's2', entries: [{ id: 'e-3', userId: 'u3' }] },
    ]);
    mockPrisma.submission.findMany.mockResolvedValue([
      { userId: 'u1', status: 'passed', score: 80 },
      { userId: 'u1', status: 'failed', score: 50 },
      { userId: 'u2', status: 'failed', score: 40 },
    ]);
    mockPrisma.leagueEntry.updateMany.mockResolvedValue({ count: 1 });

    await service.refreshEntriesForChallenge('ch-1');

    expect(mockPrisma.challenge.findUnique).toHaveBeenCalledTimes(1);
    expect(mockPrisma.leagueSeason.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.submission.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { in: ['u1', 'u2', 'u3'] } }),
      }),
    );
    // Zero `update` por entrada: só `updateMany` agrupado por pontos,
    // dentro de UMA transação (u1=90, u2=10, u3=0 → 3 valores distintos).
    expect(mockPrisma.leagueEntry.update).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.leagueEntry.updateMany).toHaveBeenCalledTimes(3);
    expect(mockPrisma.leagueEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['e-1'] } }, data: { points: 90 } }),
    );
    expect(mockPrisma.leagueEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['e-2'] } }, data: { points: 10 } }),
    );
    expect(mockPrisma.leagueEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['e-3'] } }, data: { points: 0 } }),
    );
  });

  it('M3: refresh sem entradas não toca em submissões nem em updates', async () => {
    mockPrisma.challenge.findUnique.mockResolvedValue({
      id: 'ch-1',
      activityId: 'act-1',
      startsAt: new Date(),
      endsAt: new Date(),
    });
    mockPrisma.leagueSeason.findMany.mockResolvedValue([]);
    await service.refreshEntriesForChallenge('ch-1');
    expect(mockPrisma.submission.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('M3: myLeagues usa 2 leituras e calcula posição/participantes', async () => {
    mockPrisma.leagueEntry.findMany
      .mockResolvedValueOnce([
        {
          id: 'e-1',
          points: 80,
          season: { id: 's1', tier: 'silver', startsAt: new Date('2026-10-20'), endsAt: new Date('2026-10-27') },
        },
        {
          id: 'e-2',
          points: 40,
          season: { id: 's2', tier: 'bronze', startsAt: new Date('2026-10-01'), endsAt: new Date('2026-10-07') },
        },
      ])
      .mockResolvedValueOnce([
        { seasonId: 's1', userId: 'u9', points: 100, id: 'a-1' },
        { seasonId: 's1', userId: 'user-1', points: 80, id: 'a-2' },
        { seasonId: 's1', userId: 'u8', points: 80, id: 'a-3' },
        { seasonId: 's2', userId: 'user-1', points: 40, id: 'b-1' },
        { seasonId: 's2', userId: 'u7', points: 10, id: 'b-2' },
      ]);

    const leagues = await service.myLeagues('user-1');

    expect(mockPrisma.leagueEntry.findMany).toHaveBeenCalledTimes(2);
    expect(mockPrisma.leagueEntry.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ seasonId: { in: ['s1', 's2'] } }),
      }),
    );
    // s1: 100 à frente; empate 80 com u8, mas id a-2 < a-3 → 2º de 3.
    expect(leagues[0]).toMatchObject({ seasonId: 's1', points: 80, position: 2, participants: 3 });
    // s2: 1º de 2.
    expect(leagues[1]).toMatchObject({ seasonId: 's2', points: 40, position: 1, participants: 2 });
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
    mockPrisma.submission.findMany.mockResolvedValue([
      { userId: 'user-y', status: 'passed', score: 95 },
      { userId: 'user-x', status: 'passed', score: 40 },
    ]);
    mockPrisma.leagueEntry.updateMany.mockResolvedValue({ count: 1 });
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
    // O refresh recalculou ambas as entradas (X: 10+40=50, Y: 10+95=105),
    // em lote: 1 leitura de submissões, 1 transação, 2 updateMany.
    expect(mockPrisma.submission.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.leagueEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['e-x'] } }, data: { points: 50 } }),
    );
    expect(mockPrisma.leagueEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['e-y'] } }, data: { points: 105 } }),
    );
  });
});
