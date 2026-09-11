export type LeagueTier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master'
  | 'challenger';

export interface LeagueTierInfo {
  tier: LeagueTier;
  name: string;
  division: string;
  icon: string;
  color: string;
  accentBorder: string;
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
  weeklyXp: number;
  streakDays: number;
  gitSolvedCount: number;
  currentTrack: string;
  tier: LeagueTier;
  isCurrentUser?: boolean;
  zone: 'promotion' | 'neutral' | 'relegation';
  movement: 'up' | 'down' | 'same' | 'new';
  movementPlaces?: number;
}

export interface WeeklyRoundInfo {
  roundNumber: number;
  endsAt: string; // ISO string
  totalParticipants: number;
  promotionThreshold: number; // Top N promote
  relegationThreshold: number; // Bottom N demote
  currentPrizePool: {
    firstPlaceXp: number;
    firstPlaceBadge: string;
    promotionXpBonus: number;
  };
}
