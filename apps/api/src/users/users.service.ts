import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { GiteaService } from '../gitea/gitea.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gitea: GiteaService,
  ) {}

  async list() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        giteaUserId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const role: Role = dto.role ?? 'student';
    try {
      return await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          passwordHash,
          role,
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
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw e;
    }
  }

  async delete(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Derive the Gitea identity BEFORE removing the Postgres row.
    const giteaUsername = this.giteaUsernameFor(user);

    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (e) {
      // Instrutor com cursos (Course.instructor onDelete: Restrict): o titular
      // não pode receber 500 — orientamos a transferência de ownership.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new ConflictException(
          'Conta possui cursos como instrutor. Transfira a propriedade dos cursos antes de excluir.',
        );
      }
      throw e;
    }

    if (!giteaUsername) {
      this.logger.warn(`deletionQueued: no Gitea username derivable for user ${id}, skipping Gitea propagation`);
      return;
    }

    // Exact candidate repo names ({slug}-{username} / {template}-{username})
    // so Gitea propagation never touches another student's repo.
    const candidateRepoNames = await this.giteaRepoCandidates(giteaUsername);

    // Propagate deletion to Gitea, tolerating failures: the titular must never
    // receive a 500 because Gitea is unavailable.
    try {
      const result = await this.gitea.propagateDeletion(
        giteaUsername,
        candidateRepoNames,
      );
      if (result.pending) {
        this.logger.warn(
          `deletionQueued: Gitea data for user ${id} partially removed (username=${giteaUsername})`,
          JSON.stringify(result),
        );
      } else {
        this.logger.log(`Gitea data for user ${id} removed (username=${giteaUsername})`);
      }
    } catch (err: any) {
      this.logger.warn(
        `deletionQueued: Gitea propagation failed for user ${id} (username=${giteaUsername}): ${err.message}`,
      );
    }
  }

  giteaUsernameFor(user: { email: string; name: string }): string | null {
    const fromEmail = (user.email || '')
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, '');
    if (fromEmail) return fromEmail;
    const fromName = (user.name || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    return fromName || null;
  }

  private async giteaRepoCandidates(username: string): Promise<string[]> {
    try {
      const activities = await this.prisma.activity.findMany({
        select: { slug: true, giteaTemplateRepo: true },
      });
      const bases = new Set<string>();
      for (const a of activities) {
        if (a.slug) bases.add(a.slug);
        if (a.giteaTemplateRepo) bases.add(a.giteaTemplateRepo);
      }
      return [...bases].map((base) => `${base}-${username}`);
    } catch {
      return [];
    }
  }

  async getUserProgress(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        level: true,
        streakDays: true,
        badges: {
          select: {
            id: true,
            badgeCode: true,
            title: true,
            description: true,
            icon: true,
            unlockedAt: true,
          },
          orderBy: { unlockedAt: 'desc' },
        },
      },
    });

    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            activities: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    const submissions = await this.prisma.submission.findMany({
      where: { userId },
      select: {
        id: true,
        activityId: true,
        status: true,
        score: true,
      },
    });

    const passedActivityIds = new Set(
      submissions.filter((s) => s.status === 'passed').map((s) => s.activityId),
    );

    const coursesProgress = enrollments.map((enr) => {
      const totalActivities = enr.course.activities.length;
      const completed = enr.course.activities.filter((a) => passedActivityIds.has(a.id)).length;
      const progressPercent = totalActivities > 0 ? Math.round((completed / totalActivities) * 100) : 0;
      return {
        courseId: enr.course.id,
        courseTitle: enr.course.title,
        slug: enr.course.slug,
        totalActivities,
        completedActivities: completed,
        progressPercent,
      };
    });

    const totalSubmissions = submissions.length;
    const scores = submissions.filter((s) => s.score !== null).map((s) => s.score as number);
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return {
      xp: user?.xp || 0,
      level: user?.level || 1,
      streakDays: user?.streakDays || 0,
      badges: user?.badges || [],
      completedActivitiesCount: passedActivityIds.size,
      totalSubmissionsCount: totalSubmissions,
      averageScore,
      coursesProgress,
    };
  }

  async updateTalentVisibility(userId: string, talentVisible: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { talentVisible },
      select: { id: true, talentVisible: true },
    });
  }

  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        giteaUserId: true,
        xp: true,
        level: true,
        streakDays: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
        badges: true,
        chatMessages: {
          select: {
            id: true,
            activityId: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
        enrollments: {
          select: {
            createdAt: true,
            course: {
              select: { id: true, title: true, slug: true },
            },
          },
        },
        submissions: {
          select: {
            id: true,
            activityId: true,
            commitSha: true,
            status: true,
            score: true,
            maxScore: true,
            durationMs: true,
            errorMessage: true,
            logs: true,
            codeSnapshot: true,
            aiFeedback: true,
            aiHints: true,
            xpAwarded: true,
            createdAt: true,
            updatedAt: true,
            testResults: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { badges, chatMessages, enrollments, submissions, ...profile } = user;

    return {
      exportedAt: new Date().toISOString(),
      sections: {
        profile,
        gamification: { badges },
        chat: { messages: chatMessages },
        enrollments: enrollments.map((e) => ({ course: e.course, enrolledAt: e.createdAt })),
        submissions,
      },
    };
  }
}