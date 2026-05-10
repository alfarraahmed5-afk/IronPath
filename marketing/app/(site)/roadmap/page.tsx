// /roadmap — what's coming and roughly when.
//
// The companion to /pricing's deliberate trim. We list shipped features
// only on the pricing tiers; aspirational items live here with quarterly
// targets so the customer knows what they're buying into without us
// over-promising on the pricing page itself.
//
// Honesty rules:
//   - Quarter targets are aspirational. Mark them clearly.
//   - "Shipped" only when it's in production AND a customer can use it.
//   - No vapor — if something is purely aspirational with no commitment,
//     it goes in the "Maybe later" bucket, not a quarter.

import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: 'Roadmap',
  description:
    "What's shipped, what's next, and rough quarterly targets for everything in between. Honest by default — no vapor.",
  path: '/roadmap',
});

interface RoadmapItem {
  title: string;
  detail: string;
}

interface Quarter {
  label: string;
  blurb: string;
  items: RoadmapItem[];
}

const SHIPPED: RoadmapItem[] = [
  {
    title: 'Member roster + attendance',
    detail: 'Active members, last-active timestamps, manual check-in.',
  },
  {
    title: 'Workout builder, 600+ movements',
    detail: 'Per-exercise programming, set/rep schemes, gym-template routines.',
  },
  {
    title: 'Member app (iOS + Android)',
    detail: 'Workouts, attendance, profile, notifications — Expo + RN.',
  },
  {
    title: 'QR poster forge',
    detail: 'Print one A3/A4 poster, members scan, they activate. The single highest-leverage onboarding event.',
  },
  {
    title: 'Trial-end retention emails (automated)',
    detail: 'Day 21/25/28/30/31/37 sequence, brand-templated, gated by sent-log idempotency.',
  },
  {
    title: 'Activation milestone celebrations',
    detail: 'In-app toasts when a gym hits "first announcement" or "5 workouts logged".',
  },
  {
    title: 'Cancellation save flow',
    detail: 'Reason picker → contextual save offer (pause / month-free / downgrade) → confirmation. With audit trail.',
  },
  {
    title: 'Subscription receipts in admin',
    detail: 'Per-month receipts with mark-paid + extend-trial controls (super-admin operated for now).',
  },
  {
    title: 'Custom branding (logo + accent color)',
    detail: 'Per-gym brand color and logo applied across admin and member-facing surfaces.',
  },
  {
    title: 'Founder onboarding call',
    detail: 'For Unlimited tier — 30-min walkthrough with Ahmed.',
  },
];

const QUARTERS: Quarter[] = [
  {
    label: 'Q3 2026 · Jul–Sep',
    blurb: 'Closing the most-asked gaps from the pricing page.',
    items: [
      {
        title: 'Bulk member import wizard',
        detail: 'CSV + guided Mindbody / Glofox export mapping. Self-serve.',
      },
      {
        title: 'Audit log export (CSV / JSON)',
        detail: 'The audit log already exists; this is the export endpoint + filters.',
      },
      {
        title: 'Member retention emails (drip + win-back)',
        detail: 'Extend the trial-end sequence into post-conversion lifecycle.',
      },
    ],
  },
  {
    label: 'Q4 2026 · Oct–Dec',
    blurb: 'Operational depth — pricing self-serve, scheduling, finer roles.',
    items: [
      {
        title: 'Stripe billing self-serve',
        detail: 'Today billing is manual via Stripe Invoices. This is the website checkout flow.',
      },
      {
        title: 'Front-desk check-in flow',
        detail: 'Manual + QR check-in screen for staff at the door. Today only QR-poster activation is automated.',
      },
      {
        title: 'Class scheduling + waitlists',
        detail: 'Recurring class blocks, member booking, waitlist promotion. Starts here, finishes Q1 2027.',
      },
      {
        title: 'Custom branding — app name + advanced options',
        detail: 'Beyond logo + color: app name on member device, gym-specific welcome video, custom domain on member portal.',
      },
      {
        title: 'Role-based permissions (4 roles)',
        detail: 'Owner / manager / coach / front-desk. Today only owner + coach + member exist.',
      },
      {
        title: 'Read + write API access',
        detail: 'Formalize the existing backend API as a public surface with API keys, rate limits, and docs.',
      },
    ],
  },
  {
    label: 'Q1 2027 · Jan–Mar',
    blurb: 'Insights + integrations.',
    items: [
      {
        title: 'Class scheduling — finish + polish',
        detail: 'Calendar UI for owners, member-side booking, no-show tracking.',
      },
      {
        title: 'Churn risk dashboard',
        detail: 'Per-member churn signal scoring + a weekly digest email to owners.',
      },
      {
        title: 'Webhook events',
        detail: 'member.created, attendance.logged, payment.succeeded, etc. — for Zapier-style integrations.',
      },
      {
        title: 'Member-app deep customization',
        detail: 'Per-gym splash screens, push-notification voice, in-app announcement layout.',
      },
    ],
  },
  {
    label: 'Q2 2027 · Apr–Jun',
    blurb: 'Scale tier — multi-location + the operator stack.',
    items: [
      {
        title: 'Multi-location support',
        detail: 'One owner, multiple locations under one account. Per-location MRR, attendance, staff.',
      },
      {
        title: 'Owner mobile companion app',
        detail: 'Today the admin is web-only. This is the iPhone-on-the-floor view for owners.',
      },
      {
        title: 'SSO via Google Workspace',
        detail: 'For larger gyms with staff already on Google. SAML follows if asked.',
      },
      {
        title: 'Advanced analytics + cohort retention',
        detail: 'Beyond MRR + active count: retention triangles, cohort heatmaps, LTV curves.',
      },
    ],
  },
];

