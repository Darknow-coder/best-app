import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import type { Entry, Experiment } from '@/domain/types';
import { conditionForDay, dateForDay } from '@/domain/schedule';
import { upsertEntry } from '@/data/repo';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { Field, ScaleInput, Segmented } from '@/ui/Field';
import { CondMark } from '@/ui/Bits';
import { useToast } from '@/ui/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  experiment: Experiment;
  dayIndex: number;
  existing: Entry | undefined;
  today: string;
}

export function CheckInSheet({ open, onClose, experiment: exp, dayIndex, existing, today }: Props) {
  const { t, formatDate } = useI18n();
  const { toast } = useToast();
  const cond = conditionForDay(exp, dayIndex);
  const condDef = cond === 'A' ? exp.conditionA : exp.conditionB;
  const date = dateForDay(exp, dayIndex);
  const isLate = date < today;

  const [values, setValues] = useState<Record<string, number | null>>({});
  const [adhered, setAdhered] = useState<boolean | null>(null);
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const init: Record<string, number | null> = {};
    for (const m of exp.metrics) init[m.id] = existing?.values[m.id] ?? null;
    setValues(init);
    setAdhered(existing?.adhered ?? null);
    setNote(existing?.note ?? '');
    setErr(null);
  }, [open, existing, exp.metrics]);

  const hasValue = useMemo(() => Object.values(values).some((v) => typeof v === 'number'), [values]);

  const save = async () => {
    if (!hasValue) {
      setErr(t('checkin.valueMissing'));
      return;
    }
    setSaving(true);
    try {
      await upsertEntry({
        experimentId: exp.id,
        dayIndex,
        date,
        condition: cond,
        adhered,
        values,
        note: note.trim(),
        enteredLate: isLate && !existing,
      });
      toast(t('checkin.saved'));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={`${t('checkin.title')} · ${formatDate(date)}`}>
      <div className="stack">
        <div className={`cond-block ${cond}`}>
          <div className="row">
            <CondMark c={cond} />
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{condDef.label}</div>
              {condDef.instructions && <div className="small ink-2">{condDef.instructions}</div>}
            </div>
          </div>
        </div>
        {isLate && (
          <div className="banner warn">
            <span>
              <strong>{t('checkin.late')}</strong> · {t('checkin.lateHelp')}
            </span>
          </div>
        )}

        <Field label={t('checkin.adhered')} help={t('checkin.adheredHelp')}>
          <Segmented<'yes' | 'no'>
            value={adhered === true ? 'yes' : adhered === false ? 'no' : ('' as 'yes')}
            onChange={(v) => setAdhered(v === 'yes')}
            options={[
              { value: 'yes', label: t('common.yes') },
              { value: 'no', label: t('common.no') },
            ]}
            block
          />
        </Field>

        {exp.metrics.map((m) => (
          <Field key={m.id} label={m.name} htmlFor={`m-${m.id}`}>
            <MetricInput
              id={`m-${m.id}`}
              kind={m.kind}
              unit={m.unit}
              min={m.min}
              max={m.max}
              value={values[m.id] ?? null}
              onChange={(v) => {
                setErr(null);
                setValues((xs) => ({ ...xs, [m.id]: v }));
              }}
            />
          </Field>
        ))}

        <Field label={t('checkin.note')} htmlFor="note" optional={t('common.optional')}>
          <textarea id="note" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('checkin.notePlaceholder')} rows={2} />
        </Field>

        {err && (
          <p className="small" style={{ color: 'var(--danger)', fontWeight: 500 }} role="alert">
            {err}
          </p>
        )}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={save} disabled={saving}>
            {t('checkin.save')}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function MetricInput({
  id,
  kind,
  unit,
  min,
  max,
  value,
  onChange,
}: {
  id: string;
  kind: Experiment['metrics'][number]['kind'];
  unit?: string;
  min?: number;
  max?: number;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const { t } = useI18n();
  if (kind === 'scale') {
    return <ScaleInput name={id} value={value} onChange={onChange} min={min ?? 1} max={max ?? 10} lowLabel={t('checkin.scaleLow')} highLabel={t('checkin.scaleHigh')} />;
  }
  if (kind === 'boolean') {
    return (
      <Segmented<'1' | '0'>
        value={value === 1 ? '1' : value === 0 ? '0' : ('' as '1')}
        onChange={(v) => onChange(v === '1' ? 1 : 0)}
        options={[
          { value: '1', label: t('common.yes') },
          { value: '0', label: t('common.no') },
        ]}
        block
      />
    );
  }
  return (
    <div className="input-inline">
      <input
        id={id}
        className="input"
        type="number"
        inputMode="decimal"
        step={kind === 'duration' ? 1 : 'any'}
        min={min ?? (kind === 'duration' ? 0 : undefined)}
        max={max}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
      <span className="small muted">{kind === 'duration' ? t('checkin.minutes') : unit ?? ''}</span>
    </div>
  );
}
