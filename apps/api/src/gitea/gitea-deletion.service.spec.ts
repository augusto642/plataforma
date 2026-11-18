import { GiteaDeletionJobStatus } from '@prisma/client';
import { GiteaDeletionService } from './gitea-deletion.service';

describe('GiteaDeletionService', () => {
  let service: GiteaDeletionService;
  let prisma: any;
  let gitea: any;
  let job: any;

  beforeEach(() => {
    job = {
      id: 'job-1',
      username: 'aluno',
      candidateRepoNames: ['atividade-aluno'],
      status: GiteaDeletionJobStatus.pending,
      attempts: 0,
      nextAttemptAt: new Date(Date.now() - 1_000),
    };
    prisma = {
      giteaDeletionJob: {
        findUnique: jest.fn().mockResolvedValue(job),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue(undefined),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    gitea = {
      propagateDeletion: jest.fn().mockResolvedValue({
        ok: true,
        pending: false,
        userStatus: 'deleted',
        reposDeleted: ['plataforma/atividade-aluno'],
        reposRenamed: [],
        reposFailed: [],
      }),
    };
    service = new GiteaDeletionService(prisma, gitea);
  });

  it('claims the job, deletes Gitea data, and clears identifying payload on completion', async () => {
    await expect(service.processJob(job.id)).resolves.toBe(true);

    expect(prisma.giteaDeletionJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: job.id,
          status: GiteaDeletionJobStatus.pending,
        }),
        data: expect.objectContaining({
          status: GiteaDeletionJobStatus.processing,
          attempts: { increment: 1 },
        }),
      }),
    );
    expect(gitea.propagateDeletion).toHaveBeenCalledWith('aluno', ['atividade-aluno']);
    expect(prisma.giteaDeletionJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: job.id },
        data: expect.objectContaining({
          status: GiteaDeletionJobStatus.completed,
          username: '',
          candidateRepoNames: [],
          completedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('schedules exponential retry when Gitea reports partial cleanup', async () => {
    gitea.propagateDeletion.mockResolvedValue({
      ok: false,
      pending: true,
      userStatus: 'failed',
      reposDeleted: [],
      reposRenamed: [],
      reposFailed: ['plataforma/atividade-aluno'],
    });

    await expect(service.processJob(job.id)).resolves.toBe(false);

    const retryUpdate = prisma.giteaDeletionJob.update.mock.calls[0][0];
    expect(retryUpdate.data.status).toBe(GiteaDeletionJobStatus.pending);
    expect(retryUpdate.data.lockedUntil).toBeNull();
    expect(retryUpdate.data.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 50_000);
    expect(retryUpdate.data.nextAttemptAt.getTime()).toBeLessThan(Date.now() + 70_000);
  });

  it('does not duplicate a job another worker already claimed', async () => {
    prisma.giteaDeletionJob.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.processJob(job.id)).resolves.toBe(false);
    expect(gitea.propagateDeletion).not.toHaveBeenCalled();
  });

  it('recovers expired leases and processes due jobs in bounded batches', async () => {
    prisma.giteaDeletionJob.findMany.mockResolvedValue([{ id: job.id }]);
    const processJob = jest.spyOn(service, 'processJob').mockResolvedValue(true);

    await expect(service.processPending()).resolves.toBe(1);

    expect(prisma.giteaDeletionJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: GiteaDeletionJobStatus.processing,
          lockedUntil: { lt: expect.any(Date) },
        }),
      }),
    );
    expect(prisma.giteaDeletionJob.deleteMany).toHaveBeenCalled();
    expect(prisma.giteaDeletionJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 }),
    );
    expect(processJob).toHaveBeenCalledWith(job.id);
  });
});
