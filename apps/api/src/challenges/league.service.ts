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
 * M3 (Lote 4) — cálculo puro de pontos a partir das submissões de UM
 * aluno na janela (a regra que `computePoints` aplicava por leitura):
 * 0 sem submissão; senão bônus de participação + melhor nota APROVADA
 * (nota de reprovada não soma; `score` nulo vale 0).
 */
export function pointsFromSubmissions(
  submissions: Array<{ status: string; score: number | null }>,
): number {
  if (submissions.length === 0) return 0;
  const bestPassed = submissions
    .filter((s) => s.status === 'passed')
    .reduce((max, s) => Math.max(max, Math.floor(s.score ?? 0)), 0);
  return PARTICIPATION_BONUS + bestPassed;
}

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
   *
   * REGRA DOCUMENTADA — comportamento atual, intencionalmente NÃO
   * alterado aqui (decisão de produto pendente do Augusto; ver
   * relatório da correção Fase 3): o ajuste é sempre de ±1 a partir
   * da liga BASE do CareerTier, nunca a partir da liga da season
   * anterior. Vitórias (ou derrotas) consecutivas NÃO acumulam:
   * o teto é base+1 e o piso é base−1, então duas vitórias seguidas
   * nunca sobem dois degraus — o resultado é sempre base±1, não
   * base±2. Mudar isso para uma escada cumulativa (liga anterior
   * ±1) exige decisão explícita de produto, pois altera a
   * progressão de todos os alunos.
   *
   * M3 (Lote 4) — SEM N+1 e SEM carregar a season inteira: a versão
   * anterior trazia TODAS as entradas da season (`include` sem
   * filtro) só para achar a posição do aluno. Agora são 4 leituras
   * limitadas: o usuário, a season (só a entrada do aluno),
   * quantos estão à frente dele e o total de entradas. A posição é
   * derivada da mesma ordenação (pontos desc, id asc) — semântica
   * idêntica, sem varrer a season.
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
      select: {
        id: true,
        entries: {
          where: { userId },
          select: { id: true, points: true },
        },
      },
    });
    if (!lastSeason) return base;
    // O filtro `entries.some` garante ao menos uma entrada do aluno;
    // a guarda é só defesa contra um estado inconsistente.
    const myEntry = lastSeason.entries[0];
    if (!myEntry) return base;

    // Posição (1-based) na mesma ordenação do ranking: pontos desc,
    // desempate por id asc. `ahead + 1` == índice na lista ordenada.
    const ahead = await this.prisma.leagueEntry.count({
      where: {
        seasonId: lastSeason.id,
        OR: [
          { points: { gt: myEntry.points } },
          { points: myEntry.points, id: { lt: myEntry.id } },
        ],
      },
    });
    const total = await this.prisma.leagueEntry.count({
      where: { seasonId: lastSeason.id },
    });
    const rank = ahead + 1;
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
   *
   * M3 (Lote 4) — delega ao cálculo em lote: 1 aluno ou 100, o
   * número de leituras é o mesmo (desafio + 1 `findMany`).
   */
  async computePoints(challengeId: string, userId: string): Promise<number> {
    const points = await this.computePointsMany(challengeId, [userId]);
    return points.get(userId) ?? 0;
  }

  /**
   * M3 (Lote 4) — pontos de VÁRIOS alunos num desafio com UMA
   * leitura de submissões (`userId IN (...)`) em vez de 1 `findMany`
   * por aluno. Usado pelo refresh das ligas e pelo ranking do
   * desafio. Semântica idêntica à de `computePoints`: 0 sem
   * submissão na janela; senão bônus + melhor nota aprovada.
   */
  async computePointsMany(
    challengeId: string,
    userIds: string[],
  ): Promise<Map<string, number>> {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { activityId: true, startsAt: true, endsAt: true },
    });
    if (!challenge) throw new NotFoundException('Desafio não encontrado');
    return this.pointsForUsers(challenge, userIds);
  }

  /**
   * Núcleo do cálculo em lote (desafio já carregado): 1 `findMany`
   * para todos os alunos + agregação em memória. O mapa devolve 0
   * para quem não tem submissão na janela — igual a `computePoints`.
   */
  private async pointsForUsers(
    challenge: { activityId: string; startsAt: Date; endsAt: Date },
    userIds: string[],
  ): Promise<Map<string, number>> {
    const points = new Map<string, number>(userIds.map((id) => [id, 0]));
    if (userIds.length === 0) return points;

    const submissions = await this.prisma.submission.findMany({
      where: {
        activityId: challenge.activityId,
        userId: { in: userIds },
        createdAt: { gte: challenge.startsAt, lte: challenge.endsAt },
      },
      select: { userId: true, status: true, score: true },
    });
    const byUser = new Map<string, Array<{ status: string; score: number | null }>>();
    for (const s of submissions) {
      const list = byUser.get(s.userId) ?? [];
      list.push(s);
      byUser.set(s.userId, list);
    }
    for (const [userId, list] of byUser) {
      points.set(userId, pointsFromSubmissions(list));
    }
    return points;
  }

  /**
   * Recalcula os pontos das entradas da liga na janela do desafio.
   *
   * M3 (Lote 4) — o N+1 real: a versão anterior fazia, POR ENTRADA,
   * 1 `findMany` de submissões + 1 `findUnique` do desafio (dentro de
   * `computePoints`) + 1 `update`. Agora são 4 chamadas do Prisma
   * qualquer que seja o nº de entradas: desafio, seasons, 1
   * `findMany` em lote (`pointsForUsers`) e 1 transação com 1
   * `updateMany` por valor distinto de pontos (agrupa as entradas
   * por pontos — no máximo 101 valores, 10–110). A transação também
   * torna o refresh atômico: antes, uma falha no meio deixava
   * metade das entradas recalculadas e metade defasada.
   */
  async refreshEntriesForChallenge(challengeId: string): Promise<void> {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { activityId: true, startsAt: true, endsAt: true },
    });
    if (!challenge) throw new NotFoundException('Desafio não encontrado');

    const seasons = await this.prisma.leagueSeason.findMany({
      where: { startsAt: challenge.startsAt, endsAt: challenge.endsAt },
      include: { entries: { select: { id: true, userId: true } } },
    });
    const entries = seasons.flatMap((s) => s.entries);
    if (entries.length === 0) return;

    const pointsByUser = await this.pointsForUsers(
      challenge,
      entries.map((e) => e.userId),
    );
    const idsByPoints = new Map<number, string[]>();
    for (const entry of entries) {
      const points = pointsByUser.get(entry.userId) ?? 0;
      const ids = idsByPoints.get(points) ?? [];
      ids.push(entry.id);
      idsByPoints.set(points, ids);
    }
    await this.prisma.$transaction(
      [...idsByPoints.entries()].map(([points, ids]) =>
        this.prisma.leagueEntry.updateMany({
          where: { id: { in: ids } },
          data: { points },
        }),
      ),
    );
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

  /**
   * Ligas do aluno (entrada + posição em cada season), mais recente primeiro.
   *
   * M3 (Lote 4) — SEM N+1: a versão anterior trazia, num `include`
   * aninhado, TODAS as entradas de cada season do aluno. Agora são 2
   * leituras: as entradas do aluno (com a season) + TODAS as entradas
   * dessas seasons num só `findMany` (`seasonId IN (...)`), com a
   * posição calculada em memória na mesma ordenação (pontos desc,
   * id asc). Semântica idêntica, sem varrer season por season.
   */
  async myLeagues(userId: string) {
    const entries = await this.prisma.leagueEntry.findMany({
      where: { userId },
      include: {
        season: { select: { id: true, tier: true, startsAt: true, endsAt: true } },
      },
      orderBy: { season: { endsAt: 'desc' } },
    });
    if (entries.length === 0) return [];

    const seasonIds = [...new Set(entries.map((e) => e.season.id))];
    const seasonEntries = await this.prisma.leagueEntry.findMany({
      where: { seasonId: { in: seasonIds } },
      select: { seasonId: true, userId: true, points: true, id: true },
    });
    const bySeason = new Map<string, Array<{ userId: string; points: number; id: string }>>();
    for (const se of seasonEntries) {
      const list = bySeason.get(se.seasonId) ?? [];
      list.push(se);
      bySeason.set(se.seasonId, list);
    }
    // Mesma ordenação do ranking: pontos desc, desempate por id asc.
    for (const list of bySeason.values()) {
      list.sort((a, b) => b.points - a.points || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    }
    return entries.map((e) => {
      const list = bySeason.get(e.season.id) ?? [];
      return {
        seasonId: e.season.id,
        tier: e.season.tier,
        startsAt: e.season.startsAt,
        endsAt: e.season.endsAt,
        points: e.points,
        position: list.findIndex((e2) => e2.userId === userId) + 1,
        participants: list.length,
      };
    });
  }

  /**
   * Fechamento de seasons vencidas (chamado pelo HousekeepingModule —
   * sem scheduler novo, desenho §4.1). Idempotente: o badge de campeão
   * é único por usuário, então reexecutar não duplica nada; só o
   * primeiro lugar de cada season é premiado.
   *
   * CORREÇÃO D1: os pontos são RECALCULADOS das submissões antes de
   * ordenar (via refreshEntriesForChallenge, o mesmo cálculo do
   * ranking do desafio), e as entradas são relidas já ordenadas.
   * Antes, o fechamento premiava pelos pontos ARMAZENADOS — que
   * podem estar defasados se ninguém visitou o ranking desde a
   * última submissão aprovada — e o badge ia para o líder errado.
   * Sem desafio na janela da season (season órfã), não há fonte de
   * verdade para recalcular: mantém-se os pontos armazenados e o
   * caso é logado como warning, em vez de premiar às cegas.
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
      // A season é chaveada por (tier, janela); o desafio da mesma
      // janela é a fonte das submissões que geram os pontos.
      const challenge = await this.prisma.challenge.findFirst({
        where: { startsAt: season.startsAt, endsAt: season.endsAt },
        select: { id: true },
      });
      let entries = season.entries;
      if (challenge) {
        await this.refreshEntriesForChallenge(challenge.id);
        const refreshed = await this.prisma.leagueSeason.findUnique({
          where: { id: season.id },
          include: {
            entries: {
              orderBy: [{ points: 'desc' }, { id: 'asc' }],
              select: { userId: true },
            },
          },
        });
        if (refreshed) entries = refreshed.entries;
      } else {
        this.logger.warn(
          `Fechamento de liga sem desafio na janela: season ${season.id} ` +
            `mantém pontos armazenados (sem fonte para recalcular).`,
        );
      }
      const winnerId = entries[0]?.userId ?? null;
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
