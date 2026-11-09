import { ForbiddenException } from '@nestjs/common';
import { ConfigError } from '../config/secrets.validation';
import { CoursesService } from './courses.service';
import { verifyCertificateCode } from './certificate-code';

/**
 * A4 — ranking: paginação no banco (orderBy xp desc + take/skip), cache
 * Redis de 45 s por (curso, página, limite) e invalidação coberta nos
 * specs do evaluator (`evaluator.service.spec.ts`) e do battle-run
 * (`submissions.battle.spec.ts`).
 */
describe('CoursesService.getLeaderboard (A4)', () => {
  const course = { id: 'course-1', title: 'Curso 1' };

  function row(
    userId: string,
    xp: number,
    completedActivities = 1,
  ) {
    return {
      user: {
        id: userId,
        name: `Aluno ${userId}`,
        xp,
        level: 1,
        streakDays: 0,
        badges: [],
        submissions: Array.from({ length: completedActivities }, (_, i) => ({
          id: `sub-${userId}-${i}`,
        })),
      },
    };
  }

  function buildHarness() {
    const cacheStore = new Map<string, unknown>();
    // findById usa o cache de curso: pré-carrega o curso para o teste
    // não depender do findUnique de curso.
    cacheStore.set('courses:course-1', course);
    const cache = {
      get: jest.fn(async (key: string) => cacheStore.get(key) ?? null),
      set: jest.fn(async (key: string, value: unknown) => {
        cacheStore.set(key, value);
      }),
      del: jest.fn(async (key: string) => {
        cacheStore.delete(key);
      }),
      delPattern: jest.fn(async () => undefined),
    };
    const prisma = {
      course: { findUnique: jest.fn() },
      enrollment: {
        findUnique: jest.fn().mockResolvedValue({ id: 'enr-1' }),
        findMany: jest.fn().mockResolvedValue([
          row('user-a', 300, 3),
          row('user-b', 150, 1),
        ]),
      },
    };
    const config = { get: jest.fn() };
    const gitea = {};
    const service = new CoursesService(
      prisma as any,
      cache as any,
      config as any,
      gitea as any,
    );
    return { service, prisma, cache, cacheStore };
  }

  it('queries the DB ordered by xp desc with take/skip and returns only the page', async () => {
    const { service, prisma } = buildHarness();

    const result = await service.getLeaderboard('course-1', undefined, 'admin', 2, 20);

    expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { courseId: 'course-1' },
        orderBy: [{ user: { xp: 'desc' } }, { user: { createdAt: 'asc' } }],
        skip: 20,
        take: 20,
      }),
    );
    expect(result).toHaveLength(2);
    // Rank com offset da página: 2ª página de 20 começa no 21.
    expect(result[0].rank).toBe(21);
    expect(result[1].rank).toBe(22);
    expect(result[0].xp).toBe(300);
    expect(result[0].completedActivitiesCount).toBe(3);
  });

  it('serves the second call from cache within the TTL (no second DB query)', async () => {
    const { service, prisma, cache } = buildHarness();

    const first = await service.getLeaderboard('course-1');
    const second = await service.getLeaderboard('course-1');

    expect(first).toEqual(second);
    expect(prisma.enrollment.findMany).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledWith(
      'leaderboard:course-1:p1:l50',
      expect.anything(),
      45,
    );
  });

  it('uses a different cache key per page (page 2 hits the DB again)', async () => {
    const { service, prisma, cache } = buildHarness();

    await service.getLeaderboard('course-1', undefined, 'admin', 1, 50);
    await service.getLeaderboard('course-1', undefined, 'admin', 2, 50);

    expect(prisma.enrollment.findMany).toHaveBeenCalledTimes(2);
    expect(cache.set).toHaveBeenCalledWith(
      'leaderboard:course-1:p2:l50',
      expect.anything(),
      45,
    );
  });

  it('clamps the limit to 100', async () => {
    const { service, prisma } = buildHarness();

    await service.getLeaderboard('course-1', undefined, 'admin', 1, 500);

    expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });

  it('defaults to page 1 / limit 50', async () => {
    const { service, prisma } = buildHarness();

    await service.getLeaderboard('course-1');

    expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
  });

  it('fails open to the DB when the cache read throws', async () => {
    const { service, prisma, cache } = buildHarness();
    cache.get.mockImplementation(async (key: string) => {
      if (key.startsWith('leaderboard:')) throw new Error('redis down');
      return key === 'courses:course-1' ? course : null;
    });

    const result = await service.getLeaderboard('course-1');

    expect(result).toHaveLength(2);
    expect(prisma.enrollment.findMany).toHaveBeenCalledTimes(1);
  });

  it('rejects a student who is not enrolled', async () => {
    const { service, prisma } = buildHarness();
    prisma.enrollment.findUnique.mockResolvedValue(null);

    await expect(
      service.getLeaderboard('course-1', 'user-9', 'student'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.enrollment.findMany).not.toHaveBeenCalled();
  });
});

