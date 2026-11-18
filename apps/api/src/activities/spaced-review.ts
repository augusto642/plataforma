const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface SpacedReviewSnapshot {
  repetitions: number;
  intervalDays: number;
  lastPassed: boolean;
}

export function calculateNextReview(
  previous: SpacedReviewSnapshot | null,
  passed: boolean,
  reviewedAt: Date,
) {
  const repetitions = passed
    ? previous?.lastPassed
      ? previous.repetitions + 1
      : 1
    : 0;
  const intervalDays = passed
    ? REVIEW_INTERVALS_DAYS[Math.min(repetitions - 1, REVIEW_INTERVALS_DAYS.length - 1)]
    : REVIEW_INTERVALS_DAYS[0];

  return {
    repetitions,
    intervalDays,
    lastPassed: passed,
    lastReviewedAt: reviewedAt,
    dueAt: new Date(reviewedAt.getTime() + intervalDays * DAY_MS),
  };
}
