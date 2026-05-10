import type { Metadata } from 'next';
import { fmt, getLocale, getMessages } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getMessages(locale);
  return {
    title: `${m.terms.page_title} · IronPath`,
    description: m.terms.page_description,
    alternates: { canonical: '/terms' },
  };
}

// Locale-aware. AR uses Modern Standard Arabic (legal context).
export default async function TermsPage() {
  const locale = await getLocale();
  const m = getMessages(locale);
  const isAr = locale === 'ar';
  const t = m.terms;

  return (
    <article
      className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-ink-50">
          {t.h1}
        </h1>
        <p className="mt-2 text-xs uppercase tracking-widest text-ink-400">
          {fmt(t.last_updated_label, { date: t.last_updated_date })}
        </p>
      </header>

      <section className="space-y-4 text-ink-200 leading-relaxed">
        <p>{t.intro}</p>
      </section>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_service}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_service}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_trial}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_trial}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_fees}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_fees}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_data}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_data}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_aup}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_aup}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_sla}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_sla}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_termination}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_termination}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_warranties}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_warranties}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_liability}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_liability}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_indemnify}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_indemnify}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_law}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_law}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_changes}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_changes}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_contact}</h2>
      <p className="text-ink-200 leading-relaxed">
        {t.p_contact_a}
        <a className="text-brand-400 underline" href="mailto:legal@ironpath.health" dir="ltr">
          {t.p_contact_link_label}
        </a>
        {t.p_contact_b}
      </p>
    </article>
  );
}
