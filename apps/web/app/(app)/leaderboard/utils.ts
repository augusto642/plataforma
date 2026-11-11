import type {
  CourseOption,
  LeaderboardApiEntry,
  LeaderboardDisplayUser,
} from './types';

function finiteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Iniciais derivadas do nome real retornado pela API. */
export function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

/**
 * Converte a resposta do endpoint em linhas de exibição sem inventar
 * campos: o endpoint não devolve handle, trilha atual nem variação de
 * posição, portanto nenhum desses dados é fabricado aqui. "Você" só é
 * marcado quando o userId da linha é o usuário autenticado.
 */
export function mapLeaderboardEntries(
  entries: readonly LeaderboardApiEntry[],
  currentUserId?: string | null,
): LeaderboardDisplayUser[] {
  if (!Array.isArray(entries)) return [];

  return entries.map((entry, index) => {
    const name = typeof entry?.name === 'string' && entry.name.trim() ? entry.name : 'Aluno';
    const userId = typeof entry?.userId === 'string' ? entry.userId : '';

    return {
      id: userId || `leaderboard-entry-${index}`,
      rank: finiteNumber(entry?.rank) || index + 1,
      name,
      avatarInitials: initialsForName(name),
      xp: finiteNumber(entry?.xp),
      level: finiteNumber(entry?.level),
      streakDays: finiteNumber(entry?.streakDays),
      badges: Array.isArray(entry?.badges) ? entry.badges : [],
      completedActivitiesCount: finiteNumber(entry?.completedActivitiesCount),
      isCurrentUser: Boolean(currentUserId && userId && userId === currentUserId),
    };
  });
}

/** Prioriza um curso em que o usuário está matriculado, quando houver. */
export function chooseInitialCourseId(
  courses: readonly CourseOption[],
  enrolledCourseIds: readonly string[],
): string {
  if (courses.length === 0) return '';
  const enrolled = courses.find((course) => enrolledCourseIds.includes(course.id));
  return (enrolled ?? courses[0]).id;
}
