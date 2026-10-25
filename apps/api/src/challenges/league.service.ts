import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CareerTier, LeagueTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Bônus fixo por participação no desafio (desenho §4.1: recompensa por
 * participar, não só por vencer). O restante dos pontos é a melhor nota
 * de uma submissão APROVADA na janela do desafio (0–100).
 */
export const PARTICIPATION_BONUS = 10;

/** Limiar de rebaixamento: só rebaixa quando houve liga de verdade. */
const MIN_ENTRIES_FOR_RELEGATION = 6;

/** Badge único de campeão de liga (UserBadge tem unique por usuário). */
export const LEAGUE_CHAMPION_BADGE = 'league_champion';

/**
 * Fase 3 premium (desenho §4.1) — ligas por nível e pontuação.
 *
 * Regra anti-desmotivação (explícita, não emergente): nunca uma única
 * liga global. A liga base vem do CareerTier do aluno — iniciante
 * compete com iniciante:
 * - beginner → bronze · junior → silver · mid/senior → gold.
 *
 * Promoção/rebaixamento: ao entrar numa season nova, olha-se a season
 * encerrada mais recente do aluno — top 3 sobe uma liga, últimos 3
 * descem (só se a season tinha 6+ entradas). Sem tabela nova: o
 * histórico já vive em LeagueEntry + LeagueSeason.
 *
 * Pontos são DERIVADOS de Submission (nunca digitados): o ranking
 * recalcula na leitura, então nenhuma submissão corrigida pelo Piston
 * fica de fora por falta de job — e o mesmo cálculo serve ao ranking
 * do desafio e ao da liga.
 */
@Injectable()
export class LeagueService {
  private readonly logger = new Logger(LeagueService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Liga base de um nível de carreira (matriz do desenho §4.1). */
  tierForCareerTier(careerTier: CareerTier): LeagueTier {
    switch (careerTier) {
      case CareerTier.beginner:
        return LeagueTier.bronze;
      case CareerTier.junior:
        return LeagueTier.silver;
      default:
        return LeagueTier.gold;
    }
  }

  /**
   * Liga do aluno para a próxima season: base do CareerTier, ajustada
   * pela season encerrada mais recente (promoção/rebaixamento).
   */
  async resolveTier(userId: string): Promise<LeagueTier> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { careerTier: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    const base = this.tierForCareerTier(user.careerTier);

    const now = new Date();
    const lastSeason = await this.prisma.leagueSeason.findFirst({
      where: {
        endsAt: { lt: now },
        entries: { some: { userId } },
      },
      orderBy: { endsAt: 'desc' },
      include: {
        entries: { orderBy: [{ points: 'desc' }, { id: 'asc' }], select: { userId: true } },
      },
    });
    if (!lastSeason) return base;

    const rank = lastSeason.entries.findIndex((e) => e.userId === userId) + 1;
    const total = lastSeason.entries.length;
    const order: LeagueTier[] = [LeagueTier.bronze, LeagueTier.silver, LeagueTier.gold];
    const idx = order.indexOf(base);
    if (rank >= 1 && rank <= 3 && idx < order.length - 1) return order[idx + 1];
    if (total >= MIN_ENTRIES_FOR_RELEGATION && rank > total - 3 && idx > 0) {
      return order[idx - 1];
    }
    return base;
  }

  /** Season da liga na janela do desafio (uma por tier + janela). */
  async getOrCreateSeason(tier: LeagueTier, startsAt: Date, endsAt: Date) {
    const existing = await this.prisma.leagueSeason.findFirst({
      where: { tier, startsAt, endsAt },
    });
    if (existing) return existing;
    return this.prisma.leagueSeason.create({ data: { tier, startsAt, endsAt } });
  }

  /**
   * Pontos de um aluno num desafio: bônus de participação (qualquer
   * submissão na janela, aprovada ou não) + melhor nota APROVADA.
   * Submissão fora da janela não conta; nota de submissão reprovada
   * não conta (só o bônus de ter tentado).
   */
  async computePoints(challengeId: string, userId: string): Promise<number> {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { activityId: true, startsAt: true, endsAt: true },
    });
    if (!challenge) throw new NotFoundException('Desafio não encontrado');

