import { describe, expect, it } from 'vitest';
import { buildAssignments, dayIndexFor, elapsedDays, endDate, hasEnded } from './schedule';
import { addDays, diffDays, toDateKey, fromDateKey } from './dates';

describe('assignments', () => {
  it('balances A and B inside each block and is reproducible', () => {
    const x = buildAssignments('blocked-random', 14, 2, 123);
    const y = buildAssignments('blocked-random', 14, 2, 123);
    expect(x).toEqual(y);
    expect(x).toHaveLength(14);
    for (let i = 0; i < 14; i += 2) {
      expect(new Set([x[i], x[i + 1]]).size).toBe(2);
    }
  });
  it('handles odd durations and block size 4', () => {
    const x = buildAssignments('blocked-random', 21, 4, 5);
    expect(x).toHaveLength(21);
    const countA = x.filter((c) => c === 'A').length;
    expect(Math.abs(countA - (21 - countA))).toBeLessThanOrEqual(2);
  });
  it('builds phases as A then B', () => {
    expect(buildAssignments('phases', 5, 2, 1)).toEqual(['A', 'A', 'A', 'B', 'B']);
  });
  it('differs across seeds', () => {
    const seeds = [1, 2, 3, 4, 5, 6].map((s) => buildAssignments('blocked-random', 20, 2, s).join(''));
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });
});

describe('dates', () => {
  it('round-trips keys', () => {
    expect(toDateKey(fromDateKey('2026-03-29'))).toBe('2026-03-29');
    expect(addDays('2026-02-27', 3)).toBe('2026-03-02');
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2); // across EU DST change
  });
  it('computes day indices and window boundaries', () => {
    const exp = { startDate: '2026-11-01', durationDays: 14 };
    expect(dayIndexFor(exp, '2026-10-31')).toBeNull();
    expect(dayIndexFor(exp, '2026-11-01')).toBe(0);
    expect(dayIndexFor(exp, '2026-11-14')).toBe(13);
    expect(dayIndexFor(exp, '2026-11-15')).toBeNull();
    expect(endDate(exp)).toBe('2026-11-14');
    expect(elapsedDays(exp, '2026-11-05')).toBe(5);
    expect(elapsedDays(exp, '2026-12-05')).toBe(14);
    expect(hasEnded(exp, '2026-11-14')).toBe(false);
    expect(hasEnded(exp, '2026-11-15')).toBe(true);
  });
});
