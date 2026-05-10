// /eg -- Cairo wedge page.
//
// Per the GTM strategist (council lens 4): ship a single static landing
// page for Cairo BEFORE investing in full i18n architecture. One page,
// one CTA (WhatsApp to Ahmed), one number (+20 10 3659 6238). Use it to
// book 5 in-person Cairo demos in week 1. Architecture follows demand.
//
// English-with-Arabic-flex per copywriter's deck -- Arabic key phrases
// inline (`dir="rtl"` spans), English body copy. EGP pricing visible.
// No founder photo, no last name (founder direction).

import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: 'For Cairo gyms',
  description:
    "For independent Cairo gyms tired of tracking memberships in Excel and chasing payments in WhatsApp. Free in-person demo with Ahmed.",
  path: '/eg',
});

const WHATSAPP_NUMBER = '+20 10 3659 6238';
const WHATSAPP_LINK =
  'https://wa.me/201036596238?text=' +
  encodeURIComponent("Hi Ahmed -- I run a gym in Cairo and I'd like to see IronPath.");

interface Tier {
  name: string;
  arName: string;
  priceEgp: number;
  cap: string;
  arCap: string;
  tagline: string;
}

// Founder-confirmed EGP pricing (1350 / 2750 / 5300, monthly). Lens 1
// recommended 799/1499/2999 based on EGP 500/mo benchmark; founder
// chose higher tier to position above the GymFlow incumbent.
const TIERS: Tier[] = [
  {
    name: 'Starter',
    arName: 'مبتدي',
    priceEgp: 1_350,
    cap: 'Up to 50 members',
    arCap: 'لحد 50 عضو',
    tagline: "Everything you need to run a small gym without spreadsheets.",
  },
  {
    name: 'Growth',
    arName: 'نمو',
    priceEgp: 2_750,
    cap: 'Up to 200 members',
    arCap: 'لحد 200 عضو',
    tagline: 'For gyms past the first plateau, scaling staff and class load.',
  },
  {
    name: 'Pro',
    arName: 'برو',
    priceEgp: 5_300,
    cap: 'No member cap',
    arCap: 'بدون حد للأعضاء',
    tagline: 'For multi-location gyms and operators with their own stack.',
  },
];

function formatEgp(n: number): string {
  return n.toLocaleString('en-US');
}

