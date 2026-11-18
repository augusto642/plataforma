const DAY_MS = 86_400_000;

export interface StreakState {
  streakDays: number;
  streakRestWeekStart: Date | null;
}

function utcDayStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function utcWeekStart(date: Date): number {
  const dayStart = utcDayStart(date);
  const dayOfWeek = new Date(dayStart).getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return dayStart - daysSinceMonday * DAY_MS;
}

export function calculateStreakState(
  currentStreak: number,
  lastActiveAt: Date | null,
  lastRestWeekStart: Date | null,
  now: Date,
): StreakState {
  if (!lastActiveAt) {
    return { streakDays: 1, streakRestWeekStart: null };
  }

  const gap = (utcDayStart(now) - utcDayStart(lastActiveAt)) / DAY_MS;
  if (gap <= 0) {
    return {
      streakDays: Math.max(currentStreak, 1),
      streakRestWeekStart: lastRestWeekStart,
    };
  }
  if (gap > 3) {
    return { streakDays: 1, streakRestWeekStart: null };
  }

  let restWeekStart = lastRestWeekStart
    ? utcWeekStart(lastRestWeekStart)
    : null;
  const weeksUsedDuringGap = new Set<number>();
  const lastActiveDay = utcDayStart(lastActiveAt);

  for (let offset = 1; offset < gap; offset += 1) {
    const skippedWeek = utcWeekStart(new Date(lastActiveDay + offset * DAY_MS));
    if (skippedWeek === restWeekStart || weeksUsedDuringGap.has(skippedWeek)) {
      return { streakDays: 1, streakRestWeekStart: null };
    }
    weeksUsedDuringGap.add(skippedWeek);
    restWeekStart = skippedWeek;
  }

  return {
    streakDays: currentStreak + 1,
    streakRestWeekStart: restWeekStart === null ? null : new Date(restWeekStart),
  };
}
