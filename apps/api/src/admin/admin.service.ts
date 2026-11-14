import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Plan, Prisma, Role, SubmissionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { CacheService } from '../cache/cache.service';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminMetricsResponseDto } from './dto/admin-metrics.dto';
import { CreateInstructorDto } from './dto/create-instructor.dto';

const BCRYPT_ROUNDS = 12;

export interface GetUsersQueryOptions {
  role?: Role;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly metrics: MetricsService,
  ) {}

  async getUsers(options: GetUsersQueryOptions = {}) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (options.role) {
      where.role = options.role;
    }

    if (options.search && options.search.trim()) {
      const search = options.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          plan: true,
          xp: true,
          level: true,
          streakDays: true,
          talentVisible: true,
          giteaUserId: true,
          lastActiveAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              enrollments: true,
              submissions: true,
              instructedCourses: true,
              badges: true,
            },
          },
        },
      }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        plan: u.plan,
        xp: u.xp,
        level: u.level,
        streakDays: u.streakDays,
        talentVisible: u.talentVisible,
        giteaUserId: u.giteaUserId,
        lastActiveAt: u.lastActiveAt,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        enrollmentsCount: u._count.enrollments,
        submissionsCount: u._count.submissions,
        instructedCoursesCount: u._count.instructedCourses,
        badgesCount: u._count.badges,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateUserRole(id: string, role: Role) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true },
    });

    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        xp: true,
        level: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    try {
      await this.cache.del(`user:${id}:profile`);
      await this.cache.delPattern('leaderboard:*');
    } catch (err: any) {
      this.logger.warn(`Failed to invalidate cache after role update for user ${id}: ${err.message}`);
    }

    this.logger.log(`User ${id} role updated from ${existing.role} to ${role}`);
    return updated;
  }

  /**
   * B32 (Sprint 10) — gestão manual de plano pelo admin: enquanto não
   * há gateway de pagamento (fora de escopo), é assim que um usuário
   * vira Pro de verdade — o campo existe, é legível e tem efeito
   * (entitlement da tutora). Espelha updateUserRole.
   */
  async updateUserPlan(id: string, plan: Plan) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, plan: true, email: true },
    });

    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { plan },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        updatedAt: true,
      },
    });

    this.logger.log(`User ${id} plan updated from ${existing.plan} to ${plan}`);
    return updated;
  }

  async createInstructor(dto: CreateInstructorDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      // Anti-enumeração de e-mail: mesma mensagem genérica do auth.service
      // register (não revela se o e-mail já existe).
      throw new ConflictException(
        'Não foi possível concluir o cadastro com os dados informados. Verifique os campos e tente novamente.',
      );
    }

    const rawPassword = dto.password || randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_ROUNDS);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          name: dto.name.trim(),
          passwordHash,
          role: Role.instructor,
          giteaUserId: dto.giteaUserId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          giteaUserId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.log(`Created instructor account: ${user.email} (${user.id})`);
      return {
        ...user,
        generatedPassword: dto.password ? undefined : rawPassword,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // Anti-enumeração de e-mail: mesma mensagem genérica do auth.service
        // register (corrida entre o pre-check e o create).
        throw new ConflictException(
          'Não foi possível concluir o cadastro com os dados informados. Verifique os campos e tente novamente.',
        );
      }
      throw e;
    }
  }

  async getMetrics(): Promise<AdminMetricsResponseDto> {
    const cached = await this.cache
      .get<AdminMetricsResponseDto>('admin:metrics:snapshot')
      .catch(() => null);
    if (cached && typeof cached === 'object' && (cached as any).platform) {
      return cached;
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let totalUsers = 0;
    let studentUsers = 0;
    let instructorUsers = 0;
    let adminUsers = 0;
    let activeUsers24h = 0;
    let totalCourses = 0;
    let publicCourses = 0;
    let totalEnrollments = 0;
    let totalActivities = 0;
    let totalSubmissions = 0;
    let passedSubmissions = 0;
    let failedSubmissions = 0;
    let pendingOrRunningSubmissions = 0;

    const canGroupBy =
      typeof this.prisma.user?.groupBy === 'function' &&
      typeof this.prisma.submission?.groupBy === 'function' &&
      typeof this.prisma.course?.groupBy === 'function';

    if (canGroupBy) {
      const [
        usersByRole,
        activeUsers,
        coursesByPublic,
        enrollmentsCount,
        activitiesCount,
        submissionsByStatus,
      ] = await Promise.all([
        this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
        this.prisma.user.count({ where: { lastActiveAt: { gte: last24h } } }),
        this.prisma.course.groupBy({ by: ['isPublicLibrary'], _count: { _all: true } }),
        this.prisma.enrollment.count(),
        this.prisma.activity.count(),
        this.prisma.submission.groupBy({ by: ['status'], _count: { _all: true } }),
      ]);

      activeUsers24h = activeUsers;
      totalEnrollments = enrollmentsCount;
      totalActivities = activitiesCount;

      for (const group of usersByRole) {
        const c = group._count._all;
        totalUsers += c;
        if (group.role === Role.student) studentUsers = c;
        else if (group.role === Role.instructor) instructorUsers = c;
        else if (group.role === Role.admin) adminUsers = c;
      }

      for (const group of coursesByPublic) {
        const c = group._count._all;
        totalCourses += c;
        if (group.isPublicLibrary) publicCourses = c;
      }

      for (const group of submissionsByStatus) {
        const c = group._count._all;
        totalSubmissions += c;
        if (group.status === SubmissionStatus.passed) passedSubmissions = c;
        else if (group.status === SubmissionStatus.failed) failedSubmissions = c;
        else if (
          group.status === SubmissionStatus.pending ||
          group.status === SubmissionStatus.queued ||
          group.status === SubmissionStatus.running
        ) {
          pendingOrRunningSubmissions += c;
        }
      }
    } else {
      [
        totalUsers,
        studentUsers,
        instructorUsers,
        adminUsers,
        activeUsers24h,
        totalCourses,
        publicCourses,
        totalEnrollments,
        totalActivities,
        totalSubmissions,
        passedSubmissions,
        failedSubmissions,
        pendingOrRunningSubmissions,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: Role.student } }),
        this.prisma.user.count({ where: { role: Role.instructor } }),
        this.prisma.user.count({ where: { role: Role.admin } }),
        this.prisma.user.count({ where: { lastActiveAt: { gte: last24h } } }),
        this.prisma.course.count(),
        this.prisma.course.count({ where: { isPublicLibrary: true } }),
        this.prisma.enrollment.count(),
        this.prisma.activity.count(),
        this.prisma.submission.count(),
        this.prisma.submission.count({ where: { status: SubmissionStatus.passed } }),
        this.prisma.submission.count({ where: { status: SubmissionStatus.failed } }),
        this.prisma.submission.count({
          where: {
            status: {
              in: [
                SubmissionStatus.pending,
                SubmissionStatus.queued,
                SubmissionStatus.running,
              ],
            },
          },
        }),
      ]);
    }

    const passRate = totalSubmissions > 0
      ? Math.round((passedSubmissions / totalSubmissions) * 1000) / 10
      : 0;

    const memory = process.memoryUsage();
    const metricsSnapshot = this.metrics.snapshot();

    let cacheStatus: 'connected' | 'degraded' | 'unavailable' = 'connected';
    let pingLatencyMs = 0;
    try {
      const pingStart = Date.now();
      await this.cache.set('admin:metrics:ping', '1', 5);
      await this.cache.get('admin:metrics:ping');
      pingLatencyMs = Date.now() - pingStart;
    } catch {
      cacheStatus = 'unavailable';
    }

    const response: AdminMetricsResponseDto = {
      timestamp: now.toISOString(),
      system: {
        uptimeSeconds: Math.round(process.uptime()),
        memory: {
          rssMb: Math.round((memory.rss / (1024 * 1024)) * 100) / 100,
          heapTotalMb: Math.round((memory.heapTotal / (1024 * 1024)) * 100) / 100,
          heapUsedMb: Math.round((memory.heapUsed / (1024 * 1024)) * 100) / 100,
          externalMb: Math.round((memory.external / (1024 * 1024)) * 100) / 100,
        },
        nodeVersion: process.version,
        platform: process.platform,
        httpRequestsTotal: metricsSnapshot.requestsTotal,
        httpErrorsTotal: metricsSnapshot.errorsTotal,
        avgLatencyMs: metricsSnapshot.avgLatencyMs,
        activeSubmissions: (this.metrics as any).activeSubmissions ?? 0,
      },
      platform: {
        users: {
          total: totalUsers,
          students: studentUsers,
          instructors: instructorUsers,
          admins: adminUsers,
          activeLast24h: activeUsers24h,
        },
        courses: {
          total: totalCourses,
          publicLibrary: publicCourses,
          totalEnrollments,
        },
        activities: {
          total: totalActivities,
        },
        submissions: {
          total: totalSubmissions,
          passed: passedSubmissions,
          failed: failedSubmissions,
          pendingOrRunning: pendingOrRunningSubmissions,
          passRate,
        },
      },
      cache: {
        status: cacheStatus,
        pingLatencyMs,
      },
    };

    await this.cache
      .set('admin:metrics:snapshot', response, 30)
      .catch(() => {});

    return response;
  }

  async getHealth() {
    const services: Record<string, 'up' | 'down'> = {
      database: 'down',
      redis: 'down',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      services.database = 'up';
    } catch (e: any) {
      this.logger.error(`Database health check failed: ${e.message}`);
    }

    try {
      await this.cache.set('admin:health:ping', '1', 5);
      const res = await this.cache.get('admin:health:ping');
      if (res === '1') {
        services.redis = 'up';
      }
    } catch (e: any) {
      this.logger.error(`Redis health check failed: ${e.message}`);
    }

    const isHealthy = services.database === 'up' && services.redis === 'up';

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      services,
    };
  }
}
