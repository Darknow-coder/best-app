import type { Entry, Experiment } from '@/domain/types';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJson(data: unknown, filename: string) {
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function entriesToCsv(exp: Experiment, entries: Entry[]): string {
  const header = ['day', 'date', 'condition', 'condition_label', 'adhered', ...exp.metrics.map((m) => m.id), 'note', 'entered_late'];
  const rows = [...entries]
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .map((e) => [
      e.dayIndex + 1,
      e.date,
      e.condition,
      e.condition === 'A' ? exp.conditionA.label : exp.conditionB.label,
      e.adhered === null ? '' : e.adhered ? 1 : 0,
      ...exp.metrics.map((m) => e.values[m.id] ?? ''),
      e.note,
      e.enteredLate ? 1 : 0,
    ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Daily reminder as an .ics file (floating local time, so it follows the user's timezone). */
export function buildDailyReminderIcs(opts: { time: string; title: string; description: string; startDate: string; untilDate?: string; uid: string }): string {
  const [hh = '20', mm = '00'] = opts.time.split(':');
  const start = `${opts.startDate.replace(/-/g, '')}T${hh.padStart(2, '0')}${mm.padStart(2, '0')}00`;
  const until = opts.untilDate ? `;UNTIL=${opts.untilDate.replace(/-/g, '')}T235959` : '';
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cobaye//Reminder//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${opts.uid}@cobaye`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    'DURATION:PT10M',
    `RRULE:FREQ=DAILY${until}`,
    `SUMMARY:${icsEscape(opts.title)}`,
    `DESCRIPTION:${icsEscape(opts.description)}`,
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(opts.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
