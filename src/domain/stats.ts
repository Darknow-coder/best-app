/**
 * Statistics for N-of-1 comparisons. Pure, deterministic (seeded), dependency-free.
 * We deliberately favour resampling methods (bootstrap, permutation) over parametric tests:
 * they make fewer assumptions and are easier to explain honestly to a non-statistician.
 */
import { mulberry32, type Rng } from './random';

export interface GroupSummary {
  n: number;
  mean: number;
  sd: number;
  median: number;
  min: number;
  max: number;
}

export interface Comparison {
  a: GroupSummary;
  b: GroupSummary;
  /** Mean difference B - A. */
  diff: number;
  /** 95% percentile bootstrap confidence interval of the difference. */
  ci: [number, number];
  /** Two-sided permutation p-value for the difference in means. */
  pValue: number;
  /** Cohen's d with pooled SD (0 when SD is 0). */
  cohenD: number;
  /** Fraction of iterations run; informative only. */
  iterations: number;
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

export function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) * (x - m);
  return Math.sqrt(s / (xs.length - 1));
}

export function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((p, q) => p - q);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo] as number;
  const b = sorted[hi] as number;
  return a + (b - a) * (pos - lo);
}

export function summarize(xs: number[]): GroupSummary {
  if (xs.length === 0) return { n: 0, mean: NaN, sd: 0, median: NaN, min: NaN, max: NaN };
  return {
    n: xs.length,
    mean: mean(xs),
    sd: sd(xs),
    median: median(xs),
    min: Math.min(...xs),
    max: Math.max(...xs),
  };
}

function resample(xs: number[], rng: Rng): number[] {
  const out = new Array<number>(xs.length);
  for (let i = 0; i < xs.length; i++) out[i] = xs[Math.floor(rng() * xs.length)] as number;
  return out;
}

export function bootstrapDiffCI(a: number[], b: number[], iterations = 2000, seed = 42): [number, number] {
  if (a.length === 0 || b.length === 0) return [NaN, NaN];
  const rng = mulberry32(seed);
  const diffs = new Array<number>(iterations);
  for (let i = 0; i < iterations; i++) {
    diffs[i] = mean(resample(b, rng)) - mean(resample(a, rng));
  }
  diffs.sort((p, q) => p - q);
  return [quantile(diffs, 0.025), quantile(diffs, 0.975)];
}

/**
 * Two-sided permutation test on the difference in means.
 * Uses Monte-Carlo permutations (exact enumeration is unnecessary at these sizes).
 */
export function permutationPValue(a: number[], b: number[], iterations = 2000, seed = 7): number {
  if (a.length === 0 || b.length === 0) return NaN;
  const observed = Math.abs(mean(b) - mean(a));
  const pooled = [...a, ...b];
  const nA = a.length;
  const rng = mulberry32(seed);
  let extreme = 0;
  for (let i = 0; i < iterations; i++) {
    // partial Fisher–Yates: pick nA indices for group A
    const arr = pooled.slice();
    for (let k = arr.length - 1; k >= arr.length - nA; k--) {
      const j = Math.floor(rng() * (k + 1));
      const tmp = arr[k] as number;
      arr[k] = arr[j] as number;
      arr[j] = tmp;
    }
    const permA = arr.slice(arr.length - nA);
    const permB = arr.slice(0, arr.length - nA);
    const d = Math.abs(mean(permB) - mean(permA));
    if (d >= observed - 1e-12) extreme++;
  }
  // +1 correction keeps the estimate away from 0 for finite permutations
  return (extreme + 1) / (iterations + 1);
}

export function cohenD(a: number[], b: number[]): number {
  if (a.length < 2 || b.length < 2) return 0;
  const sa = sd(a);
  const sb = sd(b);
  const pooled = Math.sqrt(((a.length - 1) * sa * sa + (b.length - 1) * sb * sb) / (a.length + b.length - 2));
  if (pooled === 0) return 0;
  return (mean(b) - mean(a)) / pooled;
}

export function compare(a: number[], b: number[], seed = 1): Comparison {
  const iterations = 2000;
  const sa = summarize(a);
  const sb = summarize(b);
  const diff = a.length && b.length ? sb.mean - sa.mean : NaN;
  return {
    a: sa,
    b: sb,
    diff,
    ci: bootstrapDiffCI(a, b, iterations, seed),
    pValue: permutationPValue(a, b, iterations, seed + 1),
    cohenD: cohenD(a, b),
    iterations,
  };
}

/** Rounds to a sensible number of decimals for display. */
export function fmt(x: number, decimals = 1): string {
  if (!Number.isFinite(x)) return '—';
  const r = Math.round(x * 10 ** decimals) / 10 ** decimals;
  return Object.is(r, -0) ? '0' : String(r);
}
