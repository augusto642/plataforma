import { Test, TestingModule } from '@nestjs/testing';
import { CommunityService } from '../community/community.service';
import { EntitlementsService } from '../plans/entitlements.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChallengesService } from './challenges.service';
import { LeagueService } from './league.service';

/**
 * Fase 3 premium — join opt-in:
 * - join registra o participante (idempotente via upsert);
 * - Pro entra na liga da sua tier (beginner→bronze); free participa
 *   do desafio SEM entrada na liga ("sem liga paga", matriz §1.1);
 * - criar desafio alimenta o fórum (tópico nasce junto);
 * - ranking do desafio ordena por pontos (bônus + melhor nota).
 */
describe('ChallengesService', () => {
  let service: ChallengesService;

  const mockPrisma = {
    activity: { findUnique: jest.fn() },
    challenge: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    challengeParticipant: { upsert: jest.fn(), deleteMany: jest.fn(), count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    leagueEntry: { upsert: jest.fn(), deleteMany: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const mockLeague = {
    resolveTier: jest.fn(),
    getOrCreateSeason: jest.fn(),
    computePoints: jest.fn(),
    computePointsMany: jest.fn(),
    refreshEntriesForChallenge: jest.fn(),
    myLeagues: jest.fn(),
    seasonStandings: jest.fn(),
  };
  const mockCommunity = { createChallengeThread: jest.fn() };
  const mockEntitlements = { getUserPlan: jest.fn() };

  const challenge = {
    id: '11111111-1111-4111-8111-111111111111',
    activityId: 'act-1',
    title: 'Soma de dois números',
    startsAt: new Date('2026-10-20'),
    endsAt: new Date('2026-10-27'),
    optIn: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'student' });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LeagueService, useValue: mockLeague },
        { provide: CommunityService, useValue: mockCommunity },
        { provide: EntitlementsService, useValue: mockEntitlements },
      ],
    }).compile();
    service = module.get<ChallengesService>(ChallengesService);
  });

  it('criar desafio alimenta o fórum (tópico nasce junto)', async () => {
    mockPrisma.activity.findUnique.mockResolvedValue({ id: 'act-1', title: 'Atividade' });
    mockPrisma.challenge.create.mockResolvedValue(challenge);
    mockCommunity.createChallengeThread.mockResolvedValue({ id: 'th-1' });

    const created = await service.createChallenge('admin-1', {
      activityId: 'act-1',
      title: 'Soma de dois números',
      startsAt: new Date('2026-10-20'),
      endsAt: new Date('2026-10-27'),
    });

    expect(created.forumThreadId).toBe('th-1');
    expect(mockCommunity.createChallengeThread).toHaveBeenCalledWith(
      'admin-1',
      expect.objectContaining({ id: '11111111-1111-4111-8111-111111111111', activityId: 'act-1' }),
    );
  });

  it('Pro iniciante entra na liga bronze; free participa sem liga', async () => {
    mockPrisma.challenge.findUnique.mockResolvedValue(challenge);
    mockPrisma.challengeParticipant.upsert.mockResolvedValue({ id: 'p1' });
    mockLeague.resolveTier.mockResolvedValue('bronze');
    mockLeague.getOrCreateSeason.mockResolvedValue({ id: 's1' });
    mockPrisma.leagueEntry.upsert.mockResolvedValue({ id: 'e1' });

    mockEntitlements.getUserPlan.mockResolvedValue('pro');
    const pro = await service.join('user-pro', '11111111-1111-4111-8111-111111111111');
    expect(pro.leagueEntry).toEqual({ id: 'e1' });
    expect(mockLeague.resolveTier).toHaveBeenCalledWith('user-pro');
    expect(mockLeague.getOrCreateSeason).toHaveBeenCalledWith(
      'bronze',
      challenge.startsAt,
      challenge.endsAt,
    );

    jest.clearAllMocks();
    mockPrisma.challenge.findUnique.mockResolvedValue(challenge);
    mockPrisma.challengeParticipant.upsert.mockResolvedValue({ id: 'p2' });
    mockEntitlements.getUserPlan.mockResolvedValue('free');
    const free = await service.join('user-free', '11111111-1111-4111-8111-111111111111');
    expect(free.participant).toEqual({ id: 'p2' });
    expect(free.leagueEntry).toBeNull();
    expect(mockPrisma.leagueEntry.upsert).not.toHaveBeenCalled();
  });

  it('join repetido é idempotente (upsert, sem duplicar participante)', async () => {
    mockPrisma.challenge.findUnique.mockResolvedValue(challenge);
    mockPrisma.challengeParticipant.upsert.mockResolvedValue({ id: 'p1' });
    mockEntitlements.getUserPlan.mockResolvedValue('free');
    await service.join('user-1', '11111111-1111-4111-8111-111111111111');
    await service.join('user-1', '11111111-1111-4111-8111-111111111111');
    expect(mockPrisma.challengeParticipant.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.challengeParticipant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { challengeId_userId: { challengeId: '11111111-1111-4111-8111-111111111111', userId: 'user-1' } },
      }),
    );
  });

  it('ranking do desafio ordena por pontos desc', async () => {
    mockPrisma.challenge.findUnique.mockResolvedValue(challenge);
    mockPrisma.challengeParticipant.findMany.mockResolvedValue([
      { user: { id: 'u1', name: 'Ana', nickname: null, xp: 0, level: 1 }, joinedAt: new Date('2026-10-20') },
      { user: { id: 'u2', name: 'Beto', nickname: null, xp: 0, level: 1 }, joinedAt: new Date('2026-10-21') },
    ]);
    mockLeague.computePointsMany.mockResolvedValue(
      new Map([
        ['u1', 30],
        ['u2', 90],
      ]),
    );
    const board = await service.leaderboard('11111111-1111-4111-8111-111111111111');
    expect(board.ranking[0]).toMatchObject({ userId: 'u2', position: 1, points: 90 });
    expect(board.ranking[1]).toMatchObject({ userId: 'u1', position: 2, points: 30 });
  });

  it('M3: ranking calcula os pontos em lote (1 chamada, não 1 por participante)', async () => {
    mockPrisma.challenge.findUnique.mockResolvedValue(challenge);
    mockPrisma.challengeParticipant.findMany.mockResolvedValue([
      { user: { id: 'u1', name: 'Ana', nickname: null, xp: 0, level: 1 }, joinedAt: new Date('2026-10-20') },
      { user: { id: 'u2', name: 'Beto', nickname: null, xp: 0, level: 1 }, joinedAt: new Date('2026-10-21') },
    ]);
    mockLeague.computePointsMany.mockResolvedValue(
      new Map([
        ['u1', 30],
        ['u2', 90],
      ]),
    );
    await service.leaderboard('11111111-1111-4111-8111-111111111111');
    expect(mockLeague.computePointsMany).toHaveBeenCalledTimes(1);
    expect(mockLeague.computePointsMany).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111', ['u1', 'u2']);
    expect(mockLeague.computePoints).not.toHaveBeenCalled();
  });

  // Central 216 (auditoria do Designer) — sem desafio ativo, getCurrent
  // devolve null (o controller envolve em { challenge } para o Nest
  // não responder 200 com corpo vazio); com desafio ativo, devolve-o.
  it('getCurrent devolve null sem desafio ativo ou futuro', async () => {
    mockPrisma.challenge.findFirst.mockResolvedValue(null);
    await expect(service.getCurrent('user-1')).resolves.toBeNull();
    expect(mockPrisma.challenge.findFirst).toHaveBeenCalledTimes(2);
  });

  it('getCurrent prefere o desafio ativo ao futuro', async () => {
    mockPrisma.challenge.findFirst.mockResolvedValueOnce(challenge);
    mockPrisma.challengeParticipant.count.mockResolvedValue(3);
    mockPrisma.challengeParticipant.findUnique.mockResolvedValue(null);
    const current = await service.getCurrent('user-1');
    expect(current?.id).toBe('11111111-1111-4111-8111-111111111111');
    expect(current?.participantCount).toBe(3);
    expect(mockPrisma.challenge.findFirst).toHaveBeenCalledTimes(1);
  });

  // Central 216 (auditoria do Designer, item 2) — id não-UUID (ex.:
  // GET /challenges/weekly caindo na rota :id) é 404, nunca P2007.
  it.each(['weekly', 'current', 'abc', ''])(
    'id malformado %p → NotFoundException sem tocar no Prisma',
    async (badId) => {
      await expect(service.getById(badId)).rejects.toThrow('Desafio não encontrado');
      await expect(service.join('user-1', badId)).rejects.toThrow('Desafio não encontrado');
      await expect(service.leave('user-1', badId)).rejects.toThrow('Desafio não encontrado');
      await expect(service.leaderboard(badId)).rejects.toThrow('Desafio não encontrado');
      expect(mockPrisma.challenge.findUnique).not.toHaveBeenCalled();
    },
  );

  it('seasonStandings com id malformado → 404 sem tocar na liga', async () => {
    await expect(service.seasonStandings('weekly')).rejects.toThrow('Temporada não encontrada');
    expect(mockLeague.seasonStandings).not.toHaveBeenCalled();
  });
});