export default function EgyptPage() {
  return (
    <main className="bg-ink-950 text-ink-50 min-h-screen">
      {/* Top utility bar -- minimal, no cinematic chrome on this page. */}
      <nav className="border-b border-ink-900">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-base tracking-tight text-ink-100 hover:text-ink-50 transition-colors"
          >
            IronPath
          </Link>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm text-ink-300 hover:text-ink-50 transition-colors"
          >
            WhatsApp
          </a>
        </div>
      </nav>

      {/* Hero -- bilingual */}
      <section className="px-4 sm:px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] text-brand-400 mb-4 tracking-wider">
            FOR CAIRO GYMS
          </p>
          <h1
            dir="rtl"
            lang="ar"
            className="font-display text-3xl sm:text-5xl text-ink-50 mb-3 tracking-tight leading-tight"
          >
            شغّل الجيم، مش جروبات الواتساب.
          </h1>
          <p className="font-display text-2xl sm:text-3xl text-ink-200 mb-8 tracking-tight">
            Run your gym, not WhatsApp groups.
          </p>
          <p className="text-base sm:text-lg text-ink-300 max-w-xl mb-10 leading-relaxed">
            For independent Cairo gyms tired of tracking memberships in Excel,
            chasing payments in DMs, and remembering everything themselves.
          </p>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-3 px-6 py-3.5 rounded-md bg-brand-500 hover:bg-brand-450 text-white font-medium text-base transition-colors"
          >
            <WhatsAppGlyph />
            <span>Talk to Ahmed on WhatsApp</span>
          </a>
          <p className="text-xs text-ink-400 mt-4 font-mono">
            {WHATSAPP_NUMBER} · Free in-person demo at your gym
          </p>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* The problem */}
      <section className="px-4 sm:px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] text-ink-400 mb-3 tracking-wider">
            BEFORE
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-ink-100 mb-6 tracking-tight">
            You&rsquo;re losing members in your DMs.
          </h2>
          <div className="space-y-5 text-ink-300 leading-relaxed">
            <p>
              Forty members. One spreadsheet. Three WhatsApp groups. The cash
              you collected last week is in your phone notes.
            </p>
            <p>
              Members forget you exist between sessions. Renewals slip. New
              sign-ups go to whoever follows up first, and you&rsquo;re the
              one running the front desk.
            </p>
            <p
              dir="rtl"
              lang="ar"
              className="text-ink-200 text-lg font-display"
            >
              النظام كله شغّال على إنك فاكر كل حاجة. لما تنسى، الجيم بيخسر.
            </p>
          </div>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* What you actually get -- only ship what we have */}
      <section className="px-4 sm:px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] text-ink-400 mb-3 tracking-wider">
            WHAT YOU GET
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-ink-100 mb-8 tracking-tight">
            Your gym, in one screen.
          </h2>
          <ul className="space-y-4">
            {[
              {
                en: 'Member app on iOS + Android',
                detail:
                  'Workouts, attendance, schedules. Members open it, they remember you exist.',
              },
              {
                en: 'Membership tracker that lives in a system',
                detail:
                  'Not Excel. Not your phone. One source of truth for who is active, who is expiring, who has paid.',
              },
              {
                en: 'Workout library, 600+ movements',
                detail:
                  'Build routines fast. Send to a member or assign to a class.',
              },
              {
                en: 'Push + email notifications',
                detail:
                  "You're back in your members' pockets. Renewal reminders, class invites, retention nudges, automated.",
              },
              {
                en: 'QR poster for the gym wall',
                detail:
                  "Print one poster. Members scan, they're in. The single highest-leverage activation event.",
              },
              {
                en: 'Web dashboard for the owner',
                detail:
                  "Active members, MRR, retention, today's check-ins. You see the gym at a glance from your laptop.",
              },
            ].map((feat) => (
              <li
                key={feat.en}
                className="flex gap-3 border-l-2 border-brand-500/30 pl-4"
              >
                <div className="flex-1">
                  <p className="text-ink-100 font-medium">{feat.en}</p>
                  <p className="text-ink-400 text-sm mt-1 leading-relaxed">
                    {feat.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* Pricing -- EGP, monthly only */}
      <section className="px-4 sm:px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-[11px] text-ink-400 mb-3 tracking-wider">
            PRICING
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-ink-100 mb-3 tracking-tight">
            Pricing in EGP. Monthly. Pay when you&rsquo;re ready.
          </h2>
          <p className="text-ink-300 mb-12 max-w-xl leading-relaxed">
            Start with a free in-person demo. Pay only when you&rsquo;re using
            the platform with real members.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {TIERS.map((tier, i) => (
              <article
                key={tier.name}
                className={[
                  'rounded-lg border bg-ink-900 p-6 flex flex-col',
                  i === 1
                    ? 'border-brand-500/40 shadow-[0_0_0_1px_rgba(200,16,46,0.15)]'
                    : 'border-ink-800',
                ].join(' ')}
              >
                <div className="mb-4">
                  <p className="font-mono text-[11px] text-ink-400 tracking-wider">
                    {tier.name.toUpperCase()}
                  </p>
                  <p
                    dir="rtl"
                    lang="ar"
                    className="font-display text-sm text-ink-300 mt-0.5"
                  >
                    {tier.arName}
                  </p>
                </div>
                <div className="mb-3" data-numeric>
                  <span className="font-display text-4xl sm:text-5xl text-ink-50 font-semibold">
                    {formatEgp(tier.priceEgp)}
                  </span>
                  <span className="text-ink-400 text-sm ml-2 font-mono">
                    EGP/mo
                  </span>
                </div>
                <p className="text-ink-300 text-sm mb-1">{tier.cap}</p>
                <p
                  dir="rtl"
                  lang="ar"
                  className="text-ink-400 text-xs font-display mb-5"
                >
                  {tier.arCap}
                </p>
                <p className="text-ink-300 text-sm leading-relaxed mb-6 flex-1">
                  {tier.tagline}
                </p>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={[
                    'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors',
                    i === 1
                      ? 'bg-brand-500 hover:bg-brand-450 text-white'
                      : 'border border-ink-700 hover:border-ink-600 text-ink-100',
                  ].join(' ')}
                >
                  <WhatsAppGlyph small />
                  <span>Talk to Ahmed</span>
                </a>
              </article>
            ))}
          </div>

          <div className="mt-10 text-sm text-ink-400 leading-relaxed max-w-2xl">
            <p>
              Pay by Paymob, Fawry, or InstaPay when you upgrade. No card
              needed to start. Switch tiers anytime.
            </p>
          </div>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* Closing CTA */}
      <section className="px-4 sm:px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl sm:text-4xl text-ink-50 mb-4 tracking-tight">
            Let&rsquo;s talk.
          </h2>
          <p
            dir="rtl"
            lang="ar"
            className="font-display text-xl sm:text-2xl text-ink-200 mb-8"
          >
            تعالى نتكلّم.
          </p>
          <p className="text-ink-300 mb-10 leading-relaxed">
            Send Ahmed a WhatsApp. He&rsquo;ll come to your gym for a free
            in-person demo, usually within a week.
          </p>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-3 px-7 py-4 rounded-md bg-brand-500 hover:bg-brand-450 text-white font-medium text-base transition-colors"
          >
            <WhatsAppGlyph />
            <span>Talk to Ahmed on WhatsApp</span>
          </a>
          <p className="text-sm text-ink-400 mt-5 font-mono">
            {WHATSAPP_NUMBER}
          </p>
        </div>
      </section>

      {/* Quiet footer -- no founder name, no LinkedIn, no booking link.
          Just the basics + a way back to the international site. */}
      <footer className="border-t border-ink-900 px-4 sm:px-6 py-10 text-xs text-ink-400">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row gap-4 sm:justify-between">
          <span>© {new Date().getFullYear()} IronPath</span>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/" className="hover:text-ink-100 transition-colors">
              International site
            </Link>
            <Link
              href="/privacy"
              className="hover:text-ink-100 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-ink-100 transition-colors"
            >
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

function WhatsAppGlyph({ small = false }: { small?: boolean }) {
  const size = small ? 14 : 18;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}
