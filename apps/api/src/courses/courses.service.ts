import { BadGatewayException, BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { GiteaService } from '../gitea/gitea.service';
import { ConfigError } from '../config/secrets.validation';
import { buildCertificateCode } from './certificate-code';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { JoinCourseDto } from './dto/join-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

const ENROLLMENT_CODE_LENGTH = 8;
const ENROLLMENT_CODE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * A4 — ranking: cache + paginação.
 * - TTL 45 s (dentro da faixa 30-60 s recomendada): o ranking muda a cada
 *   avaliação, e 45 s de defasagem é aceitável para um leaderboard.
 * - Página default 50, teto 100: o piloto tem <= 30 alunos, então a 1ª
 *   página cobre a turma inteira sem o custo de trazer todos sempre.
 * - Chave inclui curso + página + limite; a invalidação é por curso
 *   (`leaderboard:<courseId>:*`) em `evaluate`/`battleRun` e no
 *   `AdminService.updateUserRole` (que já fazia `delPattern('leaderboard:*')`
 *   sobre um cache que nunca era escrito — agora ele invalida de verdade).
 */
/**
 * A4 — entrada do ranking (contrato de `getLeaderboard`, consumido também
 * por `TalentService.getCourseLeaderboard`). Tipagem explícita: o retorno
 * passa por `cache.get<LeaderboardEntry[]>` e, sem ela, o TS inferiria
 * `unknown` nas entradas e quebraria os consumidores.
 */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  xp: number;
  level: number;
  streakDays: number;
  badges: Array<{
    id: string;
    badgeCode: string;
    title: string;
    icon: string | null;
  }>;
  completedActivitiesCount: number;
}

const LEADERBOARD_CACHE_TTL_SECONDS = 45;
const LEADERBOARD_DEFAULT_LIMIT = 50;

/**
 * M2 (Lote 4) — paginação padrão das listagens, mesmo padrão do ranking
 * (A4): 1ª página / 50 por padrão, teto 100. `page`/`limit` fora da faixa
 * são clamped, nunca rejeitados, para não quebrar clientes antigos.
 */
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

function clampPage(page: unknown, fallback = 1): number {
  return Math.max(1, Math.floor(Number(page)) || fallback);
}

function clampLimit(limit: unknown, fallback = DEFAULT_LIST_LIMIT): number {
  return Math.min(
    MAX_LIST_LIMIT,
    Math.max(1, Math.floor(Number(limit)) || fallback),
  );
}

function generateEnrollmentCode(): string {
  let code = '';
  for (let i = 0; i < ENROLLMENT_CODE_LENGTH; i++) {
    code += ENROLLMENT_CODE_CHARSET[randomInt(ENROLLMENT_CODE_CHARSET.length)];
  }
  return code;
}

function isEnrollmentCodeConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }
  const target = (error.meta?.target as string[] | string | undefined) ?? [];
  const normalized = Array.isArray(target) ? target : [target];
  return normalized.some((t) => t === 'enrollment_code' || t === 'enrollmentCode');
}

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
    private readonly gitea: GiteaService,
  ) {}

  async create(instructorId: string, dto: CreateCourseDto) {
    const existing = await this.prisma.course.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Course slug already in use');
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const course = await this.prisma.course.create({
          data: {
            title: dto.title,
            slug: dto.slug,
            description: dto.description,
            instructorId,
            enrollmentCode: generateEnrollmentCode(),
          },
          include: {
            instructor: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        await this.cache.del('courses:list');
        return course;
      } catch (error) {
        if (isEnrollmentCodeConflict(error)) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException('Não foi possível gerar um código de turma único. Tente novamente.');
  }

  async findAll() {
    const cached = await this.cache.get<any[]>('courses:list');
    if (cached) return cached;

    const courses = await this.prisma.course.findMany({
      where: { isPublicLibrary: false },
      include: {
        instructor: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { enrollments: true, activities: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    await this.cache.set('courses:list', courses, 60);
    return courses;
  }

  async findById(id: string) {
    const cached = await this.cache.get<any>(`courses:${id}`);
    if (cached) return cached;

    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: { id: true, name: true, email: true },
        },
        activities: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            language: true,
            order: true,
            createdAt: true,
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.cache.set(`courses:${id}`, course, 120);
    return course;
  }

  async update(id: string, dto: UpdateCourseDto, userId?: string, userRole?: string) {
    const course = await this.findById(id);
    if (userRole !== 'admin' && userId && course.instructorId !== userId) {
      throw new ForbiddenException('Apenas o instrutor responsável ou administradores podem editar este curso');
    }
    await this.prisma.course.update({
      where: { id },
      data: dto,
    });

    await this.cache.del(`courses:${id}`);
    await this.cache.del('courses:list');
  }

  async enroll(courseId: string, dto: EnrollStudentDto, actorId?: string, actorRole?: string) {
    const course = await this.findById(courseId);

    let targetUserId = dto.userId;
    if (!targetUserId && dto.email) {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (!user) {
        throw new NotFoundException('Student user not found');
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      throw new ConflictException('UserId or Email must be provided');
    }

    const isSelfEnrollment = actorId && targetUserId === actorId;
    if (!isSelfEnrollment && actorRole !== 'admin') {
      if (actorRole === 'instructor' && course.instructorId !== actorId) {
        throw new ForbiddenException('Apenas o instrutor responsável ou administradores podem matricurar alunos neste curso');
      }
    }

    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: targetUserId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      return existingEnrollment;
    }

    return this.prisma.enrollment.create({
      data: {
        userId: targetUserId,
        courseId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async joinByCode(userId: string, dto: JoinCourseDto) {
    const normalizedCode = dto.code.trim().toUpperCase();
    const course = await this.prisma.course.findUnique({
      where: { enrollmentCode: normalizedCode },
      select: { id: true, title: true, slug: true },
    });
    if (!course) {
      throw new NotFoundException('Código de turma inválido');
    }

    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: course.id,
        },
      },
    });

    if (!existingEnrollment) {
      await this.prisma.enrollment.create({
        data: {
          userId,
          courseId: course.id,
        },
      });
    }

    return { course };
  }

  async revealEnrollmentCode(id: string, userId?: string, userRole?: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      select: { id: true, instructorId: true, enrollmentCode: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    if (userRole !== 'admin' && userId && course.instructorId !== userId) {
      throw new ForbiddenException('Apenas o instrutor responsável ou administradores podem ver o código desta turma');
    }
    return { enrollmentCode: course.enrollmentCode };
  }

  async regenerateEnrollmentCode(id: string, userId?: string, userRole?: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      select: { id: true, instructorId: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    if (userRole !== 'admin' && userId && course.instructorId !== userId) {
      throw new ForbiddenException('Apenas o instrutor responsável ou administradores podem gerenciar o código desta turma');
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const updated = await this.prisma.course.update({
          where: { id },
          data: { enrollmentCode: generateEnrollmentCode() },
          select: { enrollmentCode: true },
        });
        await this.cache.del(`courses:${id}`);
        await this.cache.del('courses:list');
        return { enrollmentCode: updated.enrollmentCode };
      } catch (error) {
        if (isEnrollmentCodeConflict(error)) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException('Não foi possível gerar um código de turma único. Tente novamente.');
  }

  /**
   * M2 (Lote 4) — listagem paginada no banco (skip/take, teto 100).
   * Antes: `findMany` sem `take` trazia TODOS os matriculados a cada
   * chamada. O retorno continua sendo o array da página, na mesma ordem
   * (`createdAt desc`); sem `page`/`limit`, 1ª página / 50.
   */
  async getEnrollments(
    courseId: string,
    userId?: string,
    userRole?: string,
    page = 1,
    limit = DEFAULT_LIST_LIMIT,
  ) {
    const course = await this.findById(courseId);
    if (userRole !== 'admin' && userId && course.instructorId !== userId) {
      throw new ForbiddenException('Acesso não autorizado aos alunos deste curso');
    }
    const safePage = clampPage(page);
    const safeLimit = clampLimit(limit);
    return this.prisma.enrollment.findMany({
      where: { courseId },
      include: {
        user: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
  }

  async delete(id: string, userId?: string, userRole?: string) {
    const course = await this.findById(id);
    if (userRole !== 'admin' && userId && course.instructorId !== userId) {
      throw new ForbiddenException('Apenas o instrutor responsável ou administradores podem excluir este curso');
    }
    await this.prisma.course.delete({ where: { id } });

    await this.cache.del(`courses:${id}`);
    await this.cache.del('courses:list');
  }

  async getCourseAnalytics(courseId: string, userId?: string, userRole?: string) {
    const course = await this.findById(courseId);
    if (userRole !== 'admin' && userId && course.instructorId !== userId) {
      throw new ForbiddenException('Acesso não autorizado às métricas deste curso');
    }
    const enrollmentsCount = await this.prisma.enrollment.count({
      where: { courseId },
    });

    // M2 (Lote 4): antes, `activity.findMany({ include: { submissions } })`
    // trazia TODAS as submissões do curso para a memória e agregava com
    // filter/length em JS. Agora a agregação é feita no banco (`groupBy`
    // por atividade+status) e só as atividades (id/título) vêm para a
    // aplicação. Números idênticos: totalAttempts = nº de submissões da
    // atividade, passedCount = as de status 'passed', passRate =
    // Math.round(passed/total*100) (0 sem tentativas). A ordem das
    // atividades é a mesma de antes (mesmo findMany, sem orderBy).
    const activities = await this.prisma.activity.findMany({
      where: { courseId },
      select: { id: true, title: true },
    });

    const grouped = await this.prisma.submission.groupBy({
      by: ['activityId', 'status'],
      where: { activity: { courseId } },
      _count: { _all: true },
    });

    const attemptsByActivity = new Map<string, { total: number; passed: number }>();
    for (const row of grouped) {
      const entry = attemptsByActivity.get(row.activityId) ?? { total: 0, passed: 0 };
      entry.total += row._count._all;
      if (row.status === 'passed') entry.passed += row._count._all;
      attemptsByActivity.set(row.activityId, entry);
    }

    const activitiesStats = activities.map((act) => {
      const { total: totalAttempts, passed: passedCount } =
        attemptsByActivity.get(act.id) ?? { total: 0, passed: 0 };
      const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;
      return {
        activityId: act.id,
        title: act.title,
        totalAttempts,
        passedCount,
        passRate,
      };
    });

    return {
      courseId: course.id,
      courseTitle: course.title,
      enrollmentsCount,
      activitiesStats,
    };
  }

  async getStudentReport(courseId: string, studentId: string, userId?: string, userRole?: string) {
    const course = await this.findById(courseId);
    if (userRole !== 'admin' && userId && course.instructorId !== userId) {
      throw new ForbiddenException('Acesso não autorizado ao relatório deste aluno');
    }

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true },
    });
    if (!student) {
      throw new NotFoundException('Aluno não encontrado');
    }

    const activities = await this.prisma.activity.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      select: { id: true, title: true },
    });
    const activityIds = activities.map((a) => a.id);

    const submissions = activityIds.length
      ? await this.prisma.submission.findMany({
          where: { userId: studentId, activityId: { in: activityIds } },
          select: { activityId: true, status: true, score: true, durationMs: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    const statusRank: Record<string, number> = { passed: 3, failed: 2, error: 1 };
    const submissionsByActivity = new Map<string, typeof submissions>();
    for (const submission of submissions) {
      const list = submissionsByActivity.get(submission.activityId) ?? [];
      list.push(submission);
      submissionsByActivity.set(submission.activityId, list);
    }

    const activitiesReport = activities.map((act) => {
      const subs = submissionsByActivity.get(act.id) ?? [];
      let bestStatus = 'none';
      let bestScore: number | null = null;
      let lastAttemptAt: Date | null = null;
      for (const sub of subs) {
        if ((statusRank[sub.status] ?? 0) > (statusRank[bestStatus] ?? 0)) {
          bestStatus = sub.status;
        }
        if (typeof sub.score === 'number' && (bestScore === null || sub.score > bestScore)) {
          bestScore = sub.score;
        }
        if (!lastAttemptAt || sub.createdAt > lastAttemptAt) {
          lastAttemptAt = sub.createdAt;
        }
      }
      return {
        activityId: act.id,
        title: act.title,
        status: bestStatus,
        attempts: subs.length,
        bestScore,
        lastAttemptAt,
      };
    });

    const submissionsTotal = submissions.length;
    const passedTotal = submissions.filter((s) => s.status === 'passed').length;
    const scoreSum = submissions.reduce((acc, s) => acc + (typeof s.score === 'number' ? s.score : 0), 0);
    const avgScore = submissionsTotal > 0 ? Math.round((scoreSum / submissionsTotal) * 100) / 100 : 0;
    const totalDurationMs = submissions.reduce((acc, s) => acc + (s.durationMs ?? 0), 0);

    return {
      student,
      courseTitle: course.title,
      submissionsTotal,
      passedTotal,
      avgScore,
      totalDurationMs,
      activities: activitiesReport,
    };
  }

  async getCertificate(courseId: string, userId: string) {
    const course = await this.findById(courseId);

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true },
    });
    if (!enrollment) {
      throw new ForbiddenException('Você precisa estar matriculado neste curso para emitir o certificado');
    }

    const activitiesCount = await this.prisma.activity.count({ where: { courseId } });
    // M2 (Lote 4): antes, `findMany` de TODAS as submissões passed do aluno
    // no curso (activityId + createdAt) + `Set` + `reduce` em JS. Agora o
    // banco agrupa por atividade (uma linha por atividade concluída) e
    // devolve só o createdAt máximo de cada uma — a mesma cardinalidade do
    // Set e o mesmo completedAt (o mais recente entre as atividades).
    // Submissões duplicadas na mesma atividade não inflam mais a contagem
    // nem no banco nem na aplicação: o groupBy já deduplica por activityId.
    const passedGroups = await this.prisma.submission.groupBy({
      by: ['activityId'],
      where: { userId, status: 'passed', activity: { courseId } },
      _max: { createdAt: true },
    });
    const passedActivityIds = new Set(passedGroups.map((g) => g.activityId));

    if (activitiesCount === 0 || passedActivityIds.size < activitiesCount) {
      throw new BadRequestException('Complete todas as atividades para emitir o certificado');
    }

    // Aqui passedGroups é não vazio (o guarda acima garante size >= count
    // >= 1) e cada grupo tem >= 1 linha, então _max.createdAt é não nulo.
    const completedAt = passedGroups.reduce<Date>(
      (latest, g) => {
        const d = g._max.createdAt ?? latest;
        return d > latest ? d : latest;
      },
      passedGroups[0]._max.createdAt as Date,
    );

    // A11 (Lote 3): o código antigo era `sha256(userId:courseId:completedAt)`
    // sem segredo — pré-computável por qualquer um (userId vaza no
    // leaderboard, courseId é público, completedAt é dedutível) e sem
    // expiração. O código novo é v2: HMAC-SHA256 com o segredo dedicado
    // `CERTIFICATE_HMAC_SECRET` + versão + expiração embutida
    // (`certificate-code.ts`). Fail-closed: sem o segredo a emissão recusa
    // subir/emitir em vez de emitir um código forjável.
    const certificateSecret = this.config.get<string>('CERTIFICATE_HMAC_SECRET');
    if (!certificateSecret) {
      throw new ConfigError('CERTIFICATE_HMAC_SECRET is required');
    }
    const verificationCode = buildCertificateCode(certificateSecret, {
      userId,
      courseId,
      completedAt,
    });

    const student = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    return {
      studentName: student?.name ?? 'Aluno',
      courseTitle: course.title,
      courseSlug: course.slug,
      completedAt,
      verificationCode,
    };
  }

  /**
   * A4 — ranking paginado e cacheado por curso.
   *
   * Antes: `findMany` sem `take`/`orderBy`, `.sort()` em memória e retorno
   * de TODOS os matriculados a cada chamada, sem cache.
   *
   * Agora: ordenação no banco (`user.xp desc`, desempate determinístico por
   * `user.createdAt asc` — o desempate antigo por nº de atividades
   * concluídas não é exprimível em `orderBy` do Prisma e foi removido;
   * a contagem continua sendo retornada por linha), `skip`/`take` por
   * página, e cache Redis de 45 s por (curso, página, limite).
   *
   * Contrato preservado: retorna o array da página (`rank` já com o offset
   * da página). `page`/`limit` fora da faixa são clamped (limit 1..100).
   * Falha do Redis é fail-open: ignora o cache e vai ao banco (o ranking
   * nunca quebra porque o cache caiu). O `TalentService` chama sem
   * `page`/`limit` e recebe a 1ª página (50) — suficiente no piloto.
   */
  async getLeaderboard(
    courseId: string,
    userId?: string,
    userRole?: string,
    page = 1,
    limit = LEADERBOARD_DEFAULT_LIMIT,
  ): Promise<LeaderboardEntry[]> {
    const course = await this.findById(courseId);

    if (userRole === 'student' && userId) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      if (!enrollment) {
        throw new ForbiddenException('Você precisa estar matriculado neste curso para ver o ranking');
      }
    }

    const safePage = clampPage(page);
    const safeLimit = clampLimit(limit, LEADERBOARD_DEFAULT_LIMIT);
    const skip = (safePage - 1) * safeLimit;
    const cacheKey = `leaderboard:${courseId}:p${safePage}:l${safeLimit}`;

    try {
      const cached = await this.cache.get<LeaderboardEntry[]>(cacheKey);
      if (cached) return cached;
    } catch (err: any) {
      this.logger.warn(`Leaderboard cache read failed (${cacheKey}): ${err?.message}`);
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId },
      orderBy: [{ user: { xp: 'desc' } }, { user: { createdAt: 'asc' } }],
      skip,
      take: safeLimit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            xp: true,
            level: true,
            streakDays: true,
            badges: {
              select: { id: true, badgeCode: true, title: true, icon: true },
            },
            submissions: {
              where: {
                activity: { courseId },
                status: 'passed',
              },
              distinct: ['activityId'],
              select: { id: true },
            },
          },
        },
      },
    });

    const ranked = enrollments.map((e) => ({
      userId: e.user.id,
      name: e.user.name,
      xp: e.user.xp,
      level: e.user.level,
      streakDays: e.user.streakDays,
      badges: e.user.badges,
      completedActivitiesCount: e.user.submissions.length,
    }));

    const result = ranked.map((item, index) => ({
      rank: skip + index + 1,
      ...item,
    }));

    try {
      await this.cache.set(cacheKey, result, LEADERBOARD_CACHE_TTL_SECONDS);
    } catch (err: any) {
      this.logger.warn(`Leaderboard cache write failed (${cacheKey}): ${err?.message}`);
    }

    return result;
  }

  private giteaUsernameFor(email: string, userId: string): string {
    const slug = (email || '')
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 32);
    if (slug) return slug;
    return `user-${userId.replace(/-/g, '').slice(0, 8)}`;
  }

  async provisionGit(courseId: string, userId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true },
    });
    if (!enrollment) {
      throw new ForbiddenException('Você precisa estar matriculado');
    }

    const giteaEnabled = this.config.get<string>('GITEA_ENABLED') !== 'false';
    if (!giteaEnabled) {
      throw new ServiceUnavailableException('Integração Git indisponível nesta instalação');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { slug: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const org = this.config.get<string>('GITEA_ORG') || 'plataforma';
    const giteaUsername = this.giteaUsernameFor(user.email, userId);
    const repoName = `${course.slug}-${giteaUsername}`.toLowerCase();
    const repoFullName = `${org}/${repoName}`;

    const existing = await this.prisma.studentRepo.findUnique({
      where: { userId_repoFullName: { userId, repoFullName } },
    });
    if (existing) {
      return { repoFullName: existing.repoFullName, cloneUrl: this.buildCloneUrl(existing.repoFullName) };
    }

    try {
      await this.gitea.createUser({
        username: giteaUsername,
        email: user.email,
      });
      await this.gitea.createOrgRepo({
        name: repoName,
        isPrivate: true,
        autoInit: true,
      });
    } catch {
      throw new BadGatewayException('Falha ao provisionar repositório no Gitea');
    }

    try {
      await this.prisma.studentRepo.create({
        data: { userId, repoFullName, giteaUsername },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { repoFullName, cloneUrl: this.buildCloneUrl(repoFullName) };
      }
      throw error;
    }

    return { repoFullName, cloneUrl: this.buildCloneUrl(repoFullName) };
  }

  private buildCloneUrl(repoFullName: string): string {
    const base = (
      this.config.get<string>('GITEA_PUBLIC_URL') ||
      this.config.get<string>('GITEA_URL') ||
      'http://localhost:3030'
    ).replace(/\/+$/, '');
    return `${base}/${repoFullName}.git`;
  }
}
