import { Plan, Role } from '@prisma/client';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { KmsService } from '../knowledge/kms.service';

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
      updateUserPlan: jest.fn().mockResolvedValue({ id: 'u1', plan: Plan.pro }),
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
      controlAiQueue: jest.fn().mockResolvedValue({ id: 'audit-1', status: 'succeeded' }),
      listAiOperatorAudit: jest.fn().mockResolvedValue([]),
      listAdminAudit: jest.fn().mockResolvedValue([]),
    };

    controller = new AdminController(service as AdminService);
  });

  it('delegates getMetrics to service', async () => {
    await controller.getMetrics();
    expect(service.getMetrics).toHaveBeenCalled();
  });

  it('passes the authenticated administrator to queue controls', async () => {
    const dto = { queue: 'ai-reviews', action: 'pause', reason: 'Pausing during provider incident' } as const;
    await controller.controlAiQueue(dto, { sub: 'admin-1' } as any);
    expect(service.controlAiQueue).toHaveBeenCalledWith(dto, 'admin-1');
  });

  it('delegates operator audit listing', async () => {
    await controller.listAiOperatorAudit();
    expect(service.listAiOperatorAudit).toHaveBeenCalled();
  });

  it('passes the authenticated administrator to role and plan updates', async () => {
    await controller.updateUserRole('u1', { role: Role.instructor }, { sub: 'admin-1' } as any);
    expect(service.updateUserRole).toHaveBeenCalledWith('u1', Role.instructor, 'admin-1');

    await controller.updateUserPlan('u1', { plan: Plan.pro }, { sub: 'admin-1' } as any);
    expect(service.updateUserPlan).toHaveBeenCalledWith('u1', Plan.pro, 'admin-1');
  });

  it('delegates general administrative audit listing', async () => {
    await controller.listAdminAudit();
    expect(service.listAdminAudit).toHaveBeenCalled();
  });

  it('passes the authenticated administrator to specialized room mutations', async () => {
    const aiRooms = {
      create: jest.fn().mockResolvedValue({ id: 'room-1' }),
      update: jest.fn().mockResolvedValue({ id: 'room-1' }),
    };
    const roomsController = new AdminController(
      service as AdminService,
      undefined,
      undefined,
      undefined,
      undefined,
      aiRooms as any,
    );
    const roomDto = {
      activityId: 'activity-1',
      title: 'Depuração',
      slug: 'depuracao',
      description: 'Investigue falhas de teste.',
      systemInstructions: 'Faça perguntas.',
      model: 'approved-model',
    };

    await roomsController.createAiRoom(roomDto, { sub: 'admin-1' } as any);
    await roomsController.updateAiRoom('room-1', { isPublished: true }, { sub: 'admin-1' } as any);

    expect(aiRooms.create).toHaveBeenCalledWith(roomDto, 'admin-1');
    expect(aiRooms.update).toHaveBeenCalledWith('room-1', { isPublished: true }, 'admin-1');
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
    await controller.updateUserRole('u1', { role: Role.admin }, { sub: 'admin-1' } as any);
    expect(service.updateUserRole).toHaveBeenCalledWith('u1', Role.admin, 'admin-1');
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

  describe('KMS routes (G6)', () => {
    it('approve usa o admin autenticado como approvedBy; resolve registra pending-sync', async () => {
      const kms = {
        listEntries: jest.fn().mockReturnValue([]),
        approveVersion: jest.fn().mockResolvedValue({ slug: 'funcoes', version: 2, approvedBy: 'admin-1', approvedAt: '2026-10-24T00:00:00.000Z', previousActive: 1, sync: 'pending-sync' }),
        resolveReviewItem: jest.fn().mockReturnValue({ id: 'review-1', status: 'resolved', sync: 'pending-sync' }),
      };
      const kmsController = new AdminController(service as AdminService, undefined, undefined, kms as unknown as KmsService);
      const approved = await kmsController.approveKmsVersion('funcoes', '2', { user: { sub: 'admin-1' } } as any);
      expect(kms.approveVersion).toHaveBeenCalledWith('funcoes', 2, 'admin-1');
      expect(approved.approvedBy).toBe('admin-1');
      expect(approved.sync).toBe('pending-sync');
      expect(kmsController.listKmsEntries()).toEqual([]);
      const resolved = await kmsController.resolveKmsReviewItem('review-1', { action: 'dismiss', reason: 'duplicata' }, { user: { sub: 'admin-1' } } as any);
      expect(kms.resolveReviewItem).toHaveBeenCalledWith('review-1', { action: 'dismiss', reason: 'duplicata' }, 'admin-1');
      expect(resolved.sync).toBe('pending-sync');
    });

    it('approve sem admin autenticado falha (nunca aprova anônimo)', async () => {
      const kms = { approveVersion: jest.fn() };
      const kmsController = new AdminController(service as AdminService, undefined, undefined, kms as unknown as KmsService);
      await expect(async () => kmsController.approveKmsVersion('funcoes', '2', {} as any)).rejects.toThrow('approve exige admin autenticado');
      expect(kms.approveVersion).not.toHaveBeenCalled();
    });
  });
});
