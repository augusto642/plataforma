import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Optional,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { ConfigError } from '../config/secrets.validation';
import { GamificationService } from '../gamification/gamification.service';
import { GiteaService } from '../gitea/gitea.service';
import { PrismaService } from '../prisma/prisma.service';
import { SonarService, SonarMetrics } from '../sonar/sonar.service';
import { SubmissionsService } from '../submissions/submissions.service';

const MAX_PAYLOAD_BYTES = 1024 * 1024;
const REPO_NAME_PATTERN = /^(?<slug>[a-z0-9][a-z0-9_-]*)-(?<username>[a-z0-9][a-z0-9_-]*)$/i;

export function redactEmail(email: string | null | undefined): string {
  if (!email) {
    return '';
  }
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) {
    return '';
  }
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  const head = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${head}***@${domain}`;
}

export interface GiteaCommitAuthor {
  email: string;
  name: string;
  username: string;
}

export interface GiteaCommit {
  id: string;
  message: string;
  url: string;
  author: GiteaCommitAuthor;
  committer: GiteaCommitAuthor;
  timestamp: string;
}

export interface GiteaRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    id: number;
    login: string;
    username: string;
    full_name: string;
    email: string;
  };
  private: boolean;
}

export interface GiteaPushPayload {
  ref: string;
  before: string;
  after: string;
  compare_url: string;
  commits: GiteaCommit[];
  repository: GiteaRepository;
  pusher: {
    id: number;
    login: string;
    full_name: string;
    email: string;
  };
  sender: {
    id: number;
    login: string;
    full_name: string;
    email: string;
  };
  deleted?: boolean;
}

function isPrismaP2002(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2002'
  );
}

function normalizeSignature(signature: string): string {
  return signature.replace(/^sha256=/i, '').toLowerCase();
}

function parseSonarRating(
  value: string | undefined,
): SonarMetrics['maintainabilityRating'] {
  switch (value) {
    case 'A':
    case 'B':
    case 'C':
    case 'D':
    case 'E':
      return value;
    default:
      return undefined;
  }
}

function parseSonarNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

@Controller('webhooks')
@Public()
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly submissions: SubmissionsService,
    private readonly gitea: GiteaService,
    private readonly config: ConfigService,
    @Optional() private readonly sonar?: SonarService,
    @Optional() private readonly gamification?: GamificationService,
  ) {}

  @Post('gitea')
  @HttpCode(HttpStatus.OK)
  async handleGiteaPush(
    @Req() req: Request,
    @Body() payload: GiteaPushPayload,
    @Headers('x-gitea-event') event: string,
    @Headers('x-gitea-signature') signature?: string,
    @Headers('x-gitea-delivery') deliveryId?: string,
  ) {
    // 1. Fail-closed: GITEA_WEBHOOK_SECRET is mandatory.
    const webhookSecret = this.config.get<string>('GITEA_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.error(
        'GITEA_WEBHOOK_SECRET is not configured; refusing webhook request',
      );
      throw new ConfigError(
        'Missing required environment variable: GITEA_WEBHOOK_SECRET',
      );
    }

    // 2. Raw body is required to verify the exact payload signature.
    const rawBody = (req as any).rawBody;
    if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
      throw new BadRequestException(
        'Raw body is required for webhook signature verification',
      );
    }

    // 3. Payload size limit.
    if (rawBody.length > MAX_PAYLOAD_BYTES) {
      throw new BadRequestException('Webhook payload exceeds 1MB limit');
    }

    // 4. HMAC signature (timing-safe, over the raw body).
    if (!signature) {
      this.logger.warn('Gitea webhook request missing x-gitea-signature header');
      throw new UnauthorizedException('Missing webhook signature');
    }

    const computedHmac = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const received = normalizeSignature(signature);
    const sigBuffer = Buffer.from(received, 'utf8');
    const compBuffer = Buffer.from(computedHmac, 'utf8');

    if (
      sigBuffer.length !== compBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, compBuffer)
    ) {
      this.logger.warn('Invalid Gitea webhook HMAC signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // 5. Event / branch / deletion validations (maintained from previous behavior).
    if (event !== 'push' || !payload || !payload.commits || payload.commits.length === 0) {
      return { status: 'ignored', reason: 'Not a push event or no commits' };
    }

    if (payload.deleted) {
      return { status: 'ignored', reason: 'Branch deletion event' };
    }

    const branch = payload.ref;
    if (branch && !branch.endsWith('/main') && !branch.endsWith('/master')) {
      return { status: 'ignored', reason: 'Push not on main/master branch' };
    }

    // 6. Anti-replay: x-gitea-delivery is mandatory and unique.
    if (!deliveryId) {
      throw new BadRequestException('Missing x-gitea-delivery header');
    }

    const latestCommit = payload.commits[payload.commits.length - 1];
    const commitSha: string | null = latestCommit?.id ?? null;
    const repoFullName =
      payload.repository?.full_name || payload.repository?.name || '';

    try {
      await this.prisma.webhookDelivery.create({
        data: {
          deliveryId,
          eventType: event,
          repoFullName,
          commitSha,
        },
      });
    } catch (error: any) {
      if (isPrismaP2002(error)) {
        this.logger.log(`Duplicate webhook delivery ${deliveryId}`);
        return { status: 'duplicate' };
      }
      throw error;
    }

    // 7. Identity: repository name must match the {slug}-{username} pattern.
    const repoName = payload.repository?.name || '';
    const repoMatch = REPO_NAME_PATTERN.exec(repoName);
    if (!repoMatch) {
      this.logger.warn(
        `Repository name ${repoName} does not match the {slug}-{username} pattern`,
      );
      return {
        status: 'ignored',
        reason: 'Repository name does not match expected pattern',
      };
    }

    const giteaUsername = repoMatch.groups?.username || '';

    // 8. Authoritative identity mapping via StudentRepo relation ONLY.
    // O fallback anterior por e-mail do autor do commit foi REMOVIDO: o e-mail
    // vem do git config local (campo arbitrário controlável pelo aluno), o que
    // permitia spoofing de identidade para criar submissões em nome de outros.
    const studentRepo = this.prisma.studentRepo
      ? await this.prisma.studentRepo.findFirst({
          where: {
            OR: [
              { repoFullName },
              { giteaUsername, repoFullName: `${payload.repository?.owner?.username || ''}/${repoName}` },
            ],
          },
          include: { user: true },
        })
      : null;

    let user = studentRepo?.user ?? null;

    if (!user && giteaUsername) {
      // Vínculo legítimo: usuário dono de um StudentRepo com este giteaUsername.
      user = await this.prisma.user.findFirst({
        where: {
          studentRepos: {
            some: { giteaUsername },
          },
        },
      });
    }

    if (!user) {
      this.logger.warn(
        `No StudentRepo binding found for Gitea repo ${repoFullName}; ignoring event`,
      );
      return { status: 'ignored', reason: 'User not recognized' };
    }

    this.logger.log(
      `Received Gitea push webhook for repo ${repoName}, commit ${commitSha}, user ${user.id}`,
    );

    // 9. Match activity by exact slug, repo template, or course activity.
    let activity = await this.prisma.activity.findFirst({
      where: {
        OR: [{ slug: repoName }, { giteaTemplateRepo: repoName }],
      },
    });

    if (!activity) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { userId: user.id },
        include: {
          course: {
            include: { activities: true },
          },
        },
      });

      for (const enr of enrollments) {
        const found = enr.course.activities.find(
          (a) =>
            repoName.startsWith(a.slug) ||
            (a.giteaTemplateRepo && repoName.startsWith(a.giteaTemplateRepo)),
        );
        if (found) {
          activity = found;
          break;
        }
      }
    }

    if (!activity) {
      this.logger.warn(`No activity mapped to repository ${repoName}`);
      return { status: 'ignored', reason: 'No matching activity' };
    }

    // 10. Idempotency by commitSha.
    const existingSubmission = await this.prisma.submission.findFirst({
      where: {
        activityId: activity.id,
        userId: user.id,
        commitSha,
      },
    });

    if (existingSubmission) {
      this.logger.log(
        `Commit ${commitSha} already processed as submission ${existingSubmission.id}`,
      );
      return {
        status: 'already_processed',
        submissionId: existingSubmission.id,
      };
    }

    // 11. Fetch file content according to activity language.
    const repoOwner =
      payload.repository?.owner?.username ||
      this.config.get<string>('GITEA_ORG', 'plataforma');

    let studentCode = '';
    let candidateFilenames = ['solution.js', 'index.js'];
    if (activity.language === 'python') {
      candidateFilenames = ['solution.py', 'main.py'];
    } else if (activity.language === 'typescript') {
      candidateFilenames = ['solution.ts', 'index.ts'];
    } else if (activity.language === 'java') {
      candidateFilenames = ['Solution.java', 'Main.java'];
    }

    for (const filename of candidateFilenames) {
      try {
        const fileContent = await this.gitea.getFileContent(
          repoOwner,
          repoName,
          filename,
          commitSha ?? undefined,
        );
        if (fileContent && fileContent.trim().length > 0) {
          studentCode = fileContent;
          break;
        }
      } catch {}
    }

    if (!studentCode) {
      studentCode = activity.initialCode || '// Solucao enviada via Git commit';
    }

    // 12. Create submission, treating P2002 (concurrent processing) as idempotent.
    let submission;
    try {
      submission = await this.submissions.create(user.id, {
        activityId: activity.id,
        commitSha: commitSha ?? undefined,
        code: studentCode,
      });
    } catch (error: any) {
      if (isPrismaP2002(error)) {
        this.logger.log(
          `Commit ${commitSha} raced and was already processed; returning idempotent result`,
        );
        const raced = await this.prisma.submission.findFirst({
          where: {
            activityId: activity.id,
            userId: user.id,
            commitSha,
          },
        });
        return raced
          ? { status: 'already_processed', submissionId: raced.id }
          : { status: 'already_processed' };
      }
      throw error;
    }

    return {
      status: 'success',
      submissionId: submission.id,
    };
  }

  @Post('sonar')
  @HttpCode(HttpStatus.OK)
  async handleSonarWebhook(
    @Req() req: Request,
    @Body() payload: any,
    @Headers('x-sonar-webhook-hmac-sha256') signature?: string,
  ) {
    const sonarSecret = this.config.get<string>('SONAR_WEBHOOK_SECRET');
    if (!sonarSecret) {
      this.logger.error('SONAR_WEBHOOK_SECRET is not configured; refusing webhook request');
      throw new ConfigError('Missing required environment variable: SONAR_WEBHOOK_SECRET');
    }

    const rawBody = (req as any).rawBody;
    if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
      throw new BadRequestException(
        'Raw body is required for webhook signature verification',
      );
    }
    if (!signature) {
      this.logger.warn('SonarQube webhook request missing HMAC signature');
      throw new UnauthorizedException('Assinatura do webhook SonarQube ausente');
    }

    const computedHmac = crypto
      .createHmac('sha256', sonarSecret)
      .update(rawBody)
      .digest('hex');
    const received = normalizeSignature(signature);
    const sigBuffer = Buffer.from(received, 'utf8');
    const compBuffer = Buffer.from(computedHmac, 'utf8');
    if (
      sigBuffer.length !== compBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, compBuffer)
    ) {
      this.logger.warn('Invalid SonarQube webhook HMAC signature');
      throw new UnauthorizedException('Assinatura do webhook SonarQube inválida');
    }

    this.logger.log(`Received SonarQube webhook for project ${payload?.project?.key}`);

    const projectKey: string = payload?.project?.key || '';
    const repoMatch = REPO_NAME_PATTERN.exec(projectKey);
    const giteaUsername = repoMatch?.groups?.username;
    const projectSlug = repoMatch?.groups?.slug || projectKey;

    let user = null;
    if (giteaUsername) {
      user = await this.prisma.user.findFirst({
        where: {
          studentRepos: {
            some: { giteaUsername },
          },
        },
      });
    }

    if (!user) {
      return { status: 'ignored', reason: 'User not found for project key' };
    }

    const qgStatus = payload?.qualityGate?.status === 'OK' ? 'OK' : 'ERROR';
    const conditions: Array<{ metric: string; value: string }> = payload?.qualityGate?.conditions || [];
    const conditionMap = new Map(conditions.map((c) => [c.metric, c.value]));

    const metrics: SonarMetrics = {
      qualityGateStatus: qgStatus,
      maintainabilityRating: parseSonarRating(conditionMap.get('sqale_rating')),
      reliabilityRating: parseSonarRating(conditionMap.get('reliability_rating')),
      securityRating: parseSonarRating(conditionMap.get('security_rating')),
      coveragePercent: parseSonarNumber(conditionMap.get('coverage')),
      codeSmellsCount: parseSonarNumber(conditionMap.get('code_smells')),
      bugsCount: parseSonarNumber(conditionMap.get('bugs')),
      vulnerabilitiesCount: parseSonarNumber(conditionMap.get('vulnerabilities')),
    };

    let evaluation = null;
    if (this.sonar) {
      evaluation = this.sonar.evaluateCleanCode(metrics, 300);
    }

    let xpResult = null;
    const sonarEventId =
      typeof payload?.revision === 'string'
        ? payload.revision
        : typeof payload?.analysisId === 'string'
          ? payload.analysisId
          : typeof payload?.taskId === 'string'
            ? payload.taskId
            : null;
    if (this.gamification && evaluation && sonarEventId) {
      xpResult = await this.gamification.awardGiteaProjectXp(user.id, {
        projectSlug,
        basePassed: evaluation.qualityGatePassed,
        idempotencyKey: `sonar:${projectKey}:${sonarEventId}`,
        baseXp: evaluation.baseXp,
        sonarBonusMultiplier: evaluation.totalMultiplier,
        qualityGatePassed: evaluation.qualityGatePassed,
      });
    } else if (this.gamification && evaluation) {
      this.logger.warn(`Skipping Sonar XP award without a stable analysis id for ${projectKey}`);
    }

    return {
      status: 'processed',
      user: user.id,
      projectSlug,
      evaluation,
      xpResult,
      socraticFeedback: evaluation?.socraticSuggestions || [],
    };
  }

  /**
   * Webhook flexível e agnóstico de CI/CD runners (Gitea Actions, GitHub Actions, Jenkins, GitLab CI ou runners locais).
   * Recebe o relatório padronizado de execução de baterias de testes automatizados e integra na gamificação / progresso.
   */
  @Post('ci-runner')
  @HttpCode(HttpStatus.OK)
  async handleCiRunnerWebhook(
    @Body()
    payload: {
      runnerType?: string;
      projectName?: string;
      repoName?: string;
      commitSha?: string;
      branch?: string;
      status: 'SUCCESS' | 'FAILURE' | string;
      testsTotal?: number;
      testsPassed?: number;
      testsFailed?: number;
      durationSeconds?: number;
      pipelineUrl?: string;
    },
    @Headers('x-ci-token') ciToken?: string,
    @Headers('x-ci-signature') ciSignature?: string,
  ) {
    const expectedSecret =
      this.config.get<string>('CI_WEBHOOK_SECRET') ||
      this.config.get<string>('GITEA_WEBHOOK_SECRET');

    if (!expectedSecret) {
      this.logger.error('CI_WEBHOOK_SECRET is not configured; refusing webhook request');
      throw new ConfigError(
        'Missing required environment variable: CI_WEBHOOK_SECRET or GITEA_WEBHOOK_SECRET',
      );
    }

    const provided = ciToken || ciSignature;
    if (!provided) {
      this.logger.warn('CI Runner webhook request missing token or signature');
      throw new UnauthorizedException('Token de CI Runner ausente');
    }

    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expectedSecret);

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      this.logger.warn('Token ou assinatura de CI Runner inválida');
      throw new UnauthorizedException('Token de CI Runner inválido');
    }

    const runner = payload.runnerType || 'gitea_actions';
    const repo = payload.repoName || payload.projectName || 'unknown-repo';
    const isSuccess = payload.status === 'SUCCESS' && (payload.testsFailed ?? 0) === 0;
    const commitSha =
      typeof payload.commitSha === 'string' ? payload.commitSha.trim() : '';

    this.logger.log(
      `Received CI pipeline result from ${runner} for repo ${repo}: status=${payload.status}, passed=${payload.testsPassed}/${payload.testsTotal}`,
    );

    // Identifica o aluno pelo repositório
    const repoMatch = REPO_NAME_PATTERN.exec(repo);
    const giteaUsername = repoMatch?.groups?.username;
    let user = null;

    if (giteaUsername) {
      user = await this.prisma.user.findFirst({
        where: {
          studentRepos: {
            some: { giteaUsername },
          },
        },
      });
    }

    let xpResult = null;
    if (user && isSuccess && this.gamification && commitSha) {
      // Credita bônus pela esteira de testes verde
      xpResult = await this.gamification.awardGiteaProjectXp(user.id, {
        projectSlug: repo,
        basePassed: true,
        idempotencyKey: `ci:${runner}:${repo}:${commitSha}`,
        baseXp: 150,
        sonarBonusMultiplier: 1.0,
        qualityGatePassed: true,
      });
    } else if (user && isSuccess && this.gamification) {
      this.logger.warn(`Skipping CI XP award without a commit SHA for ${repo}`);
    }

    return {
      status: 'processed',
      runner,
      repo,
      isSuccess,
      testsPassed: payload.testsPassed ?? 0,
      testsFailed: payload.testsFailed ?? 0,
      testsTotal: payload.testsTotal ?? 0,
      xpAwarded: xpResult?.awarded === true,
      userId: user?.id ?? null,
    };
  }
}
