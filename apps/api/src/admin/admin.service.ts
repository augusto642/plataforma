import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, SubmissionStatus } from '@prisma/client';
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

  async createInstructor(dto: CreateInstructorDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
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
        throw new ConflictException('Email already registered');
      }
      throw e;
    }
  }

  async getMetrics(): Promise<AdminMetricsResponseDto> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
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

    return {
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
