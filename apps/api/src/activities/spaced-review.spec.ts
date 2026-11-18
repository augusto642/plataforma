import { calculateNextReview } from './spaced-review';

describe('calculateNextReview', () => {
  const reviewedAt = new Date('2026-11-14T12:00:00.000Z');

  it('schedules a missed concept for review the next day', () => {
    expect(calculateNextReview(null, false, reviewedAt)).toMatchObject({
      repetitions: 0,
      intervalDays: 1,
      lastPassed: false,
      dueAt: new Date('2026-11-15T12:00:00.000Z'),
    });
  });

  it('starts a new success streak at one day after a miss', () => {
    expect(
      calculateNextReview(
        { repetitions: 4, intervalDays: 30, lastPassed: false },
        true,
        reviewedAt,
      ),
    ).toMatchObject({ repetitions: 1, intervalDays: 1, lastPassed: true });
  });

  it('widens successful review intervals and caps them at 30 days', () => {
    let previous: ReturnType<typeof calculateNextReview> | null = null;
    const intervals: number[] = [];

    for (let index = 0; index < 8; index += 1) {
      previous = calculateNextReview(previous, true, reviewedAt);
      intervals.push(previous.intervalDays);
    }

    expect(intervals).toEqual([1, 3, 7, 14, 30, 30, 30, 30]);
  });

  it('resets the interval after a failed review', () => {
    expect(
      calculateNextReview(
        { repetitions: 3, intervalDays: 7, lastPassed: true },
        false,
        reviewedAt,
      ),
    ).toMatchObject({ repetitions: 0, intervalDays: 1, lastPassed: false });
  });
});
