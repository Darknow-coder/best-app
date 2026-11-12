import { describe, expect, it } from 'vitest';
import { bootstrapDiffCI, cohenD, compare, mean, median, permutationPValue, sd } from './stats';
import { judge } from './verdict';

describe('descriptive stats', () => {
  it('computes mean, sd, median', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(sd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
});

describe('resampling', () => {
  it('bootstrap CI contains the true difference for clearly separated groups', () => {
    const a = [5, 6, 5, 6, 5, 6, 5, 6, 5, 6];
    const b = [8, 9, 8, 9, 8, 9, 8, 9, 8, 9];
    const [lo, hi] = bootstrapDiffCI(a, b);
    expect(lo).toBeGreaterThan(2);
    expect(hi).toBeLessThan(4);
  });
  it('permutation p-value is small for a real effect and large for noise', () => {
    const a = [5, 6, 5, 6, 5, 6, 5, 6, 5, 6];
    const b = [8, 9, 8, 9, 8, 9, 8, 9, 8, 9];
    expect(permutationPValue(a, b)).toBeLessThan(0.01);
    const same = [5, 6, 7, 5, 6, 7, 5, 6, 7, 5];
    expect(permutationPValue(same, same)).toBeGreaterThan(0.5);
  });
  it('is deterministic for a given seed', () => {
    const a = [1, 3, 2, 4, 3, 5];
    const b = [2, 4, 3, 6, 4, 5];
    expect(compare(a, b, 9)).toEqual(compare(a, b, 9));
  });
  it("cohen's d is zero without variance and signed otherwise", () => {
    expect(cohenD([1, 1, 1], [1, 1, 1])).toBe(0);
    expect(cohenD([1, 2, 3], [4, 5, 6])).toBeGreaterThan(0);
    expect(cohenD([4, 5, 6], [1, 2, 3])).toBeLessThan(0);
  });
});

describe('verdict', () => {
  const metric = { higherIsBetter: true };
  it('is insufficient with fewer than 3 per group', () => {
    const v = judge(compare([1, 2], [3, 4]), metric, null, 'unsure');
    expect(v.kind).toBe('insufficient');
  });
  it('detects a meaningful effect', () => {
    const a = [5, 6, 5, 6, 5, 6, 5, 6];
    const b = [8, 9, 8, 9, 8, 9, 8, 9];
    const v = judge(compare(a, b), metric, 1, 'B_higher');
    expect(v.kind).toBe('effect-meaningful');
    expect(v.direction).toBe('B_higher');
    expect(v.matchesExpectation).toBe(true);
    expect(v.favourable).toBe(true);
  });
  it('flags an effect smaller than the pre-registered threshold', () => {
    const a = [5, 6, 5, 6, 5, 6, 5, 6, 5, 6];
    const b = [6, 7, 6, 7, 6, 7, 6, 7, 6, 7];
    const v = judge(compare(a, b), metric, 2, 'B_higher');
    expect(v.kind).toBe('effect-small');
  });
  it('declares no meaningful effect when the CI is tight around zero', () => {
    const a = [5, 5, 5, 5, 5, 5, 5, 5, 6, 5];
    const b = [5, 5, 5, 5, 5, 5, 5, 6, 5, 5];
    const v = judge(compare(a, b), metric, 2, 'unsure');
    expect(v.kind).toBe('no-meaningful-effect');
  });
  it('is inconclusive with noisy small samples', () => {
    const a = [2, 9, 4, 8];
    const b = [3, 7, 9, 2];
    const v = judge(compare(a, b), metric, 1, 'unsure');
    expect(v.kind).toBe('inconclusive');
  });
});
