import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { completeExperiment, deleteExperiment, exportAll, getEntries, importBundle, saveExperiment, startExperiment, upsertEntry } from './repo';
import type { Experiment } from '@/domain/types';

function draft(id = 'e1'): Experiment {
  return {
    id,
    schemaVersion: 1,
    createdAt: 'x',
    updatedAt: 'x',
    startDate: '2026-11-01',
    durationDays: 6,
    status: 'draft',
    title: 'T',
    question: 'Q',
    hypothesis: 'H',
    conditionA: { label: 'A', instructions: '' },
    conditionB: { label: 'B', instructions: '' },
    metrics: [{ id: 'm', name: 'M', kind: 'scale', higherIsBetter: true }],
    primaryMetricId: 'm',
    design: 'blocked-random',
    blockSize: 2,
    seed: 3,
    assignments: [],
    minEffect: 1,
    expectedDirection: 'unsure',
    checkInTime: '20:00',
    sealed: true,
    peekedAt: null,
    lockedAt: null,
    completedAt: null,
    templateId: null,
    conclusionNote: '',
  };
}

describe('repository', () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.experiments.clear();
  });

  it('starts a draft and locks assignments', async () => {
    await saveExperiment(draft());
    const started = await startExperiment('e1', '2026-11-02');
    expect(started?.status).toBe('running');
    expect(started?.assignments).toHaveLength(6);
    expect(started?.startDate).toBe('2026-11-02');
  });

  it('upserts one entry per day', async () => {
    await saveExperiment(draft());
    const base = { experimentId: 'e1', dayIndex: 0, date: '2026-11-01', condition: 'A' as const, note: '', enteredLate: false };
    await upsertEntry({ ...base, adhered: true, values: { m: 5 } });
    await upsertEntry({ ...base, adhered: false, values: { m: 7 } });
    const entries = await getEntries('e1');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.values.m).toBe(7);
    expect(entries[0]?.adhered).toBe(false);
  });

  it('deletes experiments with their entries', async () => {
    await saveExperiment(draft());
    await upsertEntry({ experimentId: 'e1', dayIndex: 0, date: '2026-11-01', condition: 'A', adhered: true, values: { m: 5 }, note: '', enteredLate: false });
    await deleteExperiment('e1');
    expect(await db.experiments.count()).toBe(0);
    expect(await db.entries.count()).toBe(0);
  });

  it('round-trips export/import and merges duplicates by day', async () => {
    await saveExperiment(draft());
    await completeExperiment('e1');
    await upsertEntry({ experimentId: 'e1', dayIndex: 1, date: '2026-11-02', condition: 'B', adhered: true, values: { m: 8 }, note: 'n', enteredLate: false });
    const bundle = await exportAll();
    expect(bundle.app).toBe('cobaye');
    await db.entries.clear();
    await db.experiments.clear();
    const res = await importBundle(bundle, 'merge');
    expect(res).toEqual({ experiments: 1, entries: 1 });
    // Importing again with a different entry id but same day must not duplicate.
    const again = { ...bundle, entries: bundle.entries.map((e) => ({ ...e, id: 'other', updatedAt: '9999' , values: { m: 9 } })) };
    await importBundle(again, 'merge');
    const entries = await getEntries('e1');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.values.m).toBe(9);
  });
});
