import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useAllEntries, useExperiments, useToday } from '@/app/hooks';
import type { Experiment } from '@/domain/types';
import { elapsedDays, hasEnded, hasStarted } from '@/domain/schedule';
import { EmptyState, PageHead, Progress } from '@/ui/Bits';
import { Button } from '@/ui/Button';
import { IconPlus } from '@/ui/Icons';
import { DEMO_ID } from '@/domain/demo';

export default function ExperimentsPage() {
  const { t } = useI18n();
  const experiments = useExperiments();
  const entries = useAllEntries();
  const today = useToday();
  if (!experiments || !entries) return null;

  if (experiments.length === 0) {
    return (
      <EmptyState title={t('exps.empty')} body={t('today.empty.body')}>
        <Button to="/library">
          <IconPlus /> {t('nav.new')}
        </Button>
      </EmptyState>
    );
  }

  const groups: Array<{ key: string; label: string; items: Experiment[] }> = [
    { key: 'running', label: t('exps.running'), items: experiments.filter((e) => e.status === 'running') },
    { key: 'draft', label: t('exps.drafts'), items: experiments.filter((e) => e.status === 'draft') },
    { key: 'completed', label: t('exps.completed'), items: experiments.filter((e) => e.status === 'completed') },
    { key: 'abandoned', label: t('exps.abandoned'), items: experiments.filter((e) => e.status === 'abandoned') },
  ];

  return (
    <div className="fade-in">
      <PageHead
        title={t('exps.title')}
        action={
          <Button to="/library" size="sm" variant="secondary">
            <IconPlus /> {t('nav.new')}
          </Button>
        }
      />
      {groups
        .filter((g) => g.items.length)
        .map((g) => (
          <section key={g.key}>
            <h2 className="section-title">{g.label}</h2>
            <div className="list">
              {g.items.map((exp) => {
                const n = entries.filter((e) => e.experimentId === exp.id).length;
                const status = statusOf(exp, today, t);
                const to = exp.status === 'completed' ? `/experiments/${exp.id}/results` : `/experiments/${exp.id}`;
                return (
                  <Link key={exp.id} to={to} className="card card-link card-pad-sm">
                    <div className="card-head" style={{ marginBottom: 8 }}>
                      <div className="grow">
                        <h3 style={{ fontSize: 'var(--fs-lg)' }}>{exp.title}</h3>
                        <p className="xs muted" style={{ marginTop: 2 }}>
                          {exp.question}
                        </p>
                      </div>
                      <span className="row" style={{ gap: 6 }}>
                        {exp.id === DEMO_ID && <span className="chip chip-outline">{t('demo.badge')}</span>}
                        <span className={`chip ${status.cls}`}>{status.label}</span>
                      </span>
                    </div>
                    {exp.status === 'running' && (
                      <div className="row">
                        <div className="grow">
                          <Progress value={elapsedDays(exp, today)} max={exp.durationDays} />
                        </div>
                        <span className="xs muted num">
                          {n}/{exp.durationDays}
                        </span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
    </div>
  );
}

function statusOf(exp: Experiment, today: string, t: ReturnType<typeof useI18n>['t']): { label: string; cls: string } {
  if (exp.status === 'draft') return { label: t('exps.status.draft'), cls: '' };
  if (exp.status === 'abandoned') return { label: t('exps.status.abandoned'), cls: 'chip-outline' };
  if (exp.status === 'completed') return { label: t('exps.status.completed'), cls: 'chip-ok' };
  if (!hasStarted(exp, today)) return { label: t('exps.status.scheduled'), cls: 'chip-info' };
  if (hasEnded(exp, today)) return { label: t('exps.status.sealed'), cls: 'chip-warn' };
  return { label: t('exps.status.running'), cls: 'chip-b' };
}
