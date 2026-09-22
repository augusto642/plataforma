import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigError } from '../config/secrets.validation';
import {
  redactEmail,
  WebhooksController,
} from './webhooks.controller';

const SECRET = 'whsec_test_secret';

function sign(rawBody: Buffer): string {
  return crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');
}

function buildPayload(overrides: Record<string, any> = {}): any {
  return {
    ref: 'refs/heads/main',
    deleted: false,
    pusher: { email: 'pusher@example.com' },
    repository: {
      name: 'activity-slug-student1',
      full_name: 'plataforma/activity-slug-student1',
      owner: { username: 'plataforma' },
    },
    commits: [
      {
        id: 'abc123',
        message: 'feat: solution',
        author: { email: 'student@example.com' },
      },
    ],
    ...overrides,
  };
}

function makeMocks() {
  const prisma = {
    webhookDelivery: { create: jest.fn().mockResolvedValue({ id: 'd1' }) },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'user-1', email: 'student@example.com' }),
      findFirst: jest.fn().mockResolvedValue({ id: 'user-1', email: 'student@example.com' }),
    },
    studentRepo: {
      findFirst: jest.fn().mockResolvedValue({ user: { id: 'user-1', email: 'student@example.com' } }),
    },
    activity: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'act-1', language: 'javascript', initialCode: '// init' }),
    },
    enrollment: { findMany: jest.fn().mockResolvedValue([]) },
    submission: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const submissions = {
    create: jest.fn().mockResolvedValue({ id: 'sub-1' }),
  };
  const gitea = {
    getFileContent: jest.fn().mockResolvedValue('console.log(1)'),
  };
  const config = {
    get: jest.fn((key: string, def?: any) =>
      key === 'GITEA_WEBHOOK_SECRET' ? SECRET : def,
    ),
  };
  return { prisma, submissions, gitea, config };
}

function makeController(overrides: Partial<ReturnType<typeof makeMocks>> = {}) {
  const mocks = makeMocks();
  const merged = {
    prisma: overrides.prisma ?? mocks.prisma,
    submissions: overrides.submissions ?? mocks.submissions,
    gitea: overrides.gitea ?? mocks.gitea,
    config: overrides.config ?? mocks.config,
  };
  const controller = new WebhooksController(
    merged.prisma as any,
    merged.submissions as any,
    merged.gitea as any,
    merged.config as any,
  );
  return { controller, mocks: merged };
}

function invoke(
  controller: WebhooksController,
  opts: {
    payload?: any;
    event?: string;
    signature?: string;
    deliveryId?: string;
    rawBody?: Buffer;
  } = {},
) {
  const payload = opts.payload ?? buildPayload();
  const rawBody =
    opts.rawBody ?? Buffer.from(JSON.stringify(payload));
  // Presença explícita: undefined significa "header ausente" nos testes.
  const signature = 'signature' in opts ? opts.signature : sign(rawBody);
  const deliveryId = 'deliveryId' in opts ? opts.deliveryId : 'delivery-001';
  return controller.handleGiteaPush(
    { rawBody } as any,
    payload,
    opts.event ?? 'push',
    signature,
    deliveryId,
  );
}

