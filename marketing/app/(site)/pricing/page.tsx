// Full pricing detail page — RSC. The cinematic landing has its own
// in-flow Pricing scene; this page is the authoritative reference for
// people who arrive deep-linked or who clicked through "see full pricing".
//
// Hard rules from the conversion lens:
//  - Pricing visible above the fold. No "MOST POPULAR" badge.
//  - Same CTA label on every tier ("Start free trial").
//  - Body emphasis uses brand-400 (#FF4566, 5.93:1 on ink-900) — never
//    brand-500 which fails AA on dark for body weight.

import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: 'Pricing',
  path: '/pricing',
});

const ADMIN_SIGNUP = 'https://admin.ironpath.health/signup';

interface Tier {
  slug: 'starter' | 'growth' | 'unlimited';
  name: string;
  price: number;
  cap: string;
  tagline: string;
  features: string[];
  accent?: boolean;
}

const TIERS: Tier[] = [
  {
    slug: 'starter',
    name: 'Starter',
    price: 49,
    cap: '50 members',
    tagline: 'Everything you need to run a small gym without spreadsheets.',
    features: [
      'Up to 50 active members',
      'Member app (iOS + Android)',
      'Workout builder with library of 600+ movements',
      'Front-desk check-in (QR + manual)',
      'Stripe billing for memberships',
      'Email + push notifications',
      'CSV member import',
      'Email support, 1 business day',
    ],
  },
  {
    slug: 'growth',
    name: 'Growth',
    price: 99,
    cap: '200 members',
    tagline: 'For gyms past the first plateau, scaling staff and class load.',
    accent: true,
    features: [
      'Up to 200 active members',
      'Everything in Starter',
      'Coach role with per-coach attendance',
      'Class scheduling + waitlists',
      'Custom branding (logo, accent color, app name)',
      'Bulk member import from Mindbody / Glofox CSV',
      'Churn risk dashboard',
      'Member retention emails (drip + win-back)',
      'Slack + email support, same-day',
      'Owner mobile dashboard',
    ],
  },
  {
    slug: 'unlimited',
    name: 'Unlimited',
    price: 199,
    cap: 'No member cap',
    tagline: 'For multi-location gyms and operators with their own stack.',
    features: [
      'Unlimited active members',
      'Everything in Growth',
      'Multi-location support',
      'Role-based permissions (owner, manager, coach, front-desk)',
      'Read + write API access',
      'Webhook events (member.created, attendance.logged, etc.)',
      'SSO via Google Workspace',
      'Audit log export (CSV / JSON)',
      'Priority support — Slack channel + 1 hr response',
      'Onboarding call with founder',
    ],
  },
];

interface ComparisonRow {
  label: string;
  starter: string;
  growth: string;
  unlimited: string;
}

