import { Role } from '@prisma/client';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;
  let service: jest.Mocked<Partial<AdminService>>;

  beforeEach(() => {
    service = {
      getMetrics: jest.fn().mockResolvedValue({
        timestamp: new Date().toISOString(),
        system: {} as any,
        platform: {} as any,
        cache: {} as any,
      }),
      getUsers: jest.fn().mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      }),
      updateUserRole: jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'test@nexus.code',
        name: 'Test',
        role: Role.admin,
        xp: 0,
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      createInstructor: jest.fn().mockResolvedValue({
        id: 'u2',
        email: 'prof@nexus.code',
        name: 'Prof Test',
        role: Role.instructor,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      getHealth: jest.fn().mockResolvedValue({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 100,
        services: { database: 'up', redis: 'up' },
      }),
    };

    controller = new AdminController(service as AdminService);
  });

  it('delegates getMetrics to service', async () => {
    await controller.getMetrics();
    expect(service.getMetrics).toHaveBeenCalled();
  });

  it('delegates getUsers to service with parsed params', async () => {
    await controller.getUsers(Role.instructor, 'test', '2', '20');
    expect(service.getUsers).toHaveBeenCalledWith({
      role: Role.instructor,
      search: 'test',
      page: 2,
      limit: 20,
    });
  });

  it('delegates updateUserRole to service', async () => {
    await controller.updateUserRole('u1', { role: Role.admin });
    expect(service.updateUserRole).toHaveBeenCalledWith('u1', Role.admin);
  });

  it('delegates createInstructor to service', async () => {
    const dto = { email: 'prof@nexus.code', name: 'Prof Test' };
    await controller.createInstructor(dto);
    expect(service.createInstructor).toHaveBeenCalledWith(dto);
  });

  it('delegates getHealth to service', async () => {
    await controller.getHealth();
    expect(service.getHealth).toHaveBeenCalled();
  });
});
