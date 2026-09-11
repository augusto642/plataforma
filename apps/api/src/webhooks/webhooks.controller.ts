import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { ConfigError } from '../config/secrets.validation';
import { GiteaService } from '../gitea/gitea.service';
import { PrismaService } from '../prisma/prisma.service';
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

@Controller('webhooks')
@Public()
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly submissions: SubmissionsService,
    private readonly gitea: GiteaService,
    private readonly config: ConfigService,
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

    const authorEmail: string =
      latestCommit?.author?.email || payload.pusher?.email || '';
    const giteaUsername = repoMatch.groups?.username || '';

    // 8. Authoritative identity mapping via StudentRepo relation.
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

    if (!user) {
      if (authorEmail) {
        user = await this.prisma.user.findUnique({
          where: { email: authorEmail },
        });
      } else if (giteaUsername) {
        user = await this.prisma.user.findFirst({
          where: {
            studentRepos: {
              some: { giteaUsername },
            },
          },
        });
      }
    }

    if (!user) {
      this.logger.warn(
        `No platform user found for Gitea repo ${repoFullName} (username: ${giteaUsername})`,
      );
      return { status: 'ignored', reason: 'User not recognized' };
    }

    this.logger.log(
      `Received Gitea push webhook for repo ${repoName}, commit ${commitSha}, user ${user.id} (${user.email})`,
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
}
