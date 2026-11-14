import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Estágio socrático do aluno num exercício (1 = modelo mental, 2 = casos de borda, 3 = complexidade). */
export type SocraticTier = 1 | 2 | 3;

/**
 * M12 — Decisão de tier socrático (extraído do AiService god service).
 *
 * O tier deriva de dois sinais: submissões falhas e mensagens de chat na
 * atividade. Falha na leitura dos sinais degrada para o Tier 1 (fail-open
 * deliberado: sem sinais, o tutor começa do estágio mais gentil).
 */
@Injectable()
export class SocraticTierService {
  constructor(private readonly prisma: PrismaService) {}

  tierFromSignals(failedCount: number, chatCount: number): SocraticTier {
    if (failedCount >= 3 || chatCount >= 6) return 3;
    if (failedCount >= 2 || chatCount >= 3) return 2;
    return 1;
  }

  async countTierSignals(
    userId: string,
    activityId: string,
  ): Promise<{ failedCount: number; chatCount: number }> {
    const [failedCount, chatCount] = await Promise.all([
      this.prisma.submission.count({
        where: { userId, activityId, status: { in: ['failed', 'error'] } },
      }),
      this.prisma.aiChatMessage.count({
        where: { userId, activityId },
      }),
    ]);
    return { failedCount, chatCount };
  }

  async calculateTier(userId: string, activityId: string): Promise<SocraticTier> {
    try {
      const { failedCount, chatCount } = await this.countTierSignals(userId, activityId);
      return this.tierFromSignals(failedCount, chatCount);
    } catch {
      return 1;
    }
  }

  /**
   * Pacote 1.2 — Limite de 3 Dicas Graduais por Atividade com Penalidade de XP
   * Nível 1: -10% XP base
   * Nível 2: -25% XP base
   * Nível 3: -50% XP base
   */
  async getHintUsage(
    userId: string,
    activityId: string,
  ): Promise<{
    consumedCount: number;
    maxHints: number;
    nextHintLevel: SocraticTier;
    currentPenaltyPercent: number;
    canRequestHint: boolean;
  }> {
    try {
      const usages = await this.prisma.activityHintUsage.findMany({
        where: { userId, activityId },
        orderBy: { hintLevel: 'asc' },
      });

      const consumedCount = usages.length;
      const nextHintLevel = (Math.min(3, Math.max(1, consumedCount + 1))) as SocraticTier;
      const currentPenaltyPercent = usages.reduce((max, u) => Math.max(max, u.xpPenaltyPercent), 0);

      return {
        consumedCount,
        maxHints: 3,
        nextHintLevel,
        currentPenaltyPercent,
        canRequestHint: consumedCount < 3,
      };
    } catch {
      return {
        consumedCount: 0,
        maxHints: 3,
        nextHintLevel: 1,
        currentPenaltyPercent: 0,
        canRequestHint: true,
      };
    }
  }

  async recordHintUsage(
    userId: string,
    activityId: string,
    hintLevel: SocraticTier,
  ): Promise<{ hintLevel: SocraticTier; penaltyPercent: number }> {
    const penalties: Record<SocraticTier, number> = { 1: 10, 2: 25, 3: 50 };
    const penaltyPercent = penalties[hintLevel] ?? 10;

    try {
      await this.prisma.activityHintUsage.upsert({
        where: {
          userId_activityId_hintLevel: {
            userId,
            activityId,
            hintLevel,
          },
        },
        update: { xpPenaltyPercent: penaltyPercent },
        create: {
          userId,
          activityId,
          hintLevel,
          xpPenaltyPercent: penaltyPercent,
        },
      });
    } catch {
      // Fallback gracioso se a tabela não tiver sido migrada
    }

    return { hintLevel, penaltyPercent };
  }
}
