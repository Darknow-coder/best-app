import { useCallback, useEffect, useState } from 'react';

export type Theme = 'system' | 'light' | 'dark';

const KEYS = {
  theme: 'cobaye.theme',
  onboarded: 'cobaye.onboarded',
  reminderTime: 'cobaye.reminderTime',
} as const;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function applyTheme(theme: Theme) {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(() => {
    const v = read(KEYS.theme);
    return v === 'light' || v === 'dark' ? v : 'system';
  });
  useEffect(() => applyTheme(theme), [theme]);
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    write(KEYS.theme, t === 'system' ? null : t);
  }, []);
  return [theme, setTheme];
}

export function isOnboarded(): boolean {
  return read(KEYS.onboarded) === '1';
}
export function setOnboarded(v: boolean) {
  write(KEYS.onboarded, v ? '1' : null);
}

export function getReminderTime(): string {
  return read(KEYS.reminderTime) ?? '20:30';
}
export function setReminderTime(v: string) {
  write(KEYS.reminderTime, v);
}
