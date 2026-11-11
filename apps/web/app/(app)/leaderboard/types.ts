// B38b (Sprint 11) / fechamento na Sprint 12 — NÃO existe sistema de
// ligas no backend da Nexus Code. A mecânica real
// (GET /courses/:id/leaderboard, em courses.service) é um ranking por
// curso ordenado pelo XP total acumulado do usuário (desempate:
// atividades concluídas distintas no curso). As "faixas" abaixo são
// apenas agrupamentos de exibição derivados do XP total — sem
// temporada, rodada semanal, promoção ou rebaixamento.

export type XpBand =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master'
  | 'challenger';

export interface XpBandInfo {
  band: XpBand;
  name: string;
  /** Intervalo de XP total que define a faixa (apenas exibição). */
  rangeLabel: string;
  icon: string;
  color: string;
  accentBorder: string;
  /** XP total mínimo para entrar na faixa. */
  minXp: number;
  description: string;
}

export interface CourseOption {
  id: string;
  title: string;
  slug?: string;
}

/** Formato devolvido por GET /courses/:id/leaderboard. */
export interface LeaderboardApiEntry {
  rank: number;
  userId: string;
  name: string;
  xp: number;
  level: number;
  streakDays: number;
  badges: Array<{
    id: string;
    badgeCode: string;
    title: string;
    icon: string;
  }>;
  completedActivitiesCount: number;
}

/** Linha pronta para exibição, derivada exclusivamente da API. */
export interface LeaderboardDisplayUser {
  id: string;
  rank: number;
  name: string;
  avatarInitials: string;
  xp: number;
  level: number;
  streakDays: number;
  badges: LeaderboardApiEntry['badges'];
  completedActivitiesCount: number;
  /** Só é verdadeiro para o usuário autenticado presente na resposta. */
  isCurrentUser: boolean;
}

export interface CourseProgressSummary {
  courseId: string;
  courseTitle: string;
  slug?: string;
}
