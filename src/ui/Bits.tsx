import type { ReactNode } from 'react';
import type { Condition } from '@/domain/types';
import { Mascot } from './Mascot';

export function CondMark({ c, lg }: { c: Condition; lg?: boolean }) {
  return (
    <span className={`cond-mark ${c} ${lg ? 'lg' : ''}`} aria-label={`Condition ${c}`}>
      {c}
    </span>
  );
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ title, body, children, mood = 'curious' }: { title: string; body?: string; children?: ReactNode; mood?: 'calm' | 'curious' | 'happy' }) {
  return (
    <div className="empty fade-in">
      <Mascot className="mascot" mood={mood} />
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      <div className="row wrap" style={{ justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

export function Chip({ kind, children }: { kind?: 'a' | 'b' | 'ok' | 'warn' | 'danger' | 'info' | 'outline'; children: ReactNode }) {
  return <span className={`chip ${kind ? `chip-${kind}` : ''}`}>{children}</span>;
}

export function PageHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <h1>{title}</h1>
        {action}
      </div>
      {sub && <p className="sub">{sub}</p>}
    </header>
  );
}
