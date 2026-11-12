import type { Entry, Experiment } from './types';
import { SCHEMA_VERSION } from './types';
import { buildAssignments, dateForDay } from './schedule';
import { mulberry32 } from './random';
import { addDays } from './dates';

export const DEMO_ID = 'demo-coffee-afternoon';

/**
 * A finished, realistic demo experiment so newcomers see the value in ten seconds.
 * Data is generated deterministically: condition B (no coffee) sleeps ~1.4 points better.
 */
export function buildDemo(today: string, locale: 'fr' | 'en'): { experiment: Experiment; entries: Entry[] } {
  const durationDays = 21;
  const startDate = addDays(today, -durationDays - 2);
  const seed = 20260101;
  const assignments = buildAssignments('blocked-random', durationDays, 2, seed);
  const now = new Date().toISOString();
  const fr = locale === 'fr';

  const experiment: Experiment = {
    id: DEMO_ID,
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    startDate,
    durationDays,
    status: 'completed',
    title: fr ? 'Démo · Café après 14 h et sommeil' : 'Demo · Coffee after 2 pm and sleep',
    question: fr ? 'Le café après 14 h dégrade-t-il mon sommeil ?' : 'Does coffee after 2 pm hurt my sleep?',
    hypothesis: fr ? 'Sans café après 14 h, je dors mieux.' : 'Without coffee after 2 pm, I sleep better.',
    conditionA: {
      label: fr ? 'Café comme d’habitude' : 'Coffee as usual',
      instructions: fr ? 'Café normalement, y compris l’après-midi.' : 'Coffee as usual, afternoon included.',
    },
    conditionB: {
      label: fr ? 'Pas de café après 14 h' : 'No coffee after 2 pm',
      instructions: fr ? 'Aucune boisson caféinée après 14 h.' : 'No caffeinated drink after 2 pm.',
    },
    metrics: [
      { id: 'sleep', name: fr ? 'Qualité du sommeil' : 'Sleep quality', kind: 'scale', higherIsBetter: true },
      { id: 'latency', name: fr ? 'Temps pour m’endormir' : 'Time to fall asleep', kind: 'duration', higherIsBetter: false },
    ],
    primaryMetricId: 'sleep',
    design: 'blocked-random',
    blockSize: 2,
    seed,
    assignments,
    minEffect: 1,
    expectedDirection: 'B_higher',
    checkInTime: '08:30',
    sealed: true,
    peekedAt: null,
    lockedAt: now,
    completedAt: now,
    templateId: 'coffee-afternoon',
    conclusionNote: fr
      ? 'Un point et demi de mieux en moyenne, et je m’endors dix minutes plus vite. Je garde le café du matin, j’arrête celui de 16 h.'
      : 'A point and a half better on average, and I fall asleep ten minutes faster. Keeping the morning coffee, dropping the 4 pm one.',
  };

  const rng = mulberry32(seed + 1);
  const gauss = () => {
    // Box–Muller
    const u = Math.max(rng(), 1e-9);
    const v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

  const notesFr = ['', '', 'Soirée tardive.', '', 'Réveil à 4 h sans raison.', '', 'Journée très calme.', '', '', 'Sport le soir.', '', ''];
  const notesEn = ['', '', 'Late night.', '', 'Woke up at 4 am for no reason.', '', 'Very quiet day.', '', '', 'Evening workout.', '', ''];

  const entries: Entry[] = [];
  for (let i = 0; i < durationDays; i++) {
    if (i === 9) continue; // one missed day, as in real life
    const cond = assignments[i] ?? 'A';
    const adhered = i === 14 ? false : true;
    const base = cond === 'B' && adhered ? 7.4 : 6.0;
    const sleep = clamp(Math.round(base + gauss() * 1.1), 1, 10);
    const latency = clamp(Math.round((cond === 'B' && adhered ? 14 : 24) + gauss() * 7), 3, 60);
    entries.push({
      id: `${DEMO_ID}-${i}`,
      experimentId: DEMO_ID,
      dayIndex: i,
      date: dateForDay(experiment, i),
      condition: cond,
      adhered,
      values: { sleep, latency },
      note: (fr ? notesFr : notesEn)[i % notesFr.length] ?? '',
      enteredLate: i === 5,
      createdAt: now,
      updatedAt: now,
    });
  }
  return { experiment, entries };
}
