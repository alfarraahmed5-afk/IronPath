'use client';

import { LazyMotion, domAnimation } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { TierCard, type TierSlug } from './TierCard';
import type { Feature } from './parts/FeatureList';

// Act 5 -- Pricing.
// Three-card grid, flowing (no pin). NumberFlow on prices, hover lift on
// every card, subtle accent pulse on Growth. NO "MOST POPULAR" badge.
//
// Each tier deep-links to admin's signup with a `tier=` query param so the
// onboarding flow can preselect the plan.

interface TierSpec {
  slug: TierSlug;
  accent?: boolean;
}

// Tier slugs + accent flag are layout decisions and stay in code. Tier name,
// cap, tagline, PRICE, currency, feature copy, and CTA all flow from the
// message catalog (scenes.pricing.tiers.{slug}.*). Locale-driven price is
// non-negotiable: EN visitors see $49/$99/$199, AR visitors see EGP
// 1,350/2,750/5,300 ج.م. Same shape, different numbers per locale.
//
// Feature lists are trimmed to ONLY shipped items. Aspirational items live
// on /roadmap with quarterly targets. Honesty over breadth.
const TIER_SPECS: TierSpec[] = [
  { slug: 'starter' },
  { slug: 'growth', accent: true },
  { slug: 'unlimited' },
];

export default function PricingScene() {
  const t = useTranslations('scenes.pricing');
  const tiers = TIER_SPECS.map((spec) => ({
    ...spec,
    name: t(`tiers.${spec.slug}.name`),
    cap: t(`tiers.${spec.slug}.cap`),
    tagline: t(`tiers.${spec.slug}.tagline`),
    cta: t(`tiers.${spec.slug}.cta`),
    // Price is locale-driven via the message catalog. next-intl returns
    // numeric values from JSON as strings via t.raw; cast to number for
    // NumberFlow inside TierCard.
    price: Number(t(`tiers.${spec.slug}.price`)),
    currency: t(`tiers.${spec.slug}.currency`),
    features: [
      { text: t(`tiers.${spec.slug}.features.f1`) },
      { text: t(`tiers.${spec.slug}.features.f2`) },
      { text: t(`tiers.${spec.slug}.features.f3`) },
      { text: t(`tiers.${spec.slug}.features.f4`) },
    ] as Feature[],
  }));

  return (
    <LazyMotion features={domAnimation} strict>
      <section
        aria-labelledby="pricing-heading"
        className="relative border-t border-ink-900 bg-ink-950 px-4 sm:px-6 py-20 sm:py-28"
      >
        <div className="max-w-[1200px] mx-auto">
          <header className="text-center mb-12 sm:mb-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400 mb-3">
              {t('eyebrow')}
            </p>
            <h2
              id="pricing-heading"
              data-font-display
              className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05] mb-4"
            >
              {t('headline')}
            </h2>
            <p className="text-ink-300 text-base sm:text-lg max-w-xl mx-auto">
              {t('lede')}
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {tiers.map((tier) => (
              <TierCard
                key={tier.slug}
                slug={tier.slug}
                name={tier.name}
                price={tier.price}
                cap={tier.cap}
                tagline={tier.tagline}
                features={tier.features}
                accent={tier.accent}
                ctaLabel={tier.cta}
                perMonthLabel={t('perMonth')}
                currencySymbol={tier.currency}
              />
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-ink-400">
            {t('footnote')}
            {' · '}
            <a
              href="/roadmap"
              className="text-ink-300 hover:text-brand-400 transition-colors underline-offset-2 hover:underline"
            >
              {t('footnoteLink')} <span aria-hidden className="rtl:inline-block rtl:-scale-x-100">→</span>
            </a>
          </p>
        </div>
      </section>
    </LazyMotion>
  );
}
