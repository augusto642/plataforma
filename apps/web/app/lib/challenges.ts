import { apiFetch } from './apiClient';
import { parseError } from './parse-error';

/**
 * Fase 3 premium (desenho §4.1) — client de desafios semanais e ligas.
 * Participação opt-in; ranking por nível (nunca uma única liga global).
 * Nenhum texto promete emprego; o prêmio é XP + posição na liga.
 */

export interface Challenge {
  id: string;
  activityId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  optIn: boolean;
  status: 'upcoming' | 'active' | 'ended';
  participantCount: number;
  joined: boolean;
  activity?: { id: string; title: string };
}

export interface ChallengeRankingEntry {
  position: number;
  userId: string;
  name: string;
  nickname: string | null;
  xp: number;
  level: number;
  points: number;
  joinedAt: string;
}

export interface LeagueStanding {
  seasonId: string;
  tier: string;
  startsAt: string;
  endsAt: string;
  points: number;
  position: number;
  participants: number;
}

export async function getCurrentChallenge(): Promise<Challenge | null> {
  const res = await apiFetch('/challenges/current');
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function joinChallenge(challengeId: string) {
  const res = await apiFetch(`/challenges/${challengeId}/join`, { method: 'POST' });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function leaveChallenge(challengeId: string) {
  const res = await apiFetch(`/challenges/${challengeId}/leave`, { method: 'POST' });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function getChallengeLeaderboard(
  challengeId: string,
): Promise<{ challengeId: string; title: string; ranking: ChallengeRankingEntry[] }> {
  const res = await apiFetch(`/challenges/${challengeId}/leaderboard`);
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function getMyLeagues(): Promise<LeagueStanding[]> {
  const res = await apiFetch('/leagues/me');
  if (!res.ok) throw await parseError(res);
  return res.json();
}
