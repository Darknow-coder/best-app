/**
 * Core domain types for Cobaye.
 * Everything here is plain data: serialisable, versioned, framework-free.
 */

export const SCHEMA_VERSION = 1;

export type Condition = 'A' | 'B';

export type MetricKind = 'scale' | 'number' | 'boolean' | 'duration';

export interface MetricDef {
  id: string;
  /** Short name shown in forms and charts, e.g. "Qualité du sommeil". */
  name: string;
  kind: MetricKind;
  /** Unit label for `number` metrics, e.g. "min", "kg", "pages". */
  unit?: string;
  /** Range for `scale` metrics (default 1..10) and optional bounds for `number`. */
  min?: number;
  max?: number;
  /** Whether a higher value is desirable (drives verdict wording). */
  higherIsBetter: boolean;
}

export type Design = 'blocked-random' | 'phases';

export type ExperimentStatus = 'draft' | 'running' | 'completed' | 'abandoned';

export type ExpectedDirection = 'B_higher' | 'B_lower' | 'unsure';

export interface ConditionDef {
  label: string;
  instructions: string;
}

export interface Experiment {
  id: string;
  schemaVersion: number;
  createdAt: string; // ISO datetime
  updatedAt: string;
  startDate: string; // YYYY-MM-DD (local)
  durationDays: number;
  status: ExperimentStatus;
  title: string;
  question: string;
  hypothesis: string;
  conditionA: ConditionDef;
  conditionB: ConditionDef;
  metrics: MetricDef[];
  primaryMetricId: string;
  design: Design;
  blockSize: number;
  seed: number;
  /** Pre-computed assignment for each day index (length === durationDays). */
  assignments: Condition[];
  /** Pre-registered smallest effect on the primary metric that would matter to the user. */
  minEffect: number | null;
  expectedDirection: ExpectedDirection;
  checkInTime: string; // "HH:MM"
  /** Results hidden until completion unless the user explicitly unseals. */
  sealed: boolean;
  peekedAt: string | null;
  lockedAt: string | null;
  completedAt: string | null;
  templateId: string | null;
  /** What the user learned, written after results. */
  conclusionNote: string;
}

export interface Entry {
  id: string;
  experimentId: string;
  dayIndex: number;
  date: string; // YYYY-MM-DD
  condition: Condition;
  /** Did the user actually follow the assigned condition? null = not answered. */
  adhered: boolean | null;
  values: Record<string, number | null>;
  note: string;
  /** True when the entry was recorded on a later day than its date. */
  enteredLate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExportBundle {
  app: 'cobaye';
  schemaVersion: number;
  exportedAt: string;
  experiments: Experiment[];
  entries: Entry[];
}
