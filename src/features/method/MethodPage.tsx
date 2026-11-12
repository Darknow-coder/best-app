import { useI18n } from '@/i18n';
import { PageHead } from '@/ui/Bits';

export default function MethodPage() {
  const { t } = useI18n();
  const sections = [1, 2, 3, 4, 5, 6] as const;
  return (
    <div className="fade-in">
      <PageHead title={t('method.title')} sub={t('method.intro')} />
      <article className="card prose">
        {sections.map((i) => (
          <section key={i}>
            <h3>{t(`method.s${i}.title`)}</h3>
            <p>{t(`method.s${i}.body`)}</p>
          </section>
        ))}
      </article>
    </div>
  );
}
