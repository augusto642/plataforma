import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LlmClient } from './llm-client';
import { CreateAiSpecializedRoomDto } from './dto/create-ai-specialized-room.dto';
import { UpdateAiSpecializedRoomDto } from './dto/update-ai-specialized-room.dto';

@Injectable()
export class AiSpecializedRoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClient,
  ) {}

  getModelConfiguration() {
    return this.llm.modelConfiguration();
  }

  async listActivityOptions() {
    return this.prisma.activity.findMany({
      orderBy: [{ course: { title: 'asc' } }, { order: 'asc' }],
      select: {
        id: true,
        title: true,
        course: { select: { id: true, title: true } },
      },
    });
  }

  async listAdminRooms() {
    const rooms = await this.prisma.aiSpecializedRoom.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        activity: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, title: true } },
          },
        },
      },
    });
    const allowedModels = new Set(this.llm.allowedModels);
    return rooms.map(({ systemInstructions, ...room }) => ({
      ...room,
      systemInstructions,
      modelAllowed: allowedModels.has(room.model),
    }));
  }

  async listPublishedForActivity(activityId: string) {
    return this.prisma.aiSpecializedRoom.findMany({
      where: {
        activityId,
        isPublished: true,
        model: { in: this.llm.allowedModels },
      },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        model: true,
      },
    });
  }

  async create(dto: CreateAiSpecializedRoomDto, adminId: string) {
    this.assertAllowedModel(dto.model);
    const activityExists = await this.prisma.activity.findUnique({
      where: { id: dto.activityId },
      select: { id: true },
    });
    if (!activityExists) throw new NotFoundException('Atividade não encontrada');

    try {
      return await this.prisma.$transaction(async (tx) => {
        const room = await tx.aiSpecializedRoom.create({
          data: {
            ...dto,
            isPublished: dto.isPublished ?? false,
          },
        });

        await tx.adminAuditEvent.create({
          data: {
            adminId,
            action: 'ai_room.created',
            targetType: 'ai_room',
            targetId: room.id,
            changedFields: ['created', ...Object.keys(dto)],
          },
        });

        return room;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Slug já utilizado nesta atividade');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateAiSpecializedRoomDto, adminId: string) {
    const room = await this.prisma.aiSpecializedRoom.findUnique({
      where: { id },
      select: { id: true, model: true },
    });
    if (!room) throw new NotFoundException('Sala especializada não encontrada');
    const model = dto.model ?? room.model;
    if (dto.model && dto.model !== room.model) this.assertAllowedModel(dto.model);
    if (dto.isPublished && !this.llm.allowedModels.includes(model)) {
      throw new BadRequestException(
        'Libere o modelo na allowlist do servidor antes de publicar esta sala',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updatedRoom = await tx.aiSpecializedRoom.update({
          where: { id },
          data: dto,
        });

        await tx.adminAuditEvent.create({
          data: {
            adminId,
            action: 'ai_room.updated',
            targetType: 'ai_room',
            targetId: id,
            changedFields: Object.entries(dto)
              .filter(([, value]) => value !== undefined)
              .map(([key]) => key),
          },
        });

        return updatedRoom;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Slug já utilizado nesta atividade');
      }
      throw error;
    }
  }

  private assertAllowedModel(model: string): void {
    if (!this.llm.allowedModels.includes(model)) {
      throw new BadRequestException(
        'O modelo solicitado não está liberado na allowlist do servidor',
      );
    }
  }
}
