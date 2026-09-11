import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { EvaluatorService } from './evaluator/evaluator.service';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evaluator: EvaluatorService,
    @InjectQueue('submissions') private readonly submissionsQueue: Queue,
  ) {}

  async create(userId: string, dto: CreateSubmissionDto) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: dto.activityId },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (!dto.code && !dto.commitSha) {
      throw new BadRequestException('Either code or commitSha must be provided');
    }

    const submission = await this.prisma.submission.create({
      data: {
        activityId: dto.activityId,
        userId,
        codeSnapshot: dto.code,
        commitSha: dto.commitSha,
        status: 'queued',
      },
    });

    // Enqueue job via BullMQ with automatic fallback to async execution
    try {
      await this.submissionsQueue.add(
        'evaluate',
        { submissionId: submission.id },
        {
          attempts: 2,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );
    } catch (queueError: any) {
      this.logger.warn(`Could not add to Redis queue, running evaluation directly (Piston runner): ${queueError.message}`);
      setImmediate(() => {
        this.evaluator.processSubmission(submission.id).catch(() => {});
      });
    }

    return submission;
  }

  async findById(id: string, userId: string, userRole: string = 'student') {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        activity: {
          select: { id: true, title: true, slug: true, language: true, courseId: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        testResults: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Students can only view their own submissions
    if (userRole === 'student' && submission.userId !== userId) {
      throw new NotFoundException('Submission not found');
    }

    if (userRole === 'student') {
      return {
        ...submission,
        testResults: submission.testResults.map((t) => {
          if (t.isHidden) {
            return {
              id: t.id,
              name: t.name,
              passed: t.passed,
              durationMs: t.durationMs,
              isHidden: true,
            };
          }
          return t;
        }),
      };
    }

    return submission;
  }

  async findAll(userId: string, userRole: string = 'student', activityId?: string) {
    const where: any = {};

    if (userRole === 'student') {
      where.userId = userId;
    } else if (userRole === 'instructor') {
      where.activity = {
        course: {
          instructorId: userId,
        },
      };
    }

    if (activityId) {
      where.activityId = activityId;
    }

    return this.prisma.submission.findMany({
      where,
      include: {
        activity: {
          select: { id: true, title: true, slug: true, language: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
