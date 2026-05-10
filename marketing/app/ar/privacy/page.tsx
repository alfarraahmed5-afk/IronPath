// /ar/privacy -- Arabic privacy policy. Mirrors /(legal)/privacy with
// locale forced to 'ar' so the cookie state can never bleed Arabic into
// English context (or vice versa). The body is inlined here (rather than
// shared via a body component) because the EN page is owned by another
// agent in this sprint -- the duplication is intentional and cheap.
//
// Legal text uses Modern Standard Arabic (per the brief's hard rule).
// Marketing surfaces use Egyptian colloquial; legal contexts use MSA.

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { fmt, getMessages } from '@/lib/i18n';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const m = getMessages('ar');
  return buildMetadata({
    title: m.privacy.page_title,
    description: m.privacy.page_description,
    path: '/privacy',
    locale: 'ar',
  });
}

export default async function ArabicPrivacyPage() {
  // Tell next-intl this subtree is Arabic so any `useTranslations` calls
  // in nested client components resolve against the AR catalog.
  setRequestLocale('ar');
  const m = getMessages('ar');
  const t = m.privacy;

  return (
    <article
      className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 prose-legal"
      dir="rtl"
      lang="ar"
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
        <p>{t.intro_p1_html}</p>
        <p>{t.intro_p2}</p>
      </section>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        {t.h2_controller}
      </h2>
      <p className="text-ink-200 leading-relaxed">{t.p_controller}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        {t.h2_collect}
      </h2>
      <ul className="text-ink-200 leading-relaxed list-disc pr-6 space-y-2">
        <li>
          <strong className="text-ink-50">{t.li_account_label}</strong> {t.li_account_body}
        </li>
        <li>
          <strong className="text-ink-50">{t.li_billing_label}</strong> {t.li_billing_body}
        </li>
        <li>
          <strong className="text-ink-50">{t.li_member_label}</strong> {t.li_member_body}
        </li>
        <li>
          <strong className="text-ink-50">{t.li_usage_label}</strong> {t.li_usage_body}
        </li>
        <li>
          <strong className="text-ink-50">{t.li_support_label}</strong> {t.li_support_body}
        </li>
      </ul>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_use}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_use}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_share}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_share}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_cookies}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_cookies}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_gdpr}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_gdpr}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_ccpa}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_ccpa}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_retention}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_retention}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_security}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_security}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_intl}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_intl}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_children}</h2>
      <p className="text-ink-200 leading-relaxed">{t.p_children}</p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">{t.h2_contact}</h2>
      <p className="text-ink-200 leading-relaxed">
        {t.p_contact_a}
        <a
          className="text-brand-400 underline"
          href="mailto:privacy@ironpath.health"
          dir="ltr"
        >
          {t.p_contact_link_label}
        </a>
        {t.p_contact_b}
      </p>
    </article>
  );
}
