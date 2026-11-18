import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AiSpecializedRoomsService } from './ai-specialized-rooms.service';

describe('AiSpecializedRoomsService', () => {
  const prisma: any = {
    activity: { findUnique: jest.fn() },
    adminAuditEvent: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    $transaction: jest.fn(),
    aiSpecializedRoom: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  prisma.$transaction.mockImplementation((callback: (tx: any) => unknown) => callback(prisma));
  const llm = {
    allowedModels: ['approved-model'],
    modelConfiguration: jest.fn().mockReturnValue({
      provider: 'openai-compatible',
      activeModel: 'default-model',
      enabled: true,
      allowedModels: ['approved-model'],
    }),
  };
  let service: AiSpecializedRoomsService;

  beforeEach(() => {
    jest.clearAllMocks();
    llm.allowedModels = ['approved-model'];
    prisma.activity.findUnique.mockResolvedValue({ id: 'activity-1' });
    prisma.aiSpecializedRoom.create.mockResolvedValue({ id: 'room-1' });
    service = new AiSpecializedRoomsService(prisma as any, llm as any);
  });

  it('exposes only the server model configuration and allowlist', () => {
    expect(service.getModelConfiguration()).toEqual({
      provider: 'openai-compatible',
      activeModel: 'default-model',
      enabled: true,
      allowedModels: ['approved-model'],
    });
  });

  it('creates a draft linked to a real activity and rejects models outside the allowlist', async () => {
    const dto = {
      activityId: 'activity-1',
      title: 'Depuração',
      slug: 'depuracao',
      description: 'Investigue falhas de teste.',
      systemInstructions: 'Faça perguntas sobre os casos de borda.',
      model: 'approved-model',
    };

    await service.create(dto, 'admin-1');
    expect(prisma.aiSpecializedRoom.create).toHaveBeenCalledWith({
      data: { ...dto, isPublished: false },
    });
    expect(prisma.adminAuditEvent.create).toHaveBeenCalledWith({
      data: {
        adminId: 'admin-1',
        action: 'ai_room.created',
        targetType: 'ai_room',
        targetId: 'room-1',
        changedFields: ['created', ...Object.keys(dto)],
      },
    });

    await expect(service.create({ ...dto, model: 'unapproved-model' }, 'admin-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.aiSpecializedRoom.create).toHaveBeenCalledTimes(1);
  });

  it('requires an existing activity before creating a room', async () => {
    prisma.activity.findUnique.mockResolvedValue(null);
    await expect(
      service.create({
        activityId: 'missing',
        title: 'Depuração',
        slug: 'depuracao',
        description: 'Investigue falhas de teste.',
        systemInstructions: 'Faça perguntas sobre os casos de borda.',
        model: 'approved-model',
      }, 'admin-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.aiSpecializedRoom.create).not.toHaveBeenCalled();
  });

  it('retorna para estudantes apenas salas publicadas e sem instruções internas', async () => {
    prisma.aiSpecializedRoom.findMany.mockResolvedValue([
      { id: 'room-1', title: 'Depuração', description: 'Analise os testes.', model: 'approved-model' },
    ]);

    await service.listPublishedForActivity('activity-1');

    expect(prisma.aiSpecializedRoom.findMany).toHaveBeenCalledWith({
      where: {
        activityId: 'activity-1',
        isPublished: true,
        model: { in: ['approved-model'] },
      },
      orderBy: { title: 'asc' },
      select: { id: true, title: true, description: true, model: true },
    });
  });

  it('permite despublicar sala cujo modelo foi removido da allowlist, mas não republicá-la', async () => {
    prisma.aiSpecializedRoom.findUnique.mockResolvedValue({
      id: 'room-1',
      model: 'retired-model',
    });
    llm.allowedModels = ['approved-model'];

    await service.update('room-1', { isPublished: false, model: 'retired-model' }, 'admin-1');
    expect(prisma.aiSpecializedRoom.update).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      data: { isPublished: false, model: 'retired-model' },
    });
    expect(prisma.adminAuditEvent.create).toHaveBeenCalledWith({
      data: {
        adminId: 'admin-1',
        action: 'ai_room.updated',
        targetType: 'ai_room',
        targetId: 'room-1',
        changedFields: ['isPublished', 'model'],
      },
    });

    await expect(
      service.update('room-1', { isPublished: true, model: 'retired-model' }, 'admin-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
