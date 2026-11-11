import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { computeCoursePath } from '../adaptation/adaptation.rules';
import { GiteaService } from '../gitea/gitea.service';
import { PrismaService } from '../prisma/prisma.service';
import { HIDDEN_TEST_FAILED_MESSAGE } from '../submissions/runner/runner.service';
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
        // Anti-enumeração de e-mail: mesma mensagem genérica do auth.service
        // register (não revela se o e-mail já existe). Ver auth.service.ts.
        throw new ConflictException(
          'Não foi possível concluir o cadastro com os dados informados. Verifique os campos e tente novamente.',
        );
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

  async checkNickname(nickname?: string): Promise<{ available: boolean; reason?: string }> {
    if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
      return {
        available: false,
        reason: 'Nickname não fornecido.',
      };
    }

    const trimmed = nickname.trim();
    const regex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!regex.test(trimmed)) {
      return {
        available: false,
        reason: 'O nickname deve ser alfanumérico e conter entre 3 e 20 caracteres.',
      };
    }

    const reserved = new Set(['admin', 'system', 'root', 'moderator', 'null', 'undefined']);
    if (reserved.has(trimmed.toLowerCase())) {
      return {
        available: false,
        reason: 'Nickname reservado pelo sistema.',
      };
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        nickname: {
          equals: trimmed,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (existing) {
      return {
        available: false,
        reason: 'Nickname indisponível ou já em uso.',
      };
    }

    return { available: true };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        nickname: true,
        role: true,
        // B32 (Sprint 10) — o plano do usuário passa a ser exposto:
        // é a leitura real da entidade criada nesta sprint.
        plan: true,
        careerTier: true,
        xp: true,
        level: true,
        streakDays: true,
        bitsBalance: true,
        streakFreezes: true,
        talentVisible: true,
        createdAt: true,
        companion: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
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
              select: { id: true, title: true, order: true, conceptTags: true },
            },
          },
        },
      },
    });

    // M2 (Lote 4): antes, `findMany` de TODAS as submissões do usuário (sem
    // take) + agregação em JS (Set de passed, soma/média de scores). Agora
    // um único `groupBy` por (atividade, status) com `_count`/`_sum`: o
    // banco devolve no máximo (#atividades × #status) linhas. Números
    // idênticos: passedActivityIds = atividades com >= 1 'passed';
    // totalSubmissions = soma dos _count; averageScore =
    // Math.round(soma dos scores / nº de scores não nulos) (0 sem scores).
    const grouped = await this.prisma.submission.groupBy({
      by: ['activityId', 'status'],
      where: { userId },
      _count: { _all: true, score: true },
      _sum: { score: true },
    });

    const passedActivityIds = new Set<string>();
    let totalSubmissions = 0;
    let scoredCount = 0;
    let scoreSum = 0;
    for (const row of grouped) {
      totalSubmissions += row._count._all;
      scoredCount += row._count.score;
      scoreSum += row._sum.score ?? 0;
      if (row.status === 'passed') passedActivityIds.add(row.activityId);
    }
    const averageScore = scoredCount > 0 ? Math.round(scoreSum / scoredCount) : 0;

    // Sprint 21 (adaptação v1) — a conclusão efetiva de cada curso vem
    // da ÚNICA derivação do sistema (computeCoursePath): submissões
    // `passed` ∪ módulos concluídos por test-out. Antes esta conta era
    // "só passed"; o test-out passa a valer aqui porque é aqui que
    // toda a interface lê progresso (courseProgressStatus no web).
    const effectiveCompletedIds = new Set<string>(passedActivityIds);
    const coursesProgress = enrollments.map((enr) => {
      const totalActivities = enr.course.activities.length;
      const path = computeCoursePath(
        enr.course.activities.map((a) => ({
          id: a.id,
          slug: '',
          title: a.title,
          order: a.order,
          conceptTags: a.conceptTags ?? [],
        })),
        passedActivityIds,
      );
      for (const id of path.effectiveCompletedIds) {
        effectiveCompletedIds.add(id);
      }
      const completed = enr.course.activities.filter((a) =>
        path.effectiveCompletedIds.has(a.id),
      ).length;
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

    return {
      xp: user?.xp || 0,
      level: user?.level || 1,
      streakDays: user?.streakDays || 0,
      badges: user?.badges || [],
      // Contagem global = passadas ∪ cobertas por test-out nos cursos
      // matriculados (a mesma derivação dos cursos acima). XP não muda:
      // XP nasce de submissão aprovada, nunca de módulo pulado.
      completedActivitiesCount: effectiveCompletedIds.size,
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
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { talentVisible },
      select: { id: true, talentVisible: true },
    });
    // Fase 4 fix D1 — espelho settings→perfil: o sentido perfil→settings
    // já existia em TalentProfileService.updateMe, mas este endpoint não
    // tocava em TalentProfile.visible, então settings-off deixava
    // profile.visible=true divergente de talentVisible=false. O espelho
    // agora vale nos dois sentidos. updateMany: sem perfil, nada a
    // sincronizar (count 0, sem erro); com perfil, visible acompanha.
    await this.prisma.talentProfile.updateMany({
      where: { userId },
      data: { visible: talentVisible },
    });
    return updated;
  }

  async updateCareerTier(userId: string, careerTier: string) {
    const normalized = String(careerTier || '').toLowerCase().trim();
    if (normalized !== 'beginner') {
      throw new ForbiddenException(
        'Patente bloqueada: conclua o nível Iniciante primeiro',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { careerTier: 'beginner' as any },
      select: { id: true, careerTier: true },
    });
  }

  async adoptCompanion(userId: string, starterName: string) {
    if (!starterName || typeof starterName !== 'string' || !starterName.trim()) {
      throw new BadRequestException('starterName é obrigatório');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.userCompanion.findUnique({
      where: { userId },
    });
    if (existing) {
      return this.prisma.userCompanion.update({
        where: { userId },
        data: { starterName: starterName.trim() },
      });
    }

    return this.prisma.userCompanion.create({
      data: {
        userId,
        starterName: starterName.trim(),
        currentStage: 1,
        xp: 0,
      },
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

    // B01b: a exportação é do próprio aluno, mas o errorMessage de um teste
    // OCULTO é o stderr bruto do harness (entrada + valor esperado) e não
    // pode sair nem aqui. Mesma regra da serialização de aluno do B01:
    // oculto aprovado sem mensagem; oculto falho, só a genérica. Os demais
    // dados do aluno seguem intactos.
    const maskedSubmissions = submissions.map((submission) => ({
      ...submission,
      testResults: submission.testResults.map((t) =>
        t.isHidden
          ? {
              ...t,
              errorMessage: t.passed ? undefined : HIDDEN_TEST_FAILED_MESSAGE,
            }
          : t,
      ),
    }));

    return {
      exportedAt: new Date().toISOString(),
      sections: {
        profile,
        gamification: { badges },
        chat: { messages: chatMessages },
        enrollments: enrollments.map((e) => ({ course: e.course, enrolledAt: e.createdAt })),
        submissions: maskedSubmissions,
      },
    };
  }
}