import { TowerController } from './tower.controller';

describe('TowerController', () => {
  const user = { sub: 'user-1' } as never;
  const tower = {
    getProgress: jest.fn(),
    roll: jest.fn(),
    submit: jest.fn(),
  };
  const controller = new TowerController(tower as never);

  beforeEach(() => jest.clearAllMocks());

  it('GET /tower/progress delega ao service com o id do usuário', async () => {
    tower.getProgress.mockResolvedValue({ floor: 1 });
    await expect(controller.getProgress(user)).resolves.toEqual({ floor: 1 });
    expect(tower.getProgress).toHaveBeenCalledWith('user-1');
  });

  it('POST /tower/roll delega ao service com o id do usuário', async () => {
    tower.roll.mockResolvedValue({ roll: 4 });
    await expect(controller.roll(user)).resolves.toEqual({ roll: 4 });
    expect(tower.roll).toHaveBeenCalledWith('user-1');
  });

  it('POST /tower/submit delega ao service com o id do usuário e o código', async () => {
    tower.submit.mockResolvedValue({ result: 'passed' });
    await expect(controller.submit(user, { code: 'function soma(a, b) { return a + b; }' })).resolves.toEqual({
      result: 'passed',
    });
    expect(tower.submit).toHaveBeenCalledWith('user-1', 'function soma(a, b) { return a + b; }');
  });
});
