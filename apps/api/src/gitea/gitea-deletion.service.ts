import { Injectable, Logger } from '@nestjs/common';
import { GiteaDeletionJobStatus } from '@prisma/client';
import { GiteaService } from './gitea.service';
import { PrismaService } from '../prisma/prisma.service';

const CLAIM_LEASE_MS = 60_000;
const MAX_RETRY_DELAY_MS = 24 * 60 * 60 * 1000;
const RETRY_BASE_DELAY_MS = 60_000;
const BATCH_SIZE = 20;
const COMPLETED_RETENTION_DAYS = 14;

@Injectable()
export class GiteaDeletionService {
  private readonly logger = new Logger(GiteaDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gitea: GiteaService,
  ) {}

  async processJob(id: string): Promise<boolean> {
    const now = new Date();
    const job = await this.prisma.giteaDeletionJob.findUnique({
      where: { id },
    });
    if (
      !job ||
      job.status !== GiteaDeletionJobStatus.pending ||
      job.nextAttemptAt > now
    ) {
      return false;
    }

    const claim = await this.prisma.giteaDeletionJob.updateMany({
      where: {
        id,
        status: GiteaDeletionJobStatus.pending,
        nextAttemptAt: { lte: now },
      },
      data: {
        status: GiteaDeletionJobStatus.processing,
        attempts: { increment: 1 },
        lockedUntil: new Date(now.getTime() + CLAIM_LEASE_MS),
      },
    });
    if (claim.count !== 1) return false;

    try {
      const result = await this.gitea.propagateDeletion(
        job.username,
        job.candidateRepoNames,
      );
      if (result.pending) {
        await this.scheduleRetry(id, job.attempts + 1);
        return false;
      }

      await this.prisma.giteaDeletionJob.update({
        where: { id },
        data: {
          status: GiteaDeletionJobStatus.completed,
          username: '',
          candidateRepoNames: [],
          lockedUntil: null,
          completedAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      await this.scheduleRetry(id, job.attempts + 1);
      this.logger.warn(
        `Gitea deletion job ${id} failed; a retry was scheduled: ${(error as Error).message}`,
      );
      return false;
    }
  }

  async processPending(): Promise<number> {
    const now = new Date();
    await this.prisma.giteaDeletionJob.updateMany({
      where: {
        status: GiteaDeletionJobStatus.processing,
        lockedUntil: { lt: now },
      },
      data: {
        status: GiteaDeletionJobStatus.pending,
        lockedUntil: null,
        nextAttemptAt: now,
      },
    });

    const expiredRetention = new Date(
      now.getTime() - COMPLETED_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    await this.prisma.giteaDeletionJob.deleteMany({
      where: {
        status: GiteaDeletionJobStatus.completed,
        completedAt: { lt: expiredRetention },
      },
    });

    const jobs = await this.prisma.giteaDeletionJob.findMany({
      where: {
        status: GiteaDeletionJobStatus.pending,
        nextAttemptAt: { lte: now },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    let completed = 0;
    for (const job of jobs) {
      if (await this.processJob(job.id)) completed += 1;
    }
    return completed;
  }

  private async scheduleRetry(id: string, attempts: number): Promise<void> {
    const delay = Math.min(
      MAX_RETRY_DELAY_MS,
      RETRY_BASE_DELAY_MS * 2 ** Math.min(Math.max(0, attempts - 1), 10),
    );
    await this.prisma.giteaDeletionJob.update({
      where: { id },
      data: {
        status: GiteaDeletionJobStatus.pending,
        lockedUntil: null,
        nextAttemptAt: new Date(Date.now() + delay),
      },
    });
  }
}
