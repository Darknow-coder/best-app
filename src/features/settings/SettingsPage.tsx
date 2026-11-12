import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n, type Locale } from '@/i18n';
import { PageHead } from '@/ui/Bits';
import { Button } from '@/ui/Button';
import { Field, Segmented, Switch } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { useConfirm } from '@/app/Confirm';
import { getReminderTime, setOnboarded, setReminderTime, useTheme, type Theme } from '@/app/settings';
import { exportAll, importBundle, isExportBundle, loadDemo, wipeAll } from '@/data/repo';
import { buildDailyReminderIcs, downloadBlob, downloadJson, readFileAsText } from '@/data/files';
import { useToday } from '@/app/hooks';
import { IconDownload, IconSparkle, IconTrash, IconUpload } from '@/ui/Icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const [theme, setTheme] = useTheme();
  const { toast } = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const today = useToday();
  const fileRef = useRef<HTMLInputElement>(null);
  const [merge, setMerge] = useState(true);
  const [reminder, setReminder] = useState(getReminderTime());
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const onExport = async () => {
    const bundle = await exportAll();
    downloadJson(bundle, `cobaye-export-${today}.json`);
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await readFileAsText(file));
      if (!isExportBundle(parsed)) throw new Error('invalid');
      const res = await importBundle(parsed, merge ? 'merge' : 'replace');
      toast(t('settings.importOk', { e: res.experiments, n: res.entries }));
    } catch {
      toast(t('settings.importErr'), 'err');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onWipe = async () => {
    if (await confirm({ body: t('settings.wipeConfirm'), confirmLabel: t('settings.wipe'), danger: true })) {
      await wipeAll();
      toast(t('settings.wiped'));
    }
  };

  const onIcs = () => {
    setReminderTime(reminder);
    const ics = buildDailyReminderIcs({
      time: reminder,
      title: `Cobaye · ${t('checkin.title')}`,
      description: t('app.tagline'),
      startDate: today,
      uid: `daily-${today}`,
    });
    downloadBlob(new Blob([ics], { type: 'text/calendar' }), 'cobaye-rappel.ics');
  };

  const onInstall = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    const choice = await installEvt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      toast(t('settings.installed'));
    }
    setInstallEvt(null);
  };

  const onPersist = async () => {
    const ok = await navigator.storage?.persist?.();
    setPersisted(ok ?? null);
  };

  const onDemo = async () => {
    await loadDemo(today, locale);
    toast(t('settings.demoLoaded'));
    nav('/experiments');
  };

  return (
    <div className="fade-in stack-lg">
      <PageHead title={t('settings.title')} />

      <section className="card stack">
        <h3>{t('settings.appearance')}</h3>
        <Field label={t('settings.theme')}>
          <Segmented<Theme>
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: t('settings.theme.system') },
              { value: 'light', label: t('settings.theme.light') },
              { value: 'dark', label: t('settings.theme.dark') },
            ]}
          />
        </Field>
        <Field label={t('settings.language')}>
          <Segmented<Locale>
            value={locale}
            onChange={setLocale}
            options={[
              { value: 'fr', label: 'Français' },
              { value: 'en', label: 'English' },
            ]}
          />
        </Field>
      </section>

      <section className="card stack">
        <h3>{t('settings.data')}</h3>
        <p className="small ink-2">{t('settings.dataBody')}</p>
        <div className="row wrap">
          <Button variant="secondary" onClick={onExport}>
            <IconDownload /> {t('settings.export')}
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <IconUpload /> {t('settings.import')}
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImportFile(e.target.files?.[0])} />
        </div>
        <Switch checked={merge} onChange={setMerge} label={t('settings.importMode')} />
        {persisted !== null && (
          <div className={`banner ${persisted ? '' : 'warn'}`}>
            <span>{persisted ? t('settings.storageGranted') : t('settings.storageDenied')}</span>
            {!persisted && (
              <Button size="sm" variant="secondary" onClick={onPersist}>
                {t('settings.storageAsk')}
              </Button>
            )}
          </div>
        )}
        <hr className="divider" />
        <div className="row wrap">
          <Button variant="secondary" onClick={onDemo}>
            <IconSparkle /> {t('settings.demo')}
          </Button>
          <Button variant="danger" onClick={onWipe}>
            <IconTrash /> {t('settings.wipe')}
          </Button>
        </div>
      </section>

      <section className="card stack">
        <h3>{t('settings.reminders')}</h3>
        <p className="small ink-2">{t('settings.remindersBody')}</p>
        <div className="row wrap">
          <Field label={t('settings.remindersTime')} htmlFor="reminder-time">
            <input id="reminder-time" className="input" type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} style={{ width: 140 }} />
          </Field>
          <Button variant="secondary" onClick={onIcs} style={{ alignSelf: 'flex-end' }}>
            <IconDownload /> {t('settings.remindersIcs')}
          </Button>
        </div>
      </section>

      <section className="card stack">
        <h3>{t('settings.install')}</h3>
        <p className="small ink-2">{t('settings.installBody')}</p>
        {installed ? (
          <span className="chip chip-ok">{t('settings.installed')}</span>
        ) : installEvt ? (
          <Button onClick={onInstall}>{t('settings.installBtn')}</Button>
        ) : (
          <p className="xs muted">{t('settings.installHint')}</p>
        )}
      </section>

      <section className="card stack">
        <h3>{t('settings.about')}</h3>
        <p className="small ink-2">{t('settings.aboutBody', { v: __APP_VERSION__ })}</p>
        <div className="row wrap">
          <Link to="/method" className="btn btn-secondary">
            {t('settings.method')}
          </Link>
          <Button
            variant="ghost"
            onClick={() => {
              setOnboarded(false);
              nav('/welcome');
            }}
          >
            {t('settings.replayOnboarding')}
          </Button>
        </div>
      </section>
    </div>
  );
}
