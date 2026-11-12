import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useAllEntries, useExperiments } from '@/app/hooks';
import { analyzeExperiment } from '@/domain/analysis';
import { fmt } from '@/domain/stats';
import { EmptyState, PageHead } from '@/ui/Bits';
import { Button } from '@/ui/Button';
import { IconArrowRight } from '@/ui/Icons';
import { DEMO_ID } from '@/domain/demo';

export default function NotebookPage() {
  const { t, formatDate } = useI18n();
  const experiments = useExperiments();
  const entries = useAllEntries();

  const items = useMemo(() => {
    if (!experiments || !entries) return [];
    return experiments
      .filter((e) => e.status === 'completed')
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
      .map((exp) => {
        const own = entries.filter((en) => en.experimentId === exp.id);
        return { exp, analysis: analyzeExperiment(exp, own), days: own.length };
      });
  }, [experiments, entries]);

  if (!experiments || !entries) return null;

  if (items.length === 0) {
    return (
      <EmptyState title={t('notebook.title')} body={t('notebook.empty')} mood="calm">
        <Button to="/library">
          {t('today.empty.cta')} <IconArrowRight />
        </Button>
      </EmptyState>
    );
  }

  const totalDays = items.reduce((s, i) => s + i.days, 0);
  const effects = items.filter((i) => i.analysis?.primary.verdict.kind === 'effect-meaningful').length;

  return (
    <div className="fade-in stack-lg">
      <PageHead title={t('notebook.title')} sub={t('notebook.subtitle')} />
      <div className="nb-stats">
        <div className="card card-sunken nb-stat">
          <div className="n">{items.length}</div>
          <div className="l">{t('notebook.stats.experiments')}</div>
        </div>
        <div className="card card-sunken nb-stat">
          <div className="n">{totalDays}</div>
          <div className="l">{t('notebook.stats.days')}</div>
        </div>
        <div className="card card-sunken nb-stat">
          <div className="n">{effects}</div>
          <div className="l">{t('notebook.stats.effects')}</div>
        </div>
      </div>
      <div className="list">
        {items.map(({ exp, analysis }) => {
          const v = analysis?.primary.verdict;
          const c = analysis?.primary.all;
          return (
            <article key={exp.id} className={`card nb-entry ${v?.kind ?? ''}`}>
              <div className="row-between" style={{ alignItems: 'flex-start' }}>
                <div className="grow">
                  <p className="xs muted">
                    {exp.completedAt ? formatDate(exp.completedAt.slice(0, 10), { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                    {exp.id === DEMO_ID && ` · ${t('demo.badge')}`}
                  </p>
                  <h3 style={{ marginTop: 4 }}>{exp.title}</h3>
                </div>
                {v && <span className={`chip ${v.kind === 'effect-meaningful' ? 'chip-ok' : v.kind === 'effect-small' ? 'chip-warn' : v.kind === 'no-meaningful-effect' ? 'chip-info' : ''}`}>{t(`results.v.${v.kind}.title`)}</span>}
              </div>
              {c && Number.isFinite(c.diff) && (
                <p className="small ink-2 num" style={{ marginTop: 8 }}>
                  {analysis?.primary.metric.name} : {fmt(c.a.mean)} → {fmt(c.b.mean)} ({c.diff > 0 ? '+' : ''}
                  {fmt(c.diff)})
                </p>
              )}
              <p className="quote" style={{ marginTop: 'var(--space-3)' }}>
                {exp.conclusionNote ? `« ${exp.conclusionNote} »` : <span className="muted" style={{ fontStyle: 'normal', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)' }}>{t('notebook.noConclusion')}</span>}
              </p>
              <div className="row" style={{ marginTop: 'var(--space-3)' }}>
                <Link to={`/experiments/${exp.id}/results`} className="btn btn-ghost btn-sm">
                  {exp.conclusionNote ? t('common.results') : t('notebook.addConclusion')} <IconArrowRight />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
