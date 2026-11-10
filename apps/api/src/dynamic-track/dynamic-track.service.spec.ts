import { ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import {
  DynamicTrackService,
  trackInvestigationJobId,
} from './dynamic-track.service';

function investigationRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-11-10T10:00:00.000Z');
  return {
    id: 'inv-1',
    userId: 'user-1',
    status: 'investigating',
    profileSnapshot: {
      expLevel: 'mid',
      timeCommitment: '10h',
      careerGoal: 'lead',
      sourceTrack: null,
      diagnosticTrackId: null,
    },
    suggestedTrack: null,
    rationale: null,
    marketEvidence: null,
    slaDueAt: new Date('2026-11-12T10:00:00.000Z'),
    completedAt: null,
    notifiedAt: null,
    emailStatus: 'not-attempted',
    failureReason: null,
    lastRetryAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildService(deps: {
  prisma?: Record<string, unknown>;
  queue?: Record<string, unknown> | null;
  research?: Record<string, unknown> | null;
  mailer?: Record<string, unknown> | null;
} = {}) {
  const prisma = {
    trackInvestigation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    diagnosticResult: { findFirst: jest.fn() },
    marketSignal: { upsert: jest.fn() },
    course: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    ...(deps.prisma ?? {}),
  };
  const queue =
    deps.queue === null
      ? undefined
      : {
          getJob: jest.fn().mockResolvedValue(null),
          add: jest.fn().mockResolvedValue({ id: 'job-1' }),
          ...(deps.queue ?? {}),
        };
  const research =
    deps.research === null
      ? undefined
      : { collect: jest.fn(), ...(deps.research ?? {}) };
  const mailer =
    deps.mailer === null
      ? undefined
      : { sendTrackReady: jest.fn().mockResolvedValue(undefined), ...(deps.mailer ?? {}) };
  const service = new DynamicTrackService(
    prisma as never,
    queue as never,
    research as never,
    mailer as never,
  );
  return { service, prisma, queue, research, mailer };
}

describe('DynamicTrackService.createForUser', () => {
  it('cria investigating com SLA +48h e enfileira 1 job idempotente', async () => {
    const { service, prisma, queue } = buildService();
    (prisma.trackInvestigation.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.trackInvestigation.create as jest.Mock).mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...investigationRow(),
        ...data,
      }),
    );
    const before = Date.now();
    const { investigation, queued } = await service.createForUser('user-1', {
      expLevel: 'mid',
      careerGoal: 'lead',
    });
    expect(investigation.status).toBe('investigating');
    expect(queued).toBe(true);
    const sla = new Date(
      (investigation as unknown as { slaDueAt: string }).slaDueAt,
    ).getTime();
    expect(sla - before).toBeGreaterThanOrEqual(48 * 60 * 60 * 1000 - 5000);
    expect(sla - before).toBeLessThanOrEqual(48 * 60 * 60 * 1000 + 5000);
    expect(queue!.add).toHaveBeenCalledWith(
      'investigate',
      { userId: 'user-1' },
      expect.objectContaining({
        jobId: trackInvestigationJobId('user-1'),
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }),
    );
    expect(trackInvestigationJobId('user-1')).toBe(
      'track-investigation-user-1',
    );
  });

  it('investigação existente não duplica nem re-enfileira', async () => {
    const { service, prisma, queue } = buildService();
    (prisma.trackInvestigation.findUnique as jest.Mock).mockResolvedValue(
      investigationRow(),
    );
    const { investigation, deduped } = await service.createForUser('user-1', {});
    expect(investigation.id).toBe('inv-1');
    expect(deduped).toBe(true);
    expect(prisma.trackInvestigation.create).not.toHaveBeenCalled();
    expect(queue!.add).not.toHaveBeenCalled();
  });

  it('falha de enqueue não desfaz a criação (linha fica investigating)', async () => {
    const { service, prisma } = buildService({
      queue: { add: jest.fn().mockRejectedValue(new Error('redis fora')) },
    });
    (prisma.trackInvestigation.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.trackInvestigation.create as jest.Mock).mockResolvedValue(
      investigationRow(),
    );
    const { investigation, queued } = await service.createForUser('user-1', {});
    expect(investigation.status).toBe('investigating');
    expect(queued).toBe(false);
  });

  it('job existente esperando ⇒ dedupe (sem add)', async () => {
    const { service, prisma, queue } = buildService();
    (prisma.trackInvestigation.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.trackInvestigation.create as jest.Mock).mockResolvedValue(
      investigationRow(),
    );
    (queue!.getJob as jest.Mock).mockResolvedValue({
      id: 'existing',
      getState: jest.fn().mockResolvedValue('waiting'),
      remove: jest.fn(),
    });
    const { queued, deduped } = await service.createForUser('user-1', {});
    expect(queued).toBe(false);
    expect(deduped).toBe(true);
    expect(queue!.add).not.toHaveBeenCalled();
  });

  it('job existente CONCLUÍDO ⇒ remove e re-enfileira (não é duplicata)', async () => {
    const { service, prisma, queue } = buildService();
    (prisma.trackInvestigation.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.trackInvestigation.create as jest.Mock).mockResolvedValue(
      investigationRow(),
    );
    const remove = jest.fn().mockResolvedValue(undefined);
    (queue!.getJob as jest.Mock).mockResolvedValue({
      id: 'existing',
      getState: jest.fn().mockResolvedValue('completed'),
      remove,
    });
    const { queued, deduped } = await service.createForUser('user-1', {});
    expect(remove).toHaveBeenCalled();
    expect(queue!.add).toHaveBeenCalled();
    expect(queued).toBe(true);
    expect(deduped).toBe(false);
  });

  it('sem fila ⇒ queued false, sem throw', async () => {
    const { service, prisma } = buildService({ queue: null });
    (prisma.trackInvestigation.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.trackInvestigation.create as jest.Mock).mockResolvedValue(
      investigationRow(),
    );
    const { queued } = await service.createForUser('user-1', {});
    expect(queued).toBe(false);
  });
});