    const submissions = await this.prisma.submission.findMany({
      where: {
        activityId: challenge.activityId,
        userId,
        createdAt: { gte: challenge.startsAt, lte: challenge.endsAt },
      },
      select: { status: true, score: true },
    });
    if (submissions.length === 0) return 0;
    const bestPassed = submissions
      .filter((s) => s.status === 'passed')
      .reduce((max, s) => Math.max(max, Math.floor(s.score ?? 0)), 0);
    return PARTICIPATION_BONUS + bestPassed;
  }

  /** Recalcula os pontos das entradas da liga na janela do desafio. */
  async refreshEntriesForChallenge(challengeId: string): Promise<void> {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { startsAt: true, endsAt: true },
    });
    if (!challenge) throw new NotFoundException('Desafio não encontrado');

    const seasons = await this.prisma.leagueSeason.findMany({
      where: { startsAt: challenge.startsAt, endsAt: challenge.endsAt },
      include: { entries: { select: { id: true, userId: true } } },
    });
    for (const season of seasons) {
      for (const entry of season.entries) {
        const points = await this.computePoints(challengeId, entry.userId);
        await this.prisma.leagueEntry.update({
          where: { id: entry.id },
          data: { points },
        });
      }
    }
  }

  /** Classificação de uma season, com posição (1-based, desempate por id). */
  async seasonStandings(seasonId: string) {
    const season = await this.prisma.leagueSeason.findUnique({
      where: { id: seasonId },
      include: {
        entries: {
          orderBy: [{ points: 'desc' }, { id: 'asc' }],
          include: {
            user: { select: { id: true, name: true, nickname: true, xp: true, level: true } },
          },
        },
      },
    });
    if (!season) throw new NotFoundException('Temporada de liga não encontrada');
    return {
      season: { id: season.id, tier: season.tier, startsAt: season.startsAt, endsAt: season.endsAt },
      standings: season.entries.map((e, i) => ({
        position: i + 1,
        userId: e.user.id,
        name: e.user.name,
        nickname: e.user.nickname,
        xp: e.user.xp,
        level: e.user.level,
        points: e.points,
      })),
    };
  }

  /** Ligas do aluno (entrada + posição em cada season), mais recente primeiro. */
  async myLeagues(userId: string) {
    const entries = await this.prisma.leagueEntry.findMany({
      where: { userId },
      include: {
        season: {
          include: {
            entries: { orderBy: [{ points: 'desc' }, { id: 'asc' }], select: { userId: true } },
          },
        },
      },
      orderBy: { season: { endsAt: 'desc' } },
    });
    return entries.map((e) => ({
      seasonId: e.season.id,
      tier: e.season.tier,
      startsAt: e.season.startsAt,
      endsAt: e.season.endsAt,
      points: e.points,
      position: e.season.entries.findIndex((e2) => e2.userId === userId) + 1,
      participants: e.season.entries.length,
    }));
  }

  /**
   * Fechamento de seasons vencidas (chamado pelo HousekeepingModule —
   * sem scheduler novo, desenho §4.1). Idempotente: o badge de campeão
   * é único por usuário, então reexecutar não duplica nada; só o
   * primeiro lugar de cada season é premiado.
   */
  async closeExpiredSeasons() {
    const now = new Date();
    const seasons = await this.prisma.leagueSeason.findMany({
      where: { endsAt: { lt: now } },
      include: {
        entries: {
          orderBy: [{ points: 'desc' }, { id: 'asc' }],
          select: { userId: true },
        },
      },
    });
    const closed: Array<{ seasonId: string; tier: LeagueTier; winnerId: string | null }> = [];
    for (const season of seasons) {
      const winnerId = season.entries[0]?.userId ?? null;
      if (winnerId) {
        const existing = await this.prisma.userBadge.findUnique({
          where: { userId_badgeCode: { userId: winnerId, badgeCode: LEAGUE_CHAMPION_BADGE } },
        });
        if (!existing) {
          await this.prisma.userBadge.create({
            data: {
              userId: winnerId,
              badgeCode: LEAGUE_CHAMPION_BADGE,
              title: 'Campeão da liga',
              description: 'Terminou uma temporada de liga em primeiro lugar.',
              icon: '🏆',
            },
          });
          this.logger.log(`Campeão da liga premiado: season ${season.id} → ${winnerId}`);
        }
      }
      closed.push({ seasonId: season.id, tier: season.tier, winnerId });
    }
    return closed;
  }
}