const COMPARISON: ComparisonRow[] = [
  { label: 'Member cap',          starter: '50',          growth: '200',         unlimited: 'Unlimited' },
  { label: 'Member app',          starter: 'Yes',         growth: 'Yes',         unlimited: 'Yes' },
  { label: 'Workout builder',     starter: 'Yes',         growth: 'Yes',         unlimited: 'Yes' },
  { label: 'Stripe billing',      starter: 'Yes',         growth: 'Yes',         unlimited: 'Yes' },
  { label: 'Coach role',          starter: '—',           growth: 'Yes',         unlimited: 'Yes' },
  { label: 'Class scheduling',    starter: '—',           growth: 'Yes',         unlimited: 'Yes' },
  { label: 'Custom branding',     starter: '—',           growth: 'Yes',         unlimited: 'Yes' },
  { label: 'Bulk member import',  starter: 'CSV only',    growth: 'Mindbody, Glofox, CSV', unlimited: 'Mindbody, Glofox, CSV, API' },
  { label: 'Churn dashboard',     starter: '—',           growth: 'Yes',         unlimited: 'Yes' },
  { label: 'Multi-location',      starter: '—',           growth: '—',           unlimited: 'Yes' },
  { label: 'API access',          starter: '—',           growth: '—',           unlimited: 'Read + write' },
  { label: 'Webhooks',            starter: '—',           growth: '—',           unlimited: 'Yes' },
  { label: 'SSO (Google)',        starter: '—',           growth: '—',           unlimited: 'Yes' },
  { label: 'Audit log export',    starter: '—',           growth: '—',           unlimited: 'Yes' },
  { label: 'Support',             starter: 'Email · 1 day', growth: 'Slack + email · same day', unlimited: 'Priority · 1 hr' },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: 'What happens after the 30-day trial?',
    a: (
      <>
        On day 30 we email you with a one-click upgrade link. If you do
        nothing, the gym is paused (members can still log in to read their
        history but new check-ins and workouts are disabled). We never
        auto-bill a card you haven&rsquo;t explicitly entered.
      </>
    ),
  },
  {
    q: 'Can I switch tiers anytime?',
    a: (
      <>
        Yes. Upgrades take effect immediately and we prorate the difference.
        Downgrades take effect at the next billing cycle. There is never a
        cancellation fee.
      </>
    ),
  },
  {
    q: 'Do you charge per gym member?',
    a: (
      <>
        No. We deliberately do not charge per member. A gym at 180 members
        does not cost meaningfully more to serve than a gym at 80. The cost
        to serve you is the cost to serve you. Pricing scales with{' '}
        <span className="text-brand-400">tier</span>, not headcount.
      </>
    ),
  },
  {
    q: 'What about transaction fees?',
    a: (
      <>
        Stripe charges its standard processing fee (currently 2.9% + 30&cent;
        in the US) directly to you. IronPath takes zero on top of that. We
        are a software vendor, not a payment middleman.
      </>
    ),
  },
  {
    q: 'Is there an annual discount?',
    a: (
      <>
        Yes. Pay annually and you get two months free (~16.7% off). The
        annual option is on the billing page after you sign up — we
        intentionally don&rsquo;t complicate the marketing page with it.
      </>
    ),
  },
  {
    q: 'Can I import members from Mindbody / Glofox?',
    a: (
      <>
        Yes. Growth and Unlimited include a guided importer that maps
        Mindbody and Glofox export CSVs. On Unlimited we&rsquo;ll do the
        first import for you on a screen-share call. We&rsquo;ve done dozens
        of these &mdash; the longest one took 40 minutes.
      </>
    ),
  },
];

