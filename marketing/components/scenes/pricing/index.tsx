'use client';

import { LazyMotion, domAnimation } from 'framer-motion';
import { TierCard, type TierSlug } from './TierCard';
import type { Feature } from './parts/FeatureList';

// Act 5 — Pricing.
// Three-card grid, flowing (no pin). NumberFlow on prices, hover lift on
// every card, subtle accent pulse on Growth. NO "MOST POPULAR" badge.
//
// Each tier deep-links to admin's signup with a `tier=` query param so the
// onboarding flow can preselect the plan.

interface Tier {
  slug: TierSlug;
  name: string;
  price: number;
  cap: string;
  tagline: string;
  features: Feature[];
  accent?: boolean;
}

// Feature lists are intentionally trimmed to ONLY what's shipped today.
// Aspirational items (class scheduling, churn dashboard, multi-location,
// SSO, etc.) live on /roadmap with quarterly targets. Honesty over breadth.
const TIERS: Tier[] = [
  {
    slug: 'starter',
    name: 'Starter',
    price: 49,
    cap: 'Up to 50 members',
    tagline: 'For the studio finding its rhythm.',
    features: [
      { text: 'Member roster & attendance' },
      { text: 'Workout programming, 600+ movements' },
      { text: 'QR poster forge' },
      { text: 'Email support' },
    ],
  },
  {
    slug: 'growth',
    name: 'Growth',
    price: 99,
    cap: 'Up to 200 members',
    tagline: 'For the gym hitting its stride.',
    features: [
      { text: 'Everything in Starter' },
      { text: 'Subscription receipts in admin' },
      { text: 'Trial-end retention emails (automated)' },
      { text: 'Activation milestone celebrations' },
    ],
    accent: true,
  },
  {
    slug: 'unlimited',
    name: 'Unlimited',
    price: 199,
    cap: 'No member cap',
    tagline: 'For the box that keeps growing.',
    features: [
      { text: 'Everything in Growth' },
      { text: 'Custom branding (logo + accent color)' },
      { text: 'Founder onboarding call' },
      { text: 'Priority email support' },
    ],
  },
];

export default function PricingScene() {
  return (
    <LazyMotion features={domAnimation} strict>
      <section
        aria-labelledby="pricing-heading"
        className="relative border-t border-ink-900 bg-ink-950 px-4 sm:px-6 py-20 sm:py-28"
      >
        <div className="max-w-[1200px] mx-auto">
          <header className="text-center mb-12 sm:mb-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400 mb-3">
              Act 5 · Pricing
            </p>
            <h2
              id="pricing-heading"
              className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05] mb-4"
            >
              One price. Pick your size.
            </h2>
            <p className="text-ink-300 text-base sm:text-lg max-w-xl mx-auto">
              Every plan unlocks the full IronPath product. The only thing
              that changes is how many members you bring.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {TIERS.map((t) => (
              <TierCard
                key={t.slug}
                slug={t.slug}
                name={t.name}
                price={t.price}
                cap={t.cap}
                tagline={t.tagline}
                features={t.features}
                accent={t.accent}
              />
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-ink-400">
            All tiers include the 30-day trial. Switch tiers anytime.
            {' · '}
            <a
              href="/roadmap"
              className="text-ink-300 hover:text-brand-400 transition-colors underline-offset-2 hover:underline"
            >
              See what&rsquo;s shipping next →
            </a>
          </p>
        </div>
      </section>
    </LazyMotion>
  );
}
