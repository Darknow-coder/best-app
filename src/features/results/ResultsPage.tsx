import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useEntries, useExperiment, useToday } from '@/app/hooks';
import { analyzeExperiment, type MetricAnalysis } from '@/domain/analysis';
import { fmt } from '@/domain/stats';
import { MIN_PER_GROUP, judge } from '@/domain/verdict';
import { diffDays } from '@/domain/dates';
import { hasEnded, hasStarted } from '@/domain/schedule';
import type { Experiment } from '@/domain/types';
import { completeExperiment, markPeeked, updateExperimentFields } from '@/data/repo';
import { downloadBlob, entriesToCsv } from '@/data/files';
import { Button } from '@/ui/Button';
import { useConfirm } from '@/app/Confirm';
import { useToast } from '@/ui/Toast';
import { IconArrowLeft, IconDownload, IconSeal, IconShare } from '@/ui/Icons';
import { DotPlot, TimeSeries } from './charts';
import { renderResultCard } from './card';
import { DEMO_ID } from '@/domain/demo';

export default function ResultsPage() {
  const { id } = useParams();
  const { t, formatDate } = useI18n();
  const today = useToday();
  const confirm = useConfirm();
  const exp = useExperiment(id);
  const entries = useEntries(id);
  const [unsealed, setUnsealed] = useState(false);

  if (exp === undefined || entries === undefined) return null;
  if (exp === null) return <p className="muted">{t('exps.empty')}</p>;

  const started = hasStarted(exp, today);
  const ended = hasEnded(exp, today);
  const completed = exp.status === 'completed';

  if (!started && !completed) {
    return (
      <div className="empty">
        <p className="muted">{t('results.notStarted')}</p>
        <Button to={`/experiments/${exp.id}`} variant="secondary">
          <IconArrowLeft /> {t('common.back')}
        </Button>
      </div>
    );
  }

  // Running, time is up: the ceremony of breaking the seal, which also completes the experiment.
  if (!completed && ended) {
    return (
      <div className="seal fade-in">
        <IconSeal className="seal-icon" />
        <h2>{t('results.unsealTitle')}</h2>
        <p className="ink-2" style={{ margin: 'var(--space-3) auto var(--space-5)', maxWidth: '40ch' }}>
          {t('results.unsealBody')}
        </p>
        <Button size="lg" onClick={() => completeExperiment(exp.id)}>
          {t('results.completeAndReveal')}
        </Button>
      </div>
    );
  }

  // Running, sealed, not finished: offer a peek with a warning.
  if (!completed && exp.sealed && !unsealed && !exp.peekedAt) {
    const remaining = exp.durationDays - diffDays(exp.startDate, today);
    return (
      <div className="seal fade-in">
        <IconSeal className="seal-icon" />
        <h2>{t('results.sealed.title')}</h2>
        <p className="ink-2" style={{ margin: 'var(--space-3) auto var(--space-5)', maxWidth: '40ch' }}>
          {t('results.sealed.body')} {t('results.sealed.remaining', { n: remaining })}
        </p>
        <div className="row wrap" style={{ justifyContent: 'center' }}>
          <Button to={`/experiments/${exp.id}`} variant="secondary">
            <IconArrowLeft /> {t('common.back')}
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              if (await confirm({ body: t('results.sealed.peekConfirm'), confirmLabel: t('results.sealed.peek') })) {
                await markPeeked(exp.id);
                setUnsealed(true);
              }
            }}
          >
            {t('results.sealed.peek')}
          </Button>
        </div>
      </div>
    );
  }

  return <Report exp={exp} entriesKey={entries.length} peekedLabel={exp.peekedAt ? t('results.peeked', { date: formatDate(exp.peekedAt.slice(0, 10)) }) : null} />;
}

