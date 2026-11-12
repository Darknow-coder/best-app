import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fr, type MessageKey } from './fr';
import { en } from './en';

export type Locale = 'fr' | 'en';
export type { MessageKey };

const dictionaries: Record<Locale, Record<MessageKey, string>> = { fr, en };
const STORAGE_KEY = 'cobaye.locale';

export type Vars = Record<string, string | number>;

export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'fr' || stored === 'en') return stored;
  } catch {
    /* storage unavailable */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'fr';
  return nav.startsWith('fr') ? 'fr' : 'en';
}

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, vars?: Vars) => string;
  /** Resolves a localized text object { fr, en }. */
  tx: (obj: { fr: string; en: string }) => string;
  formatDate: (dateKey: string, opts?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (n: number, decimals?: number) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const dict = dictionaries[locale];
    const intlLocale = locale === 'fr' ? 'fr-FR' : 'en-GB';
    return {
      locale,
      setLocale,
      t: (key, vars) => interpolate(dict[key] ?? key, vars),
      tx: (obj) => obj[locale],
      formatDate: (dateKey, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => {
        const [y, m, d] = dateKey.split('-').map(Number);
        const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12);
        return new Intl.DateTimeFormat(intlLocale, opts).format(date);
      },
      formatNumber: (n, decimals = 1) => {
        if (!Number.isFinite(n)) return '—';
        return new Intl.NumberFormat(intlLocale, { maximumFractionDigits: decimals, minimumFractionDigits: 0 }).format(n);
      },
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
