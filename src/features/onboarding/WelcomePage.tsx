import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { Button } from '@/ui/Button';
import { Mascot } from '@/ui/Mascot';
import { setOnboarded } from '@/app/settings';

export default function WelcomePage() {
  const { t, locale, setLocale } = useI18n();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const moods = ['curious', 'calm', 'happy'] as const;
  const steps = [
    { title: t('onb.1.title'), body: t('onb.1.body') },
    { title: t('onb.2.title'), body: t('onb.2.body') },
    { title: t('onb.3.title'), body: t('onb.3.body') },
  ];
  const cur = steps[step]!;
  const last = step === steps.length - 1;

  const finish = () => {
    setOnboarded(true);
    nav('/', { replace: true });
  };

  return (
    <div className="onb">
      <div className="row-between">
        <div className="segmented" role="group" aria-label="Language">
          <button type="button" aria-pressed={locale === 'fr'} onClick={() => setLocale('fr')}>
            FR
          </button>
          <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>
            EN
          </button>
        </div>
        <Button variant="ghost" size="sm" onClick={finish}>
          {t('onb.skip')}
        </Button>
      </div>
      <div className="onb-body fade-in" key={step}>
        <Mascot className="mascot" mood={moods[step] ?? 'calm'} />
        <h1>{cur.title}</h1>
        <p>{cur.body}</p>
      </div>
      <div className="stack">
        <div className="dots" aria-hidden>
          {steps.map((_, i) => (
            <i key={i} className={i === step ? 'on' : ''} />
          ))}
        </div>
        {last ? (
          <Button size="lg" block onClick={finish}>
            {t('onb.cta')}
          </Button>
        ) : (
          <Button size="lg" block onClick={() => setStep((s) => s + 1)}>
            {t('common.continue')}
          </Button>
        )}
        <p className="xs muted center" style={{ maxWidth: '44ch', margin: '0 auto' }}>
          {t('onb.disclaimer')}
        </p>
      </div>
    </div>
  );
}
