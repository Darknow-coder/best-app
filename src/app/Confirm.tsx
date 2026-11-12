import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { useI18n } from '@/i18n';

interface Options {
  title?: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
}
type Ask = (o: Options) => Promise<boolean>;
const Ctx = createContext<Ask | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [opts, setOpts] = useState<Options | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const ask = useCallback<Ask>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);
  const finish = useCallback((v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  }, []);
  const value = useMemo(() => ask, [ask]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Sheet open={opts !== null} onClose={() => finish(false)} title={opts?.title}>
        <div className="stack">
          <p className="ink-2">{opts?.body}</p>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => finish(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant={opts?.danger ? 'danger' : 'primary'} onClick={() => finish(true)} autoFocus>
              {opts?.confirmLabel ?? t('common.confirm')}
            </Button>
          </div>
        </div>
      </Sheet>
    </Ctx.Provider>
  );
}

export function useConfirm(): Ask {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useConfirm outside ConfirmProvider');
  return ctx;
}
