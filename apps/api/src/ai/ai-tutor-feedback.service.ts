import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiTutorFeedbackDto } from './dto/ai-tutor-feedback.dto';

const QUALITY_WINDOW_DAYS = 30;

@Injectable()
export class AiTutorFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(dto: AiTutorFeedbackDto): Promise<{ recorded: true }> {
    try {
      await this.prisma.aiTutorFeedback.create({
        data: {
          responseId: dto.responseId,
          activityId: dto.activityId,
          helpful: dto.helpful,
          concern: dto.concern ?? null,
        },
        select: { id: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Feedback para esta resposta já foi registrado.');
      }
      throw error;
    }

    return { recorded: true };
  }

  async getQualitySummary(now = new Date()) {
    const since = new Date(now.getTime() - QUALITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const groups = await this.prisma.aiTutorFeedback.groupBy({
      by: ['helpful', 'concern'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });

    const summary = {
      windowDays: QUALITY_WINDOW_DAYS,
      total: 0,
      helpful: 0,
      notHelpful: 0,
      concerns: {
        tooMuchAnswer: 0,
        incorrect: 0,
        unclear: 0,
      },
    };

    for (const group of groups) {
      const count = group._count._all;
      summary.total += count;
      if (group.helpful) {
        summary.helpful += count;
      } else {
        summary.notHelpful += count;
        if (group.concern === 'too_much_answer') summary.concerns.tooMuchAnswer += count;
        if (group.concern === 'incorrect') summary.concerns.incorrect += count;
        if (group.concern === 'unclear') summary.concerns.unclear += count;
      }
    }

    return summary;
  }
}
