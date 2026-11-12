import type { Comparison } from './stats';
import type { ExpectedDirection, MetricDef } from './types';

export type VerdictKind =
  | 'insufficient' // too few observations
  | 'effect-meaningful' // CI excludes 0 and |diff| >= minEffect (or no minEffect)
  | 'effect-small' // CI excludes 0 but |diff| < minEffect
  | 'no-meaningful-effect' // CI fully inside ±minEffect
  | 'inconclusive'; // everything else

export interface Verdict {
  kind: VerdictKind;
  /** 'B_higher' | 'B_lower' | null when no direction can be asserted. */
  direction: 'B_higher' | 'B_lower' | null;
  /** Whether the observed direction matches what the user expected (null if unsure / no effect). */
  matchesExpectation: boolean | null;
  /** Whether the effect is favourable given the metric's higherIsBetter flag. */
  favourable: boolean | null;
  /** Confidence label for display. */
  strength: 'none' | 'weak' | 'moderate' | 'strong';
}

export const MIN_PER_GROUP = 3;

export function judge(
  cmp: Comparison,
  metric: Pick<MetricDef, 'higherIsBetter'>,
  minEffect: number | null,
  expected: ExpectedDirection,
): Verdict {
  if (cmp.a.n < MIN_PER_GROUP || cmp.b.n < MIN_PER_GROUP || !Number.isFinite(cmp.diff)) {
    return { kind: 'insufficient', direction: null, matchesExpectation: null, favourable: null, strength: 'none' };
  }
  const [lo, hi] = cmp.ci;
  const excludesZero = Number.isFinite(lo) && Number.isFinite(hi) && (lo > 0 || hi < 0);
  const direction: Verdict['direction'] = cmp.diff > 0 ? 'B_higher' : cmp.diff < 0 ? 'B_lower' : null;
  const absD = Math.abs(cmp.cohenD);
  const strength: Verdict['strength'] = !excludesZero ? 'none' : absD >= 0.8 ? 'strong' : absD >= 0.4 ? 'moderate' : 'weak';

  const favourable =
    direction === null ? null : direction === 'B_higher' ? metric.higherIsBetter : !metric.higherIsBetter;
  const matchesExpectation = expected === 'unsure' || direction === null ? null : expected === direction;

  if (excludesZero) {
    if (minEffect !== null && minEffect > 0 && Math.abs(cmp.diff) < minEffect) {
      return { kind: 'effect-small', direction, matchesExpectation, favourable, strength };
    }
    return { kind: 'effect-meaningful', direction, matchesExpectation, favourable, strength };
  }
  if (minEffect !== null && minEffect > 0 && lo > -minEffect && hi < minEffect) {
    return { kind: 'no-meaningful-effect', direction: null, matchesExpectation: null, favourable: null, strength: 'none' };
  }
  return { kind: 'inconclusive', direction: null, matchesExpectation: null, favourable: null, strength: 'none' };
}
