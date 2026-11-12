import type { ReactNode } from 'react';

interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  help?: ReactNode;
  error?: string | null;
  children: ReactNode;
  optional?: string;
}

export function Field({ label, htmlFor, help, error, children, optional }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>
        {label}
        {optional && <span className="muted" style={{ fontWeight: 400 }}>{` · ${optional}`}</span>}
      </label>
      {children}
      {error ? <span className="error" role="alert">{error}</span> : help ? <span className="help">{help}</span> : null}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  block?: boolean;
  ariaLabel?: string;
}
export function Segmented<T extends string>({ value, options, onChange, block, ariaLabel }: SegmentedProps<T>) {
  return (
    <div
      className={`segmented ${block ? 'segmented-block' : ''}`}
      role="group"
      aria-label={ariaLabel}
      style={block ? { gridTemplateColumns: `repeat(${options.length}, 1fr)` } : undefined}
    >
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface ChoiceProps {
  selected: boolean;
  title: string;
  help?: string;
  onSelect: () => void;
}
export function Choice({ selected, title, help, onSelect }: ChoiceProps) {
  return (
    <button type="button" className="choice" aria-pressed={selected} onClick={onSelect}>
      <span className="radio-dot" />
      <span>
        <span className="choice-title">{title}</span>
        {help && <span className="choice-help" style={{ display: 'block' }}>{help}</span>}
      </span>
    </button>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)}>
      <span className="switch-track" />
      <span className="small" style={{ fontWeight: 500 }}>
        {label}
      </span>
    </button>
  );
}

export function ScaleInput({
  value,
  onChange,
  min = 1,
  max = 10,
  lowLabel,
  highLabel,
  name,
}: {
  value: number | null;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  lowLabel: string;
  highLabel: string;
  name: string;
}) {
  const vals = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div>
      <div className="scale" role="radiogroup" aria-label={name} style={{ gridTemplateColumns: `repeat(${vals.length}, 1fr)` }}>
        {vals.map((v) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} aria-pressed={value === v} onClick={() => onChange(v)}>
            {v}
          </button>
        ))}
      </div>
      <div className="scale-ends">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
