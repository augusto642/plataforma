import { BadRequestException, Injectable } from '@nestjs/common';
import { saveVersionedDraft } from '../activities/activity-drafts.service';
import { SaveActivityDraftDto } from '../activities/dto/save-activity-draft.dto';
import { PrismaService } from '../prisma/prisma.service';

type PlaygroundLanguage = 'javascript' | 'python' | 'portugol';

function assertLanguage(language: string): asserts language is PlaygroundLanguage {
  if (language !== 'javascript' && language !== 'python' && language !== 'portugol') {
    throw new BadRequestException('Linguagem indisponível no playground.');
  }
}

@Injectable()
export class PlaygroundDraftsService {
  constructor(private readonly prisma: PrismaService) {}

  read(userId: string, language: string) {
    assertLanguage(language);
    return this.prisma.playgroundDraft.findUnique({
      where: { userId_language: { userId, language } },
      select: { code: true, revision: true, updatedAt: true },
    });
  }

  save(userId: string, language: string, dto: SaveActivityDraftDto) {
    assertLanguage(language);
    return saveVersionedDraft(
      dto,
      () => this.prisma.playgroundDraft.create({
        data: { userId, language, code: dto.code },
        select: { code: true, revision: true, updatedAt: true },
      }),
      () => this.prisma.playgroundDraft.updateMany({
        where: { userId, language, revision: dto.revision },
        data: { code: dto.code, revision: { increment: 1 } },
      }),
    );
  }
}