function Report({ exp, entriesKey, peekedLabel }: { exp: Experiment; entriesKey: number; peekedLabel: string | null }) {
  const { t, formatNumber } = useI18n();
  const { toast } = useToast();
  const entries = useEntries(exp.id);
  const [note, setNote] = useState(exp.conclusionNote);
  const [exporting, setExporting] = useState(false);
  useEffect(() => setNote(exp.conclusionNote), [exp.conclusionNote]);

  const analysis = useMemo(() => (entries ? analyzeExperiment(exp, entries) : null), [exp, entries, entriesKey]);
  if (!analysis || !entries) return null;
  const p = analysis.primary;
  const v = p.verdict;
  const unit = unitFor(p);

  const bodyVars = {
    a: exp.conditionA.label,
    b: exp.conditionB.label,
    metric: p.metric.name,
    diff: signed(p.all.diff, unit),
    dir: v.direction === 'B_higher' ? t('results.dir.higher') : t('results.dir.lower'),
    min: `${formatNumber(exp.minEffect ?? 0)}${unit}`,
    n: MIN_PER_GROUP,
  };
  const verdictTitle = t(`results.v.${v.kind}.title`);
  const verdictBody = t(`results.v.${v.kind}.body`, bodyVars);

  const sens = p.adherentOnly;
  const sensJudge = judge(sens, p.metric, exp.minEffect, exp.expectedDirection);
  const sensApplicable = sens.a.n >= MIN_PER_GROUP && sens.b.n >= MIN_PER_GROUP && (sens.a.n + sens.b.n) < (p.all.a.n + p.all.b.n);

  const saveNote = async () => {
    await updateExperimentFields(exp.id, { conclusionNote: note.trim() });
    toast(t('results.conclusionSaved'));
  };

  const exportCard = async () => {
    setExporting(true);
    try {
      const blob = await renderResultCard(exp, p, {
        verdictTitle,
        verdictBody,
        footer: t('results.card.footer'),
        days: t('results.card.days', { n: analysis.filledDays }),
        meanA: t('results.meanA'),
        meanB: t('results.meanB'),
        diff: `${t('results.diff')} : ${signed(p.all.diff, unit)}  ·  IC 95 % [${fmt(p.all.ci[0])}, ${fmt(p.all.ci[1])}]`,
      });
      downloadBlob(blob, `cobaye-${slug(exp.title)}.png`);
      toast(t('results.shared'));
    } finally {
      setExporting(false);
    }
  };

  const exportCsv = () => {
    downloadBlob(new Blob([entriesToCsv(exp, entries)], { type: 'text/csv' }), `cobaye-${slug(exp.title)}.csv`);
  };

  return (
    <div className="fade-in stack-lg">
      <div>
        <Link to={`/experiments/${exp.id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: -12 }}>
          <IconArrowLeft /> {t('detail.calendar')}
        </Link>
        <header className="page-head" style={{ marginTop: 'var(--space-2)' }}>
          <div className="row wrap" style={{ gap: 8, marginBottom: 6 }}>
            <span className="chip chip-ok">{t('results.title')}</span>
            {exp.id === DEMO_ID && <span className="chip chip-outline">{t('demo.badge')}</span>}
            {peekedLabel && <span className="chip chip-warn">{t('results.peekedBadge')}</span>}
          </div>
          <h1>{exp.title}</h1>
          <p className="sub">{exp.question}</p>
        </header>
      </div>

      <section className={`verdict ${v.kind}`}>
        <p className="eyebrow" style={{ marginBottom: 6 }}>
          {t('results.verdict')}
          {v.strength !== 'none' && ` · ${t(`results.strength.${v.strength}`)}`}
        </p>
        <h2>{verdictTitle}</h2>
        <p className="ink-2" style={{ marginTop: 'var(--space-3)' }}>
          {verdictBody}
        </p>
        {(v.favourable !== null || v.matchesExpectation !== null) && (
          <div className="row wrap" style={{ marginTop: 'var(--space-3)', gap: 8 }}>
            {v.favourable !== null && <span className={`chip ${v.favourable ? 'chip-ok' : 'chip-warn'}`}>{v.favourable ? t('results.favourable') : t('results.unfavourable')}</span>}
            {v.matchesExpectation !== null && <span className="chip chip-outline">{v.matchesExpectation ? t('results.matchesYes') : t('results.matchesNo')}</span>}
          </div>
        )}
        {peekedLabel && (
          <p className="xs muted" style={{ marginTop: 'var(--space-3)' }}>
            {peekedLabel}
          </p>
        )}
      </section>

      <MetricSection analysis={p} exp={exp} title={t('results.primary')} />

      {sensApplicable && (
        <section className="card stack-sm">
          <h3>{t('results.sensitivity')}</h3>
          <p className="small ink-2">
            {t('results.sensitivityBody', { n: sens.a.n + sens.b.n, diff: signed(sens.diff, unit), ci: `[${fmt(sens.ci[0])}, ${fmt(sens.ci[1])}]` })}{' '}
            <strong>{sensJudge.kind === v.kind ? t('results.sensitivitySame') : t('results.sensitivityDiffers')}</strong>
          </p>
        </section>
      )}
      {!sensApplicable && analysis.adherenceRate !== null && analysis.adherenceRate < 1 && sens.a.n + sens.b.n < p.all.a.n + p.all.b.n && (
        <section className="card stack-sm">
          <h3>{t('results.sensitivity')}</h3>
          <p className="small ink-2">{t('results.sensitivityNA')}</p>
        </section>
      )}

      {analysis.secondary.length > 0 && (
        <>
          <h2 className="section-title">{t('results.secondary')}</h2>
          {analysis.secondary.map((s) => (
            <MetricSection key={s.metric.id} analysis={s} exp={exp} title={s.metric.name} compact />
          ))}
        </>
      )}

      <section className="card stack">
        <h3>{t('results.conclusion')}</h3>
        <textarea className="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('results.conclusionPh')} />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={saveNote} disabled={note.trim() === exp.conclusionNote}>
            {t('common.save')}
          </Button>
        </div>
      </section>

      <section className="card stack">
        <div className="row wrap">
          <Button onClick={exportCard} disabled={exporting}>
            <IconShare /> {t('results.share')}
          </Button>
          <Button variant="secondary" onClick={exportCsv}>
            <IconDownload /> {t('results.csv')}
          </Button>
        </div>
        <p className="xs muted">{t('results.shareHelp')}</p>
        <details className="collapsible">
          <summary>{t('results.table')}</summary>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('results.table.date')}</th>
                  <th>{t('results.table.cond')}</th>
                  <th>{t('results.table.adhered')}</th>
                  {exp.metrics.map((m) => (
                    <th key={m.id}>{m.name}</th>
                  ))}
                  <th>{t('results.table.note')}</th>
                </tr>
              </thead>
              <tbody>
                <TableRows exp={exp} />
              </tbody>
            </table>
          </div>
        </details>
        <Link to="/method" className="small ink-2">
          {t('results.howComputed')} →
        </Link>
      </section>
    </div>
  );
}

function TableRows({ exp }: { exp: Experiment }) {
  const entries = useEntries(exp.id) ?? [];
  const { t, formatDate } = useI18n();
  return (
    <>
      {entries.map((e) => (
        <tr key={e.id}>
          <td className="num">{e.dayIndex + 1}</td>
          <td>{formatDate(e.date)}</td>
          <td>
            <span className={`chip chip-${e.condition.toLowerCase()}`}>{e.condition}</span>
          </td>
          <td>{e.adhered === null ? '—' : e.adhered ? t('common.yes') : t('common.no')}</td>
          {exp.metrics.map((m) => (
            <td key={m.id} className="num">
              {e.values[m.id] ?? '—'}
            </td>
          ))}
          <td className="small ink-2">{e.note}</td>
        </tr>
      ))}
    </>
  );
}

function MetricSection({ analysis, exp, title, compact }: { analysis: MetricAnalysis; exp: Experiment; title: string; compact?: boolean }) {
  const { t } = useI18n();
  const unit = unitFor(analysis);
  const c = analysis.all;
  return (
    <section className="card stack">
      <div className="row-between">
        <h3>{title}</h3>
        {compact && <span className="xs muted">{t(`results.v.${analysis.verdict.kind}.title`)}</span>}
      </div>
      <div className="stat-grid">
        <div className="stat">
          <div className="lbl">{t('results.meanA')}</div>
          <div className="val a">
            {fmt(c.a.mean)}
            <span className="xs muted">{unit}</span>
          </div>
          <div className="sub num">n = {c.a.n}</div>
        </div>
        <div className="stat">
          <div className="lbl">{t('results.meanB')}</div>
          <div className="val b">
            {fmt(c.b.mean)}
            <span className="xs muted">{unit}</span>
          </div>
          <div className="sub num">n = {c.b.n}</div>
        </div>
        <div className="stat">
          <div className="lbl">{t('results.diff')}</div>
          <div className="val">{signed(c.diff, unit)}</div>
          <div className="sub num">
            IC 95 % [{fmt(c.ci[0])}, {fmt(c.ci[1])}]
          </div>
        </div>
        <div className="stat">
          <div className="lbl">{t('results.p')}</div>
          <div className="val">{Number.isFinite(c.pValue) ? (c.pValue < 0.001 ? '< 0.001' : fmt(c.pValue, 3)) : '—'}</div>
          <div className="sub num">
            {t('results.d')} = {fmt(c.cohenD, 2)}
          </div>
        </div>
      </div>
      {!compact && (
        <>
          <h4 className="eyebrow" style={{ marginTop: 'var(--space-2)' }}>
            {t('results.chart.dots')}
          </h4>
          <DotPlot analysis={analysis} labelA={exp.conditionA.label} labelB={exp.conditionB.label} />
          <h4 className="eyebrow">{t('results.chart.series')}</h4>
          <TimeSeries analysis={analysis} labelA={exp.conditionA.label} labelB={exp.conditionB.label} />
        </>
      )}
      {compact && (
        <details className="collapsible">
          <summary>{t('results.chart.dots')}</summary>
          <DotPlot analysis={analysis} labelA={exp.conditionA.label} labelB={exp.conditionB.label} />
        </details>
      )}
    </section>
  );
}

function unitFor(a: MetricAnalysis): string {
  if (a.metric.kind === 'duration') return ' min';
  if (a.metric.kind === 'number' && a.metric.unit) return ` ${a.metric.unit}`;
  return '';
}

function signed(x: number, unit: string): string {
  if (!Number.isFinite(x)) return '—';
  const s = fmt(x, 1);
  return `${x > 0 ? '+' : ''}${s}${unit}`;
}

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}