describe('DynamicTrackService.getMyInvestigation', () => {
  it('null quando nunca investigado', async () => {
    const { service, prisma } = buildService();
    (prisma.trackInvestigation.findUnique as jest.Mock).mockResolvedValue(null);
    expect(await service.getMyInvestigation('user-1')).toBeNull();
  });

  it('ready resolve startCourse só quando o slug existe no banco', async () => {
    const { service, prisma } = buildService();
    (prisma.trackInvestigation.findUnique as jest.Mock).mockResolvedValue(
      investigationRow({
        status: 'ready',
        suggestedTrack: 'backend',
        rationale: { reasons: ['career-goal:lead'], basis: 'profile-only' },
        marketEvidence: [],
        completedAt: new Date('2026-11-10T11:00:00.000Z'),
      }),
    );
    (prisma.course.findUnique as jest.Mock).mockResolvedValue({
      slug: 'introducao-python',
      title: 'Introdução a Python',
    });
    const view = await service.getMyInvestigation('user-1');
    expect(view!.status).toBe('ready');
    expect(view!.trackName).toBe('Desenvolvimento Back-end');
    expect(view!.startCourse).toEqual({
      slug: 'introducao-python',
      title: 'Introdução a Python',
    });
    expect(view!.rationaleText).toContain('liderança técnica');
    expect(view!.marketEvidence).toEqual([]);
    expect(view!.basis).toBe('profile-only');
  });

  it('ready com slug inexistente ⇒ startCourse null (nunca slug inventado)', async () => {
    const { service, prisma } = buildService();
    (prisma.trackInvestigation.findUnique as jest.Mock).mockResolvedValue(
      investigationRow({
        status: 'ready',
        suggestedTrack: 'backend',
        rationale: { reasons: ['career-goal:lead'], basis: 'profile-only' },
        marketEvidence: [],
      }),
    );
    (prisma.course.findUnique as jest.Mock).mockResolvedValue(null);
    const view = await service.getMyInvestigation('user-1');
    expect(view!.startCourse).toBeNull();
  });

  it('investigating com SLA vencido ⇒ overdue true', async () => {
    const { service, prisma } = buildService();
    (prisma.trackInvestigation.findUnique as jest.Mock).mockResolvedValue(
      investigationRow({
        slaDueAt: new Date(Date.now() - 1000),
      }),
    );
    const view = await service.getMyInvestigation('user-1');
    expect(view!.overdue).toBe(true);
  });
});

