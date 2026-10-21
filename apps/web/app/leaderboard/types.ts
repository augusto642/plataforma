// B38b (Sprint 11) — NÃO existe sistema de ligas no backend da Nexus Code.
// A mecânica real (GET /courses/:id/leaderboard, em courses.service) é um
// ranking por curso ordenado pelo XP total acumulado do usuário (desempate:
// atividades concluídas distintas no curso). As "faixas" abaixo são apenas
// agrupamentos de exibição derivados do XP total — sem temporada, rodada
// semanal, promoção ou rebaixamento.

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

export type LeaderboardFilter = 'current' | 'global' | 'friends';

export interface LeaderboardUser {
  id: string;
  rank: number;
  name: string;
  handle: string;
  avatarUrl?: string;
  avatarInitials: string;
  /** XP total acumulado (a mesma grandeza que ordena o ranking real). */
  xp: number;
  streakDays: number;
  gitSolvedCount: number;
  currentTrack: string;
  isCurrentUser?: boolean;
  movement: 'up' | 'down' | 'same' | 'new';
  movementPlaces?: number;
}