describe('WebhooksController (fail-closed webhook)', () => {
  describe('redactEmail', () => {
    it('redacts the local part of an email', () => {
      expect(redactEmail('student@example.com')).toBe('st***@example.com');
      expect(redactEmail('a@b.com')).toBe('a***@b.com');
    });

    it('returns empty string for missing emails', () => {
      expect(redactEmail(null)).toBe('');
      expect(redactEmail(undefined)).toBe('');
      expect(redactEmail('')).toBe('');
    });
  });

  it('rejects the request when GITEA_WEBHOOK_SECRET is not configured and creates no submission', async () => {
    const config = {
      get: jest.fn((key: string, def?: any) =>
        key === 'GITEA_WEBHOOK_SECRET' ? undefined : def,
      ),
    };
    const { controller, mocks } = makeController({ config });

    await expect(
      invoke(controller, { signature: 'anything' }),
    ).rejects.toThrow(ConfigError);
    expect(mocks.submissions.create).not.toHaveBeenCalled();
    expect(mocks.prisma.webhookDelivery.create).not.toHaveBeenCalled();
  });

  it('rejects a request with a missing signature', async () => {
    const { controller, mocks } = makeController();
    await expect(
      invoke(controller, { signature: undefined }),
    ).rejects.toThrow(UnauthorizedException);
    expect(mocks.submissions.create).not.toHaveBeenCalled();
  });

  it('rejects a request with an invalid signature', async () => {
    const { controller, mocks } = makeController();
    await expect(
      invoke(controller, { signature: 'deadbeef' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(mocks.submissions.create).not.toHaveBeenCalled();
  });

  it('rejects a tampered body (signature no longer matches raw body)', async () => {
    const { controller } = makeController();
    const forgedBody = Buffer.from(
      JSON.stringify(buildPayload({ repository: { name: 'evil' } })),
    );
    await expect(
      invoke(controller, {
        payload: buildPayload(),
        signature: sign(forgedBody),
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('accepts the canonical sha256= prefix in the signature header', async () => {
    const { controller, mocks } = makeController();
    const payload = buildPayload();
    const rawBody = Buffer.from(JSON.stringify(payload));
    const result = await controller.handleGiteaPush(
      { rawBody } as any,
      payload,
      'push',
      `sha256=${sign(rawBody)}`,
      'delivery-001',
    );
    expect(result.status).toBe('success');
    expect(mocks.submissions.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a request without raw body (JSON.stringify fallback removed)', async () => {
    const { controller, mocks } = makeController();
    await expect(
      controller.handleGiteaPush(
        {} as any,
        buildPayload(),
        'push',
        sign(Buffer.from(JSON.stringify(buildPayload()))),
        'delivery-001',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(mocks.submissions.create).not.toHaveBeenCalled();
  });

  it('rejects a payload larger than 1MB', async () => {
    const { controller, mocks } = makeController();
    const big = Buffer.alloc(1024 * 1024 + 1, 'a');
    await expect(
      invoke(controller, { rawBody: big, signature: sign(big) }),
    ).rejects.toThrow(BadRequestException);
    expect(mocks.submissions.create).not.toHaveBeenCalled();
  });

  it('returns 200 duplicate on repeated x-gitea-delivery without creating a submission', async () => {
    const prisma = makeMocks().prisma;
    prisma.webhookDelivery.create.mockRejectedValue({
      code: 'P2002',
      message: 'unique constraint',
    });
    const { controller, mocks } = makeController({ prisma });

    const result = await invoke(controller);
    expect(result).toEqual({ status: 'duplicate' });
    expect(mocks.submissions.create).not.toHaveBeenCalled();
  });

  it('rejects a request without x-gitea-delivery header', async () => {
    const { controller, mocks } = makeController();
    await expect(invoke(controller, { deliveryId: undefined })).rejects.toThrow(
      BadRequestException,
    );
    expect(mocks.submissions.create).not.toHaveBeenCalled();
  });

  it('ignores non-push events', async () => {
    const { controller, mocks } = makeController();
    const result = await invoke(controller, { event: 'issues' });
    expect(result).toEqual({
      status: 'ignored',
      reason: 'Not a push event or no commits',
    });
    expect(mocks.submissions.create).not.toHaveBeenCalled();
  });

  it('ignores pushes on non-main/master branches', async () => {
    const { controller, mocks } = makeController();
    const result = await invoke(
      controller,
      { payload: buildPayload({ ref: 'refs/heads/feature/x' }) },
    );
    expect(result.status).toBe('ignored');
    expect(mocks.submissions.create).not.toHaveBeenCalled();
  });

  it('ignores branch deletions', async () => {
    const { controller, mocks } = makeController();
    const result = await invoke(
      controller,
      { payload: buildPayload({ deleted: true }) },
    );
    expect(result.status).toBe('ignored');
    expect(mocks.submissions.create).not.toHaveBeenCalled();
  });

  it('ignores repositories that do not match the {slug}-{username} pattern', async () => {
    const { controller, mocks } = makeController();
    const result = await invoke(
      controller,
      {
        payload: buildPayload({
          repository: {
            name: 'bad repo name!',
            full_name: 'plataforma/bad repo name!',
            owner: { username: 'plataforma' },
          },
        }),
      },
    );
    expect(result).toEqual({
      status: 'ignored',
      reason: 'Repository name does not match expected pattern',
    });
    expect(mocks.submissions.create).not.toHaveBeenCalled();
  });

  it('ignores unknown repositories after activity lookup fails', async () => {
    const prisma = makeMocks().prisma;
    prisma.activity.findFirst.mockResolvedValue(null);
    const { controller, mocks } = makeController({ prisma });
    const result = await invoke(
      controller,
      {
        payload: buildPayload({
          repository: {
            name: 'unknown-slug-student1',
            full_name: 'plataforma/unknown-slug-student1',
            owner: { username: 'plataforma' },
          },
        }),
      },
    );
    expect(result).toEqual({ status: 'ignored', reason: 'No matching activity' });
    expect(mocks.submissions.create).not.toHaveBeenCalled();
  });

  it('returns already_processed for a repeated commitSha (same delivery)', async () => {
    const prisma = makeMocks().prisma;
    prisma.submission.findFirst.mockResolvedValue({ id: 'sub-existing' });
    const { controller, mocks } = makeController({ prisma });

    const result = await invoke(controller);
    expect(result).toEqual({
      status: 'already_processed',
      submissionId: 'sub-existing',
    });
    expect(mocks.submissions.create).not.toHaveBeenCalled();
  });

  it('treats a P2002 race on submission create as already_processed, never 500', async () => {
    const submissions = {
      create: jest.fn().mockRejectedValue({
        code: 'P2002',
        message: 'unique constraint',
      }),
    };
    const prisma = makeMocks().prisma;
    prisma.submission.findFirst.mockResolvedValueOnce(null);
    prisma.submission.findFirst.mockResolvedValueOnce({ id: 'sub-raced' });
    const { controller } = makeController({ prisma, submissions });

    const result = await invoke(controller);
    expect(result).toEqual({
      status: 'already_processed',
      submissionId: 'sub-raced',
    });
  });

  it('creates a submission and records the delivery on the happy path', async () => {
    const { controller, mocks } = makeController();
    const result = await invoke(controller);

    expect(result).toEqual({ status: 'success', submissionId: 'sub-1' });
    expect(mocks.prisma.webhookDelivery.create).toHaveBeenCalledWith({
      data: {
        deliveryId: 'delivery-001',
        eventType: 'push',
        repoFullName: 'plataforma/activity-slug-student1',
        commitSha: 'abc123',
      },
    });
    expect(mocks.submissions.create).toHaveBeenCalledWith('user-1', {
      activityId: 'act-1',
      commitSha: 'abc123',
      code: 'console.log(1)',
    });
  });

  describe('identity anti-spoofing (email fallback removed)', () => {
    it('ignores the event when no StudentRepo binding exists, even if the commit author email matches a platform user', async () => {
      const prisma = makeMocks().prisma;
      prisma.studentRepo.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(null);
      // E-mail do autor do commit casa com um usuário real da plataforma —
      // antes isso resolvia a identidade (spoofing via git config); agora não.
      prisma.user.findUnique.mockResolvedValue({ id: 'victim-1', email: 'student@example.com' });
      const { controller, mocks } = makeController({ prisma });

      const result = await invoke(controller);

      expect(result).toEqual({ status: 'ignored', reason: 'User not recognized' });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(mocks.submissions.create).not.toHaveBeenCalled();
    });

    it('resolves identity via StudentRepo binding by giteaUsername when repoFullName does not match', async () => {
      const prisma = makeMocks().prisma;
      prisma.studentRepo.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue({ id: 'user-2', email: 'owner@example.com' });
      const { controller, mocks } = makeController({ prisma });

      const result = await invoke(controller);

      expect(result).toEqual({ status: 'success', submissionId: 'sub-1' });
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { studentRepos: { some: { giteaUsername: 'student1' } } },
      });
      expect(mocks.submissions.create).toHaveBeenCalledWith(
        'user-2',
        expect.objectContaining({ activityId: 'act-1' }),
      );
    });
  });
});