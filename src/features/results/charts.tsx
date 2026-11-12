import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/i18n';
import type { MetricAnalysis } from '@/domain/analysis';
import { fmt } from '@/domain/stats';

interface Tip {
  x: number;
  y: number;
  content: ReactNode;
}

function useTooltip() {
  const [tip, setTip] = useState<Tip | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const show = (e: React.MouseEvent | React.FocusEvent, content: ReactNode) => {
    const wrap = wrapRef.current;
    const target = e.currentTarget as SVGGraphicsElement;
    if (!wrap) return;
    const wb = wrap.getBoundingClientRect();
    const tb = target.getBoundingClientRect();
    setTip({ x: tb.left - wb.left + tb.width / 2, y: tb.top - wb.top, content });
  };
  const hide = () => setTip(null);
  return { tip, wrapRef, show, hide };
}

function Legend({ a, b, showNf }: { a: string; b: string; showNf: boolean }) {
  const { t } = useI18n();
  return (
    <div className="legend" aria-hidden>
      <span>
        <i className="A" /> {a}
      </span>
      <span>
        <i className="B" /> {b}
      </span>
      {showNf && (
        <span>
          <i className="nf" /> {t('detail.legend.notFollowed')}
        </span>
      )}
    </div>
  );
}

function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const span = max - min;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

/** Strip/dot plot: every observation by condition, with mean lines and 95% CI of each mean approximated by ±1.96·SE. */
export function DotPlot({ analysis, labelA, labelB }: { analysis: MetricAnalysis; labelA: string; labelB: string }) {
  const { t, formatDate } = useI18n();
  const { tip, wrapRef, show, hide } = useTooltip();
  const W = 600;
  const H = 230;
  const pad = { l: 44, r: 16, t: 16, b: 28 };
  const pts = analysis.series.filter((p) => p.value !== null) as Array<(typeof analysis.series)[number] & { value: number }>;
  const kind = analysis.metric.kind;
  const [min, max] = useMemo(() => {
    if (kind === 'scale') return [analysis.metric.min ?? 1, analysis.metric.max ?? 10];
    if (kind === 'boolean') return [0, 1];
    const vals = pts.map((p) => p.value);
    if (!vals.length) return [0, 1];
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const m = (hi - lo || 1) * 0.1;
    return [Math.max(0, lo - m), hi + m];
  }, [pts, kind, analysis.metric.min, analysis.metric.max]);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  const colX = (c: 'A' | 'B') => pad.l + ((c === 'A' ? 1 : 3) * (W - pad.l - pad.r)) / 4;
  const ticks = niceTicks(min, max);
  const showNf = pts.some((p) => p.adhered === false);

  // Bee-swarm layout: points sharing (almost) the same value are spread side by side.
  const swarmOffsets = (vals: number[]): number[] => {
    const groups = new Map<number, number[]>();
    vals.forEach((v, i) => {
      const key = Math.round(v * 2) / 2;
      const g = groups.get(key) ?? [];
      g.push(i);
      groups.set(key, g);
    });
    const out = new Array<number>(vals.length).fill(0);
    for (const idxs of groups.values()) {
      const k = idxs.length;
      idxs.forEach((i, j) => {
        out[i] = (j - (k - 1) / 2) * 12;
      });
    }
    return out;
  };

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <Legend a={labelA} b={labelB} showNf={showNf} />
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('results.chart.dots')}>
        <g className="grid">
          {ticks.map((tk) => (
            <g key={tk}>
              <line x1={pad.l} x2={W - pad.r} y1={y(tk)} y2={y(tk)} />
              <text x={pad.l - 8} y={y(tk) + 4} textAnchor="end" className="num">
                {fmt(tk, 1)}
              </text>
            </g>
          ))}
        </g>
        {(['A', 'B'] as const).map((c) => {
          const vals = pts.filter((p) => p.condition === c);
          const offsets = swarmOffsets(vals.map((p) => p.value));
          const s = c === 'A' ? analysis.all.a : analysis.all.b;
          const se = s.n > 1 ? s.sd / Math.sqrt(s.n) : 0;
          const color = c === 'A' ? 'var(--a)' : 'var(--b)';
          return (
            <g key={c}>
              {s.n > 0 && (
                <>
                  <rect x={colX(c) - 44} width={88} y={y(s.mean + 1.96 * se)} height={Math.max(0, y(s.mean - 1.96 * se) - y(s.mean + 1.96 * se))} fill={color} opacity={0.12} rx={4} />
                  <line className="mean-line" x1={colX(c) - 48} x2={colX(c) + 48} y1={y(s.mean)} y2={y(s.mean)} stroke={color} />
                  <text x={colX(c) + 54} y={y(s.mean) + 4} className="num" style={{ fill: 'var(--ink-2)', fontWeight: 600 }}>
                    {fmt(s.mean, 1)}
                  </text>
                </>
              )}
              {vals.map((p, i) => (
                <circle
                  key={p.dayIndex}
                  cx={colX(c) + (offsets[i] ?? 0)}
                  cy={y(p.value)}
                  r={5}
                  fill={p.adhered === false ? 'var(--paper-2)' : color}
                  stroke={p.adhered === false ? 'var(--ink-3)' : 'var(--paper-2)'}
                  strokeWidth={p.adhered === false ? 2 : 1.5}
                  tabIndex={0}
                  onMouseEnter={(e) =>
                    show(
                      e,
                      <>
                        {formatDate(p.date)} · {c} · <b>{fmt(p.value, 1)}</b>
                      </>,
                    )
                  }
                  onMouseLeave={hide}
                  onFocus={(e) => show(e, `${formatDate(p.date)} · ${c} · ${fmt(p.value, 1)}`)}
                  onBlur={hide}
                />
              ))}
              <text x={colX(c)} y={H - 8} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontWeight: 600 }}>
                {c === 'A' ? labelA : labelB}
              </text>
            </g>
          );
        })}
      </svg>
      {tip && (
        <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
          {tip.content}
        </div>
      )}
    </div>
  );
}