export default function PricingPage() {
  return (
    <main className="bg-ink-950 text-ink-50 min-h-screen">
      {/* Top utility bar — minimal back-to-home, not the cinematic chrome. */}
      <nav className="border-b border-ink-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-base tracking-tight text-ink-100 hover:text-ink-50 transition-colors"
          >
            IronPath
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/blog" className="text-ink-300 hover:text-ink-50 transition-colors">
              Blog
            </Link>
            <Link href="/for-gyms" className="text-ink-300 hover:text-ink-50 transition-colors">
              For gyms
            </Link>
            <a
              href={`${ADMIN_SIGNUP}?tier=growth`}
              className="rounded-md bg-brand-500 text-white px-3 py-1.5 hover:bg-brand-450 transition-colors"
            >
              Start trial
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-4xl px-4 sm:px-6 pt-16 sm:pt-24 pb-12 text-center">
        <h1 className="font-display text-4xl sm:text-6xl tracking-tight text-ink-50">
          Pricing that scales with you.
        </h1>
        <p className="mt-5 text-lg sm:text-xl text-ink-300 max-w-2xl mx-auto">
          All tiers include the <span className="text-brand-400">30-day free trial</span>.
          No card up front. Cancel from the billing page in two clicks.
        </p>
      </header>

      {/* Tier cards */}
      <section
        aria-label="Pricing tiers"
        className="mx-auto max-w-6xl px-4 sm:px-6 pb-16"
      >
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TIERS.map((tier) => (
            <li key={tier.slug}>
              <article
                data-tier={tier.slug}
                className={[
                  'h-full rounded-2xl border bg-ink-900 p-6 sm:p-7 flex flex-col',
                  tier.accent
                    ? 'border-brand-500/40 shadow-[0_0_0_1px_rgba(255,69,102,0.4),0_30px_80px_-40px_rgba(255,69,102,0.25)]'
                    : 'border-ink-800',
                ].join(' ')}
              >
                <header className="mb-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-2">
                    {tier.name}
                  </p>
                  <p className="text-sm text-ink-300 mb-4">{tier.tagline}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-ink-400 text-2xl">$</span>
                    <span
                      data-numeric
                      className="font-display text-5xl sm:text-6xl tracking-tight tabular-nums text-ink-50"
                    >
                      {tier.price}
                    </span>
                    <span className="text-ink-400 text-sm">/mo</span>
                  </div>
                  <p className="mt-2 text-xs font-mono uppercase tracking-[0.14em] text-brand-400">
                    {tier.cap}
                  </p>
                </header>

                <ul className="space-y-2.5 text-sm text-ink-200 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <span aria-hidden className="text-brand-400 mt-0.5">+</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 pt-6 border-t border-ink-800/80">
                  <a
                    href={`${ADMIN_SIGNUP}?tier=${tier.slug}`}
                    className={[
                      'block w-full text-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
                      tier.accent
                        ? 'bg-brand-500 text-white hover:bg-brand-450'
                        : 'bg-ink-50 text-ink-950 hover:bg-white',
                    ].join(' ')}
                  >
                    Start free trial
                  </a>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* Comparison table */}
      <section
        aria-labelledby="compare"
        className="mx-auto max-w-6xl px-4 sm:px-6 pb-20"
      >
        <h2
          id="compare"
          className="font-display text-2xl sm:text-3xl tracking-tight mb-6 text-ink-50"
        >
          Feature comparison
        </h2>
        <div className="overflow-x-auto rounded-xl border border-ink-800">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-ink-900 text-ink-300">
                <th scope="col" className="text-left font-medium px-4 py-3">
                  Feature
                </th>
                <th scope="col" className="text-left font-medium px-4 py-3">
                  Starter
                </th>
                <th scope="col" className="text-left font-medium px-4 py-3">
                  Growth
                </th>
                <th scope="col" className="text-left font-medium px-4 py-3">
                  Unlimited
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr
                  key={row.label}
                  className={
                    i % 2 === 0
                      ? 'bg-ink-950 text-ink-200'
                      : 'bg-ink-900/50 text-ink-200'
                  }
                >
                  <th scope="row" className="text-left font-normal text-ink-100 px-4 py-3 align-top">
                    {row.label}
                  </th>
                  <td className="px-4 py-3 align-top">{row.starter}</td>
                  <td className="px-4 py-3 align-top">{row.growth}</td>
                  <td className="px-4 py-3 align-top">{row.unlimited}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section
        aria-labelledby="faq"
        className="mx-auto max-w-3xl px-4 sm:px-6 pb-20"
      >
        <h2
          id="faq"
          className="font-display text-2xl sm:text-3xl tracking-tight mb-8 text-ink-50"
        >
          Frequently asked
        </h2>
        <dl className="space-y-8">
          {FAQ.map((item) => (
            <div key={item.q} className="border-b border-ink-900 pb-8 last:border-b-0">
              <dt className="font-display text-lg text-ink-50 mb-2">
                {item.q}
              </dt>
              <dd className="text-ink-300 leading-relaxed">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Founder card */}
      <section
        aria-labelledby="founder"
        className="mx-auto max-w-3xl px-4 sm:px-6 pb-24"
      >
        <h2 id="founder" className="sr-only">
          Talk to the founder
        </h2>
        <article className="rounded-2xl border border-ink-800 bg-ink-900 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
          <div
            aria-hidden
            className="shrink-0 w-20 h-20 rounded-full bg-gradient-to-br from-brand-500/40 to-brand-700/40 border border-ink-800 flex items-center justify-center font-display text-2xl text-ink-50"
          >
            A
          </div>
          <div className="flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-2">
              Talk to the founder before signing up
            </p>
            <p className="font-display text-xl text-ink-50 mb-1">
              Ahmed &mdash; founder, IronPath
            </p>
            <p className="text-sm text-ink-300 mb-5">
              I&rsquo;ve sat with 43 gym owners since launching. If
              you&rsquo;re weighing IronPath against Mindbody / Glofox /
              your spreadsheets, grab 15 minutes &mdash; I&rsquo;ll tell you
              honestly whether we&rsquo;re the right call.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href="https://cal.com/ironpath-ahmed/15min"
                className="inline-flex items-center gap-2 rounded-md bg-brand-500 text-white px-4 py-2 font-medium hover:bg-brand-450 transition-colors"
              >
                Book 15 min on Cal.com
              </a>
              <a
                href="https://www.linkedin.com/in/ironpath-ahmed/"
                className="inline-flex items-center gap-2 rounded-md border border-ink-700 text-ink-100 px-4 py-2 font-medium hover:border-ink-600 transition-colors"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </article>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-400">
          <p>&copy; {new Date().getFullYear()} IronPath, Inc.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-ink-200 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink-200 transition-colors">
              Terms
            </Link>
            <Link href="/blog" className="hover:text-ink-200 transition-colors">
              Blog
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
