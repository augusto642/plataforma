import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Language } from '@prisma/client';
import { GamificationService } from '../gamification/gamification.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  PistonRunnerService,
  type SandboxResultKind,
} from '../submissions/runner/runner.service';
import { DiceService } from './dice.service';
import { TowerBoardService, type TowerSquareInfo } from './tower-board.service';
import {
  TOWER_FREE_DAILY_MOVES,
  TOWER_MAX_FLOOR_BY_TIER,
  TOWER_PRO_DAILY_MOVES,
  TOWER_SQUARES_PER_FLOOR,
} from './tower.constants';
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

export interface TowerPendingChallenge {
  activityId: string;
  floor: number;
  toSquare: number;
  squareType: string;
  timeLimitSeconds: number;
  deadlineAt: string;
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
  square: TowerSquareInfo;
  movesLeftToday: number;
  pendingChallenge: TowerPendingChallenge | null;
}

export type TowerSubmitResultKind = 'passed' | 'failed' | 'timeout';

export interface TowerSubmitResult {
  result: TowerSubmitResultKind;
  score: number | null;
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
 * Loop principal da Torre de Desafios (Fase 1 — MVP jogável).
 *
 * rolar → mover → resolver a casa de código via Activity + Piston.
 * - Acerto: avança para a casa sorteada.
 * - Erro ou tempo esgotado: volta para a última casa − 1.
 * - Guardião (casa 30): passar avança de andar (ou completa o nível).
 * - Limite diário: 5 jogadas/dia (grátis) / 10 (assinante), reset à meia-noite (UTC).
 * - XP: reusa GamificationService (70 passou / 20 errou / +50 nota 100).
 *
 * Casas de quiz/mini-game/item (Fase 1): o jogador apenas atravessa a casa —
 * o desafio em si é Fase 2. O movimento dessas casas é aplicado na rolagem.
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

      const roll = this.dice.roll();
      const fromSquare = progress.square;
      const toSquare = Math.min(fromSquare + roll, TOWER_SQUARES_PER_FLOOR);
      const info = this.board.getSquare(progress.floor, toSquare);

      // Casa de código/guardião precisa da Activity semeada — sem ela, a
      // jogada NÃO é consumida (fail-closed).
      let activityId: string | null = null;
      if (this.isCodeChallenge(info)) {
        activityId = await this.board.resolveActivityId(tx, progress.floor, toSquare);
        if (!activityId) {
          throw new ServiceUnavailableException(
            'O conteúdo da torre ainda não foi semeado. Nenhuma jogada foi consumida.',
          );
        }
      }

      // Casa sem desafio (quiz/mini-game/item): atravessa na hora. Casa de
      // código: o avanço só acontece quando o desafio for resolvido.
      const newSquare = activityId ? fromSquare : toSquare;
      progress = await tx.towerProgress.update({
        where: { id: progress.id },
        data: { square: newSquare, movesLeftToday: progress.movesLeftToday - 1 },
      });

      const move = await tx.towerMove.create({
        data: {
          userId,
          floor: progress.floor,
          fromSquare,
          roll,
          toSquare,
          squareType: info.type,
          activityId,
          result: activityId ? 'pending' : 'skipped',
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
        pendingChallenge: activityId ? this.toPendingChallenge(move, info) : null,
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
    const deadlineAt = new Date(
      pending.createdAt.getTime() + info.timeLimitSeconds * 1000,
    );

    // Tempo esgotado: volta para a última casa − 1, sem XP e sem submissão
    // (nada foi executado).
    if (Date.now() > deadlineAt.getTime()) {
      const timedOut = await db.$transaction(async (tx) => {
        const stillPending = await this.findPendingMoveById(tx, pending.id);
        if (!stillPending) {
          throw new ConflictException('O desafio pendente já foi resolvido.');
        }
        await this.lockProgress(tx, userId);
        const progress = await tx.towerProgress.findUnique({ where: { userId } });
        const newSquare = Math.max(0, pending.fromSquare - 1);
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
      });
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
      const stillPending = await this.findPendingMoveById(tx, pending.id);
      if (!stillPending) {
        throw new ConflictException('O desafio pendente já foi resolvido.');
      }
      await this.lockProgress(tx, userId);
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
          xpAwarded: canAwardXp,
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
      let newSquare = passed ? pending.toSquare : Math.max(0, pending.fromSquare - 1);
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

      const updated = await tx.towerProgress.update({
        where: { id: progress.id },
        data: { floor: newFloor, square: newSquare },
      });
      await tx.towerMove.update({
        where: { id: pending.id },
        data: { result: passed ? 'passed' : 'failed', xpGained: 0 },
      });
      return {
        floor: newFloor,
        square: newSquare,
        movesLeftToday: updated.movesLeftToday,
        guardianDefeated,
        tierComplete,
      };
    });

    // XP depois da transação, como no EvaluatorService.
    let xpGained = 0;
    let totalXp: number | null = null;
    let level: number | null = null;
    let streakDays: number | null = null;
    if (canAwardXp) {
      const awarded = await this.gamification.awardSubmissionXp(
        userId,
        pending.activityId as string,
        passed,
        evaluation.score,
      );
      if (awarded) {
        xpGained = awarded.xpGained;
        totalXp = awarded.totalXp;
        level = awarded.level;
        streakDays = awarded.streak;
        await db.towerMove.update({
          where: { id: pending.id },
          data: { xpGained },
        });
      } else {
        this.logger.warn(
          `XP da torre não foi premiado (user ${userId}, activity ${pending.activityId}).`,
        );
      }
    }

    return {
      result: passed ? 'passed' : 'failed',
      score: evaluation.score,
      xpGained,
      totalXp,
      level,
      streakDays,
      floor: outcome.floor,
      square: outcome.square,
      movesLeftToday: outcome.movesLeftToday,
      guardianDefeated: outcome.guardianDefeated,
      tierComplete: outcome.tierComplete,
    };
  }

  // ---- helpers ----

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
    return {
      activityId: move.activityId as string,
      floor: move.floor,
      toSquare: move.toSquare,
      squareType: move.squareType,
      timeLimitSeconds: info.timeLimitSeconds,
      deadlineAt: new Date(
        move.createdAt.getTime() + info.timeLimitSeconds * 1000,
      ).toISOString(),
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
}
