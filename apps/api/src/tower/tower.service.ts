import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Language, Prisma } from '@prisma/client';
import { GamificationService } from '../gamification/gamification.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  PistonRunnerService,
  type SandboxResultKind,
} from '../submissions/runner/runner.service';
import { DiceService } from './dice.service';
import { TowerBoardService, type TowerSquareInfo } from './tower-board.service';
import {
  TOWER_DEFAULT_ITEMS,
  TOWER_FREE_DAILY_MOVES,
  TOWER_MAX_FLOOR_BY_TIER,
  TOWER_PRO_DAILY_MOVES,
  TOWER_SQUARES_PER_FLOOR,
} from './tower.constants';
import { getTowerObjectiveQuestion, type TowerObjectiveKind } from './tower-objectives';
import type {
  TowerMoveRow,
  TowerPrismaClient,
  TowerProgressRow,
  TowerUserRow,
} from './tower-prisma.types';

/** Kinds que nunca premiam XP — mesma regra do EvaluatorService. */
const NO_XP_KINDS: ReadonlySet<SandboxResultKind> = new Set([
  'unsupported',
  'sandbox_unavailable',
  'compile_error',
]);

const DIRECTLY_ACTIVATABLE_TOWER_ITEMS = new Set([
  'SHIELD',
  'DOUBLE_DICE',
  'EXTRA_TIME',
  'CHAOS_BANANA',
]);
const EXTRA_TIME_SECONDS = 60;

export interface TowerPendingChallenge {
  activityId: string | null;
  floor: number;
  toSquare: number;
  squareType: string;
  timeLimitSeconds: number;
  deadlineAt: string;
  objective?: {
    kind: TowerObjectiveKind;
    title: string;
    prompt: string;
    options: string[];
    codeSnippet?: string;
  };
}

export interface TowerProgressView {
  floor: number;
  square: number;
  movesLeftToday: number;
  dailyMovesLimit: number;
  // T1 — 'career' (fase 1 premium) é plano pago: limite de assinante.
  plan: 'free' | 'pro' | 'career';
  maxFloor: number;
  movesResetDate: string;
  pendingChallenge: TowerPendingChallenge | null;
}

export interface TowerRollResult {
  roll: number;
  fromSquare: number;
  toSquare: number;
  floor: number;
  square: TowerSquareInfo | null;
  movesLeftToday: number;
  sabotageApplied: boolean;
  pendingChallenge: TowerPendingChallenge | null;
}

export interface TowerPartyView {
  id: string;
  name: string;
  floor: number;
  leaderId: string;
  members: Array<{
    id: string;
    nickname: string;
    floor: number;
    square: number;
    isLeader: boolean;
    isCurrentUser: boolean;
  }>;
  recentAdvances: Array<{
    id: string;
    nickname: string;
    floor: number;
    createdAt: string;
  }>;
}

type TowerPartyMember = TowerPartyView['members'][number];

export type TowerSubmitResultKind = 'passed' | 'failed' | 'timeout';

export interface TowerSubmitResult {
  result: TowerSubmitResultKind;
  score: number | null;
  feedback?: string;
  xpGained: number;
  totalXp: number | null;
  level: number | null;
  streakDays: number | null;
  floor: number;
  square: number;
  movesLeftToday: number;
  guardianDefeated: boolean;
  tierComplete: boolean;
}

/**
 * Loop principal da Torre de Desafios (código, quiz, bug-hunt e lacunas).
 *
 * rolar → mover → resolver a casa de código via Activity + Piston.
 * - Acerto: avança para a casa sorteada.
 * - Erro ou tempo esgotado: volta para a última casa − 1.
 * - Guardião (casa 30): passar avança de andar (ou completa o nível).
 * - Limite diário: 5 jogadas/dia (grátis) / 10 (assinante), reset à meia-noite (UTC).
 * - XP de código e objetivos usa fluxos idempotentes separados.
 *
 * Quiz and mini-game squares create timed multiple-choice objectives. Item
 * squares are traversed immediately.
 *
 * Concorrência: rolar/submeter travam a linha de TowerProgress
 * (`SELECT ... FOR UPDATE`) dentro da transação, para duas rolagens
 * simultâneas do mesmo usuário não consumirem a mesma jogada nem criarem
 * dois desafios pendentes. (Corrida rara no primeiro roll — criação
 * simultânea do progresso — pode devolver erro de unique; o cliente retenta.)
 *
 * Fail-closed: sandbox indisponível (ou conteúdo não semeado) NÃO consome a
 * jogada e NÃO move o jogador — o desafio segue pendente para nova tentativa.
 */
@Injectable()
export class TowerService {
  private readonly logger = new Logger(TowerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dice: DiceService,
    private readonly board: TowerBoardService,
    private readonly runner: PistonRunnerService,
    private readonly gamification: GamificationService,
  ) {}

  async onModuleInit() {
    await this.seedTowerItems();
  }

  async seedTowerItems() {
    try {
      for (const item of TOWER_DEFAULT_ITEMS) {
        await (this.prisma as any).towerItem.upsert({
          where: { code: item.code },
          create: item,
          update: item,
        });
      }
      this.logger.log('Tower items seeded successfully');
    } catch (err) {
      this.logger.warn(`Could not seed tower items: ${(err as Error).message}`);
    }
  }

