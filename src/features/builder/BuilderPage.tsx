import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { findTemplate, type Template } from '@/domain/templates';
import type { Design, ExpectedDirection, Experiment, MetricDef, MetricKind } from '@/domain/types';
import { SCHEMA_VERSION } from '@/domain/types';
import { randomSeed, uid } from '@/domain/random';
import { addDays, isValidDateKey } from '@/domain/dates';
import { buildAssignments } from '@/domain/schedule';
import { saveExperiment, startExperiment } from '@/data/repo';
import { useExperiment, useToday } from '@/app/hooks';
import { Button } from '@/ui/Button';
import { Choice, Field, Segmented, Switch } from '@/ui/Field';
import { CondMark } from '@/ui/Bits';
import { useToast } from '@/ui/Toast';
import { IconArrowLeft, IconArrowRight, IconLock, IconPlus } from '@/ui/Icons';

interface Draft {
  title: string;
  question: string;
  hypothesis: string;
  conditionA: { label: string; instructions: string };
  conditionB: { label: string; instructions: string };
  metrics: MetricDef[];
  primaryMetricId: string;
  design: Design;
  blockSize: number;
  durationDays: number;
  startDate: string;
  checkInTime: string;
  minEffect: number | null;
  expectedDirection: ExpectedDirection;
  sealed: boolean;
  templateId: string | null;
}

const newMetric = (): MetricDef => ({ id: uid().slice(0, 8), name: '', kind: 'scale', higherIsBetter: true });

function emptyDraft(today: string): Draft {
  const m = newMetric();
  return {
    title: '',
    question: '',
    hypothesis: '',
    conditionA: { label: '', instructions: '' },
    conditionB: { label: '', instructions: '' },
    metrics: [m],
    primaryMetricId: m.id,
    design: 'blocked-random',
    blockSize: 2,
    durationDays: 14,
    startDate: addDays(today, 1),
    checkInTime: '20:30',
    minEffect: 1,
    expectedDirection: 'unsure',
    sealed: true,
    templateId: null,
  };
}

function fromTemplate(tp: Template, today: string, tx: (o: { fr: string; en: string }) => string): Draft {
  return {
    title: tx(tp.title),
    question: tx(tp.question),
    hypothesis: tx(tp.hypothesis),
    conditionA: { label: tx(tp.conditionA.label), instructions: tx(tp.conditionA.instructions) },
    conditionB: { label: tx(tp.conditionB.label), instructions: tx(tp.conditionB.instructions) },
    metrics: tp.metrics.map((m) => ({ id: m.id, name: tx(m.name), kind: m.kind, unit: m.unit ? tx(m.unit) : undefined, higherIsBetter: m.higherIsBetter })),
    primaryMetricId: tp.primaryMetricId,
    design: tp.design,
    blockSize: tp.blockSize,
    durationDays: tp.durationDays,
    startDate: addDays(today, 1),
    checkInTime: tp.checkInTime,
    minEffect: tp.minEffect,
    expectedDirection: tp.expectedDirection,
    sealed: true,
    templateId: tp.id,
  };
}

function fromExperiment(e: Experiment): Draft {
  return {
    title: e.title,
    question: e.question,
    hypothesis: e.hypothesis,
    conditionA: { ...e.conditionA },
    conditionB: { ...e.conditionB },
    metrics: e.metrics.map((m) => ({ ...m })),
    primaryMetricId: e.primaryMetricId,
    design: e.design,
    blockSize: e.blockSize,
    durationDays: e.durationDays,
    startDate: e.startDate,
    checkInTime: e.checkInTime,
    minEffect: e.minEffect,
    expectedDirection: e.expectedDirection,
    sealed: e.sealed,
    templateId: e.templateId,
  };
}

const STEPS = ['question', 'conditions', 'metrics', 'design', 'review'] as const;
type Step = (typeof STEPS)[number];

