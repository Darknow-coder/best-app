import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import { todayKey } from '@/domain/dates';
import type { Entry, Experiment } from '@/domain/types';

/** Current local date key; re-evaluates at midnight and when the tab regains focus. */
export function useToday(): string {
  const [today, setToday] = useState(() => todayKey());
  useEffect(() => {
    const tick = () => setToday(todayKey());
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
    const timer = window.setTimeout(tick, midnight.getTime() - now.getTime());
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', tick);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', tick);
    };
  }, [today]);
  return today;
}

export function useExperiments(): Experiment[] | undefined {
  return useLiveQuery(() => db.experiments.orderBy('updatedAt').reverse().toArray(), []);
}

export function useExperiment(id: string | undefined): Experiment | undefined | null {
  return useLiveQuery(async () => (id ? ((await db.experiments.get(id)) ?? null) : null), [id]);
}

export function useEntries(experimentId: string | undefined): Entry[] | undefined {
  return useLiveQuery(
    async () => (experimentId ? db.entries.where('experimentId').equals(experimentId).sortBy('dayIndex') : []),
    [experimentId],
  );
}

export function useAllEntries(): Entry[] | undefined {
  return useLiveQuery(() => db.entries.toArray(), []);
}

export function useMediaQuery(q: string): boolean {
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(q).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(q);
    const h = () => setM(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [q]);
  return m;
}
