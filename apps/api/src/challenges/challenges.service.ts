import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CommunityService } from '../community/community.service';
import { EntitlementsService } from '../plans/entitlements.service';
import { planHasFeature } from '../plans/plan-entitlements';
import { PrismaService } from '../prisma/prisma.service';
import { LeagueService } from './league.service';

export interface CreateChallengeInput {
  activityId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  optIn?: boolean;
}

/**
 * Fase 3 premium (desenho §4.1) — desafio curto toda semana.
 *
 * Reuso, sem banco de exercícios paralelo: o problema É uma Activity
 * existente, a correção É Submission + Piston, o prêmio É a gamificação
 * existente (o XP da submissão aprovada já é dado pelo fluxo normal;
 * aqui soma-se o ranking da liga). Participação é opt-in: sem join,
 * não há entrada no ranking — o desafio nunca inscreve ninguém sozinho.
 *
 * Gate de liga (matriz §1.1): o desafio em si é aberto a todo aluno
 * autenticado (free participa, com bônus de participação e ranking do
 * desafio); a entrada na liga persistente (season, promoção/
 * rebaixamento) é de quem tem `challengesFull` (Pro/Carreira) — free
 * participa "sem liga paga", como prevê a matriz. Staff não é bloqueado.
 */
@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly league: LeagueService,
    private readonly community: CommunityService,
    private readonly entitlements: EntitlementsService,
  ) {}

  /**
   * Cria o desafio da semana (admin) e já alimenta a comunidade: o
   * tópico do fórum nasce junto (desenho §4.2 — lançamento casado;
   * comunidade vazia é pior que nenhuma).
   */
  async createChallenge(adminId: string, input: CreateChallengeInput) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: input.activityId },
      select: { id: true, title: true },
    });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    if (!(input.startsAt < input.endsAt)) {
      throw new BadRequestException('O início do desafio precisa ser anterior ao fim.');
    }
    const challenge = await this.prisma.challenge.create({
      data: {
        activityId: input.activityId,
        title: input.title,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        optIn: input.optIn ?? true,
      },
    });
    const thread = await this.community.createChallengeThread(adminId, {
      id: challenge.id,
      title: challenge.title,
      activityId: challenge.activityId,
      startsAt: challenge.startsAt,
      endsAt: challenge.endsAt,
    });
    return { ...challenge, forumThreadId: thread.id };
  }

  async getCurrent(userId?: string) {
    const now = new Date();
    const active = await this.prisma.challenge.findFirst({
      where: { startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { startsAt: 'desc' },
      include: { activity: { select: { id: true, title: true } } },
    });
    const challenge =
      active ??
      (await this.prisma.challenge.findFirst({
        where: { startsAt: { gt: now } },
        orderBy: { startsAt: 'asc' },
        include: { activity: { select: { id: true, title: true } } },
      }));
    if (!challenge) return null;
    return this.withJoinState(challenge, userId);
  }

  async getById(challengeId: string, userId?: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      include: { activity: { select: { id: true, title: true } } },
    });
    if (!challenge) throw new NotFoundException('Desafio não encontrado');
    return this.withJoinState(challenge, userId);
  }

  private async withJoinState(challenge: any, userId?: string) {
    const participantCount = await this.prisma.challengeParticipant.count({
      where: { challengeId: challenge.id },
    });
    const now = new Date();
    const joined = userId
      ? (await this.prisma.challengeParticipant.findUnique({
          where: { challengeId_userId: { challengeId: challenge.id, userId } },
        })) !== null
      : false;
    return {
      ...challenge,
      status: now < challenge.startsAt ? 'upcoming' : now > challenge.endsAt ? 'ended' : 'active',
      participantCount,
      joined,
    };
  }

  /** Opt-in: registra a participação e, se elegível, a entrada na liga. */
  async join(userId: string, challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) throw new NotFoundException('Desafio não encontrado');
    if (!challenge.optIn) {
      throw new ForbiddenException('Este desafio não está aceitando inscrições.');
    }
    const participant = await this.prisma.challengeParticipant.upsert({
      where: { challengeId_userId: { challengeId, userId } },
      create: { challengeId, userId },
      update: {},
    });

    let leagueEntry = null;
    if (await this.hasLeagueAccess(userId)) {
      // D2 (documentado, semântica preservada): resolveTier ajusta
      // ±1 a partir da liga BASE do CareerTier, não da liga anterior
      // — vitórias consecutivas não acumulam degraus (teto base+1).
      // Escada cumulativa é decisão de produto pendente; não mudar
      // aqui por conta própria.
      const tier = await this.league.resolveTier(userId);
      const season = await this.league.getOrCreateSeason(
        tier,
        challenge.startsAt,
        challenge.endsAt,
      );
      leagueEntry = await this.prisma.leagueEntry.upsert({
        where: { seasonId_userId: { seasonId: season.id, userId } },
        create: { seasonId: season.id, userId, points: 0 },
        update: {},
      });
    }
    return { participant, leagueEntry };
  }

  /** Opt-out: sai do desafio e da liga daquela janela. */
  async leave(userId: string, challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { startsAt: true, endsAt: true },
    });
    if (!challenge) throw new NotFoundException('Desafio não encontrado');
    await this.prisma.challengeParticipant.deleteMany({
      where: { challengeId, userId },
    });
    await this.prisma.leagueEntry.deleteMany({
      where: {
        userId,
        season: { startsAt: challenge.startsAt, endsAt: challenge.endsAt },
      },
    });
    return { left: true };
  }

  /**
   * Ranking do desafio: só participantes opt-in, pontos recalculados
   * das submissões (bônus de participação + melhor nota aprovada).
   * Recalcula também as entradas da liga, para os dois rankings nunca
   * divergirem.
   */
  async leaderboard(challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) throw new NotFoundException('Desafio não encontrado');
    await this.league.refreshEntriesForChallenge(challengeId);

    const participants = await this.prisma.challengeParticipant.findMany({
      where: { challengeId },
      include: {
        user: { select: { id: true, name: true, nickname: true, xp: true, level: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
    const ranked = await Promise.all(
      participants.map(async (p) => ({
        userId: p.user.id,
        name: p.user.name,
        nickname: p.user.nickname,
        xp: p.user.xp,
        level: p.user.level,
        points: await this.league.computePoints(challengeId, p.user.id),
        joinedAt: p.joinedAt,
      })),
    );
    ranked.sort((a, b) => b.points - a.points || a.joinedAt.getTime() - b.joinedAt.getTime());
    return {
      challengeId,
      title: challenge.title,
      startsAt: challenge.startsAt,
      endsAt: challenge.endsAt,
      ranking: ranked.map((r, i) => ({ position: i + 1, ...r })),
    };
  }

  async myLeagues(userId: string) {
    return this.league.myLeagues(userId);
  }

  async seasonStandings(seasonId: string) {
    return this.league.seasonStandings(seasonId);
  }

  /** Liga persistente: staff ou plano com challengesFull (matriz §1.1). */
  private async hasLeagueAccess(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.role !== Role.student) return true;
    const plan = await this.entitlements.getUserPlan(userId);
    return planHasFeature(plan, 'challenges-full');
  }
}
