import type { Entry, Experiment, MetricDef } from './types';
import { compare, type Comparison } from './stats';
import { judge, type Verdict } from './verdict';

export interface MetricAnalysis {
  metric: MetricDef;
  all: Comparison;
  /** Same comparison restricted to days where the user reports having followed the condition. */
  adherentOnly: Comparison;
  verdict: Verdict;
  series: Array<{ dayIndex: number; date: string; condition: 'A' | 'B'; value: number | null; adhered: boolean | null }>;
}

export interface ExperimentAnalysis {
  primary: MetricAnalysis;
  secondary: MetricAnalysis[];
  totalDays: number;
  filledDays: number;
  adherenceRate: number | null;
  daysA: number;
  daysB: number;
}

function valuesFor(entries: Entry[], metricId: string, cond: 'A' | 'B', adherentOnly: boolean): number[] {
  const out: number[] = [];
  for (const e of entries) {
    if (e.condition !== cond) continue;
    if (adherentOnly && e.adhered !== true) continue;
    const v = e.values[metricId];
    if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
  }
  return out;
}

export function analyzeMetric(exp: Experiment, entries: Entry[], metric: MetricDef): MetricAnalysis {
  const seed = (exp.seed ^ hashString(metric.id)) >>> 0;
  const all = compare(valuesFor(entries, metric.id, 'A', false), valuesFor(entries, metric.id, 'B', false), seed);
  const adherentOnly = compare(valuesFor(entries, metric.id, 'A', true), valuesFor(entries, metric.id, 'B', true), seed);
  const isPrimary = metric.id === exp.primaryMetricId;
  const verdict = judge(all, metric, isPrimary ? exp.minEffect : null, isPrimary ? exp.expectedDirection : 'unsure');
  const series = [...entries]
    .sort((p, q) => p.dayIndex - q.dayIndex)
    .map((e) => ({
      dayIndex: e.dayIndex,
      date: e.date,
      condition: e.condition,
      value: typeof e.values[metric.id] === 'number' ? (e.values[metric.id] as number) : null,
      adhered: e.adhered,
    }));
  return { metric, all, adherentOnly, verdict, series };
}

export function analyzeExperiment(exp: Experiment, entries: Entry[]): ExperimentAnalysis | null {
  const primaryDef = exp.metrics.find((m) => m.id === exp.primaryMetricId) ?? exp.metrics[0];
  if (!primaryDef) return null;
  const primary = analyzeMetric(exp, entries, primaryDef);
  const secondary = exp.metrics.filter((m) => m.id !== primaryDef.id).map((m) => analyzeMetric(exp, entries, m));
  const answered = entries.filter((e) => e.adhered !== null);
  const adherenceRate = answered.length ? answered.filter((e) => e.adhered).length / answered.length : null;
  return {
    primary,
    secondary,
    totalDays: exp.durationDays,
    filledDays: entries.filter((e) => Object.values(e.values).some((v) => typeof v === 'number')).length,
    adherenceRate,
    daysA: entries.filter((e) => e.condition === 'A').length,
    daysB: entries.filter((e) => e.condition === 'B').length,
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
