import { BadGatewayException, BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role } from '@prisma/client';
import { createHash, randomInt } from 'node:crypto';
import { GiteaService } from '../gitea/gitea.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { JoinCourseDto } from './dto/join-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

const ENROLLMENT_CODE_LENGTH = 8;
const ENROLLMENT_CODE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

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
        await this.cache.del('courses:public-catalog');
        await this.cache.del('courses:public-stats');
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

  /**
   * B74 (Sprint 18 · Volta 3) — leitura pública da vitrine: cursos
   * do catálogo (fora a biblioteca interna), em ordem de criação,
   * com as atividades em ordem de trilha. O formato é o contrato da
   * landing: activityCount vem do _count real e a ementa resumida é
   * a lista real de títulos — a vitrine não estima número nenhum.
   */
  async findPublicCatalog() {
    const cached = await this.cache.get<any[]>('courses:public-catalog');
    if (cached) return cached;

    const courses = await this.prisma.course.findMany({
      where: { isPublicLibrary: false },
      select: {
        slug: true,
        title: true,
        description: true,
        activities: {
          orderBy: { order: 'asc' },
          select: { title: true, language: true },
        },
        _count: { select: { activities: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const catalog = courses.map((course) => ({
      slug: course.slug,
      title: course.title,
      description: course.description,
      activityCount: course._count.activities,
      activities: course.activities.map((activity) => ({
        title: activity.title,
        language: activity.language,
      })),
    }));

    await this.cache.set('courses:public-catalog', catalog, 60);
    return catalog;
  }

  /**
   * B77 (Sprint 19 · destravamento B3) — os números reais que a
   * landing passa a exibir na faixa de estatísticas. TODOS saem de
   * contagens vivas do banco, com a mesma definição das fontes que
   * a página já usa — nada hardcoded, nada estimado:
   * - publishedCourses: cursos do catálogo público (a MESMA régua
   *   do findPublicCatalog: fora a biblioteca interna);
   * - publishedActivities: atividades desses cursos;
   * - registeredStudents: contas com papel de aluno — admin e
   *   instrutor ficam fora pela própria role, e nenhum dado
   *   individual sai daqui, só o agregado;
   * - planInterestTotal: interessados nos planos pagos, na mesma
   *   soma do PlanInterestService.counts() (leads por e-mail +
   *   registros de conta; a vinculação no cadastro impede contar
   *   a mesma pessoa duas vezes).
   * Zero é devolvido como zero: quem formata a exibição é a
   * landing, e zero real se exibe como zero (padrão B50/B72).
   */
  async findPublicStats() {
    const cached = await this.cache.get<{
      publishedCourses: number;
      publishedActivities: number;
      registeredStudents: number;
      planInterestTotal: number;
    }>('courses:public-stats');
    if (cached) return cached;

    const [
      publishedCourses,
      publishedActivities,
      registeredStudents,
      interestLeads,
      interestAccounts,
    ] = await Promise.all([
      this.prisma.course.count({ where: { isPublicLibrary: false } }),
      this.prisma.activity.count({
        where: { course: { isPublicLibrary: false } },
      }),
      this.prisma.user.count({ where: { role: Role.student } }),
      this.prisma.planInterestLead.count(),
      this.prisma.planInterest.count(),
    ]);

    const stats = {
      publishedCourses,
      publishedActivities,
      registeredStudents,
      planInterestTotal: interestLeads + interestAccounts,
    };

    await this.cache.set('courses:public-stats', stats, 60);
    return stats;
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
            // Rodada 3 (R9) — a página do curso agrupa por segmento
            // incremental e exibe o selo factual a partir do payload.
            lessonPayload: true,
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
    await this.cache.del('courses:public-catalog');
    await this.cache.del('courses:public-stats');
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
        await this.cache.del('courses:public-catalog');
        await this.cache.del('courses:public-stats');
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

  async getEnrollments(courseId: string, userId?: string, userRole?: string) {
    const course = await this.findById(courseId);
    if (userRole !== 'admin' && userId && course.instructorId !== userId) {
      throw new ForbiddenException('Acesso não autorizado aos alunos deste curso');
    }
    return this.prisma.enrollment.findMany({
      where: { courseId },
      include: {
        user: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
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
    await this.cache.del('courses:public-catalog');
    await this.cache.del('courses:public-stats');
  }

  async getCourseAnalytics(courseId: string, userId?: string, userRole?: string) {
    const course = await this.findById(courseId);
    if (userRole !== 'admin' && userId && course.instructorId !== userId) {
      throw new ForbiddenException('Acesso não autorizado às métricas deste curso');
    }
    const enrollmentsCount = await this.prisma.enrollment.count({
      where: { courseId },
    });

    const activities = await this.prisma.activity.findMany({
      where: { courseId },
      include: {
        submissions: {
          select: { id: true, status: true, score: true, userId: true },
        },
      },
    });

    const activitiesStats = activities.map((act) => {
      const totalAttempts = act.submissions.length;
      const passedCount = act.submissions.filter((s) => s.status === 'passed').length;
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
      select: { id: true, certificateCode: true },
    });
    if (!enrollment) {
      throw new ForbiddenException('Você precisa estar matriculado neste curso para emitir o certificado');
    }

    const activitiesCount = await this.prisma.activity.count({ where: { courseId } });
    const passedSubmissions = await this.prisma.submission.findMany({
      where: { userId, status: 'passed', activity: { courseId } },
      select: { activityId: true, createdAt: true },
    });
    const passedActivityIds = new Set(passedSubmissions.map((s) => s.activityId));

    if (activitiesCount === 0 || passedActivityIds.size < activitiesCount) {
      throw new BadRequestException('Complete todas as atividades para emitir o certificado');
    }

    const completedAt = passedSubmissions.reduce<Date>(
      (latest, s) => (s.createdAt > latest ? s.createdAt : latest),
      passedSubmissions[0].createdAt,
    );

    const verificationCode = createHash('sha256')
      .update(`${userId}:${courseId}:${completedAt.toISOString()}`)
      .digest('hex');

    // B30 (Sprint 10) — persiste o código na matrícula na primeira
    // emissão: é esse registro que a verificação pública consulta.
    // Sem persistir, o código só existia no ato da emissão e a página
    // /verify não tinha fonte real para conferir.
    if (!enrollment.certificateCode) {
      await this.prisma.enrollment.update({
        where: { userId_courseId: { userId, courseId } },
        data: { certificateCode: verificationCode, certificateIssuedAt: completedAt },
      });
    }

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
   * B30 (Sprint 10) — verificação pública de certificado.
   * Consulta SOMENTE o código persistido na emissão
   * (Enrollment.certificateCode). Código desconhecido = certificado
   * não encontrado — nunca um registro fabricado.
   */
  async verifyCertificateByCode(rawCode: string) {
    const code = (rawCode ?? '')
      .trim()
      .toLowerCase()
      .replace(/^sha256:/, '');

    if (!/^[a-f0-9]{64}$/.test(code)) {
      throw new NotFoundException('Certificado não encontrado');
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { certificateCode: code },
      select: {
        certificateCode: true,
        certificateIssuedAt: true,
        user: { select: { name: true } },
        course: { select: { title: true, slug: true } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Certificado não encontrado');
    }

    return {
      valid: true,
      studentName: enrollment.user.name,
      courseTitle: enrollment.course.title,
      courseSlug: enrollment.course.slug,
      completedAt: enrollment.certificateIssuedAt,
      verificationCode: enrollment.certificateCode,
    };
  }

  async getLeaderboard(courseId: string, userId?: string, userRole?: string) {
    const course = await this.findById(courseId);

    if (userRole === 'student' && userId) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      if (!enrollment) {
        throw new ForbiddenException('Você precisa estar matriculado neste curso para ver o ranking');
      }
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId },
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

    const ranked = enrollments
      .map((e) => ({
        userId: e.user.id,
        name: e.user.name,
        xp: e.user.xp,
        level: e.user.level,
        streakDays: e.user.streakDays,
        badges: e.user.badges,
        completedActivitiesCount: e.user.submissions.length,
      }))
      .sort((a, b) => b.xp - a.xp || b.completedActivitiesCount - a.completedActivitiesCount);

    return ranked.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));
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
