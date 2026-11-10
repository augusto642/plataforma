import { Test, TestingModule } from '@nestjs/testing';
import { EntitlementsService } from '../plans/entitlements.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  ChallengesController,
  LeaguesController,
} from './challenges.controller';
import { ChallengesService } from './challenges.service';

/**
 * A10 (Lote 3 · portões do merge) — ChallengesController e
 * LeaguesController estavam em 0%. Delegação fina ao
 * ChallengesService (os gates 'challenges-full' das ligas são do
 * FeatureGuard, coberto no seu próprio spec): a criação converte as
 * datas do DTO para Date antes de delegar.
 */
describe('ChallengesController', () => {
  let controller: ChallengesController;
  const mockService = {
    createChallenge: jest.fn(),
    getCurrent: jest.fn(),
    getById: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    leaderboard: jest.fn(),
    myLeagues: jest.fn(),
    seasonStandings: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChallengesController, LeaguesController],
      providers: [
        {
          provide: EntitlementsService,
          useValue: { assertFeature: jest.fn(), assertAiTutorAccess: jest.fn() },
        },
        { provide: ChallengesService, useValue: mockService }],
    }).compile();
    controller = module.get<ChallengesController>(ChallengesController);
  });

  const user = { sub: 'user-1', role: 'admin' } as JwtPayload;

  it('createChallenge converte startsAt/endsAt para Date e repassa tudo', async () => {
    mockService.createChallenge.mockResolvedValue({ id: 'ch-1' });
    const result = await controller.createChallenge(user, {
      activityId: 'act-1',
      title: 'Desafio da semana',
      startsAt: '2026-11-09T00:00:00.000Z',
      endsAt: '2026-11-16T00:00:00.000Z',
      optIn: true,
    } as never);

    expect(mockService.createChallenge).toHaveBeenCalledWith('user-1', {
      activityId: 'act-1',
      title: 'Desafio da semana',
      startsAt: new Date('2026-11-09T00:00:00.000Z'),
      endsAt: new Date('2026-11-16T00:00:00.000Z'),
      optIn: true,
    });
    expect(result).toEqual({ id: 'ch-1' });
  });

  it('getCurrent usa o userId do JWT', async () => {
    mockService.getCurrent.mockResolvedValue({ id: 'ch-1' });
    await expect(controller.getCurrent(user)).resolves.toEqual({ id: 'ch-1' });
    expect(mockService.getCurrent).toHaveBeenCalledWith('user-1');
  });

  it('getById repassa id e userId (ordem: id, user)', async () => {
    mockService.getById.mockResolvedValue({ id: 'ch-1' });
    await expect(controller.getById(user, 'ch-1')).resolves.toEqual({
      id: 'ch-1',
    });
    expect(mockService.getById).toHaveBeenCalledWith('ch-1', 'user-1');
  });

  it('join e leave repassam userId e id', async () => {
    mockService.join.mockResolvedValue({ joined: true });
    mockService.leave.mockResolvedValue({ left: true });
    await expect(controller.join(user, 'ch-1')).resolves.toEqual({
      joined: true,
    });
    await expect(controller.leave(user, 'ch-1')).resolves.toEqual({
      left: true,
    });
    expect(mockService.join).toHaveBeenCalledWith('user-1', 'ch-1');
    expect(mockService.leave).toHaveBeenCalledWith('user-1', 'ch-1');
  });

  it('leaderboard repassa só o id (rota sem usuário)', async () => {
    mockService.leaderboard.mockResolvedValue([{ userId: 'user-1' }]);
    await expect(controller.leaderboard('ch-1')).resolves.toEqual([
      { userId: 'user-1' },
    ]);
    expect(mockService.leaderboard).toHaveBeenCalledWith('ch-1');
  });
});

describe('LeaguesController', () => {
  let controller: LeaguesController;
  const mockService = {
    createChallenge: jest.fn(),
    getCurrent: jest.fn(),
    getById: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    leaderboard: jest.fn(),
    myLeagues: jest.fn(),
    seasonStandings: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChallengesController, LeaguesController],
      providers: [
        {
          provide: EntitlementsService,
          useValue: { assertFeature: jest.fn(), assertAiTutorAccess: jest.fn() },
        },
        { provide: ChallengesService, useValue: mockService },
      ],
    }).compile();
    controller = module.get<LeaguesController>(LeaguesController);
  });

  const user = { sub: 'user-1', role: 'student' } as JwtPayload;

  it('myLeagues usa o userId do JWT', async () => {
    mockService.myLeagues.mockResolvedValue([{ league: 'ouro' }]);
    await expect(controller.myLeagues(user)).resolves.toEqual([
      { league: 'ouro' },
    ]);
    expect(mockService.myLeagues).toHaveBeenCalledWith('user-1');
  });

  it('seasonStandings repassa o id da temporada', async () => {
    mockService.seasonStandings.mockResolvedValue([{ userId: 'user-1' }]);
    await expect(controller.seasonStandings('season-1')).resolves.toEqual([
      { userId: 'user-1' },
    ]);
    expect(mockService.seasonStandings).toHaveBeenCalledWith('season-1');
  });
});