describe('DynamicTrackService.startForUser', () => {
  it('conta sem investigação: cria a partir do careerTier', async () => {
    const { service, prisma, queue } = buildService();
    (prisma.trackInvestigation.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      careerTier: 'junior',
    });
    (prisma.trackInvestigation.create as jest.Mock).mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...investigationRow(),
        ...data,
      }),
    );
    const { created } = await service.startForUser('user-1');
    expect(created).toBe(true);
    const snapshot = (prisma.trackInvestigation.create as jest.Mock).mock
      .calls[0][0].data.profileSnapshot;
    expect(snapshot.expLevel).toBe('junior');
    expect(queue!.add).toHaveBeenCalled();
  });

  it('investigating existente ⇒ devolve sem duplicar', async () => {
    const { service, prisma, queue } = buildService();
    (prisma.trackInvestigation.findUnique as jest.Mock).mockResolvedValue(
      investigationRow(),
    );
    const { created } = await service.startForUser('user-1');
    expect(created).toBe(false);
    expect(queue!.add).not.toHaveBeenCalled();
  });

  it('failed há menos de 24h ⇒ 429 honesto', async () => {
    const { service, prisma } = buildService();
    (prisma.trackInvestigation.findUnique as jest.Mock).mockResolvedValue(
      investigationRow({
        status: 'failed',
        failureReason: 'banco fora',
        lastRetryAt: new Date(Date.now() - 60 * 60 * 1000),
      }),
    );
    let thrown: unknown;
    try {
      await service.startForUser('user-1');
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
  });

  it('failed há mais de 24h ⇒ reseta e re-enfileira', async () => {
    const { service, prisma, queue } = buildService();
    (prisma.trackInvestigation.findUnique as jest.Mock).mockResolvedValue(
      investigationRow({
        status: 'failed',
        failureReason: 'banco fora',
        lastRetryAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      }),
    );
    (prisma.trackInvestigation.update as jest.Mock).mockResolvedValue(
      investigationRow({ status: 'investigating', failureReason: null }),
    );
    const { view } = await service.startForUser('user-1');
    expect(view.status).toBe('investigating');
    expect(queue!.add).toHaveBeenCalled();
  });
});

describe('DynamicTrackService.markSeen', () => {
  it('ready sem notifiedAt ⇒ marca; investigating ⇒ não marca', async () => {
    const { service, prisma } = buildService();
    (prisma.trackInvestigation.findUnique as jest.Mock)
      .mockResolvedValueOnce(
        investigationRow({
          status: 'ready',
          suggestedTrack: 'frontend',
          rationale: { reasons: ['default-entry'], basis: 'profile-only' },
          marketEvidence: [],
        }),
      )
      .mockResolvedValueOnce(investigationRow());
    (prisma.trackInvestigation.update as jest.Mock).mockResolvedValue(
      investigationRow({
        status: 'ready',
        suggestedTrack: 'frontend',
        rationale: { reasons: ['default-entry'], basis: 'profile-only' },
        marketEvidence: [],
        notifiedAt: new Date('2026-11-10T12:00:00.000Z'),
      }),
    );
    (prisma.course.findUnique as jest.Mock).mockResolvedValue({
      slug: 'algoritmos-javascript',
      title: 'Algoritmos com JavaScript',
    });
    const seen = await service.markSeen('user-1');
    expect(seen!.notifiedAt).not.toBeNull();
    const untouched = await service.markSeen('user-1');
    expect(untouched!.notifiedAt).toBeNull();
    expect(prisma.trackInvestigation.update).toHaveBeenCalledTimes(1);
  });
});

