import { calculateStreakState } from './streak-policy';

describe('calculateStreakState', () => {
  it('starts a new streak without consuming the weekly rest day', () => {
    expect(
      calculateStreakState(0, null, null, new Date('2026-10-19T12:00:00.000Z')),
    ).toEqual({ streakDays: 1, streakRestWeekStart: null });
  });

  it('records a skipped day against its UTC Monday-based week', () => {
    expect(
      calculateStreakState(
        4,
        new Date('2026-10-19T10:00:00.000Z'),
        null,
        new Date('2026-10-21T12:00:00.000Z'),
      ),
    ).toEqual({
      streakDays: 5,
      streakRestWeekStart: new Date('2026-10-19T00:00:00.000Z'),
    });
  });

  it('resets after a second rest day in the same UTC week', () => {
    expect(
      calculateStreakState(
        8,
        new Date('2026-10-22T10:00:00.000Z'),
        new Date('2026-10-19T00:00:00.000Z'),
        new Date('2026-10-24T12:00:00.000Z'),
      ),
    ).toEqual({ streakDays: 1, streakRestWeekStart: null });
  });

  it('allows one rest day in a new UTC week', () => {
    expect(
      calculateStreakState(
        8,
        new Date('2026-10-18T10:00:00.000Z'),
        new Date('2026-10-12T00:00:00.000Z'),
        new Date('2026-10-20T12:00:00.000Z'),
      ),
    ).toEqual({
      streakDays: 9,
      streakRestWeekStart: new Date('2026-10-19T00:00:00.000Z'),
    });
  });

  it('resets if multiple skipped days fall in one week across a week boundary', () => {
    expect(
      calculateStreakState(
        8,
        new Date('2026-10-23T10:00:00.000Z'),
        null,
        new Date('2026-10-26T12:00:00.000Z'),
      ),
    ).toEqual({ streakDays: 1, streakRestWeekStart: null });
  });

  it('preserves the rest marker for same-day activity', () => {
    const restWeek = new Date('2026-10-19T00:00:00.000Z');
    expect(
      calculateStreakState(
        8,
        new Date('2026-10-21T10:00:00.000Z'),
        restWeek,
        new Date('2026-10-21T12:00:00.000Z'),
      ),
    ).toEqual({ streakDays: 8, streakRestWeekStart: restWeek });
  });

  it('preserves the rest marker for next-day activity', () => {
    const restWeek = new Date('2026-10-19T00:00:00.000Z');
    expect(
      calculateStreakState(
        8,
        new Date('2026-10-20T10:00:00.000Z'),
        restWeek,
        new Date('2026-10-21T12:00:00.000Z'),
      ),
    ).toEqual({ streakDays: 9, streakRestWeekStart: restWeek });
  });
});
