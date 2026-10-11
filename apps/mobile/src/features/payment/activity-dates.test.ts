import { describe, expect, it } from 'vitest';
import { activeDayKeys, dayKey, monthGrid, startOfDay } from './activity-dates';

describe('activity dates', () => {
  it('keys times by local day', () => {
    const morning = new Date(2026, 9, 11, 7, 45).getTime();
    const night = new Date(2026, 9, 11, 22, 10).getTime();
    expect(dayKey(morning)).toBe(dayKey(night));
    expect(dayKey(morning)).not.toBe(dayKey(new Date(2026, 9, 12, 0, 5)));
    expect(startOfDay(night)).toBe(new Date(2026, 9, 11).getTime());
  });

  it('collects the days that have transactions', () => {
    const keys = activeDayKeys([
      { createdAt: new Date(2026, 9, 11, 9).getTime() },
      { createdAt: new Date(2026, 9, 11, 18).getTime() },
      { createdAt: new Date(2026, 9, 9, 12).getTime() },
      {},
    ]);
    expect(keys.size).toBe(2);
    expect(keys.has(dayKey(new Date(2026, 9, 9)))).toBe(true);
  });

  it('lays out a month in Sunday-first weeks', () => {
    // October 2026 starts on a Thursday and has 31 days.
    const weeks = monthGrid(2026, 9);
    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0]?.slice(0, 4)).toEqual([null, null, null, null]);
    expect(weeks[0]?.[4]).toBe(new Date(2026, 9, 1).getTime());
    expect(weeks.flat().filter((cell) => cell !== null)).toHaveLength(31);
  });
});
