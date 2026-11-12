import type { Condition, Design, Experiment } from './types';
import { mulberry32, shuffle } from './random';
import { addDays, diffDays } from './dates';

/**
 * Build the day-by-day assignment of conditions.
 * - blocked-random: within each block of `blockSize` days, half are A and half B, in random order.
 *   This guarantees balance even if the experiment is stopped early, and avoids long runs.
 * - phases: first half A (baseline), second half B (intervention).
 */
export function buildAssignments(design: Design, durationDays: number, blockSize: number, seed: number): Condition[] {
  if (durationDays <= 0) return [];
  if (design === 'phases') {
    const half = Math.ceil(durationDays / 2);
    return Array.from({ length: durationDays }, (_, i) => (i < half ? 'A' : 'B'));
  }
  const size = Math.max(2, blockSize - (blockSize % 2)); // force even block size >= 2
  const rng = mulberry32(seed);
  const out: Condition[] = [];
  while (out.length < durationDays) {
    const block: Condition[] = [];
    for (let i = 0; i < size / 2; i++) block.push('A', 'B');
    shuffle(block, rng);
    out.push(...block);
  }
  return out.slice(0, durationDays);
}

/** Day index of a given date within the experiment, or null when outside the window. */
export function dayIndexFor(exp: Pick<Experiment, 'startDate' | 'durationDays'>, dateKey: string): number | null {
  const idx = diffDays(exp.startDate, dateKey);
  if (idx < 0 || idx >= exp.durationDays) return null;
  return idx;
}

export function dateForDay(exp: Pick<Experiment, 'startDate'>, dayIndex: number): string {
  return addDays(exp.startDate, dayIndex);
}

export function endDate(exp: Pick<Experiment, 'startDate' | 'durationDays'>): string {
  return addDays(exp.startDate, exp.durationDays - 1);
}

export function conditionForDay(exp: Pick<Experiment, 'assignments'>, dayIndex: number): Condition {
  return exp.assignments[dayIndex] ?? 'A';
}

/** Number of days that have occurred so far (today included), clamped to the window. */
export function elapsedDays(exp: Pick<Experiment, 'startDate' | 'durationDays'>, today: string): number {
  const idx = diffDays(exp.startDate, today);
  if (idx < 0) return 0;
  return Math.min(exp.durationDays, idx + 1);
}

export function hasEnded(exp: Pick<Experiment, 'startDate' | 'durationDays'>, today: string): boolean {
  return diffDays(exp.startDate, today) >= exp.durationDays;
}

export function hasStarted(exp: Pick<Experiment, 'startDate'>, today: string): boolean {
  return diffDays(exp.startDate, today) >= 0;
}
