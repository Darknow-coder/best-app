import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useEntries, useExperiment, useToday } from '@/app/hooks';
import { dateForDay, elapsedDays, endDate, hasEnded, hasStarted } from '@/domain/schedule';
import { abandonExperiment, completeExperiment, deleteExperiment, startExperiment, updateExperimentFields } from '@/data/repo';
import { MIN_PER_GROUP } from '@/domain/verdict';
import { Button } from '@/ui/Button';
import { CondMark, Progress } from '@/ui/Bits';
import { useConfirm } from '@/app/Confirm';
import { useToast } from '@/ui/Toast';
import { Sheet } from '@/ui/Sheet';
import { IconArrowLeft, IconChart, IconFlag, IconPencil, IconTrash } from '@/ui/Icons';
import { CheckInSheet } from '@/features/today/CheckInSheet';
import { DEMO_ID } from '@/domain/demo';

export default function ExperimentDetailPage() {
  const { id } = useParams();
  const { t, formatDate } = useI18n();
  const nav = useNavigate();
  const confirm = useConfirm();
  const { toast } = useToast();
  const today = useToday();
  const exp = useExperiment(id);
  const entries = useEntries(id);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const byDay = useMemo(() => new Map((entries ?? []).map((e) => [e.dayIndex, e])), [entries]);

  if (exp === undefined || entries === undefined) return null;
  if (exp === null) {
    return (
      <div className="empty">
        <p className="muted">{t('exps.empty')}</p>
        <Button to="/experiments" variant="secondary">
          <IconArrowLeft /> {t('common.back')}
        </Button>
      </div>
    );
  }

  const started = hasStarted(exp, today);
  const ended = hasEnded(exp, today);
  const elapsed = elapsedDays(exp, today);
  const answered = entries.filter((e) => e.adhered !== null);
  const adherence = answered.length ? Math.round((answered.filter((e) => e.adhered).length / answered.length) * 100) : null;
  const primary = exp.metrics.find((m) => m.id === exp.primaryMetricId) ?? exp.metrics[0];
  const perGroup = { A: entries.filter((e) => e.condition === 'A').length, B: entries.filter((e) => e.condition === 'B').length };
  const canFinish = Math.min(perGroup.A, perGroup.B) >= MIN_PER_GROUP;

  const onDelete = async () => {
    if (await confirm({ body: t('detail.deleteConfirm'), confirmLabel: t('common.delete'), danger: true })) {
      await deleteExperiment(exp.id);
      toast(t('detail.deleted'));
      nav('/experiments', { replace: true });
    }
  };
  const onAbandon = async () => {
    if (await confirm({ body: t('detail.abandonConfirm'), confirmLabel: t('detail.abandon'), danger: true })) {
      await abandonExperiment(exp.id);
    }
  };
  const onFinishEarly = async () => {
    if (await confirm({ body: t('detail.finishEarlyConfirm'), confirmLabel: t('detail.finishEarly') })) {
      await completeExperiment(exp.id);
      nav(`/experiments/${exp.id}/results`);
    }
  };
  const onStartNow = async () => {
    await startExperiment(exp.id, today);
    toast(t('builder.started'));
    nav('/');
  };
  const onRename = async () => {
    if (newTitle.trim()) await updateExperimentFields(exp.id, { title: newTitle.trim() });
    setRenaming(false);
  };

  const dayState = (i: number): 'filled' | 'missing' | 'future' => {
    if (byDay.has(i)) return 'filled';
    return i < elapsed ? 'missing' : 'future';
  };
  const weekdayLabels = Array.from({ length: 7 }, (_, i) => formatDate(dateForDay(exp, i), { weekday: 'narrow' }));

  return (
    <div className="fade-in stack-lg">
      <div>
        <Link to="/experiments" className="btn btn-ghost btn-sm" style={{ marginLeft: -12 }}>
          <IconArrowLeft /> {t('exps.title')}
        </Link>
        <header className="page-head" style={{ marginTop: 'var(--space-2)' }}>
          <div className="row wrap" style={{ gap: 8, marginBottom: 6 }}>
            <span className={`chip ${exp.status === 'running' ? 'chip-b' : exp.status === 'completed' ? 'chip-ok' : ''}`}>
              {t(`exps.status.${exp.status}`)}
            </span>
            {exp.id === DEMO_ID && <span className="chip chip-outline">{t('demo.badge')}</span>}
            {exp.sealed && exp.status === 'running' && <span className="chip chip-outline">{t('exps.status.sealed')}</span>}
          </div>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <h1 className="grow">{exp.title}</h1>
            <Button
              icon
              variant="ghost"
              aria-label={t('detail.rename')}
              onClick={() => {
                setNewTitle(exp.title);
                setRenaming(true);
              }}
            >
              <IconPencil />
            </Button>
          </div>
          <p className="sub">{exp.question}</p>
        </header>
      </div>

      {exp.status === 'draft' && (
        <div className="card row wrap">
          <Button onClick={onStartNow}>{t('detail.startNow')}</Button>
          <Button to={`/experiments/${exp.id}/edit`} variant="secondary">
            {t('detail.editDraft')}
          </Button>
        </div>
      )}

      {exp.status !== 'draft' && (
        <section className="card stack">
          <div className="row-between">
            <h3>{t('detail.progress')}</h3>
            <span className="num small muted">{started ? t('today.progress', { i: Math.min(elapsed, exp.durationDays), n: exp.durationDays }) : t('common.daysCount', { n: exp.durationDays })}</span>
          </div>
          <Progress value={elapsed} max={exp.durationDays} />
          <dl className="kv">
            <dt>{t('detail.period')}</dt>
            <dd>{t('detail.from', { a: formatDate(exp.startDate), b: formatDate(endDate(exp)) })}</dd>
            <dt>{t('detail.filled', { n: entries.length })}</dt>
            <dd className="num">
              A {perGroup.A} · B {perGroup.B}
            </dd>
            <dt>{t('detail.adherence')}</dt>
            <dd className="num">{adherence === null ? '—' : `${adherence} %`}</dd>
          </dl>
          {(exp.status === 'completed' || ended) && (
            <Button to={`/experiments/${exp.id}/results`}>
              <IconChart /> {t('common.results')}
            </Button>
          )}
        </section>
      )}

      {exp.status !== 'draft' && (
        <section className="card stack">
          <h3>{t('detail.calendar')}</h3>
          <div className="cal" role="grid">
            {weekdayLabels.map((w, i) => (
              <span key={i} className="xs muted center" aria-hidden>
                {w}
              </span>
            ))}
            {exp.assignments.map((c, i) => {
              const st = dayState(i);
              const e = byDay.get(i);
              const isToday = dateForDay(exp, i) === today;
              const clickable = exp.status !== 'abandoned' && st !== 'future';
              return (
                <button
                  key={i}
                  type="button"
                  className={`cal-day ${c} ${st} ${isToday ? 'today' : ''}`}
                  disabled={!clickable}
                  onClick={() => setOpenDay(i)}
                  aria-label={`${formatDate(dateForDay(exp, i))} · ${c}`}
                  title={e?.note || undefined}
                >
                  <span className="d">{i + 1}</span>
                  <span style={{ fontSize: 9, opacity: 0.85 }}>{c}</span>
                  {e?.adhered === false && <span className="nf" aria-hidden />}
                </button>
              );
            })}
          </div>
          <div className="cal-legend">
            <span>
              <i style={{ background: 'var(--a)' }} /> {exp.conditionA.label}
            </span>
            <span>
              <i style={{ background: 'var(--b)' }} /> {exp.conditionB.label}
            </span>
            <span>
              <i style={{ background: 'transparent', border: '1.5px dashed var(--ink-3)' }} /> {t('detail.legend.missing')}
            </span>
            <span>
              <i style={{ background: 'var(--highlight)', borderRadius: '50%' }} /> {t('detail.legend.notFollowed')}
            </span>
          </div>
        </section>
      )}

      <section className="card stack">
        <h3>{t('detail.preregistered')}</h3>
        {exp.hypothesis && <p className="quote">« {exp.hypothesis} »</p>}
        <div className="stack-sm">
          <div className="row">
            <CondMark c="A" />
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{exp.conditionA.label}</div>
              <div className="small ink-2">{exp.conditionA.instructions}</div>
            </div>
          </div>
          <div className="row">
            <CondMark c="B" />
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{exp.conditionB.label}</div>
              <div className="small ink-2">{exp.conditionB.instructions}</div>
            </div>
          </div>
        </div>
        <dl className="kv">
          <dt>{t('builder.m.primary')}</dt>
          <dd>{primary?.name}</dd>
          {exp.metrics.length > 1 && (
            <>
              <dt>{t('results.secondary')}</dt>
              <dd>
                {exp.metrics
                  .filter((m) => m.id !== primary?.id)
                  .map((m) => m.name)
                  .join(', ')}
              </dd>
            </>
          )}
          <dt>{t('builder.d.design')}</dt>
          <dd>{exp.design === 'phases' ? t('detail.designPhases') : t('detail.designBlocked', { n: exp.blockSize })}</dd>
          <dt>{t('detail.expected')}</dt>
          <dd>{t(`builder.r.dir.${exp.expectedDirection}`)}</dd>
          <dt>{t('detail.minEffect')}</dt>
          <dd className="num">{exp.minEffect ?? '—'}</dd>
          <dt>{t('detail.seed')}</dt>
          <dd className="num">{exp.seed}</dd>
        </dl>
      </section>

      <section className="card stack">
        <h3>{t('detail.actions')}</h3>
        <div className="row wrap">
          {exp.status === 'running' && started && (
            <Button variant="secondary" onClick={onFinishEarly} disabled={!canFinish} title={!canFinish ? t('detail.tooFewToFinish', { n: MIN_PER_GROUP * 2 }) : undefined}>
              <IconFlag /> {t('detail.finishEarly')}
            </Button>
          )}
          {exp.status === 'running' && (
            <Button variant="ghost" onClick={onAbandon}>
              {t('detail.abandon')}
            </Button>
          )}
          <Button variant="danger" onClick={onDelete}>
            <IconTrash /> {t('common.delete')}
          </Button>
        </div>
        {exp.status === 'running' && !canFinish && <p className="xs muted">{t('detail.tooFewToFinish', { n: MIN_PER_GROUP * 2 })}</p>}
      </section>

      {openDay !== null && (
        <CheckInSheet open onClose={() => setOpenDay(null)} experiment={exp} dayIndex={openDay} existing={byDay.get(openDay)} today={today} />
      )}
      <Sheet open={renaming} onClose={() => setRenaming(false)} title={t('detail.rename')}>
        <div className="stack">
          <input className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus aria-label={t('builder.q.title')} />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setRenaming(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={onRename}>{t('common.save')}</Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