/**
 * A11 (Lote 3) — `getCertificate` emite código v2 (HMAC + versão +
 * expiração) e falha fechado sem `CERTIFICATE_HMAC_SECRET`.
 */
describe('CoursesService.getCertificate (A11)', () => {
  const SECRET = 'test-cert-secret-0123456789abcdef0123456789abcdef';
  const completedAt = new Date('2026-11-01T10:00:00.000Z');

  function buildHarness(secret: string | undefined) {
    const cacheStore = new Map<string, unknown>();
    cacheStore.set('courses:course-1', { id: 'course-1', title: 'Curso 1' });
    const cache = {
      get: jest.fn(async (key: string) => cacheStore.get(key) ?? null),
      set: jest.fn(async () => undefined),
      del: jest.fn(async () => undefined),
      delPattern: jest.fn(async () => undefined),
    };
    const prisma = {
      course: { findUnique: jest.fn() },
      enrollment: {
        findUnique: jest.fn().mockResolvedValue({ id: 'enr-1' }),
      },
      activity: { count: jest.fn().mockResolvedValue(1) },
      submission: {
        // M2: getCertificate agora agrupa no banco (groupBy por
        // activityId + _max createdAt) em vez de findMany + Set em JS.
        groupBy: jest.fn().mockResolvedValue([
          { activityId: 'act-1', _max: { createdAt: completedAt } },
        ]),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ name: 'Aluna' }) },
    };
    const config = {
      get: jest.fn((key: string) =>
        key === 'CERTIFICATE_HMAC_SECRET' ? secret : undefined,
      ),
    };
    const service = new CoursesService(
      prisma as any,
      cache as any,
      config as any,
      {} as any,
    );
    return { service };
  }

  it('issues a v2 HMAC code that verifies with the configured secret', async () => {
    const { service } = buildHarness(SECRET);

    const result = await service.getCertificate('course-1', 'user-1');

    expect(result.verificationCode.startsWith('v2:')).toBe(true);
    const verified = verifyCertificateCode(SECRET, result.verificationCode);
    expect(verified.valid).toBe(true);
    if (verified.valid) {
      expect(verified.userId).toBe('user-1');
      expect(verified.courseId).toBe('course-1');
      expect(verified.completedAt).toEqual(completedAt);
    }
    expect(result.studentName).toBe('Aluna');
    expect(result.completedAt).toEqual(completedAt);
  });

  it('fails closed when CERTIFICATE_HMAC_SECRET is missing', async () => {
    const { service } = buildHarness(undefined);

    await expect(
      service.getCertificate('course-1', 'user-1'),
    ).rejects.toBeInstanceOf(ConfigError);
  });

  it('M2: duplicate passed submissions for the same activity count once (groupBy dedupes by activityId)', async () => {
    const { service } = buildHarness(SECRET);
    // 2 atividades no curso; o aluno passou 3 vezes na act-1 e 1 vez na
    // act-2 — o groupBy devolve 1 linha por atividade (não 4).
    const prisma = (service as any).prisma;
    prisma.activity.count.mockResolvedValue(2);
    prisma.submission.groupBy.mockResolvedValue([
      { activityId: 'act-1', _max: { createdAt: new Date('2026-11-01T09:00:00.000Z') } },
      { activityId: 'act-2', _max: { createdAt: completedAt } },
    ]);

    const result = await service.getCertificate('course-1', 'user-1');

    expect(result.completedAt).toEqual(completedAt);
    expect(prisma.submission.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['activityId'],
        where: expect.objectContaining({ userId: 'user-1', status: 'passed' }),
        _max: { createdAt: true },
      }),
    );
  });
});