/** Day-by-day series: a single thin line through time, markers coloured by condition. */
export function TimeSeries({ analysis, labelA, labelB }: { analysis: MetricAnalysis; labelA: string; labelB: string }) {
  const { t, formatDate } = useI18n();
  const { tip, wrapRef, show, hide } = useTooltip();
  const W = 600;
  const H = 200;
  const pad = { l: 44, r: 16, t: 12, b: 26 };
  const all = analysis.series;
  const pts = all.filter((p) => p.value !== null) as Array<(typeof all)[number] & { value: number }>;
  const kind = analysis.metric.kind;
  const lastDay = Math.max(0, ...all.map((p) => p.dayIndex));
  const [min, max] = useMemo(() => {
    if (kind === 'scale') return [analysis.metric.min ?? 1, analysis.metric.max ?? 10];
    if (kind === 'boolean') return [0, 1];
    const vals = pts.map((p) => p.value);
    if (!vals.length) return [0, 1];
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const m = (hi - lo || 1) * 0.1;
    return [Math.max(0, lo - m), hi + m];
  }, [pts, kind, analysis.metric.min, analysis.metric.max]);
  const x = (d: number) => pad.l + (lastDay === 0 ? 0 : (d / lastDay) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  const ticks = niceTicks(min, max, 3);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.dayIndex).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const showNf = pts.some((p) => p.adhered === false);
  const dayTicks = Array.from({ length: lastDay + 1 }, (_, i) => i).filter((i) => i % Math.ceil((lastDay + 1) / 7) === 0 || i === lastDay);

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <Legend a={labelA} b={labelB} showNf={showNf} />
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('results.chart.series')}>
        <g className="grid">
          {ticks.map((tk) => (
            <g key={tk}>
              <line x1={pad.l} x2={W - pad.r} y1={y(tk)} y2={y(tk)} />
              <text x={pad.l - 8} y={y(tk) + 4} textAnchor="end" className="num">
                {fmt(tk, 1)}
              </text>
            </g>
          ))}
        </g>
        <path d={path} fill="none" stroke="var(--ink-4)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p) => {
          const color = p.condition === 'A' ? 'var(--a)' : 'var(--b)';
          return (
            <circle
              key={p.dayIndex}
              cx={x(p.dayIndex)}
              cy={y(p.value)}
              r={5.5}
              fill={p.adhered === false ? 'var(--paper-2)' : color}
              stroke={p.adhered === false ? 'var(--ink-3)' : 'var(--paper-2)'}
              strokeWidth={p.adhered === false ? 2 : 1.5}
              tabIndex={0}
              onMouseEnter={(e) =>
                show(
                  e,
                  <>
                    {formatDate(p.date)} · {p.condition} · <b>{fmt(p.value, 1)}</b>
                  </>,
                )
              }
              onMouseLeave={hide}
              onFocus={(e) => show(e, `${formatDate(p.date)} · ${p.condition} · ${fmt(p.value, 1)}`)}
              onBlur={hide}
            />
          );
        })}
        {dayTicks.map((d) => (
          <text key={d} x={x(d)} y={H - 6} textAnchor="middle" className="num">
            {t('common.day').slice(0, 1).toUpperCase()}
            {d + 1}
          </text>
        ))}
      </svg>
      {tip && (
        <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
          {tip.content}
        </div>
      )}
    </div>
  );
}