const MAYBE_LATER: RoadmapItem[] = [
  {
    title: 'AI-powered programming',
    detail: 'Routine generation from goals — exists in the spec, deprioritized until the rest of the platform is bulletproof.',
  },
  {
    title: 'Marketplace integrations (Whoop, Garmin, Apple Watch)',
    detail: 'Health data ingestion. Demand-led — we build it when 5+ paying gyms ask.',
  },
  {
    title: 'In-app live chat between members + coaches',
    detail: 'Tempting, but we&rsquo;d rather members message via WhatsApp than build a chat product.',
  },
  {
    title: 'Public marketplace / community feed across gyms',
    detail: 'Anti-feature per the platform plan — dilutes B2B positioning.',
  },
];

export default function RoadmapPage() {
  return (
    <main className="bg-ink-950 text-ink-50 min-h-screen">
      {/* Top utility bar */}
      <nav className="border-b border-ink-900">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-base tracking-tight text-ink-100 hover:text-ink-50 transition-colors"
          >
            IronPath
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/pricing" className="text-ink-300 hover:text-ink-50 transition-colors">
              Pricing
            </Link>
            <Link href="/blog" className="text-ink-300 hover:text-ink-50 transition-colors">
              Blog
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] text-brand-400 mb-3 tracking-wider">
            ROADMAP
          </p>
          <h1 className="font-display text-3xl sm:text-5xl text-ink-50 mb-4 tracking-tight">
            What&rsquo;s shipped, what&rsquo;s next.
          </h1>
          <p className="text-ink-300 text-base sm:text-lg max-w-xl leading-relaxed">
            Our pricing page only lists what&rsquo;s actually shipped today.
            Everything else lives here, with rough quarterly targets. Targets
            slip; we update this page when they do.
          </p>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* Shipped today */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-baseline justify-between mb-2">
            <p className="font-mono text-[11px] text-ink-400 tracking-wider">
              SHIPPED · LIVE TODAY
            </p>
            <p className="text-xs text-ink-500 font-mono">{SHIPPED.length} features</p>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl text-ink-100 mb-8 tracking-tight">
            Live in production right now.
          </h2>
          <ul className="space-y-5">
            {SHIPPED.map((item) => (
              <li key={item.title} className="border-l-2 border-brand-500 pl-4">
                <p className="text-ink-100 font-medium">{item.title}</p>
                <p className="text-ink-400 text-sm mt-1 leading-relaxed">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* Quarterly roadmap */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] text-ink-400 mb-3 tracking-wider">
            COMING UP
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-ink-100 mb-2 tracking-tight">
            Targets, not promises.
          </h2>
          <p className="text-ink-400 text-sm mb-12 max-w-xl leading-relaxed">
            Quarterly buckets reflect priority order. If you&rsquo;re a
            customer and a specific item moves you, tell us &mdash; we
            re-order based on demand from paying gyms.
          </p>

          <div className="space-y-12">
            {QUARTERS.map((q) => (
              <div key={q.label}>
                <div className="flex items-baseline justify-between mb-1">
                  <p className="font-display text-xl text-ink-100 tracking-tight">
                    {q.label}
                  </p>
                  <p className="text-xs text-ink-500 font-mono">{q.items.length} items</p>
                </div>
                <p className="text-ink-400 text-sm mb-6">{q.blurb}</p>
                <ul className="space-y-4">
                  {q.items.map((item) => (
                    <li
                      key={item.title}
                      className="border-l-2 border-ink-700 pl-4"
                    >
                      <p className="text-ink-100 font-medium">{item.title}</p>
                      <p className="text-ink-400 text-sm mt-1 leading-relaxed">
                        {item.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* Maybe later */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] text-ink-400 mb-3 tracking-wider">
            MAYBE LATER · NO COMMITMENT
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-ink-100 mb-2 tracking-tight">
            Things we&rsquo;ve thought about.
          </h2>
          <p className="text-ink-400 text-sm mb-8 max-w-xl leading-relaxed">
            On the wall, but not in any quarter. We build them when paying
            customers ask &mdash; or we don&rsquo;t build them at all.
          </p>
          <ul className="space-y-4">
            {MAYBE_LATER.map((item) => (
              <li
                key={item.title}
                className="border-l-2 border-ink-800 pl-4 opacity-80"
              >
                <p className="text-ink-200 font-medium">{item.title}</p>
                <p className="text-ink-500 text-sm mt-1 leading-relaxed">
                  {item.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* CTA */}
      <section className="px-4 sm:px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl sm:text-3xl text-ink-50 mb-4 tracking-tight">
            Want to influence priority?
          </h2>
          <p className="text-ink-300 mb-8 leading-relaxed">
            Become a paying customer. We re-order this list based on what
            real gyms need. Start with what we have today &mdash; what we
            ship next is shaped by you.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-brand-500 hover:bg-brand-450 text-white text-sm font-medium transition-colors"
          >
            <span>See pricing</span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink-900 px-4 sm:px-6 py-10 text-xs text-ink-400">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row gap-4 sm:justify-between">
          <span>© {new Date().getFullYear()} IronPath</span>
          <span>Last updated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </footer>
    </main>
  );
}
