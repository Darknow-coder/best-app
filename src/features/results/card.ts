/**
 * Renders a shareable PNG result card with the Canvas API.
 * Page fonts (Fraunces / Inter / JetBrains Mono) are available to canvas once loaded.
 */
import type { Experiment } from '@/domain/types';
import type { MetricAnalysis } from '@/domain/analysis';
import { fmt } from '@/domain/stats';

export interface CardText {
  verdictTitle: string;
  verdictBody: string;
  footer: string;
  days: string;
  meanA: string;
  meanB: string;
  diff: string;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#000';
}

export async function renderResultCard(exp: Experiment, primary: MetricAnalysis, text: CardText): Promise<Blob> {
  await document.fonts?.ready;
  const scale = 2;
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.scale(scale, scale);

  const paper = cssVar('--paper');
  const paper2 = cssVar('--paper-2');
  const ink = cssVar('--ink');
  const ink2 = cssVar('--ink-2');
  const ink3 = cssVar('--ink-3');
  const line = cssVar('--line');
  const a = cssVar('--a');
  const b = cssVar('--b');
  const display = "'Fraunces Variable', Georgia, serif";
  const ui = "'Inter Variable', system-ui, sans-serif";
  const mono = "'JetBrains Mono Variable', ui-monospace, monospace";

  // Background
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);
  // Card
  const m = 56;
  roundRect(ctx, m, m, W - 2 * m, H - 2 * m, 36);
  ctx.fillStyle = paper2;
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.stroke();

  let yPos = m + 72;
  const x = m + 64;
  const innerW = W - 2 * m - 128;

  // Eyebrow
  ctx.fillStyle = ink3;
  ctx.font = `600 20px ${ui}`;
  ctx.fillText(`${text.days.toUpperCase()}  ·  N = 1`, x, yPos);
  yPos += 44;

  // Title
  ctx.fillStyle = ink;
  ctx.font = `600 54px ${display}`;
  for (const l of wrap(ctx, exp.title, innerW).slice(0, 2)) {
    ctx.fillText(l, x, yPos + 40);
    yPos += 64;
  }
  yPos += 18;

  // Question
  ctx.fillStyle = ink2;
  ctx.font = `italic 400 28px ${display}`;
  for (const l of wrap(ctx, exp.question, innerW).slice(0, 2)) {
    ctx.fillText(l, x, yPos + 24);
    yPos += 38;
  }
  yPos += 40;

  // Two columns: A and B means
  const colW = (innerW - 32) / 2;
  const drawCol = (cx: number, color: string, label: string, mean: number, n: number) => {
    roundRect(ctx, cx, yPos, colW, 190, 24);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.12;
    ctx.fill();
    ctx.globalAlpha = 1;
    // mark
    roundRect(ctx, cx + 24, yPos + 24, 44, 44, 12);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `700 26px ${display}`;
    ctx.textAlign = 'center';
    ctx.fillText(label === 'A' ? 'A' : 'B', cx + 46, yPos + 56);
    ctx.textAlign = 'left';
    ctx.fillStyle = ink2;
    ctx.font = `500 20px ${ui}`;
    const condLabel = label === 'A' ? exp.conditionA.label : exp.conditionB.label;
    ctx.fillText(wrap(ctx, condLabel, colW - 100)[0] ?? '', cx + 84, yPos + 54);
    ctx.fillStyle = ink;
    ctx.font = `600 64px ${mono}`;
    const meanText = fmt(mean, 1);
    ctx.fillText(meanText, cx + 24, yPos + 150);
    const meanWidth = ctx.measureText(meanText).width;
    ctx.fillStyle = ink3;
    ctx.font = `500 18px ${ui}`;
    ctx.fillText(`n = ${n}`, cx + 24 + meanWidth + 18, yPos + 150);
  };
  drawCol(x, a, 'A', primary.all.a.mean, primary.all.a.n);
  drawCol(x + colW + 32, b, 'B', primary.all.b.mean, primary.all.b.n);
  yPos += 230;

  // Metric + diff line
  ctx.fillStyle = ink3;
  ctx.font = `600 20px ${ui}`;
  ctx.fillText(primary.metric.name.toUpperCase(), x, yPos);
  yPos += 36;
  ctx.fillStyle = ink;
  ctx.font = `600 30px ${mono}`;
  ctx.fillText(text.diff, x, yPos);
  yPos += 56;

  // Verdict
  const vColor = primary.verdict.kind === 'effect-meaningful' ? cssVar('--ok') : primary.verdict.kind === 'effect-small' ? cssVar('--warn') : primary.verdict.kind === 'no-meaningful-effect' ? cssVar('--info') : ink3;
  ctx.fillStyle = vColor;
  ctx.fillRect(x, yPos - 6, 8, 120);
  ctx.fillStyle = ink;
  ctx.font = `600 40px ${display}`;
  ctx.fillText(text.verdictTitle, x + 28, yPos + 30);
  yPos += 60;
  ctx.fillStyle = ink2;
  ctx.font = `400 22px ${ui}`;
  for (const l of wrap(ctx, text.verdictBody, innerW - 28).slice(0, 4)) {
    ctx.fillText(l, x + 28, yPos + 18);
    yPos += 32;
  }

  // Footer
  ctx.fillStyle = ink3;
  ctx.font = `500 18px ${ui}`;
  ctx.fillText(text.footer, x, H - m - 48);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob'))), 'image/png'));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