/**
 * M2 (Lote 4) — agregações no banco + paginação das listagens.
 * - `getCourseAnalytics`: groupBy (atividade, status) em vez de
 *   `include: { submissions }` + filter/length em JS — mesmos totais.
 * - `getEnrollments`: skip/take no banco (padrão 50, teto 100).
 */
describe('CoursesService analytics + enrollments (M2)', () => {
  function buildHarness() {
    const cacheStore = new Map<string, unknown>();
    cacheStore.set('courses:course-1', { id: 'course-1', title: 'Curso 1' });
    const cache = {
      get: jest.fn(async (key: string) => cacheStore.get(key) ?? null),
      set: jest.fn(async () => undefined),
      del: jest.fn(async () => undefined),
      delPattern: jest.fn(async () => undefined),
    };
    const prisma = {
      course: { findUnique: jest.fn() },
      enrollment: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([]),
      },
      activity: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'act-1', title: 'Soma' },
          { id: 'act-2', title: 'Laço' },
          { id: 'act-3', title: 'Função' },
        ]),
      },
      submission: {
        groupBy: jest.fn().mockResolvedValue([
          { activityId: 'act-1', status: 'passed', _count: { _all: 2 } },
          { activityId: 'act-1', status: 'failed', _count: { _all: 1 } },
          { activityId: 'act-2', status: 'failed', _count: { _all: 4 } },
        ]),
      },
    };
    const service = new CoursesService(
      prisma as any,
      cache as any,
      { get: jest.fn() } as any,
      {} as any,
    );
    return { service, prisma };
  }

  it('aggregates in the DB (groupBy) and returns the same totals as the old in-memory computation', async () => {
    const { service, prisma } = buildHarness();

    const result = await service.getCourseAnalytics('course-1', undefined, 'admin');

    expect(prisma.submission.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['activityId', 'status'],
        where: { activity: { courseId: 'course-1' } },
        _count: { _all: true },
      }),
    );
    // Não há mais include de submissions: as atividades vêm só com id/título.
    expect(prisma.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true, title: true } }),
    );
    expect(result.enrollmentsCount).toBe(2);
    expect(result.activitiesStats).toEqual([
      { activityId: 'act-1', title: 'Soma', totalAttempts: 3, passedCount: 2, passRate: 67 },
      { activityId: 'act-2', title: 'Laço', totalAttempts: 4, passedCount: 0, passRate: 0 },
      { activityId: 'act-3', title: 'Função', totalAttempts: 0, passedCount: 0, passRate: 0 },
    ]);
  });

  it('paginates enrollments with skip/take (page 2, limit 20)', async () => {
    const { service, prisma } = buildHarness();

    await service.getEnrollments('course-1', undefined, 'admin', 2, 20);

    expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
  });

  it('clamps the enrollments limit to 100 and defaults to page 1 / limit 50', async () => {
    const { service, prisma } = buildHarness();

    await service.getEnrollments('course-1', undefined, 'admin', 1, 500);
    expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 100 }),
    );

    await service.getEnrollments('course-1', undefined, 'admin');
    expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
  });
});
