import { db } from './db';
import type { Entry, Experiment, ExportBundle } from '@/domain/types';
import { SCHEMA_VERSION } from '@/domain/types';
import { uid } from '@/domain/random';
import { buildAssignments } from '@/domain/schedule';
import { buildDemo, DEMO_ID } from '@/domain/demo';

const nowIso = () => new Date().toISOString();

export async function saveExperiment(exp: Experiment): Promise<void> {
  await db.experiments.put({ ...exp, updatedAt: nowIso() });
}

export async function getExperiment(id: string): Promise<Experiment | undefined> {
  return db.experiments.get(id);
}

/** Moves a draft to running: recomputes assignments, locks the protocol. */
export async function startExperiment(id: string, startDate: string): Promise<Experiment | undefined> {
  const exp = await db.experiments.get(id);
  if (!exp || exp.status !== 'draft') return exp;
  const assignments = buildAssignments(exp.design, exp.durationDays, exp.blockSize, exp.seed);
  const updated: Experiment = { ...exp, startDate, assignments, status: 'running', lockedAt: nowIso(), updatedAt: nowIso() };
  await db.experiments.put(updated);
  return updated;
}

export async function completeExperiment(id: string): Promise<void> {
  await db.experiments.update(id, { status: 'completed', completedAt: nowIso(), updatedAt: nowIso() });
}

export async function abandonExperiment(id: string): Promise<void> {
  await db.experiments.update(id, { status: 'abandoned', updatedAt: nowIso() });
}

export async function markPeeked(id: string): Promise<void> {
  const exp = await db.experiments.get(id);
  if (exp && !exp.peekedAt) await db.experiments.update(id, { peekedAt: nowIso(), updatedAt: nowIso() });
}

export async function updateExperimentFields(id: string, patch: Partial<Experiment>): Promise<void> {
  await db.experiments.update(id, { ...patch, updatedAt: nowIso() });
}

export async function deleteExperiment(id: string): Promise<void> {
  await db.transaction('rw', db.experiments, db.entries, async () => {
    await db.entries.where('experimentId').equals(id).delete();
    await db.experiments.delete(id);
  });
}

export async function getEntries(experimentId: string): Promise<Entry[]> {
  return db.entries.where('experimentId').equals(experimentId).sortBy('dayIndex');
}

export async function getEntry(experimentId: string, dayIndex: number): Promise<Entry | undefined> {
  return db.entries.where('[experimentId+dayIndex]').equals([experimentId, dayIndex]).first();
}

export interface EntryInput {
  experimentId: string;
  dayIndex: number;
  date: string;
  condition: 'A' | 'B';
  adhered: boolean | null;
  values: Record<string, number | null>;
  note: string;
  enteredLate: boolean;
}

export async function upsertEntry(input: EntryInput): Promise<Entry> {
  const existing = await getEntry(input.experimentId, input.dayIndex);
  const entry: Entry = existing
    ? { ...existing, ...input, enteredLate: existing.enteredLate || input.enteredLate, updatedAt: nowIso() }
    : { id: uid(), ...input, createdAt: nowIso(), updatedAt: nowIso() };
  await db.entries.put(entry);
  return entry;
}

export async function exportAll(): Promise<ExportBundle> {
  const [experiments, entries] = await Promise.all([db.experiments.toArray(), db.entries.toArray()]);
  return { app: 'cobaye', schemaVersion: SCHEMA_VERSION, exportedAt: nowIso(), experiments, entries };
}

export function isExportBundle(x: unknown): x is ExportBundle {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return o.app === 'cobaye' && Array.isArray(o.experiments) && Array.isArray(o.entries) && typeof o.schemaVersion === 'number';
}

function sanitizeExperiment(e: Experiment): Experiment {
  // Defensive defaults so imports from older/foreign files cannot break the UI.
  return {
    ...e,
    schemaVersion: SCHEMA_VERSION,
    metrics: Array.isArray(e.metrics) ? e.metrics : [],
    assignments: Array.isArray(e.assignments) ? e.assignments : [],
    conclusionNote: e.conclusionNote ?? '',
    sealed: e.sealed ?? true,
    peekedAt: e.peekedAt ?? null,
    lockedAt: e.lockedAt ?? null,
    completedAt: e.completedAt ?? null,
    templateId: e.templateId ?? null,
    minEffect: typeof e.minEffect === 'number' ? e.minEffect : null,
    expectedDirection: e.expectedDirection ?? 'unsure',
    blockSize: e.blockSize ?? 2,
    checkInTime: e.checkInTime ?? '20:00',
  };
}

export async function importBundle(bundle: ExportBundle, mode: 'merge' | 'replace'): Promise<{ experiments: number; entries: number }> {
  const experiments = bundle.experiments.map(sanitizeExperiment);
  const entries = bundle.entries.filter((en) => en && typeof en.experimentId === 'string' && typeof en.dayIndex === 'number');
  await db.transaction('rw', db.experiments, db.entries, async () => {
    if (mode === 'replace') {
      await db.entries.clear();
      await db.experiments.clear();
    }
    await db.experiments.bulkPut(experiments);
    // Avoid duplicate (experimentId, dayIndex) pairs when merging exports made on different devices.
    for (const en of entries) {
      const existing = await db.entries.where('[experimentId+dayIndex]').equals([en.experimentId, en.dayIndex]).first();
      if (existing && existing.id !== en.id) {
        if (existing.updatedAt <= en.updatedAt) await db.entries.put({ ...en, id: existing.id });
      } else {
        await db.entries.put(en);
      }
    }
  });
  return { experiments: experiments.length, entries: entries.length };
}

export async function wipeAll(): Promise<void> {
  await db.transaction('rw', db.experiments, db.entries, async () => {
    await db.entries.clear();
    await db.experiments.clear();
  });
}

export async function loadDemo(today: string, locale: 'fr' | 'en'): Promise<void> {
  const { experiment, entries } = buildDemo(today, locale);
  await db.transaction('rw', db.experiments, db.entries, async () => {
    await db.entries.where('experimentId').equals(DEMO_ID).delete();
    await db.experiments.put(experiment);
    await db.entries.bulkPut(entries);
  });
}

export async function hasAnyExperiment(): Promise<boolean> {
  return (await db.experiments.count()) > 0;
}
