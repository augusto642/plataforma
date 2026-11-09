import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../cache/cache.service';
import { ConfigError } from '../config/secrets.validation';
import { GiteaService } from '../gitea/gitea.service';
import { PrismaService } from '../prisma/prisma.service';
import { CoursesService } from './courses.service';
import { buildCertificateCode, verifyCertificateCode } from './certificate-code';
import { CreateCourseDto } from './dto/create-course.dto';

const TEST_CERT_SECRET = 'test-cert-secret-0123456789abcdef0123456789abcdef';

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

/**
 * Specs de fumaça do CoursesService (B04) — antes este módulo tinha zero
 * testes. Cobre criação (feliz + slug duplicado), listagem com cache
 * (miss popula o cache, hit não toca o banco), leitura por id
 * (feliz + não encontrado) e matrícula por código de turma
 * (inválido + nova + já matriculado).
 */
describe('CoursesService', () => {
  let service: CoursesService;

  const instructorId = 'instructor-1';

  const mockPrismaService = {
    course: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    enrollment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    activity: {
      count: jest.fn(),
    },
    submission: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn((key: string) =>
      key === 'CERTIFICATE_HMAC_SECRET' ? TEST_CERT_SECRET : undefined,
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: GiteaService, useValue: {} },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      title: 'Lógica de Programação',
      slug: 'logica-de-programacao',
      description: 'Curso introdutório',
    } as CreateCourseDto;

    it('cria o curso com código de turma de 8 caracteres e invalida a lista em cache', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);
      mockPrismaService.course.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'course-1',
          ...data,
          instructor: { id: instructorId, name: 'Prof', email: 'prof@ex.com' },
        }),
      );

      const result = await service.create(instructorId, dto);

      expect(result.id).toBe('course-1');
      expect(result.instructorId).toBe(instructorId);
      expect(result.enrollmentCode).toMatch(/^[A-Z0-9]{8}$/);
      expect(mockCacheService.del).toHaveBeenCalledWith('courses:list');
    });

    it('lança ConflictException quando o slug já está em uso', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({ id: 'other' });

      await expect(service.create(instructorId, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(mockPrismaService.course.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('busca no banco e popula o cache quando não há cache', async () => {
      const courses = [{ id: 'course-1', title: 'Lógica' }];
      mockPrismaService.course.findMany.mockResolvedValue(courses);

      const result = await service.findAll();

      expect(result).toEqual(courses);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'courses:list',
        courses,
        60,
      );
    });

    it('retorna o cache sem tocar o banco quando há cache', async () => {
      const cached = [{ id: 'course-cached', title: 'Do cache' }];
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.findAll();

      expect(result).toEqual(cached);
      expect(mockPrismaService.course.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('retorna o curso e grava no cache', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const course = { id: 'course-1', title: 'Lógica', activities: [] };
      mockPrismaService.course.findUnique.mockResolvedValue(course);

      const result = await service.findById('course-1');

      expect(result).toEqual(course);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'courses:course-1',
        course,
        120,
      );
    });

    it('lança NotFoundException quando o curso não existe', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('joinByCode', () => {
    const course = { id: 'course-1', title: 'Lógica', slug: 'logica' };

    it('lança NotFoundException para código de turma inválido', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        service.joinByCode('student-1', { code: 'XXXX0000' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrismaService.enrollment.create).not.toHaveBeenCalled();
    });

    it('matricula o aluno quando ele ainda não está matriculado', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(course);
      mockPrismaService.enrollment.findUnique.mockResolvedValue(null);
      mockPrismaService.enrollment.create.mockResolvedValue({ id: 'enr-1' });

      const result = await service.joinByCode('student-1', { code: ' abcd1234 ' });

      expect(result).toEqual({ course });
      // O código é normalizado (trim + maiúsculas) antes da busca.
      expect(mockPrismaService.course.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { enrollmentCode: 'ABCD1234' } }),
      );
      expect(mockPrismaService.enrollment.create).toHaveBeenCalledWith({
        data: { userId: 'student-1', courseId: 'course-1' },
      });
    });

    it('não duplica a matrícula de quem já está matriculado', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(course);
      mockPrismaService.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });

      const result = await service.joinByCode('student-1', { code: 'ABCD1234' });

      expect(result).toEqual({ course });
      expect(mockPrismaService.enrollment.create).not.toHaveBeenCalled();
    });
  });

  // B30 (Sprint 10) — a verificação pública de certificados consulta
  // apenas o código persistido na emissão. Antes, a página /verify
  // fabricava um certificado "válido" para qualquer hash digitado.
  describe('certificados (B30)', () => {
    const issuedAt = new Date('2026-03-05T18:42:19Z');
    const validCode = buildCertificateCode(TEST_CERT_SECRET, {
      userId: 'student-1',
      courseId: 'course-1',
      completedAt: issuedAt,
    });

    beforeEach(() => {
      mockPrismaService.enrollment.findUnique.mockReset();
      mockPrismaService.enrollment.update.mockReset();
      mockPrismaService.submission.groupBy.mockReset();
    });

    it('verifyCertificateByCode devolve o registro real de um código emitido', async () => {
      mockPrismaService.enrollment.findUnique.mockResolvedValue({
        certificateCode: validCode,
        certificateIssuedAt: issuedAt,
        user: { name: 'Maria Silva' },
        course: { title: 'APIs com Go', slug: 'apis-go' },
      });

      const result = await service.verifyCertificateByCode(validCode);

      expect(result).toEqual({
        valid: true,
        studentName: 'Maria Silva',
        courseTitle: 'APIs com Go',
        courseSlug: 'apis-go',
        completedAt: issuedAt,
        verificationCode: validCode,
      });
      expect(mockPrismaService.enrollment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_courseId: { userId: 'student-1', courseId: 'course-1' },
          },
        }),
      );
    });

    it('verifyCertificateByCode rejeita código v1 legado (64 hex) sem tocar o banco', async () => {
      await expect(service.verifyCertificateByCode('a'.repeat(64))).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockPrismaService.enrollment.findUnique).not.toHaveBeenCalled();
    });

    it('verifyCertificateByCode rejeita código v2 com assinatura adulterada', async () => {
      const tampered = `${validCode.slice(0, -1)}${validCode.endsWith('0') ? '1' : '0'}`;

      await expect(service.verifyCertificateByCode(tampered)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockPrismaService.enrollment.findUnique).not.toHaveBeenCalled();
    });

    it('verifyCertificateByCode lança NotFound para código v2 válido sem matrícula', async () => {
      mockPrismaService.enrollment.findUnique.mockResolvedValue(null);

      await expect(service.verifyCertificateByCode(validCode)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('verifyCertificateByCode lança NotFound para lixo (sem tocar o banco)', async () => {
      await expect(service.verifyCertificateByCode('check')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.verifyCertificateByCode('')).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrismaService.enrollment.findUnique).not.toHaveBeenCalled();
    });

    it('getCertificate persiste o código na matrícula na primeira emissão', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: 'course-1',
        title: 'APIs com Go',
        slug: 'apis-go',
      });
      mockPrismaService.enrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        certificateCode: null,
      });
      mockPrismaService.activity.count.mockResolvedValue(1);
      mockPrismaService.submission.groupBy.mockResolvedValue([
        { activityId: 'act-1', _max: { createdAt: issuedAt } },
      ]);
      mockPrismaService.user.findUnique.mockResolvedValue({ name: 'Maria Silva' });
      mockPrismaService.enrollment.update.mockResolvedValue({});

      const result = await service.getCertificate('course-1', 'student-1');

      expect(result.studentName).toBe('Maria Silva');
      expect(result.verificationCode.startsWith('v2:')).toBe(true);
      expect(mockPrismaService.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            certificateCode: result.verificationCode,
            certificateIssuedAt: issuedAt,
          }),
        }),
      );
    });

    it('getCertificate não sobrescreve o código já emitido', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: 'course-1',
        title: 'APIs com Go',
        slug: 'apis-go',
      });
      mockPrismaService.enrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        certificateCode: validCode,
      });
      mockPrismaService.activity.count.mockResolvedValue(1);
      mockPrismaService.submission.groupBy.mockResolvedValue([
        { activityId: 'act-1', _max: { createdAt: issuedAt } },
      ]);
      mockPrismaService.user.findUnique.mockResolvedValue({ name: 'Maria Silva' });

      await service.getCertificate('course-1', 'student-1');

      expect(mockPrismaService.enrollment.update).not.toHaveBeenCalled();
    });
  });
});
