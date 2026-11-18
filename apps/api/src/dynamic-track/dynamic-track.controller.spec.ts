import { DynamicTrackController } from './dynamic-track.controller';

function buildController() {
  const service = {
    getMyInvestigation: jest.fn(),
    getImmediateMiniTrack: jest.fn(),
    startForUser: jest.fn(),
    refreshForUser: jest.fn(),
    markSeen: jest.fn(),
    listInvestigationsAdmin: jest.fn(),
    reenqueueAdmin: jest.fn(),
  };
  return {
    controller: new DynamicTrackController(service as never, {} as never),
    service,
  };
}

const user = { sub: 'user-1', email: 'a@b.c', role: 'student' } as never;

describe('DynamicTrackController', () => {
  it('scopes goals and private evidence to the authenticated user', async () => {
    const evidence = { goals: jest.fn(), portfolio: jest.fn() };
    const controller = new DynamicTrackController({} as never, evidence as never);
    controller.getSkillGoals(user);
    controller.getEvidence(user);
    expect(evidence.goals).toHaveBeenCalledWith('user-1');
    expect(evidence.portfolio).toHaveBeenCalledWith('user-1');
  });

  it('GET /me devolve a investigação do aluno logado', async () => {
    const { controller, service } = buildController();
    service.getMyInvestigation.mockResolvedValue({ status: 'investigating' });
    const out = await controller.getMine(user);
    expect(out).toEqual({ investigation: { status: 'investigating' } });
    expect(service.getMyInvestigation).toHaveBeenCalledWith('user-1');
  });

  it('GET /me/mini-track delegates to the authenticated user', async () => {
    const { controller, service } = buildController();
    const miniTrack = { available: true, track: 'frontend', activities: [] };
    service.getImmediateMiniTrack.mockResolvedValue(miniTrack);

    await expect(controller.getMiniTrack(user)).resolves.toEqual(miniTrack);
    expect(service.getImmediateMiniTrack).toHaveBeenCalledWith('user-1');
  });

  it('POST /me/start delega ao service com o sub do token', async () => {
    const { controller, service } = buildController();
    service.startForUser.mockResolvedValue({
      view: { status: 'investigating' },
      created: true,
    });
    const out = await controller.startMine(user);
    expect(out).toEqual({
      investigation: { status: 'investigating' },
      created: true,
    });
  });

  it('POST /me/seen delega ao service', async () => {
    const { controller, service } = buildController();
    service.markSeen.mockResolvedValue({ status: 'ready' });
    const out = await controller.markSeen(user);
    expect(out).toEqual({ investigation: { status: 'ready' } });
  });

  it('POST /me/refresh delega ao service com objetivos e tecnologia', async () => {
    const { controller, service } = buildController();
    service.refreshForUser.mockResolvedValue({ status: 'ready', suggestedTrack: 'ai' });
    const out = await controller.refreshMine(user, {
      careerGoals: ['ai', 'data_science'],
      primaryTechnology: 'python',
    });
    expect(service.refreshForUser).toHaveBeenCalledWith('user-1', {
      careerGoals: ['ai', 'data_science'],
      primaryTechnology: 'python',
    });
    expect(out).toEqual({
      investigation: { status: 'ready', suggestedTrack: 'ai' },
    });
  });

  it('GET /me/immersion reports real status without fabricated progress or market data', async () => {
    const { controller, service } = buildController();
    service.getMyInvestigation.mockResolvedValue({
      status: 'investigating',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000 - 60_000),
      careerGoals: ['fullstack'],
    });

    const result = await controller.getImmersionModule(user);

    expect(result.investigationStatus).toBe('investigating');
    expect(result.hoursElapsed).toBe(3);
    expect(result.marketDataAvailable).toBe(false);
    expect(result.marketXRay).toBeNull();
    expect(result).not.toHaveProperty('progressPercentage');
    expect(result).not.toHaveProperty('workersActive');
    expect(result.miningStage).toContain('não há telemetria');
  });

  it('GET /me/immersion does not invent an age when the investigation has no timestamp', async () => {
    const { controller, service } = buildController();
    service.getMyInvestigation.mockResolvedValue({ status: 'investigating' });

    const result = await controller.getImmersionModule(user);

    expect(result.hoursElapsed).toBeNull();
    expect(result.investigationStatus).toBe('investigating');
  });

  it('GET /admin/investigations lista para o admin', async () => {
    const { controller, service } = buildController();
    service.listInvestigationsAdmin.mockResolvedValue([{ id: 'inv-1' }]);
    const out = await controller.listAdmin();
    expect(out).toEqual({ investigations: [{ id: 'inv-1' }] });
  });

  it('POST /admin/investigations/:id/reenqueue delega ao service', async () => {
    const { controller, service } = buildController();
    service.reenqueueAdmin.mockResolvedValue({
      investigation: { id: 'inv-1' },
      queued: true,
      deduped: false,
    });
    const out = await controller.reenqueueAdmin('inv-1');
    expect(out).toEqual({
      investigation: { id: 'inv-1' },
      queued: true,
      deduped: false,
    });
    expect(service.reenqueueAdmin).toHaveBeenCalledWith('inv-1');
  });
});
