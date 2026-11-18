import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PlaygroundProjectsService } from './playground-projects.service';

describe('PlaygroundProjectsService', () => {
  const projects = {
    count: jest.fn(), create: jest.fn(), findFirst: jest.fn(),
    findMany: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn(),
  };
  const tx = { playgroundProject: projects, $queryRaw: jest.fn() };
  const prisma = {
    playgroundProject: projects,
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const service = new PlaygroundProjectsService(prisma as never);
  const dto = { title: 'Teste', language: 'python' as const, files: [{ name: 'main.py', content: 'print(1)' }] };

  beforeEach(() => {
    jest.clearAllMocks();
    projects.count.mockResolvedValue(0);
  });

  it('creates only within a per-user quota under a transaction lock', async () => {
    projects.create.mockResolvedValue({ id: 'project' });
    await service.create('user', dto);
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(projects.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'user' }),
    }));
    projects.count.mockResolvedValue(20);
    await expect(service.create('user', dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(projects.create).toHaveBeenCalledTimes(1);
  });

  it('does not disclose or modify other users projects and rejects stale versions', async () => {
    projects.updateMany.mockResolvedValue({ count: 0 });
    projects.findFirst.mockResolvedValue(null);
    await expect(service.update('user', 'other-project', { ...dto, revision: 1 }))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(projects.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user', id: 'other-project', revision: 1 },
    }));
    projects.findFirst.mockResolvedValue({ id: 'own-project' });
    await expect(service.update('user', 'own-project', { ...dto, revision: 1 }))
      .rejects.toBeInstanceOf(ConflictException);
    projects.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.remove('user', 'own-project', 1)).rejects.toBeInstanceOf(ConflictException);
  });
});
