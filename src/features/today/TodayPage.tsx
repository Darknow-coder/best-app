import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useAllEntries, useExperiments, useToday } from '@/app/hooks';
import { conditionForDay, dayIndexFor, elapsedDays, hasEnded, hasStarted } from '@/domain/schedule';
import { diffDays } from '@/domain/dates';
import type { Entry, Experiment } from '@/domain/types';
import { Button } from '@/ui/Button';
import { CondMark, EmptyState, Progress } from '@/ui/Bits';
import { IconArrowRight, IconCheck, IconDice, IconSeal } from '@/ui/Icons';
import { CheckInSheet } from './CheckInSheet';
import { loadDemo } from '@/data/repo';
import { DEMO_ID } from '@/domain/demo';

const REVEAL_KEY = 'cobaye.revealed';
function revealedSet(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(REVEAL_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}
function markRevealed(key: string) {
  const s = revealedSet();
  s.add(key);
  try {
    sessionStorage.setItem(REVEAL_KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
}

export default function TodayPage() {
  const { t, locale } = useI18n();
  const today = useToday();
  const experiments = useExperiments();
  const entries = useAllEntries();
  const nav = useNavigate();

  const running = useMemo(() => (experiments ?? []).filter((e) => e.status === 'running'), [experiments]);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('today.greeting.morning') : hour < 18 ? t('today.greeting.afternoon') : t('today.greeting.evening');

  if (experiments === undefined || entries === undefined) return null;

  if (running.length === 0) {
    const hasDemo = experiments.some((e) => e.id === DEMO_ID);
    return (
      <EmptyState title={t('today.empty.title')} body={t('today.empty.body')}>
        <Button to="/library" size="lg">
          {t('today.empty.cta')} <IconArrowRight />
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            if (!hasDemo) await loadDemo(today, locale);
            nav(`/experiments/${DEMO_ID}/results`);
          }}
        >
          {t('today.empty.demo')}
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="fade-in">
      <header className="page-head">
        <p className="eyebrow">{greeting}</p>
        <h1>{t('today.title')}</h1>
        <p className="sub">{t('today.activeCount', { n: running.length })}</p>
      </header>
      <div className="list">
        {running.map((exp) => (
          <TodayCard key={exp.id} exp={exp} today={today} entries={entries.filter((e) => e.experimentId === exp.id)} />
        ))}
      </div>
    </div>
  );
}

function TodayCard({ exp, today, entries }: { exp: Experiment; today: string; entries: Entry[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  const [, force] = useState(0);
  const dayIndex = dayIndexFor(exp, today);
  const revealKey = `${exp.id}:${today}`;
  const todayEntry = dayIndex !== null ? entries.find((e) => e.dayIndex === dayIndex) : undefined;
  const revealed = revealedSet().has(revealKey) || !!todayEntry;
  const elapsed = elapsedDays(exp, today);
  const missing = useMemo(() => {
    const filled = new Set(entries.map((e) => e.dayIndex));
    const out: number[] = [];
    for (let i = 0; i < elapsed - 1; i++) if (!filled.has(i)) out.push(i);
    return out;
  }, [entries, elapsed]);

  if (!hasStarted(exp, today)) {
    const n = -diffDays(exp.startDate, today);
    return (
      <article className="card">
        <div className="card-head">
          <h3>{exp.title}</h3>
          <span className="chip chip-info">{n === 1 ? t('today.startsTomorrow') : t('today.startsIn', { n })}</span>
        </div>
        <Link to={`/experiments/${exp.id}`} className="small ink-2">
          {t('detail.calendar')} →
        </Link>
      </article>
    );
  }

  if (hasEnded(exp, today) || dayIndex === null) {
    return (
      <article className="card today-card">
        <div className="card-head">
          <h3>{exp.title}</h3>
          <span className="chip chip-ok">{t('today.endedTitle')}</span>
        </div>
        <p className="small ink-2" style={{ marginBottom: 'var(--space-4)' }}>
          {t('today.endedBody')}
        </p>
        <Button to={`/experiments/${exp.id}/results`}>
          <IconSeal /> {t('today.viewResults')}
        </Button>
      </article>
    );
  }

  const cond = conditionForDay(exp, dayIndex);
  const condDef = cond === 'A' ? exp.conditionA : exp.conditionB;

  return (
    <article className={`card today-card ${revealed ? `cond-${cond}` : ''}`}>
      <div className="card-head">
        <div>
          <Link to={`/experiments/${exp.id}`} style={{ textDecoration: 'none' }}>
            <h3>{exp.title}</h3>
          </Link>
          <p className="xs muted num" style={{ marginTop: 4 }}>
            {t('today.progress', { i: dayIndex + 1, n: exp.durationDays })}
          </p>
        </div>
        {todayEntry && (
          <span className="chip chip-ok">
            <IconCheck width={12} height={12} /> {t('today.checkinDone')}
          </span>
        )}
      </div>
      <Progress value={entries.length} max={exp.durationDays} />

      <div style={{ marginTop: 'var(--space-4)' }}>
        {revealed ? (
          <div className="reveal-cond stack-sm">
            <p className="eyebrow">{t('today.yourCondition')}</p>
            <div className="row">
              <CondMark c={cond} lg />
              <div className="grow">
                <div className="cond-title">{condDef.label}</div>
              </div>
            </div>
            {condDef.instructions && (
              <p className="small ink-2">
                <strong>{t('today.instructions')} :</strong> {condDef.instructions}
              </p>
            )}
          </div>
        ) : (
          <div className="envelope">
            <IconDice width={36} height={36} style={{ marginBottom: 8, color: 'var(--ink-2)' }} />
            <div>
              <Button
                onClick={() => {
                  markRevealed(revealKey);
                  force((x) => x + 1);
                }}
              >
                {t('today.reveal')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="row wrap" style={{ marginTop: 'var(--space-4)' }}>
        {revealed && (
          <Button variant={todayEntry ? 'secondary' : 'primary'} onClick={() => setOpen(dayIndex)}>
            {todayEntry ? t('today.editCheckin') : t('today.checkin')}
          </Button>
        )}
        {missing.length > 0 && (
          <Button variant="ghost" onClick={() => setOpen(missing[missing.length - 1] ?? 0)}>
            {missing.length === 1 ? t('today.missingOne') : t('today.missing', { n: missing.length })} · {t('today.catchUp')}
          </Button>
        )}
      </div>

      {open !== null && (
        <CheckInSheet open onClose={() => setOpen(null)} experiment={exp} dayIndex={open} existing={entries.find((e) => e.dayIndex === open)} today={today} />
      )}
    </article>
  );
}