describe('DynamicTrackService.runInvestigation', () => {
  it('noop quando não há investigação ou não está investigating', async () => {
    const { service, prisma } = buildService();
    (prisma.trackInvestigation.findUnique as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(investigationRow({ status: 'ready' }));
    expect(await service.runInvestigation('user-1')).toEqual({
      action: 'noop',
    });
    expect(await service.runInvestigation('user-1')).toEqual({
      action: 'noop',
    });
  });

  it('ready profile-only quando a pesquisa falha (fail-closed)', async () => {
    const { service, prisma, research, mailer } = buildService({
      research: {
        collect: jest.fn().mockRejectedValue(new Error('sem chave de busca')),
      },
    });
    (prisma.trackInvestigation.findUnique as jest.Mock)
      .mockResolvedValueOnce(investigationRow())
      .mockResolvedValueOnce(investigationRow());
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      email: 'a@b.c',
      name: 'Ana',
    });
    (prisma.diagnosticResult.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.trackInvestigation.update as jest.Mock).mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...investigationRow(),
        ...data,
      }),
    );
    const result = await service.runInvestigation('user-1');
    expect(result).toEqual({
      action: 'ready',
      track: 'backend',
      basis: 'profile-only',
      evidenceCount: 0,
    });
    const updateData = (prisma.trackInvestigation.update as jest.Mock).mock
      .calls[0][0].data;
    expect(updateData.status).toBe('ready');
    expect(updateData.suggestedTrack).toBe('backend');
    expect(updateData.rationale.basis).toBe('profile-only');
    expect(updateData.rationale.reasons).toEqual(['career-goal:lead']);
    expect(updateData.marketEvidence).toEqual([]);
    expect(mailer!.sendTrackReady).toHaveBeenCalledWith(
      'a@b.c',
      'Ana',
      'Desenvolvimento Back-end',
    );
  });

  it('diagnóstico do aluno tem precedência sobre objetivo e hint', async () => {
    const { service, prisma } = buildService({ research: null, mailer: null });
    (prisma.trackInvestigation.findUnique as jest.Mock)
      .mockResolvedValueOnce(
        investigationRow({
          profileSnapshot: {
            careerGoal: 'lead',
            sourceTrack: 'frontend',
            diagnosticTrackId: null,
          },
        }),
      )
      .mockResolvedValueOnce(
        investigationRow({
          profileSnapshot: {
            careerGoal: 'lead',
            sourceTrack: 'frontend',
            diagnosticTrackId: null,
          },
        }),
      );
    (prisma.diagnosticResult.findFirst as jest.Mock).mockResolvedValue({
      archetype: 'automatizador',
    });
    (prisma.trackInvestigation.update as jest.Mock).mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...investigationRow(),
        ...data,
      }),
    );
    const result = await service.runInvestigation('user-1');
    // automatizador → ai (ver quiz-v1 ARCHETYPES)
    expect(result.track).toBe('ai');
    const updateData = (prisma.trackInvestigation.update as jest.Mock).mock
      .calls[0][0].data;
    expect(updateData.rationale.reasons).toEqual(['diagnostic']);
  });

  it('e-mail falho não derruba a investigação (pending-smtp, continua ready)', async () => {
    const { service, prisma, mailer } = buildService({
      research: null,
      mailer: {
        sendTrackReady: jest
          .fn()
          .mockRejectedValue(new Error('SMTP não configurado')),
      },
    });
    (prisma.trackInvestigation.findUnique as jest.Mock)
      .mockResolvedValueOnce(investigationRow())
      .mockResolvedValueOnce(investigationRow());
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      email: 'a@b.c',
      name: 'Ana',
    });
    (prisma.diagnosticResult.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.trackInvestigation.update as jest.Mock).mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...investigationRow(),
        ...data,
      }),
    );
    const result = await service.runInvestigation('user-1');
    expect(result.action).toBe('ready');
    expect(mailer!.sendTrackReady).toHaveBeenCalled();
    const statuses = (prisma.trackInvestigation.update as jest.Mock).mock.calls.map(
      (c) => c[0].data,
    );
    expect(statuses[0].status).toBe('ready');
    expect(statuses[1].emailStatus).toBe('pending-smtp');
  });

  it('sem mailer ⇒ pending-smtp, investigação continua ready', async () => {
    const { service, prisma } = buildService({
      research: null,
      mailer: null,
    });
    (prisma.trackInvestigation.findUnique as jest.Mock)
      .mockResolvedValueOnce(investigationRow())
      .mockResolvedValueOnce(investigationRow());
    (prisma.diagnosticResult.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.trackInvestigation.update as jest.Mock).mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...investigationRow(),
        ...data,
      }),
    );
    const result = await service.runInvestigation('user-1');
    expect(result.action).toBe('ready');
    const statuses = (prisma.trackInvestigation.update as jest.Mock).mock.calls.map(
      (c) => c[0].data,
    );
    expect(statuses[1].emailStatus).toBe('pending-smtp');
  });
});

describe('DynamicTrackService admin', () => {
  it('reenqueue de ready ⇒ ConflictException; de failed ⇒ reseta', async () => {
    const { service, prisma, queue } = buildService();
    (prisma.trackInvestigation.findUnique as jest.Mock)
      .mockResolvedValueOnce(investigationRow({ status: 'ready' }))
      .mockResolvedValueOnce(
        investigationRow({ status: 'failed', failureReason: 'x' }),
      );
    await expect(service.reenqueueAdmin('inv-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    (prisma.trackInvestigation.update as jest.Mock).mockResolvedValue(
      investigationRow({ status: 'investigating' }),
    );
    const out = await service.reenqueueAdmin('inv-1');
    expect(out.investigation.status).toBe('investigating');
    expect(queue!.add).toHaveBeenCalled();
  });
});
