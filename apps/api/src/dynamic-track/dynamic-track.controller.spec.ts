import { DynamicTrackController } from './dynamic-track.controller';

function buildController() {
  const service = {
    getMyInvestigation: jest.fn(),
    startForUser: jest.fn(),
    refreshForUser: jest.fn(),
    markSeen: jest.fn(),
    listInvestigationsAdmin: jest.fn(),
    reenqueueAdmin: jest.fn(),
  };
  return {
    controller: new DynamicTrackController(service as never),
    service,
  };
}

const user = { sub: 'user-1', email: 'a@b.c', role: 'student' } as never;

describe('DynamicTrackController', () => {
  it('GET /me devolve a investigação do aluno logado', async () => {
    const { controller, service } = buildController();
    service.getMyInvestigation.mockResolvedValue({ status: 'investigating' });
    const out = await controller.getMine(user);
    expect(out).toEqual({ investigation: { status: 'investigating' } });
    expect(service.getMyInvestigation).toHaveBeenCalledWith('user-1');
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