export default function BuilderPage() {
  const { t, tx, formatDate } = useI18n();
  const nav = useNavigate();
  const { toast } = useToast();
  const today = useToday();
  const [params] = useSearchParams();
  const { id } = useParams();
  const existing = useExperiment(id);
  const templateId = params.get('template');

  const [draft, setDraft] = useState<Draft>(() => {
    const tp = templateId ? findTemplate(templateId) : undefined;
    return tp ? fromTemplate(tp, today, tx) : emptyDraft(today);
  });
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (existing && existing.id !== loadedId) {
      setDraft(fromExperiment(existing));
      setLoadedId(existing.id);
    }
  }, [existing, loadedId]);

  const editingLocked = !!existing && existing.status !== 'draft';
  const current: Step = STEPS[step] ?? 'question';
  const primary = useMemo(() => draft.metrics.find((m) => m.id === draft.primaryMetricId) ?? draft.metrics[0], [draft]);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const validate = (s: Step): boolean => {
    const e: Record<string, string> = {};
    if (s === 'question') {
      if (!draft.title.trim()) e.title = t('builder.err.title');
      if (!draft.question.trim()) e.question = t('builder.err.question');
    }
    if (s === 'conditions') {
      if (!draft.conditionA.label.trim() || !draft.conditionB.label.trim()) e.conditions = t('builder.err.conditions');
    }
    if (s === 'metrics') {
      if (draft.metrics.length === 0) e.metrics = t('builder.err.metricsCount');
      else if (draft.metrics.some((m) => !m.name.trim())) e.metrics = t('builder.err.metrics');
    }
    if (s === 'design') {
      if (!(draft.durationDays >= 6 && draft.durationDays <= 90)) e.duration = t('builder.err.duration');
      if (!isValidDateKey(draft.startDate)) e.start = t('builder.err.start');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate(current)) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0 });
  };
  const prev = () => {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
  };

  const toExperiment = (status: 'draft' | 'running'): Experiment => {
    const now = new Date().toISOString();
    const seed = existing?.seed ?? randomSeed();
    const base: Experiment = {
      id: existing?.id ?? uid(),
      schemaVersion: SCHEMA_VERSION,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      startDate: draft.startDate,
      durationDays: draft.durationDays,
      status,
      title: draft.title.trim(),
      question: draft.question.trim(),
      hypothesis: draft.hypothesis.trim(),
      conditionA: { label: draft.conditionA.label.trim(), instructions: draft.conditionA.instructions.trim() },
      conditionB: { label: draft.conditionB.label.trim(), instructions: draft.conditionB.instructions.trim() },
      metrics: draft.metrics.map((m) => ({ ...m, name: m.name.trim(), unit: m.unit?.trim() || undefined })),
      primaryMetricId: primary?.id ?? draft.metrics[0]?.id ?? '',
      design: draft.design,
      blockSize: draft.blockSize,
      seed,
      assignments: buildAssignments(draft.design, draft.durationDays, draft.blockSize, seed),
      minEffect: draft.minEffect !== null && draft.minEffect > 0 ? draft.minEffect : null,
      expectedDirection: draft.expectedDirection,
      checkInTime: draft.checkInTime,
      sealed: draft.sealed,
      peekedAt: existing?.peekedAt ?? null,
      lockedAt: existing?.lockedAt ?? null,
      completedAt: null,
      templateId: draft.templateId,
      conclusionNote: existing?.conclusionNote ?? '',
    };
    return base;
  };

  const saveDraft = async () => {
    if (!validate('question')) {
      setStep(0);
      return;
    }
    setBusy(true);
    try {
      const exp = toExperiment('draft');
      await saveExperiment(exp);
      toast(t('builder.draftSaved'));
      nav(`/experiments/${exp.id}`, { replace: true });
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    for (const s of STEPS) {
      if (!validate(s)) {
        setStep(STEPS.indexOf(s));
        return;
      }
    }
    setBusy(true);
    try {
      if (editingLocked && existing) {
        // Only cosmetic fields may change once running.
        await saveExperiment({ ...existing, title: draft.title.trim(), question: draft.question.trim(), hypothesis: draft.hypothesis.trim(), checkInTime: draft.checkInTime });
        nav(`/experiments/${existing.id}`, { replace: true });
        return;
      }
      const exp = toExperiment('draft');
      await saveExperiment(exp);
      await startExperiment(exp.id, draft.startDate);
      toast(t('builder.started'));
      nav('/', { replace: true });
    } finally {
      setBusy(false);
    }
  };

  const updateMetric = (mid: string, p: Partial<MetricDef>) => patch({ metrics: draft.metrics.map((m) => (m.id === mid ? { ...m, ...p } : m)) });
  const removeMetric = (mid: string) => {
    const metrics = draft.metrics.filter((m) => m.id !== mid);
    patch({ metrics, primaryMetricId: draft.primaryMetricId === mid ? (metrics[0]?.id ?? '') : draft.primaryMetricId });
  };

  const kindOptions: Array<{ value: MetricKind; label: string }> = [
    { value: 'scale', label: t('builder.m.kind.scale') },
    { value: 'number', label: t('builder.m.kind.number') },
    { value: 'duration', label: t('builder.m.kind.duration') },
    { value: 'boolean', label: t('builder.m.kind.boolean') },
  ];

  return (
    <div className="fade-in">
      <header className="page-head">
        <p className="eyebrow">{t(`builder.step.${current}`)}</p>
        <h1>{existing ? t('builder.editTitle') : t('builder.title')}</h1>
      </header>
      <div className="steps" aria-hidden>
        {STEPS.map((s, i) => (
          <span key={s} className={i < step ? 'done' : i === step ? 'current' : ''} />
        ))}
      </div>

      {editingLocked && (
        <div className="banner" style={{ marginBottom: 'var(--space-4)' }}>
          <span className="row" style={{ gap: 8 }}>
            <IconLock width={16} height={16} /> {t('builder.r.lock')}
          </span>
        </div>
      )}

      <div className="card stack" key={current}>
        {current === 'question' && (
          <>
            <Field label={t('builder.q.title')} htmlFor="title" error={errors.title}>
              <input id="title" className="input" value={draft.title} onChange={(e) => patch({ title: e.target.value })} placeholder={t('builder.q.titlePh')} aria-invalid={!!errors.title} />
            </Field>
            <Field label={t('builder.q.question')} htmlFor="question" error={errors.question}>
              <textarea id="question" className="textarea" rows={2} value={draft.question} onChange={(e) => patch({ question: e.target.value })} placeholder={t('builder.q.questionPh')} aria-invalid={!!errors.question} />
            </Field>
            <Field label={t('builder.q.hypothesis')} htmlFor="hyp" optional={t('common.optional')}>
              <textarea id="hyp" className="textarea" rows={2} value={draft.hypothesis} onChange={(e) => patch({ hypothesis: e.target.value })} placeholder={t('builder.q.hypothesisPh')} />
            </Field>
          </>
        )}

        {current === 'conditions' && (
          <>
            <p className="small ink-2">{t('builder.c.intro')}</p>
            {errors.conditions && (
              <p className="small" style={{ color: 'var(--danger)', fontWeight: 500 }} role="alert">
                {errors.conditions}
              </p>
            )}
            {(['A', 'B'] as const).map((c) => {
              const val = c === 'A' ? draft.conditionA : draft.conditionB;
              const set = (p: Partial<typeof val>) => patch(c === 'A' ? { conditionA: { ...val, ...p } } : { conditionB: { ...val, ...p } });
              return (
                <div key={c} className={`cond-block ${c} stack-sm`}>
                  <div className="row">
                    <CondMark c={c} />
                    <label htmlFor={`label-${c}`} className="field-label">
                      {t(c === 'A' ? 'builder.c.labelA' : 'builder.c.labelB')}
                    </label>
                  </div>
                  <input id={`label-${c}`} className="input" value={val.label} disabled={editingLocked} onChange={(e) => set({ label: e.target.value })} placeholder={t(c === 'A' ? 'builder.c.labelAPh' : 'builder.c.labelBPh')} />
                  <label htmlFor={`instr-${c}`} className="field-label">
                    {t('builder.c.instr')}
                  </label>
                  <textarea id={`instr-${c}`} className="textarea" rows={2} value={val.instructions} disabled={editingLocked} onChange={(e) => set({ instructions: e.target.value })} placeholder={t('builder.c.instrPh')} />
                </div>
              );
            })}
          </>
        )}

        {current === 'metrics' && (
          <>
            <p className="small ink-2">{t('builder.m.intro')}</p>
            {errors.metrics && (
              <p className="small" style={{ color: 'var(--danger)', fontWeight: 500 }} role="alert">
                {errors.metrics}
              </p>
            )}
            {draft.metrics.map((m, i) => {
              const isPrimary = m.id === (primary?.id ?? '');
              return (
                <div key={m.id} className={`metric-card stack-sm ${isPrimary ? 'primary' : ''}`}>
                  <div className="row-between">
                    <span className="eyebrow">{isPrimary ? t('builder.m.primary') : `${t('builder.step.metrics')} ${i + 1}`}</span>
                    <span className="row" style={{ gap: 4 }}>
                      {!isPrimary && !editingLocked && (
                        <Button size="sm" variant="ghost" onClick={() => patch({ primaryMetricId: m.id })}>
                          {t('builder.m.makePrimary')}
                        </Button>
                      )}
                      {draft.metrics.length > 1 && !editingLocked && (
                        <Button size="sm" variant="ghost" onClick={() => removeMetric(m.id)}>
                          {t('builder.m.remove')}
                        </Button>
                      )}
                    </span>
                  </div>
                  <Field label={t('builder.m.name')} htmlFor={`mn-${m.id}`}>
                    <input id={`mn-${m.id}`} className="input" value={m.name} disabled={editingLocked} onChange={(e) => updateMetric(m.id, { name: e.target.value })} placeholder={t('builder.m.namePh')} />
                  </Field>
                  <Field label={t('builder.m.kind')}>
                    <Segmented<MetricKind> value={m.kind} onChange={(kind) => !editingLocked && updateMetric(m.id, { kind })} options={kindOptions} />
                  </Field>
                  {m.kind === 'number' && (
                    <Field label={t('builder.m.unit')} htmlFor={`mu-${m.id}`} optional={t('common.optional')}>
                      <input id={`mu-${m.id}`} className="input" value={m.unit ?? ''} disabled={editingLocked} onChange={(e) => updateMetric(m.id, { unit: e.target.value })} placeholder={t('builder.m.unitPh')} />
                    </Field>
                  )}
                  <Segmented<'hi' | 'lo'>
                    value={m.higherIsBetter ? 'hi' : 'lo'}
                    onChange={(v) => !editingLocked && updateMetric(m.id, { higherIsBetter: v === 'hi' })}
                    options={[
                      { value: 'hi', label: t('builder.m.higher') },
                      { value: 'lo', label: t('builder.m.lower') },
                    ]}
                    block
                  />
                </div>
              );
            })}
            {draft.metrics.length < 3 && !editingLocked && (
              <Button variant="secondary" onClick={() => patch({ metrics: [...draft.metrics, newMetric()] })}>
                <IconPlus /> {t('builder.m.add')}
              </Button>
            )}
          </>
        )}

        {current === 'design' && (
          <>
            <Field label={t('builder.d.design')}>
              <div className="stack-sm">
                <Choice selected={draft.design === 'blocked-random'} title={t('builder.d.blocked')} help={t('builder.d.blockedHelp')} onSelect={() => !editingLocked && patch({ design: 'blocked-random' })} />
                <Choice selected={draft.design === 'phases'} title={t('builder.d.phases')} help={t('builder.d.phasesHelp')} onSelect={() => !editingLocked && patch({ design: 'phases' })} />
              </div>
            </Field>
            {draft.design === 'blocked-random' && (
              <Field label={t('builder.d.blockSize')} help={t('builder.d.blockSizeHelp')}>
                <Segmented<'2' | '4'>
                  value={String(draft.blockSize) as '2' | '4'}
                  onChange={(v) => !editingLocked && patch({ blockSize: Number(v) })}
                  options={[
                    { value: '2', label: '2' },
                    { value: '4', label: '4' },
                  ]}
                />
              </Field>
            )}
            <Field label={t('builder.d.duration')} help={t('builder.d.durationHelp')} error={errors.duration}>
              <div className="row wrap">
                <Segmented<string>
                  value={[10, 14, 21, 28].includes(draft.durationDays) ? String(draft.durationDays) : 'custom'}
                  onChange={(v) => v !== 'custom' && !editingLocked && patch({ durationDays: Number(v) })}
                  options={[10, 14, 21, 28].map((n) => ({ value: String(n), label: t('common.daysCount', { n }) }))}
                />
                <div className="input-inline">
                  <input className="input" type="number" min={6} max={90} value={draft.durationDays} disabled={editingLocked} onChange={(e) => patch({ durationDays: Number(e.target.value) })} aria-label={t('builder.d.duration')} />
                  <span className="small muted">{t('common.days')}</span>
                </div>
              </div>
            </Field>
            <Field label={t('builder.d.start')} htmlFor="start" error={errors.start}>
              <div className="row wrap">
                <Segmented<string>
                  value={draft.startDate === today ? 'today' : draft.startDate === addDays(today, 1) ? 'tomorrow' : 'other'}
                  onChange={(v) => !editingLocked && patch({ startDate: v === 'today' ? today : addDays(today, 1) })}
                  options={[
                    { value: 'today', label: t('builder.d.startToday') },
                    { value: 'tomorrow', label: t('builder.d.startTomorrow') },
                  ]}
                />
                <input id="start" className="input" type="date" value={draft.startDate} min={editingLocked ? undefined : today} disabled={editingLocked} onChange={(e) => patch({ startDate: e.target.value })} style={{ width: 170 }} />
              </div>
            </Field>
            <Field label={t('builder.d.checkin')} htmlFor="cit" help={t('builder.d.checkinHelp')}>
              <input id="cit" className="input" type="time" value={draft.checkInTime} onChange={(e) => patch({ checkInTime: e.target.value })} style={{ width: 140 }} />
            </Field>
          </>
        )}

        {current === 'review' && (
          <>
            <p className="small ink-2">{t('builder.r.intro')}</p>
            <Field label={t('builder.r.direction')}>
              <div className="stack-sm">
                {(['B_higher', 'B_lower', 'unsure'] as const).map((d) => (
                  <Choice key={d} selected={draft.expectedDirection === d} title={t(`builder.r.dir.${d}`)} onSelect={() => !editingLocked && patch({ expectedDirection: d })} />
                ))}
              </div>
            </Field>
            <Field label={t('builder.r.minEffect')} htmlFor="minEffect" help={t('builder.r.minEffectHelp', { metric: primary?.name ?? '' })}>
              <div className="input-inline">
                <input
                  id="minEffect"
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={draft.minEffect ?? ''}
                  disabled={editingLocked}
                  onChange={(e) => patch({ minEffect: e.target.value === '' ? null : Number(e.target.value) })}
                />
                <span className="small muted">{primary?.kind === 'duration' ? t('checkin.minutes') : primary?.kind === 'scale' ? '/10' : primary?.unit ?? ''}</span>
              </div>
            </Field>
            <Switch checked={draft.sealed} onChange={(v) => !editingLocked && patch({ sealed: v })} label={t('builder.r.sealed')} />
            <p className="xs muted">{t('builder.r.sealedHelp')}</p>

            <hr className="divider" />
            <h4>{t('builder.r.summary')}</h4>
            <dl className="kv">
              <dt>{t('builder.q.title')}</dt>
              <dd>{draft.title}</dd>
              <dt>{t('common.conditionA')}</dt>
              <dd>{draft.conditionA.label}</dd>
              <dt>{t('common.conditionB')}</dt>
              <dd>{draft.conditionB.label}</dd>
              <dt>{t('builder.m.primary')}</dt>
              <dd>{primary?.name}</dd>
              <dt>{t('builder.d.design')}</dt>
              <dd>{draft.design === 'phases' ? t('detail.designPhases') : t('detail.designBlocked', { n: draft.blockSize })}</dd>
              <dt>{t('builder.d.duration')}</dt>
              <dd>{t('common.daysCount', { n: draft.durationDays })}</dd>
              <dt>{t('builder.d.start')}</dt>
              <dd>{isValidDateKey(draft.startDate) ? formatDate(draft.startDate, { weekday: 'long', day: 'numeric', month: 'long' }) : '—'}</dd>
            </dl>
            {!editingLocked && (
              <p className="xs muted row" style={{ gap: 6 }}>
                <IconLock width={14} height={14} /> {t('builder.r.lock')}
              </p>
            )}
          </>
        )}
      </div>

      <div className="builder-foot">
        <Button variant="ghost" onClick={step === 0 ? () => nav(-1) : prev}>
          <IconArrowLeft /> {step === 0 ? t('common.cancel') : t('common.previous')}
        </Button>
        <span className="row">
          {!editingLocked && step < STEPS.length - 1 && (
            <Button variant="ghost" onClick={saveDraft} disabled={busy}>
              {t('builder.r.saveDraft')}
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>
              {t('common.next')} <IconArrowRight />
            </Button>
          ) : (
            <Button onClick={start} disabled={busy} size="lg">
              {editingLocked ? t('common.save') : t('builder.r.startBtn')}
            </Button>
          )}
        </span>
      </div>
    </div>
  );
}
