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
}
