import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { TEMPLATES, TEMPLATE_CATEGORIES, type TemplateCategory } from '@/domain/templates';
import { PageHead } from '@/ui/Bits';
import { IconPlus } from '@/ui/Icons';

export default function LibraryPage() {
  const { t, tx } = useI18n();
  const [cat, setCat] = useState<TemplateCategory | 'all'>('all');
  const list = TEMPLATES.filter((tp) => cat === 'all' || tp.category === cat);

  return (
    <div className="fade-in">
      <PageHead title={t('library.title')} sub={t('library.subtitle')} />
      <div className="filters" role="group">
        <button type="button" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>
          {t('library.all')}
        </button>
        {TEMPLATE_CATEGORIES.map((c) => (
          <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {t(`library.cat.${c}`)}
          </button>
        ))}
      </div>
      <div className="tpl-grid">
        <Link to="/new" className="card card-link tpl card-sunken" style={{ borderStyle: 'dashed', borderColor: 'var(--line-2)' }}>
          <span className="row" style={{ gap: 8 }}>
            <span className="cond-mark" style={{ background: 'var(--ink)' }}>
              <IconPlus width={16} height={16} />
            </span>
            <h3>{t('library.custom')}</h3>
          </span>
          <p className="q">{t('library.customBody')}</p>
        </Link>
        {list.map((tp) => (
          <Link key={tp.id} to={`/new?template=${tp.id}`} className="card card-link tpl">
            <span className="row" style={{ gap: 8 }}>
              <i className={`cat-dot cat-${tp.category}`} aria-hidden />
              <span className="xs muted" style={{ fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {t(`library.cat.${tp.category}`)}
              </span>
            </span>
            <h3>{tx(tp.title)}</h3>
            <p className="q">{tx(tp.question)}</p>
            <span className="tpl-foot">
              <span className="row" style={{ gap: 6 }}>
                <span className="cond-mark A" style={{ width: 20, height: 20, fontSize: 11, borderRadius: 5 }}>
                  A
                </span>
                <span className="cond-mark B" style={{ width: 20, height: 20, fontSize: 11, borderRadius: 5 }}>
                  B
                </span>
              </span>
              <span className="num">{t('common.daysCount', { n: tp.durationDays })}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
