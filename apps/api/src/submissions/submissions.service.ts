import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { RedisLockService } from '../cache/redis-lock.service';
import { PrismaService } from '../prisma/prisma.service';
import { BattleRunDto } from './dto/battle-run.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { EvaluatorService } from './evaluator/evaluator.service';
import { PistonRunnerService } from './runner/runner.service';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const CREATE_LOCK_TTL_MS = 10_000;

function isPrismaP2002(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2002'
  );
}

function clampInt(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

/** Campos leves consumidos pelo front (useSubmissionStream/SSE e IDE). */
const PROGRESS_TEST_RESULT_SELECT = {
  id: true,
  name: true,
  passed: true,
  durationMs: true,
  errorMessage: true,
  isHidden: true,
} as const;

const PROGRESS_SELECT = {
  id: true,
  status: true,
  score: true,
  maxScore: true,
  durationMs: true,
  errorMessage: true,
  aiFeedback: true,
  aiHints: true,
  createdAt: true,
} as const;

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evaluator: EvaluatorService,
    private readonly runner: PistonRunnerService,
    @InjectQueue('submissions') private readonly submissionsQueue: Queue,
    private readonly redisLock: RedisLockService,
  ) {}

  /**
   * Cria uma submissão com idempotência:
   * - lock Redis curto `sub:lock:{userId}:{activityId}` impede duplicidade
   *   concorrente (duplo clique / retries do cliente) mesmo quando commitSha é
   *   NULL (NULLs distintos não colidem no unique do Postgres);
   * - P2002 (unique activityId+userId+commitSha) retorna a submissão existente
   *   em vez de propagar erro;
   * - enqueue com jobId = submission.id para dedupe nativo do BullMQ.
   *
   * Fail-closed: se a fila Redis estiver indisponível, a submissão é marcada
   * como 'error' (sem execução fora da fila). O watchdog do housekeeping
   * re-enfileira submissões 'queued' zumbis uma vez antes de marcá-las erro.
   */
  async create(userId: string, dto: CreateSubmissionDto) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: dto.activityId },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (!dto.code && !dto.commitSha) {
      throw new BadRequestException('Either code or commitSha must be provided');
    }

    const lockKey = `sub:lock:${userId}:${dto.activityId}`;

    return this.redisLock.usingLock(
      lockKey,
      CREATE_LOCK_TTL_MS,
      async () => this.createInner(userId, dto),
      async () => {
        // Lock em uso: há um create concorrente para o mesmo par
        // (userId, activityId). Comportamento idempotente — devolve a
        // submissão mais recente em vez de criar duplicata ou retornar 409.
        const existing = await this.findLatestForDedupe(userId, dto);
        if (existing) {
          this.logger.log(
            `Concurrent create detected for user ${userId} activity ${dto.activityId}; returning existing submission ${existing.id}`,
          );
          return existing;
        }
        throw new ConflictException(
          'A submission for this activity is already being processed',
        );
      },
    );
  }

  private async findLatestForDedupe(userId: string, dto: CreateSubmissionDto) {
    return this.prisma.submission.findFirst({
      where: {
        activityId: dto.activityId,
        userId,
        ...(dto.commitSha ? { commitSha: dto.commitSha } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async createInner(userId: string, dto: CreateSubmissionDto) {
    let submission;
    try {
      submission = await this.prisma.submission.create({
        data: {
          activityId: dto.activityId,
          userId,
          codeSnapshot: dto.code,
          commitSha: dto.commitSha,
          status: 'queued',
        },
      });
    } catch (error: unknown) {
      if (isPrismaP2002(error)) {
        // Idempotência: unique (activityId, userId, commitSha) violado por
        // corrida — retorna a submissão existente (nunca 409/500).
        const existing = await this.findLatestForDedupe(userId, dto);
        if (existing) {
          this.logger.log(
            `Duplicate submission for user ${userId} activity ${dto.activityId} commit ${dto.commitSha ?? '(null)'}; returning existing ${existing.id}`,
          );
          return existing;
        }
      }
      throw error;
    }

    try {
      await this.submissionsQueue.add(
        'evaluate',
        { submissionId: submission.id },
        {
          // jobId estável = dedupe nativo do BullMQ: retries/replicas não
          // criam jobs duplicados para a mesma submissão.
          jobId: submission.id,
          attempts: 2,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );
    } catch (queueError: any) {
      // Fail-closed documentado: sem fila não há avaliação. O fallback antigo
      // (setImmediate -> evaluator direto) podia concorrer com o worker BullMQ
      // e duplicar execução de sandbox; foi removido. A submissão fica 'error'
      // e o cliente pode reenviar quando a fila voltar.
      this.logger.error(
        `Could not enqueue submission ${submission.id}: ${queueError.message}. Marking as error (fail-closed).`,
      );
      await this.prisma.submission
        .update({
          where: { id: submission.id },
          data: {
            status: 'error',
            errorMessage:
              'Serviço de fila indisponível no momento. Reenvie sua submissão em instantes.',
          },
        })
        .catch(() => {});
      return { ...submission, status: 'error' as const };
    }

    return submission;
  }

  async battleRun(userId: string, dto: BattleRunDto) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: dto.activityId },
    });
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const companion = await this.prisma.userCompanion.findFirst({
      where: { id: dto.companionId, userId },
    });
    if (!companion) {
      throw new NotFoundException('Companion not found or does not belong to user');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const bossMeta = (activity.bossMetadata as any) || {};
    const bossName = bossMeta.name || bossMeta.bossName || 'SyntaxBug #404';
    const bossMaxHp = Number(bossMeta.maxHp || bossMeta.hp || 100);
    const bossAttack = Number(bossMeta.attack || bossMeta.attackPower || 15);
    const bossXpReward = Number(bossMeta.xpReward || 75);
    const bossBitsReward = Number(bossMeta.bitsReward || 50);

    // Fonte da verdade do HP do boss = histórico real de submissões do usuário
    // nesta atividade (o valor enviado pelo cliente foi removido do DTO: era
    // forjável e permitia farmar vitória/XP). Boss já derrotado antes => HP 0.
    const priorSubmissions = await this.prisma.submission.findMany({
      where: { activityId: dto.activityId, userId },
      select: { status: true, score: true },
    });
    const bossAlreadyDefeated = priorSubmissions.some((s) => s.status === 'passed');
    const priorDamage = bossAlreadyDefeated
      ? bossMaxHp
      : priorSubmissions.reduce((acc, s) => {
          if (s.status === 'passed' || !s.score || s.score <= 0) return acc;
          return acc + Math.round(bossMaxHp * 0.5 * (s.score / 100));
        }, 0);
    const currentBossHp = Math.max(0, bossMaxHp - priorDamage);

    const evaluation = await this.runner.executeInSandbox({
      language: dto.language,
      code: dto.code,
      testScript: activity.testCode || '',
      hiddenTests: activity.hiddenTests || undefined,
      timeLimitMs: activity.timeLimitMs || 5000,
      memoryLimitMb: activity.memoryLimitMb || 256,
    });

    const testCases = evaluation.testCases || [];
    const totalTests = testCases.length > 0 ? testCases.length : 1;
    const passedTests = testCases.filter((t) => t.passed).length;
    const allPassed =
      evaluation.status === 'passed' &&
      (testCases.length === 0 || passedTests === totalTests);
    const successRatio =
      testCases.length > 0
        ? passedTests / totalTests
        : evaluation.status === 'passed'
          ? 1
          : 0;

    let damageDealt = 0;
    let recoilDamage = 0;

    if (allPassed) {
      // Boss já derrotado em corrida anterior: sem dano/recompensa nova.
      damageDealt =
        currentBossHp > 0
          ? Math.max(currentBossHp, Math.round(bossMaxHp * 1.0))
          : 0;
      recoilDamage = 0;
    } else if (successRatio > 0) {
      damageDealt = Math.max(5, Math.round(bossMaxHp * 0.5 * successRatio));
      recoilDamage = Math.round(bossAttack * 0.5);
    } else {
      damageDealt = 0;
      recoilDamage = bossAttack;
    }

    const remainingBossHp = Math.max(0, currentBossHp - damageDealt);
    // Vitória só na transição HP>0 -> 0: repetir o combate com o boss já
    // derrotado não concede a recompensa cheia novamente (anti-farm).
    const isVictory = remainingBossHp === 0 && currentBossHp > 0;

    let xpGained = 0;
    let bitsGained = 0;

    if (isVictory) {
      xpGained = bossXpReward;
      bitsGained = bossBitsReward;
    } else if (successRatio > 0) {
      xpGained = Math.round(25 * successRatio);
      bitsGained = Math.round(10 * successRatio);
    }

    const txResult = await this.prisma.$transaction(async (tx) => {
      // {increment} atômico: sem lost update sob concorrência (read-modify-write
      // com valores lidos antes da tx perderia updates de outras réplicas).
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          xp: { increment: xpGained },
          bitsBalance: { increment: bitsGained },
        },
      });

      const newLevel = Math.floor(updatedUser.xp / 200) + 1;
      if (newLevel !== updatedUser.level) {
        await tx.user.update({
          where: { id: userId },
          data: { level: newLevel },
        });
      }

      const companionWithXp = await tx.userCompanion.update({
        where: { id: companion.id },
        data: { xp: { increment: xpGained } },
      });

      // Evolução do Starter: Estágio 1 -> 2 em 100 XP, 2 -> 3 em 300 XP
      let newStage = companionWithXp.currentStage;
      let evolved = false;
      if (newStage === 1 && companionWithXp.xp >= 100) {
        newStage = 2;
        evolved = true;
      } else if (newStage === 2 && companionWithXp.xp >= 300) {
        newStage = 3;
        evolved = true;
      }

      let updatedCompanion = companionWithXp;
      if (evolved) {
        updatedCompanion = await tx.userCompanion.update({
          where: { id: companion.id },
          data: { currentStage: newStage },
        });
      }

      const sub = await tx.submission.create({
        data: {
          activityId: dto.activityId,
          userId,
          codeSnapshot: dto.code,
          status: allPassed
            ? 'passed'
            : evaluation.status === 'error'
              ? 'error'
              : 'failed',
          score: Math.round(successRatio * 100),
          maxScore: 100,
          durationMs: evaluation.durationMs,
          errorMessage: evaluation.errorMessage,
          logs: evaluation.logs,
          xpAwarded: xpGained > 0,
        },
      });

      if (evaluation.testCases && evaluation.testCases.length > 0) {
        await tx.testCaseResult.createMany({
          data: evaluation.testCases.map((t) => ({
            submissionId: sub.id,
            name: t.name,
            passed: t.passed,
            durationMs: t.durationMs,
            stdout: t.stdout,
            stderr: t.stderr,
            errorMessage: t.errorMessage,
            isHidden: t.isHidden ?? false,
          })),
        });
      }

      return { updatedCompanion, evolved, newStage };
    });

    let combatLog = '';
    if (allPassed) {
      combatLog = isVictory
        ? `COMPILAÇÃO IMPECÁVEL! Golpe crítico causou ${damageDealt} de dano! O Boss ${bossName} foi derrotado! (+${xpGained} XP, +${bitsGained} Bits)`
        : currentBossHp === 0
          ? `COMPILAÇÃO IMPECÁVEL! O Boss ${bossName} já foi derrotado — sem recompensa extra.`
          : `COMPILAÇÃO IMPECÁVEL! Golpe crítico causou ${damageDealt} de dano em ${bossName}!`;
    } else if (successRatio > 0) {
      combatLog = `TESTES PARCIAIS (${passedTests}/${totalTests}): Causou ${damageDealt} de dano. ${bossName} contra-atacou causando ${recoilDamage} de dano!`;
    } else {
      combatLog = `FALHA DE TESTES: Código falhou. ${bossName} contra-atacou causando ${recoilDamage} de dano!`;
    }

    if (txResult.evolved) {
      combatLog += ` 🌟 METAMORFOSE! Seu monstrinho evoluiu para o Estágio ${txResult.newStage}!`;
    }

    return {
      status: allPassed ? 'passed' : evaluation.status,
      allPassed,
      testsPassed: passedTests,
      totalTests,
      damageDealt,
      recoilDamage,
      remainingBossHp,
      isVictory,
      isCriticalHit: allPassed,
      xpGained,
      bitsGained,
      combatLog,
      companion: {
        id: txResult.updatedCompanion.id,
        starterName: txResult.updatedCompanion.starterName,
        currentStage: txResult.updatedCompanion.currentStage,
        xp: txResult.updatedCompanion.xp,
        evolved: txResult.evolved,
      },
      testResults: evaluation.testCases.map((t) => ({
        name: t.name,
        passed: t.passed,
        durationMs: t.durationMs,
        isHidden: t.isHidden ?? false,
        errorMessage:
          t.isHidden && !t.passed ? 'Teste oculto falhou' : t.errorMessage,
      })),
    };
  }

  async findById(id: string, userId: string, userRole: string = 'student') {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        activity: {
          select: {
            id: true,
            title: true,
            slug: true,
            language: true,
            courseId: true,
            course: { select: { instructorId: true } },
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        testResults: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    this.assertCanAccess(submission, userId, userRole);

    if (userRole === 'student') {
      return {
        ...submission,
        testResults: submission.testResults.map((t) => {
          if (t.isHidden) {
            return {
              id: t.id,
              name: t.name,
              passed: t.passed,
              durationMs: t.durationMs,
              isHidden: true,
            };
          }
          return t;
        }),
      };
    }

    return submission;
  }

  /**
   * Projeção leve para o SSE (submissions.controller streamEvents): apenas os
   * campos consumidos pelo front, sem codeSnapshot/logs/testResults pesados.
   */
  async findProgress(id: string, userId: string, userRole: string = 'student') {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      select: {
        ...PROGRESS_SELECT,
        userId: true,
        activity: {
          select: { course: { select: { instructorId: true } } },
        },
        testResults: {
          select: PROGRESS_TEST_RESULT_SELECT,
          orderBy: { createdAt: 'asc' as const },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    this.assertCanAccess(submission, userId, userRole);

    const { userId: _ownerId, activity: _activity, ...progress } = submission;
    return progress;
  }

  /**
   * Autorização (anti-IDOR):
   * - admin: acesso total;
   * - instructor: apenas submissões de atividades dos cursos que instrui
   *   (mesmo padrão de ai/line-feedback.service.ts) — senão 404;
   * - student: apenas a própria — senão 404 (anti-enumeration).
   */
  private assertCanAccess(
    submission: {
      userId: string;
      activity: { course: { instructorId: string } };
    },
    userId: string,
    userRole: string,
  ): void {
    if (userRole === 'admin') return;
    if (submission.userId === userId) return;
    if (
      userRole === 'instructor' &&
      submission.activity?.course?.instructorId === userId
    ) {
      return;
    }
    throw new NotFoundException('Submission not found');
  }

  /**
   * Contagem de submissões do próprio usuário logado (GET /submissions/count).
   * - student: apenas o próprio `total` (nunca agrega dados de terceiros);
   * - instructor/admin: mesmo `total` + `byStatus` (agrupamento por status).
   */
  async countMine(userId: string, userRole: string = 'student') {
    const total = await this.prisma.submission.count({ where: { userId } });

    if (userRole === 'student') {
      return { total };
    }

    const grouped = await this.prisma.submission.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
      orderBy: { status: 'asc' },
    });

    const byStatus: Record<string, number> = {};
    for (const row of grouped) {
      byStatus[row.status] = row._count._all;
    }

    return { total, byStatus };
  }

  async findAll(
    userId: string,
    userRole: string = 'student',
    activityId?: string,
    limit: unknown = DEFAULT_PAGE_SIZE,
    offset: unknown = 0,
  ) {
    const where: any = {};

    if (userRole === 'student') {
      where.userId = userId;
    } else if (userRole === 'instructor') {
      where.activity = {
        course: {
          instructorId: userId,
        },
      };
    }

    if (activityId) {
      where.activityId = activityId;
    }

    // Paginação backward-compatible: continua retornando um array, mas com
    // take/skip seguros (default 50, máx 200) para não carregar a tabela toda.
    const take = clampInt(limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = clampInt(offset, 0, Number.MAX_SAFE_INTEGER);

    return this.prisma.submission.findMany({
      where,
      include: {
        activity: {
          select: { id: true, title: true, slug: true, language: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }
}
