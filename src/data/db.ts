import Dexie, { type Table } from 'dexie';
import type { Entry, Experiment } from '@/domain/types';

export class CobayeDB extends Dexie {
  experiments!: Table<Experiment, string>;
  entries!: Table<Entry, string>;

  constructor(name = 'cobaye') {
    super(name);
    this.version(1).stores({
      experiments: 'id, status, startDate, updatedAt',
      entries: 'id, experimentId, [experimentId+dayIndex], date',
    });
  }
}

export const db = new CobayeDB();