  /** Progresso atual (cria o registro na primeira leitura). */
  async getProgress(userId: string): Promise<TowerProgressView> {
    const db = this.db();
    const user = await this.loadUser(db, userId);
    const progress = await db.$transaction(async (tx) => {
      let row = await tx.towerProgress.findUnique({ where: { userId } });
      if (!row) {
        row = await tx.towerProgress.create({
          data: {
            userId,
            movesLeftToday: this.dailyLimit(user.plan),
            movesResetDate: new Date(this.todayUtc()),
          },
        });
      }
      return this.maybeResetDaily(tx, row, user);
    });
    const pending = await this.findPendingMove(db, userId);
    return this.toView(user, progress, pending);
  }

  /** Rola o dado e move. Retorna o desafio pendente quando cai em casa de código. */
  async roll(userId: string): Promise<TowerRollResult> {
    const db = this.db();
    return db.$transaction(async (tx) => {
      const user = await this.loadUser(tx, userId);
      let progress = await tx.towerProgress.findUnique({ where: { userId } });
      if (!progress) {
        progress = await tx.towerProgress.create({
          data: {
            userId,
            movesLeftToday: this.dailyLimit(user.plan),
            movesResetDate: new Date(this.todayUtc()),
          },
        });
      }
      await this.lockProgress(tx, userId);
      progress = await this.maybeResetDaily(tx, progress, user);

      const maxFloor = this.maxFloor(user.careerTier);
      if (
        progress.floor > maxFloor ||
        (progress.floor === maxFloor && progress.square >= TOWER_SQUARES_PER_FLOOR)
      ) {
        throw new ForbiddenException(
          'Você chegou ao fim do seu nível na torre. Suba de nível para continuar.',
        );
      }

      const pending = await this.findPendingMove(tx, userId);
      if (pending) {
        throw new ConflictException(
          'Você tem um desafio pendente na torre. Resolva-o antes de rolar novamente.',
        );
      }

      if (progress.movesLeftToday <= 0) {
        // NestJS 10 não tem TooManyRequestsException (só a partir do 11).
        throw new HttpException(
          'Limite diário de jogadas esgotado. Volte amanhã.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      let roll = this.dice.roll();
      const doubleDiceEffect = await (tx as any).towerActiveEffect.findFirst({
        where: { userId, effectType: 'DOUBLE_DICE', charges: { gt: 0 } },
      });
      if (doubleDiceEffect) {
        roll += this.dice.roll();
        if (doubleDiceEffect.charges <= 1) {
          await (tx as any).towerActiveEffect.delete({ where: { id: doubleDiceEffect.id } });
        } else {
          await (tx as any).towerActiveEffect.update({
            where: { id: doubleDiceEffect.id },
            data: { charges: doubleDiceEffect.charges - 1 },
          });
        }
      }

      const bananaEffect = await (tx as any).towerActiveEffect.findFirst({
        where: { userId, effectType: 'CHAOS_BANANA', charges: { gt: 0 } },
      });
      if (bananaEffect) {
        if (bananaEffect.charges <= 1) {
          await (tx as any).towerActiveEffect.delete({ where: { id: bananaEffect.id } });
        } else {
          await (tx as any).towerActiveEffect.update({
            where: { id: bananaEffect.id },
            data: { charges: bananaEffect.charges - 1 },
          });
        }
      }

      const fromSquare = progress.square;
      const toSquare = Math.max(
        fromSquare,
        Math.min(
          fromSquare + roll - (bananaEffect ? 1 : 0),
          TOWER_SQUARES_PER_FLOOR,
        ),
      );
      const info = toSquare > 0 ? this.board.getSquare(progress.floor, toSquare) : null;

      // Casa de código/guardião precisa da Activity semeada — sem ela, a
      // jogada NÃO é consumida (fail-closed).
      let activityId: string | null = null;
      if (toSquare > fromSquare && info && this.isCodeChallenge(info)) {
        activityId = await this.board.resolveActivityId(tx, progress.floor, toSquare);
        if (!activityId) {
          throw new ServiceUnavailableException(
            'O conteúdo da torre ainda não foi semeado. Nenhuma jogada foi consumida.',
          );
        }
      }

      const hasChallenge =
        toSquare > fromSquare &&
        info !== null &&
        (Boolean(activityId) || this.isObjectiveChallenge(info.type));
      const newSquare = hasChallenge ? fromSquare : toSquare;
      progress = await tx.towerProgress.update({
        where: { id: progress.id },
        data: {
          square: newSquare,
          previousSquare: fromSquare,
          movesLeftToday: progress.movesLeftToday - 1,
        },
      });

      const move = await tx.towerMove.create({
        data: {
          userId,
          floor: progress.floor,
          fromSquare,
          roll,
          toSquare,
          squareType: info?.type ?? 'none',
          activityId,
          result: hasChallenge ? 'pending' : 'skipped',
          xpGained: 0,
        },
      });

      return {
        roll,
        fromSquare,
        toSquare,
        floor: progress.floor,
        square: info,
        movesLeftToday: progress.movesLeftToday,
        sabotageApplied: Boolean(bananaEffect),
        pendingChallenge:
          hasChallenge && info ? this.toPendingChallenge(move, info) : null,
      };
    });
  }

  /** Submete o código do desafio pendente e aplica o resultado do loop. */
  async submit(userId: string, code: string): Promise<TowerSubmitResult> {
    const db = this.db();
    const user = await this.loadUser(db, userId);
    const pending = await this.findPendingMove(db, userId);
    if (!pending) {
      throw new ConflictException('Nenhum desafio pendente na torre.');
    }
    const info = this.board.getSquare(pending.floor, pending.toSquare);
    if (!pending.activityId || !['code', 'final'].includes(pending.squareType)) {
      throw new ConflictException('Este desafio não aceita submissão de código.');
    }

    if (this.isTimedOut(pending, info.timeLimitSeconds)) {
      return this.timeoutPendingMove(userId, pending);
    }

    const activity = await db.activity.findUnique({
      where: { id: pending.activityId as string },
    });
    if (!activity) {
      throw new ServiceUnavailableException(
        'O desafio da torre não está mais disponível. Tente novamente mais tarde.',
      );
    }

    // Execução fora da transação (chamada de rede; o runner tem timeout de 30 s).
    const evaluation = await this.runner.executeInSandbox({
      language: activity.language as Language,
      code,
      testScript: activity.testCode || '',
      hiddenTests: activity.hiddenTests || undefined,
      timeLimitMs: activity.timeLimitMs,
      memoryLimitMb: activity.memoryLimitMb,
    });
    const kind: SandboxResultKind =
      evaluation.kind ?? (evaluation.status === 'passed' ? 'passed' : 'failed');

    // Sandbox fora do ar: fail-closed — o desafio segue pendente, sem
    // consumir nada. O jogador retenta o submit depois.
    if (kind === 'sandbox_unavailable' || kind === 'unsupported') {
      throw new ServiceUnavailableException(
        'O sandbox de execução está temporariamente indisponível. Tente novamente mais tarde.',
      );
    }

    const passed = evaluation.status === 'passed';
    const canAwardXp = !NO_XP_KINDS.has(kind);

    const outcome = await db.$transaction(async (tx) => {
      await this.lockProgress(tx, userId);
      const stillPending = await this.findPendingMoveById(tx, pending.id);
      if (!stillPending) {
        throw new ConflictException('O desafio pendente já foi resolvido.');
      }
      const progress = await tx.towerProgress.findUnique({ where: { userId } });
      if (!progress) {
        throw new ConflictException('Progresso da torre não encontrado.');
      }

      // Registro da submissão (mesma auditoria das submissões normais).
      const submission = await tx.submission.create({
        data: {
          activityId: pending.activityId,
          userId,
          codeSnapshot: code,
          status: evaluation.status,
          score: evaluation.score,
          maxScore: evaluation.maxScore,
          durationMs: evaluation.durationMs,
          errorMessage: evaluation.errorMessage ?? null,
          logs: evaluation.logs ?? null,
          xpAwarded: false,
        },
      });
      if (evaluation.testCases.length > 0) {
        await tx.testCaseResult.createMany({
          data: evaluation.testCases.map((test) => ({
            submissionId: submission.id,
            name: test.name,
            passed: test.passed,
            durationMs: test.durationMs,
            stdout: test.stdout,
            stderr: test.stderr,
            errorMessage: test.errorMessage,
            isHidden: test.isHidden ?? false,
          })),
        });
      }

      const maxFloor = this.maxFloor(user.careerTier);
      const guardianDefeated = passed && this.isGuardian(info);
      let newFloor = progress.floor;

      // Checagem de Escudo Protetor (SHIELD) em caso de erro
      let shieldActive = false;
      if (!passed) {
        const shield = await (tx as any).towerActiveEffect.findFirst({
          where: { userId, effectType: 'SHIELD', charges: { gt: 0 } },
        });
        if (shield) {
          shieldActive = true;
          if (shield.charges <= 1) {
            await (tx as any).towerActiveEffect.delete({ where: { id: shield.id } });
          } else {
            await (tx as any).towerActiveEffect.update({
              where: { id: shield.id },
              data: { charges: shield.charges - 1 },
            });
          }
        }
      }

      const penaltySquare = shieldActive ? pending.fromSquare : Math.max(0, pending.fromSquare - 1);
      let newSquare = passed ? pending.toSquare : penaltySquare;
      let tierComplete = false;
      if (guardianDefeated) {
        if (progress.floor >= maxFloor) {
          // Último andar do nível: fica na casa 30 e o nível está completo.
          newSquare = pending.toSquare;
          tierComplete = true;
        } else {
          newFloor = progress.floor + 1;
          newSquare = 0;
        }
      }

      if (passed) {
        await (tx as any).user.update({
          where: { id: userId },
          data: { coins: { increment: 15 } },
        });
      }

      let xpAward: Awaited<ReturnType<GamificationService['awardSubmissionXp']>> = null;
      if (canAwardXp) {
        xpAward = await this.gamification.awardSubmissionXp(
          userId,
          pending.activityId as string,
          passed,
          evaluation.score,
          `submission:${submission.id}`,
          tx as unknown as Prisma.TransactionClient,
        );
        if (!xpAward) {
          throw new ConflictException('Não foi possível registrar a recompensa de XP.');
        }
        await tx.submission.update({
          where: { id: submission.id },
          data: { xpAwarded: true },
        });
      }

      const updated = await tx.towerProgress.update({
        where: { id: progress.id },
        data: { floor: newFloor, square: newSquare },
      });
      if (guardianDefeated) {
        await this.updatePartyFloor(tx, userId, newFloor);
      }
      await tx.towerMove.update({
        where: { id: pending.id },
        data: { result: passed ? 'passed' : 'failed', xpGained: xpAward?.xpGained ?? 0 },
      });
      return {
        floor: newFloor,
        square: newSquare,
        movesLeftToday: updated.movesLeftToday,
        guardianDefeated,
        tierComplete,
        xpAward,
      };
    });

    return {
      result: passed ? 'passed' : 'failed',
      score: evaluation.score,
      xpGained: outcome.xpAward?.xpGained ?? 0,
      totalXp: outcome.xpAward?.totalXp ?? null,
      level: outcome.xpAward?.level ?? null,
      streakDays: outcome.xpAward?.streak ?? null,
      floor: outcome.floor,
      square: outcome.square,
      movesLeftToday: outcome.movesLeftToday,
      guardianDefeated: outcome.guardianDefeated,
      tierComplete: outcome.tierComplete,
    };
  }

  /** Responde a quiz/minigame sem expor a resposta correta antes da tentativa. */
  async submitObjective(userId: string, choiceIndex: number): Promise<TowerSubmitResult> {
    if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) {
      throw new BadRequestException('Alternativa inválida.');
    }

    const db = this.db();
    const pending = await this.findPendingMove(db, userId);
    if (!pending || !this.isObjectiveChallenge(pending.squareType)) {
      throw new ConflictException('Nenhum quiz ou minigame pendente na torre.');
    }

    const question = getTowerObjectiveQuestion(pending.floor, pending.toSquare);
    const info = this.board.getSquare(pending.floor, pending.toSquare);
    if (this.isTimedOut(pending, info.timeLimitSeconds)) {
      return this.timeoutPendingMove(userId, pending);
    }

    const outcome = await db.$transaction(async (tx) => {
      await this.lockProgress(tx, userId);
      const stillPending = await this.findPendingMoveById(tx, pending.id);
      if (!stillPending || !this.isObjectiveChallenge(stillPending.squareType)) {
        throw new ConflictException('O desafio pendente já foi resolvido.');
      }

      const progress = await tx.towerProgress.findUnique({ where: { userId } });
      if (!progress) {
        throw new ConflictException('Progresso da torre não encontrado.');
      }
      if (this.isTimedOut(stillPending, info.timeLimitSeconds)) {
        return {
          kind: 'timeout' as const,
          timedOut: await this.applyTimeoutInTransaction(tx, userId, stillPending),
        };
      }

      const passed = choiceIndex === question.correctOption;
      let shieldActive = false;
      if (!passed) {
        const shield = await (tx as any).towerActiveEffect.findFirst({
          where: { userId, effectType: 'SHIELD', charges: { gt: 0 } },
        });
        if (shield) {
          shieldActive = true;
          if (shield.charges <= 1) {
            await (tx as any).towerActiveEffect.delete({ where: { id: shield.id } });
          } else {
            await (tx as any).towerActiveEffect.update({
              where: { id: shield.id },
              data: { charges: shield.charges - 1 },
            });
          }
        }
      }

      const score = passed ? 100 : 0;
      const newSquare = passed
        ? stillPending.toSquare
        : shieldActive
          ? stillPending.fromSquare
          : Math.max(0, stillPending.fromSquare - 1);

      if (passed) {
        await (tx as any).user.update({
          where: { id: userId },
          data: { coins: { increment: 15 } },
        });
      }

      const xpAward = await this.gamification.awardTowerObjectiveXp(
        userId,
        `tower-objective:${question.kind}:${stillPending.floor}:${stillPending.toSquare}`,
        passed,
        score,
        `tower-objective:${stillPending.id}`,
        tx as unknown as Prisma.TransactionClient,
      );
      if (!xpAward) {
        throw new ConflictException('Não foi possível registrar a recompensa de XP.');
      }

      const updated = await tx.towerProgress.update({
        where: { id: progress.id },
        data: { square: newSquare },
      });
      await tx.towerMove.update({
        where: { id: stillPending.id },
        data: { result: passed ? 'passed' : 'failed', xpGained: xpAward.xpGained },
      });

      return {
        kind: 'resolved' as const,
        passed,
        score,
        feedback: passed
          ? question.explanation
          : `Resposta correta: ${question.options[question.correctOption]}. ${question.explanation}`,
        floor: progress.floor,
        square: newSquare,
        movesLeftToday: updated.movesLeftToday,
        xpAward,
      };
    });

    if (outcome.kind === 'timeout') {
      return this.toTimeoutResult(outcome.timedOut);
    }

    return {
      result: outcome.passed ? 'passed' : 'failed',
      score: outcome.score,
      feedback: outcome.feedback,
      xpGained: outcome.xpAward.xpGained,
      totalXp: outcome.xpAward.totalXp,
      level: outcome.xpAward.level,
      streakDays: outcome.xpAward.streak,
      floor: outcome.floor,
      square: outcome.square,
      movesLeftToday: outcome.movesLeftToday,
      guardianDefeated: false,
      tierComplete: false,
    };
  }

  async getParty(userId: string): Promise<TowerPartyView | null> {
    const db = this.db();
    const party = await this.findUserParty(db, userId);
    if (!party) return null;

    const memberIds = this.partyMemberIds(party.members);
    const members = await Promise.all(
      memberIds.map(async (memberId) => {
        const [user, progress] = await Promise.all([
          db.user.findUnique({
            where: { id: memberId },
            select: { id: true, nickname: true },
          }),
          db.towerProgress.findUnique({ where: { userId: memberId } }),
        ]);
        if (!user) return null;
        return {
          id: user.id,
          nickname: user.nickname || 'Aventureiro',
          floor: progress?.floor ?? 1,
          square: progress?.square ?? 0,
          isLeader: memberId === party.leaderId,
          isCurrentUser: memberId === userId,
        };
      }),
    );
    const visibleMembers = members.filter(
      (member): member is TowerPartyMember => member !== null,
    );
    const nicknameById = new Map(
      visibleMembers.map((member) => [member.id, member.nickname]),
    );
    const recentMoves = memberIds.length
      ? await (db as any).towerMove.findMany({
          where: {
            userId: { in: memberIds },
            toSquare: TOWER_SQUARES_PER_FLOOR,
            result: 'passed',
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        })
      : [];

    return {
      id: party.id,
      name: party.name,
      floor: party.floor,
      leaderId: party.leaderId,
      members: visibleMembers,
      recentAdvances: recentMoves.map((move: TowerMoveRow) => ({
        id: move.id,
        nickname: nicknameById.get(move.userId) ?? 'Aventureiro',
        floor: move.floor,
        createdAt: move.createdAt.toISOString(),
      })),
    };
  }

  async createParty(userId: string, name?: string): Promise<TowerPartyView> {
    const db = this.db();
    const trimmedName = name?.trim();
    if (trimmedName && (trimmedName.length < 2 || trimmedName.length > 40)) {
      throw new BadRequestException('O nome da party deve ter entre 2 e 40 caracteres.');
    }

    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const currentParty = await this.findUserParty(tx, userId);
      if (currentParty) {
        throw new ConflictException('Você já participa de uma party ativa.');
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, nickname: true },
      });
      if (!user) throw new NotFoundException('Usuário não encontrado.');
      const progress = await tx.towerProgress.findUnique({ where: { userId } });
      await (tx as any).towerParty.create({
        data: {
          name: trimmedName || `Torre de ${user.nickname || 'Aventureiro'}`,
          floor: progress?.floor ?? 1,
          leaderId: userId,
          members: [userId],
          status: 'active',
        },
      });
    });

    return this.getRequiredPartyView(userId);
  }

  async joinParty(userId: string, partyId: string): Promise<TowerPartyView> {
    const db = this.db();
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) throw new NotFoundException('Usuário não encontrado.');

      const currentParty = await this.findUserParty(tx, userId);
      if (currentParty?.id === partyId) return;
      if (currentParty) {
        throw new ConflictException('Você já participa de outra party ativa.');
      }

      let party = await (tx as any).towerParty.findUnique({ where: { id: partyId } });
      if (!party || party.status !== 'active') {
        throw new NotFoundException('Party não encontrada ou encerrada.');
      }
      await this.lockParty(tx, partyId);
      party = await (tx as any).towerParty.findUnique({ where: { id: partyId } });
      if (!party || party.status !== 'active') {
        throw new NotFoundException('Party não encontrada ou encerrada.');
      }

      const members = this.partyMemberIds(party.members);
      if (members.includes(userId)) return;
      if (members.length >= 4) {
        throw new ConflictException('Esta party já atingiu o limite de 4 participantes.');
      }
      await (tx as any).towerParty.update({
        where: { id: partyId },
        data: { members: [...members, userId] },
      });
    });
    return this.getRequiredPartyView(userId);
  }

  async leaveParty(userId: string): Promise<{ success: true }> {
    const db = this.db();
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const party = await this.findUserParty(tx, userId);
      if (!party) throw new ConflictException('Você não participa de uma party ativa.');
      await this.lockParty(tx, party.id);
      const currentParty = await (tx as any).towerParty.findUnique({
        where: { id: party.id },
      });
      if (!currentParty || currentParty.status !== 'active') {
        throw new ConflictException('A party não está mais ativa.');
      }

      const members = this.partyMemberIds(currentParty.members).filter(
        (memberId) => memberId !== userId,
      );
      if (members.length === 0) {
        await (tx as any).towerParty.delete({ where: { id: currentParty.id } });
        return;
      }
      await (tx as any).towerParty.update({
        where: { id: currentParty.id },
        data: {
          members,
          ...(currentParty.leaderId === userId ? { leaderId: members[0] } : {}),
        },
      });
    });
    return { success: true };
  }

  private async getRequiredPartyView(userId: string): Promise<TowerPartyView> {
    const party = await this.getParty(userId);
    if (!party) {
      throw new ConflictException('A party foi salva, mas não pôde ser carregada.');
    }
    return party;
  }

  // ---- helpers ----

  private isTimedOut(move: TowerMoveRow, timeLimitSeconds: number): boolean {
    return (
      Date.now() >
      move.createdAt.getTime() +
        (timeLimitSeconds + move.timeBonusSeconds) * 1000
    );
  }

  private async timeoutPendingMove(
    userId: string,
    pending: TowerMoveRow,
  ): Promise<TowerSubmitResult> {
    const timedOut = await this.db().$transaction(async (tx) => {
      await this.lockProgress(tx, userId);
      const stillPending = await this.findPendingMoveById(tx, pending.id);
      if (!stillPending) {
        throw new ConflictException('O desafio pendente já foi resolvido.');
      }
      const info = this.board.getSquare(stillPending.floor, stillPending.toSquare);
      if (!this.isTimedOut(stillPending, info.timeLimitSeconds)) {
        throw new ConflictException(
          'O prazo do desafio foi estendido. Envie sua resposta novamente.',
        );
      }
      return this.applyTimeoutInTransaction(tx, userId, stillPending);
    });
    return this.toTimeoutResult(timedOut);
  }

  private async applyTimeoutInTransaction(
    tx: TowerPrismaClient,
    userId: string,
    pending: TowerMoveRow,
  ) {
    const progress = await tx.towerProgress.findUnique({ where: { userId } });
    let shieldActive = false;
    const shield = await (tx as any).towerActiveEffect.findFirst({
      where: { userId, effectType: 'SHIELD', charges: { gt: 0 } },
    });
    if (shield) {
      shieldActive = true;
      if (shield.charges <= 1) {
        await (tx as any).towerActiveEffect.delete({ where: { id: shield.id } });
      } else {
        await (tx as any).towerActiveEffect.update({
          where: { id: shield.id },
          data: { charges: shield.charges - 1 },
        });
      }
    }

    const newSquare = shieldActive
      ? pending.fromSquare
      : Math.max(0, pending.fromSquare - 1);
    const updated = progress
      ? await tx.towerProgress.update({
          where: { id: progress.id },
          data: { square: newSquare },
        })
      : null;
    await tx.towerMove.update({
      where: { id: pending.id },
      data: { result: 'timeout', xpGained: 0 },
    });
    return {
      floor: pending.floor,
      square: newSquare,
      movesLeftToday: updated?.movesLeftToday ?? 0,
    };
  }

  private toTimeoutResult(timedOut: {
    floor: number;
    square: number;
    movesLeftToday: number;
  }): TowerSubmitResult {
    return {
      result: 'timeout',
      score: null,
      xpGained: 0,
      totalXp: null,
      level: null,
      streakDays: null,
      floor: timedOut.floor,
      square: timedOut.square,
      movesLeftToday: timedOut.movesLeftToday,
      guardianDefeated: false,
      tierComplete: false,
    };
  }

  /** Cast documentado em tower-prisma.types.ts (client ainda sem `prisma generate`). */
  private db(): TowerPrismaClient {
    return this.prisma as unknown as TowerPrismaClient;
  }

  private async loadUser(
    db: TowerPrismaClient,
    userId: string,
  ): Promise<TowerUserRow> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, plan: true, careerTier: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  private todayUtc(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private dailyLimit(plan: string): number {
    // T1 — qualquer plano pago (pro ou career) tem o limite de assinante;
    // só 'free' fica com o limite grátis.
    return plan === 'free' ? TOWER_FREE_DAILY_MOVES : TOWER_PRO_DAILY_MOVES;
  }

  private maxFloor(careerTier: string): number {
    return TOWER_MAX_FLOOR_BY_TIER[careerTier] ?? TOWER_MAX_FLOOR_BY_TIER.beginner;
  }

  private isCodeChallenge(info: TowerSquareInfo): boolean {
    return info.type === 'code' || info.type === 'final';
  }

  private isObjectiveChallenge(squareType: string): boolean {
    return squareType === 'quiz' || squareType === 'minigame';
  }

  private isGuardian(info: TowerSquareInfo): boolean {
    return info.type === 'final';
  }

  /** Reseta as jogadas quando o dia (UTC) virou desde o último acesso. */
  private async maybeResetDaily(
    tx: TowerPrismaClient,
    progress: TowerProgressRow,
    user: TowerUserRow,
  ): Promise<TowerProgressRow> {
    const lastReset = progress.movesResetDate.toISOString().slice(0, 10);
    if (lastReset === this.todayUtc()) return progress;
    return tx.towerProgress.update({
      where: { id: progress.id },
      data: {
        movesLeftToday: this.dailyLimit(user.plan),
        movesResetDate: new Date(this.todayUtc()),
      },
    });
  }

  /** Trava a linha de progresso do usuário dentro da transação em curso. */
  private async lockProgress(tx: TowerPrismaClient, userId: string): Promise<void> {
    await tx.$queryRaw`SELECT "id" FROM "tower_progress" WHERE "user_id" = ${userId} FOR UPDATE`;
  }

  private async lockParty(tx: TowerPrismaClient, partyId: string): Promise<void> {
    await tx.$queryRaw`SELECT "id" FROM "tower_parties" WHERE "id" = ${partyId}::uuid FOR UPDATE`;
  }

  private partyMemberIds(members: unknown): string[] {
    return Array.isArray(members)
      ? [...new Set(members.filter((member): member is string => typeof member === 'string'))]
      : [];
  }

  private async findUserParty(db: TowerPrismaClient, userId: string) {
    const parties = await (db as any).towerParty.findMany({
      where: { status: 'active' },
      orderBy: { updatedAt: 'desc' },
    });
    return parties.find((party: { members: unknown }) =>
      this.partyMemberIds(party.members).includes(userId),
    ) ?? null;
  }

  private async updatePartyFloor(
    tx: TowerPrismaClient,
    userId: string,
    floor: number,
  ): Promise<void> {
    const parties = await (tx as any).towerParty.findMany({
      where: { status: 'active' },
    });
    for (const candidate of parties) {
      if (!this.partyMemberIds(candidate.members).includes(userId)) continue;
      await this.lockParty(tx, candidate.id);
      const party = await (tx as any).towerParty.findUnique({
        where: { id: candidate.id },
      });
      if (
        party?.status === 'active' &&
        this.partyMemberIds(party.members).includes(userId) &&
        party.floor < floor
      ) {
        await (tx as any).towerParty.update({
          where: { id: party.id },
          data: { floor },
        });
      }
    }
  }

  private async findPendingMove(
    db: TowerPrismaClient,
    userId: string,
  ): Promise<TowerMoveRow | null> {
    return db.towerMove.findFirst({
      where: { userId, result: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findPendingMoveById(
    tx: TowerPrismaClient,
    moveId: string,
  ): Promise<TowerMoveRow | null> {
    return tx.towerMove.findFirst({
      where: { id: moveId, result: 'pending' },
    });
  }

  private toPendingChallenge(move: TowerMoveRow, info: TowerSquareInfo): TowerPendingChallenge {
    const objective = this.isObjectiveChallenge(move.squareType)
      ? getTowerObjectiveQuestion(move.floor, move.toSquare)
      : null;
    return {
      activityId: move.activityId,
      floor: move.floor,
      toSquare: move.toSquare,
      squareType: move.squareType,
      timeLimitSeconds: info.timeLimitSeconds + move.timeBonusSeconds,
      deadlineAt: new Date(
        move.createdAt.getTime() +
          (info.timeLimitSeconds + move.timeBonusSeconds) * 1000,
      ).toISOString(),
      ...(objective
        ? {
            objective: {
              kind: objective.kind,
              title: objective.title,
              prompt: objective.prompt,
              options: objective.options,
              ...(objective.codeSnippet ? { codeSnippet: objective.codeSnippet } : {}),
            },
          }
        : {}),
    };
  }

  private toView(
    user: TowerUserRow,
    progress: TowerProgressRow,
    pending: TowerMoveRow | null,
  ): TowerProgressView {
    const info = pending ? this.board.getSquare(pending.floor, pending.toSquare) : null;
    return {
      floor: progress.floor,
      square: progress.square,
      movesLeftToday: progress.movesLeftToday,
      dailyMovesLimit: this.dailyLimit(user.plan),
      plan: user.plan,
      maxFloor: this.maxFloor(user.careerTier),
      movesResetDate: progress.movesResetDate.toISOString().slice(0, 10),
      pendingChallenge: pending && info ? this.toPendingChallenge(pending, info) : null,
    };
  }

  // ── Mercador, Economia e Inventário (Pacote 4) ───────────────────────

  async listMerchantItems() {
    const items = await (this.prisma as any).towerItem.findMany({
      orderBy: { costCoins: 'asc' },
    });
    return items.length > 0 ? items : TOWER_DEFAULT_ITEMS;
  }

  async getUserInventory(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, coins: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const [inventory, activeEffects] = await Promise.all([
      (this.prisma as any).userTowerInventory.findMany({
        where: { userId, quantity: { gt: 0 } },
        include: { item: true },
      }),
      (this.prisma as any).towerActiveEffect.findMany({
        where: { userId, charges: { gt: 0 } },
      }),
    ]);

    return {
      coins: user.coins ?? 0,
      inventory: inventory.map((inv: any) => ({
        itemCode: inv.itemCode,
        name: inv.item?.name || inv.itemCode,
        description: inv.item?.description,
        icon: inv.item?.icon,
        quantity: inv.quantity,
      })),
      activeEffects: activeEffects.map((eff: any) => ({
        effectType: eff.effectType,
        charges: eff.charges,
        expiresAt: eff.expiresAt,
      })),
    };
  }

  async buyItem(userId: string, itemCode: string) {
    const item = TOWER_DEFAULT_ITEMS.find((i) => i.code === itemCode);
    if (!item) throw new NotFoundException('Item não encontrado.');
    const cost = item.costCoins;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { coins: true } });
      if (!user) throw new NotFoundException('Usuário não encontrado.');
      const currentCoins = user.coins ?? 0;
      if (currentCoins < cost) {
        throw new ConflictException(`Nexus Coins insuficientes. Você tem ${currentCoins} e o item custa ${cost}.`);
      }

      await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: cost } },
      });

      const inv = await (tx as any).userTowerInventory.upsert({
        where: {
          userId_itemCode: { userId, itemCode },
        },
        create: {
          userId,
          itemCode,
          quantity: 1,
        },
        update: {
          quantity: { increment: 1 },
        },
      });

      return {
        success: true,
        itemCode,
        remainingCoins: currentCoins - cost,
        inventoryQuantity: inv.quantity,
      };
    });
  }

  async useItem(userId: string, itemCode: string, targetUserId?: string) {
    const item = TOWER_DEFAULT_ITEMS.find((candidate) => candidate.code === itemCode);
    if (!item) throw new NotFoundException('Item não encontrado.');
    if (!DIRECTLY_ACTIVATABLE_TOWER_ITEMS.has(itemCode)) {
      throw new ConflictException(
        'Este item não possui uma ação de ativação disponível.',
      );
    }
    if (itemCode === 'CHAOS_BANANA' && (!targetUserId || targetUserId === userId)) {
      throw new BadRequestException('Selecione outro integrante da sua party.');
    }
    if (itemCode !== 'CHAOS_BANANA' && targetUserId) {
      throw new BadRequestException('Este item não aceita um alvo.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (itemCode === 'CHAOS_BANANA') {
        const rivalId = targetUserId;
        if (!rivalId || rivalId === userId) {
          throw new BadRequestException('Selecione outro integrante da sua party.');
        }
        const party = await this.findUserParty(
          tx as unknown as TowerPrismaClient,
          userId,
        );
        if (!party) {
          throw new ConflictException(
            'A Armadilha Competitiva só pode ser usada contra alguém da sua party.',
          );
        }
        if (!this.partyMemberIds(party.members).includes(rivalId)) {
          throw new ForbiddenException(
            'O alvo precisa ser outro integrante da sua party ativa.',
          );
        }
        const target = await tx.user.findUnique({
          where: { id: rivalId },
          select: { id: true, nickname: true },
        });
        if (!target) throw new NotFoundException('Integrante não encontrado.');
        const targetProgress = await tx.towerProgress.findUnique({
          where: { userId: rivalId },
        });
        if (!targetProgress) {
          throw new ConflictException('O alvo precisa iniciar a Torre antes de ser sabotado.');
        }
        await this.lockProgress(
          tx as unknown as TowerPrismaClient,
          rivalId,
        );
        await this.lockParty(tx as unknown as TowerPrismaClient, party.id);
        const currentParty = await (tx as any).towerParty.findUnique({
          where: { id: party.id },
        });
        const currentMembers = this.partyMemberIds(currentParty?.members);
        if (
          !currentParty ||
          currentParty.status !== 'active' ||
          !currentMembers.includes(userId) ||
          !currentMembers.includes(rivalId)
        ) {
          throw new ForbiddenException(
            'O alvo precisa ser outro integrante da sua party ativa.',
          );
        }

        const consumed = await (tx as any).userTowerInventory.updateMany({
          where: { userId, itemCode, quantity: { gt: 0 } },
          data: { quantity: { decrement: 1 } },
        });
        if (consumed.count !== 1) {
          throw new ConflictException('Você não possui este item em seu inventário.');
        }

        await (tx as any).towerActiveEffect.create({
          data: {
            userId: rivalId,
            effectType: itemCode,
            charges: 1,
          },
        });
        return {
          success: true,
          activatedEffect: itemCode,
          target: target.nickname || 'Aventureiro',
        };
      }

      if (itemCode === 'EXTRA_TIME') {
        await this.lockProgress(tx as unknown as TowerPrismaClient, userId);
        const pending = await this.findPendingMove(
          tx as unknown as TowerPrismaClient,
          userId,
        );
        if (!pending) {
          throw new ConflictException(
            'A Ampulheta só pode ser usada durante um desafio pendente.',
          );
        }
        const info = this.board.getSquare(pending.floor, pending.toSquare);
        if (this.isTimedOut(pending, info.timeLimitSeconds)) {
          throw new ConflictException(
            'O tempo do desafio acabou; não é possível estendê-lo.',
          );
        }

        const consumed = await (tx as any).userTowerInventory.updateMany({
          where: { userId, itemCode, quantity: { gt: 0 } },
          data: { quantity: { decrement: 1 } },
        });
        if (consumed.count !== 1) {
          throw new ConflictException(
            'Você não possui este item em seu inventário.',
          );
        }

        const updated = await (tx as any).towerMove.update({
          where: { id: pending.id },
          data: {
            timeBonusSeconds: pending.timeBonusSeconds + EXTRA_TIME_SECONDS,
          },
        });
        return {
          success: true,
          itemCode,
          secondsAdded: EXTRA_TIME_SECONDS,
          timeLimitSeconds: info.timeLimitSeconds + updated.timeBonusSeconds,
          deadlineAt: new Date(
            updated.createdAt.getTime() +
              (info.timeLimitSeconds + updated.timeBonusSeconds) * 1000,
          ).toISOString(),
        };
      }

      const consumed = await (tx as any).userTowerInventory.updateMany({
        where: { userId, itemCode, quantity: { gt: 0 } },
        data: { quantity: { decrement: 1 } },
      });
      if (consumed.count !== 1) {
        throw new ConflictException('Você não possui este item em seu inventário.');
      }

      // Cria/adiciona efeito ativo
      const effect = await (tx as any).towerActiveEffect.create({
        data: {
          userId,
          effectType: itemCode,
          charges: 1,
        },
      });

      return {
        success: true,
        activatedEffect: effect.effectType,
        charges: effect.charges,
      };
    });
  }

  async askOracleHint(userId: string) {
    const db = this.db();
    return db.$transaction(async (tx) => {
      const pending = await this.findPendingMove(tx, userId);
      if (!pending || !pending.activityId) {
        throw new ConflictException('Nenhum desafio pendente na torre para receber dica.');
      }

      const activity = await tx.activity.findUnique({
        where: { id: pending.activityId },
      });

      const consumed = await (tx as any).userTowerInventory.updateMany({
        where: { userId, itemCode: 'ORACLE_SCROLL', quantity: { gt: 0 } },
        data: { quantity: { decrement: 1 } },
      });
      if (consumed.count !== 1) {
        throw new ForbiddenException(
          'A IA Socrática na Torre exige o Pergaminho do Oráculo (ORACLE_SCROLL). Adquira-o no Mercador.',
        );
      }

      return {
        success: true,
        hint: `[Oráculo da Torre]: Observe atentamente as estruturas condicionais e o escopo de variáveis deste desafio (${activity?.title || 'Casa Atual'}). Qual caso base garante a terminação correta?`,
        consumedItem: 'ORACLE_SCROLL',
      };
    });
  }

}
