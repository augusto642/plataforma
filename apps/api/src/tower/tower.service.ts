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
  TOWER_DEFAULT_ITEMS,
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
      try {
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
      } catch {}

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

        // Checagem de Escudo Protetor (SHIELD) no timeout
        let shieldActive = false;
        try {
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
        } catch {}

        const newSquare = shieldActive ? pending.fromSquare : Math.max(0, pending.fromSquare - 1);
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

      // Checagem de Escudo Protetor (SHIELD) em caso de erro
      let shieldActive = false;
      if (!passed) {
        try {
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
        } catch {}
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
        try {
          await (tx as any).user.update({
            where: { id: userId },
            data: { coins: { increment: 15 } },
          });
        } catch {}
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

  // ── Mercador, Economia e Inventário (Pacote 4) ───────────────────────

  async listMerchantItems() {
    try {
      const items = await (this.prisma as any).towerItem.findMany({
        orderBy: { costCoins: 'asc' },
      });
      return items.length > 0 ? items : TOWER_DEFAULT_ITEMS;
    } catch {
      return TOWER_DEFAULT_ITEMS;
    }
  }

  async getUserInventory(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, coins: true },
    });

    try {
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
        coins: user?.coins ?? 0,
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
    } catch {
      return {
        coins: user?.coins ?? 0,
        inventory: [],
        activeEffects: [],
      };
    }
  }

  async buyItem(userId: string, itemCode: string) {
    const item = TOWER_DEFAULT_ITEMS.find((i) => i.code === itemCode);
    const cost = item ? item.costCoins : 50;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { coins: true } });
      const currentCoins = user?.coins ?? 0;
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

  async useItem(userId: string, itemCode: string) {
    return this.prisma.$transaction(async (tx) => {
      const inv = await (tx as any).userTowerInventory.findUnique({
        where: { userId_itemCode: { userId, itemCode } },
      });

      if (!inv || inv.quantity <= 0) {
        throw new ConflictException('Você não possui este item em seu inventário.');
      }

      // Decrementa inventário
      await (tx as any).userTowerInventory.update({
        where: { id: inv.id },
        data: { quantity: inv.quantity - 1 },
      });

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
    const pending = await this.findPendingMove(db, userId);
    if (!pending || !pending.activityId) {
      throw new ConflictException('Nenhum desafio pendente na torre para receber dica.');
    }

    // Verifica se possui item ORACLE_SCROLL ou efeito ativo
    const inv = await (this.prisma as any).userTowerInventory.findUnique({
      where: { userId_itemCode: { userId, itemCode: 'ORACLE_SCROLL' } },
    });

    if (!inv || inv.quantity <= 0) {
      throw new ForbiddenException(
        'A IA Socrática na Torre exige o Pergaminho do Oráculo (ORACLE_SCROLL). Adquira-o no Mercador.',
      );
    }

    // Consome 1 pergaminho
    await (this.prisma as any).userTowerInventory.update({
      where: { id: inv.id },
      data: { quantity: inv.quantity - 1 },
    });

    const activity = await this.prisma.activity.findUnique({
      where: { id: pending.activityId as string },
    });

    return {
      success: true,
      hint: `[Oráculo da Torre]: Observe atentamente as estruturas condicionais e o escopo de variáveis deste desafio (${activity?.title || 'Casa Atual'}). Qual caso base garante a terminação correta?`,
      consumedItem: 'ORACLE_SCROLL',
    };
  }

  // ── Modo Party nas Torres Altas (Pacote 4.1) ─────────────────────────

  async createParty(userId: string, name: string) {
    const party = await (this.prisma as any).towerParty.create({
      data: {
        name,
        leaderId: userId,
        members: [{ userId, joinedAt: new Date().toISOString() }],
        floor: 10,
        subtasks: [
          { id: 'task-1', title: 'Implementar Algoritmo de Otimização', status: 'pending' },
          { id: 'task-2', title: 'Cobrir Testes de Resiliência', status: 'pending' },
        ],
      },
    });

    return party;
  }

  async getParty(partyId: string) {
    const party = await (this.prisma as any).towerParty.findUnique({
      where: { id: partyId },
      include: { leader: { select: { id: true, name: true, email: true } } },
    });
    if (!party) throw new NotFoundException('Party não encontrada');
    return party;
  }

  async joinParty(userId: string, partyId: string) {
    const party = await (this.prisma as any).towerParty.findUnique({
      where: { id: partyId },
    });
    if (!party) throw new NotFoundException('Party não encontrada');

    const members: any[] = Array.isArray(party.members) ? party.members : [];
    if (!members.some((m) => m.userId === userId)) {
      members.push({ userId, joinedAt: new Date().toISOString() });
      await (this.prisma as any).towerParty.update({
        where: { id: partyId },
        data: { members },
      });
    }

    return { success: true, partyId, membersCount: members.length };
  }
}
