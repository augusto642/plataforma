import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async awardSubmissionXp(userId: string, activityId: string, passed: boolean, score: number) {
    try {
      const xpGained = passed ? 70 : 20;
      const perfectBonus = score === 100 ? 50 : 0;
      const totalXpDelta = xpGained + perfectBonus;

      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: { badges: true },
        });

        if (!user) return null;

        // newXp/newLevel são derivados apenas para o retorno e para badges;
        // a escrita usa {increment} atômico do Prisma para evitar lost update
        // entre réplicas/jobs concorrentes (read-modify-write não é seguro).
        const newXp = user.xp + totalXpDelta;
        const newLevel = Math.floor(newXp / 200) + 1;

        let newStreak = user.streakDays || 0;
        const now = new Date();
        if (user.lastActiveAt) {
          const diffHours = (now.getTime() - new Date(user.lastActiveAt).getTime()) / (1000 * 60 * 60);
          if (diffHours >= 20 && diffHours <= 48) {
            newStreak += 1;
          } else if (diffHours > 48) {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }

        const updated = await tx.user.update({
          where: { id: userId },
          data: {
            xp: { increment: totalXpDelta },
            level: newLevel,
            streakDays: newStreak,
            lastActiveAt: now,
          },
        });

        await this.evaluateBadges(tx, updated, user.badges, passed, score, newStreak);

        return { xpGained: totalXpDelta, totalXp: newXp, level: newLevel, streak: newStreak };
      });

      return result;
    } catch (err: any) {
      this.logger.error(`Failed to award gamification XP: ${err.message}`);
      return null;
    }
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

    for (const b of badgesToAward) {
      await tx.userBadge.create({
        data: {
          userId: user.id,
          badgeCode: b.code,
          title: b.title,
          description: b.desc,
          icon: b.icon,
        },
      });
      this.logger.log(`Badge awarded to user ${user.id}: ${b.title}`);
    }
  }

  async getUserBadges(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
    });
  }
}
