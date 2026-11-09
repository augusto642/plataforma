import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { reconcileXp as reconcileXpInDb } from './xp-reconciliation';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * C8 (Lote 1): quando `tx` é passado (caso do EvaluatorService), o prêmio
   * roda DENTRO da transação do chamador — sem $transaction própria e sem
   * engolir erro: se o award falhar, a transação inteira desfaz (inclusive o
   * claim xpAwarded), e o retry do BullMQ pode reclamar o XP. Sem `tx`, o
   * comportamento antigo é preservado (transação própria + catch que retorna
   * null), para chamadores fora do fluxo de avaliação.
   */
  async awardSubmissionXp(
    userId: string,
    activityId: string,
    passed: boolean,
    score: number,
    tx?: Prisma.TransactionClient,
  ) {
    if (tx) {
      return this.awardSubmissionXpInner(tx, userId, passed, score);
    }
    try {
      return await this.prisma.$transaction(async (t) =>
        this.awardSubmissionXpInner(t, userId, passed, score),
      );
    } catch (err: any) {
      this.logger.error(`Failed to award gamification XP: ${err.message}`);
      return null;
    }
  }

  private async awardSubmissionXpInner(
    tx: Prisma.TransactionClient,
    userId: string,
    passed: boolean,
    score: number,
  ) {
    const xpGained = passed ? 70 : 20;
    const perfectBonus = score === 100 ? 50 : 0;
    const totalXpDelta = xpGained + perfectBonus;

    const user = await tx.user.findUnique({
      where: { id: userId },
      include: { badges: true },
    });

    if (!user) return null;

    // M4 (Lote 4): nível e streak calculados a partir do valor JÁ
    // TRAVADO/ATUALIZADO, dentro desta transação — nunca da leitura
    // inicial. Antes, `newLevel = floor((user.xp + delta)/200)+1` usava o
    // XP lido sem lock: duas concessões concorrentes calculavam o nível a
    // partir do mesmo XP e a subida de nível se perdia (ex.: xp 190 +
    // 120 duas vezes = 430, nível 3, mas ambas gravavam nível 2, porque
    // cada uma via 190+120=310 -> nível 2). Agora o `update` com
    // {increment} trava a linha do usuário até o fim da transação e
    // devolve o XP novo; o nível deriva dele (mesmo padrão já usado no
    // battleRun — `executeBattleRunInner` — que calcula o nível a partir
    // do `updatedUser.xp` retornado pelo increment).
    //
    // Streak (B15, Sprint 10): deriva de `lastActiveAt` lido ANTES do
    // update, via computeStreakDays (dias de calendário UTC, 1 dia de
    // descanso perdoado). Sob concorrência as duas corridas leem o mesmo
    // lastActiveAt e computam o mesmo streak — o que é correto por
    // desenho: duas submissões no mesmo dia contam 1 dia de streak, não 2.
    const now = new Date();
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        xp: { increment: totalXpDelta },
        lastActiveAt: now,
      },
    });

    const newXp = updated.xp;
    const newLevel = Math.floor(newXp / 200) + 1;

    const newStreak = this.computeStreakDays(user.streakDays || 0, user.lastActiveAt, now);

    // Segunda escrita só se o nível e/ou o streak mudaram (o XP e o
    // lastActiveAt já foram gravados no update acima): evita um UPDATE
    // vazio quando nada muda.
    let finalUser = updated;
    if (newLevel !== updated.level || newStreak !== updated.streakDays) {
      finalUser = await tx.user.update({
        where: { id: userId },
        data: {
          level: newLevel,
          streakDays: newStreak,
        },
      });
    }

    await this.evaluateBadges(tx, finalUser, user.badges, passed, score, newStreak);

    return { xpGained: totalXpDelta, totalXp: newXp, level: newLevel, streak: newStreak };
  }

  /**
   * Regra de streak com dia de descanso (padrão Rocketseat — B15):
   * meta semanal de 6 dias de atividade com 1 dia de descanso perdoado.
   *
   * A conta é por DIAS DE CALENDÁRIO (UTC), não por janela de horas — a
   * regra antiga (20–48h) quebrava a sequência de quem estuda em horários
   * diferentes a cada dia e perdoava folgas diferentes conforme o relógio.
   *
   * - sem atividade anterior: hoje é o dia 1;
   * - mesmo dia (ou relógio adiantado): sequência intacta;
   * - dia seguinte: +1;
   * - 1 dia sem atividade entre a última e hoje (o dia de descanso da
   *   semana): sequência PRESERVADA e hoje soma +1;
   * - 2 ou mais dias sem atividade: quebra — hoje recomeça em 1.
   *
   * Como só olhamos os dias corridos entre as duas atividades, a virada
   * de semana não quebra nada por si só: pular o domingo e voltar na
   * segunda (ou pular a segunda e voltar na terça) mantém a sequência.
   */
  private computeStreakDays(currentStreak: number, lastActiveAt: Date | null, now: Date): number {
    if (!lastActiveAt) return 1;

    const dayIndex = (d: Date) =>
      Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000);
    const gap = dayIndex(now) - dayIndex(new Date(lastActiveAt));

    if (gap <= 0) return Math.max(currentStreak, 1);
    if (gap <= 2) return currentStreak + 1;
    return 1;
  }

  private async evaluateBadges(tx: any, user: any, existingBadges: any[], passed: boolean, score: number, streak: number) {
    const existingCodes = new Set(existingBadges.map((b: any) => b.badgeCode));
    const badgesToAward: Array<{ code: string; title: string; desc: string; icon: string }> = [];

    if (!existingCodes.has('first_step')) {
      badgesToAward.push({
        code: 'first_step',
        title: 'Primeiro Passo',
        desc: 'Enviou sua primeira solução de código!',
        icon: '🌱',
      });
    }

    if (score === 100 && !existingCodes.has('perfectionist')) {
      badgesToAward.push({
        code: 'perfectionist',
        title: 'Pontuação Perfeita',
        desc: 'Alcançou nota 100 em um exercício!',
        icon: '⭐',
      });
    }

    if (streak >= 3 && !existingCodes.has('streak_3')) {
      badgesToAward.push({
        code: 'streak_3',
        title: 'Foco Constante',
        desc: 'Manteve 3 dias seguidos de estudo!',
        icon: '🔥',
      });
    }

    // C8: createMany com skipDuplicates é a defesa contra a corrida no
    // @@unique([userId, badgeCode]): duas avaliações simultâneas para um
    // usuário novo (ex.: first_step) não quebram mais com P2002 — a segunda
    // inserção duplicada é ignorada em vez de derrubar a transação de XP.
    // O filtro existingCodes acima continua como fast-path; a unicidade real
    // é garantida pelo banco.
    if (badgesToAward.length > 0) {
      await tx.userBadge.createMany({
        data: badgesToAward.map((b) => ({
          userId: user.id,
          badgeCode: b.code,
          title: b.title,
          description: b.desc,
          icon: b.icon,
        })),
        skipDuplicates: true,
      });
      for (const b of badgesToAward) {
        this.logger.log(`Badge awarded to user ${user.id}: ${b.title}`);
      }
    }
  }

  async getUserBadges(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  /**
   * C8 — Reconciliação periódica users.xp × XP esperado das submissões.
   * Leitura por padrão; fix=true corrige xp+level (ver xp-reconciliation.ts
   * para a regra e a cadência recomendada: 1×/semana).
   */
  async reconcileXp(options: { fix?: boolean } = {}) {
    return reconcileXpInDb(this.prisma as any, options);
  }
}
