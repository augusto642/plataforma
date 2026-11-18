import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveActivityDraftDto } from './dto/save-activity-draft.dto';

export async function saveVersionedDraft(
  dto: SaveActivityDraftDto,
  create: () => Promise<{ code: string; revision: number }>,
  update: () => Promise<{ count: number }>,
) {
  if (dto.revision === 0) {
    try {
      return await create();
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('O rascunho foi alterado em outro dispositivo.');
      }
      throw error;
    }
  }
  if ((await update()).count !== 1) {
    throw new ConflictException('O rascunho foi alterado em outro dispositivo.');
  }
  return { code: dto.code, revision: dto.revision + 1 };
}

@Injectable()
export class ActivityDraftsService {
  constructor(private readonly prisma: PrismaService) {}

  read(userId: string, activityId: string) {
    return this.prisma.activityDraft.findUnique({
      where: { userId_activityId: { userId, activityId } },
      select: { code: true, revision: true, updatedAt: true },
    });
  }

  async save(userId: string, activityId: string, dto: SaveActivityDraftDto) {
    return saveVersionedDraft(
      dto,
      () => this.prisma.activityDraft.create({
          data: { userId, activityId, code: dto.code },
          select: { code: true, revision: true, updatedAt: true },
      }),
      () => this.prisma.activityDraft.updateMany({
        where: { userId, activityId, revision: dto.revision },
        data: { code: dto.code, revision: { increment: 1 } },
      }),
    );
  }
}
