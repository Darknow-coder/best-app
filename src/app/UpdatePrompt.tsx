import { useRegisterSW } from 'virtual:pwa-register/react';
import { useI18n } from '@/i18n';
import { Button } from '@/ui/Button';

export function UpdatePrompt() {
  const { t } = useI18n();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="banner" style={{ marginBottom: 'var(--space-4)' }} role="status">
      <span>{t('settings.update')}</span>
      <span className="row">
        <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
          {t('common.close')}
        </Button>
        <Button size="sm" onClick={() => updateServiceWorker(true)}>
          {t('settings.updateBtn')}
        </Button>
      </span>
    </div>
  );
}
