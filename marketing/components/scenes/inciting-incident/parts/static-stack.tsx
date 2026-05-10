'use client';

// Reduced-motion variant of the Inciting Incident.
//
// No pinning, no scrub, no GSAP. The three cards stack vertically and fade in
// via Framer's `whileInView` (opacity-only, 200ms). Same content as the
// pinned-stack variant -- header, three cards, eyebrow + headline + caption
// baked into each card -- so reduced-motion users see exactly the same
// information, just delivered in normal scroll flow. γ3 verifies this branch
// passes the reduced-motion audit.

import { LazyMotion, domAnimation, m } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { SpreadsheetFragment } from './spreadsheet-fragment';
import { StoppedClock } from './stopped-clock';
import { SilentPhone } from './silent-phone';
import { EmberSeam } from '@/components/primitives/ember-seam';

type CardKey = 'memberships' | 'clock' | 'phone';

interface CardSpec {
  key: CardKey;
  Frame: React.ForwardRefExoticComponent<React.RefAttributes<HTMLDivElement>>;
}

const CARDS: CardSpec[] = [
  { key: 'memberships', Frame: SpreadsheetFragment },
  { key: 'clock', Frame: StoppedClock },
  { key: 'phone', Frame: SilentPhone },
];

const fade = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.2 },
};

export function StaticStack() {
  const t = useTranslations('scenes.incitingIncident');

  return (
    <LazyMotion features={domAnimation}>
      <section
        className="relative bg-ink-950"
        aria-label={t('ariaLabel')}
      >
        <div
          className="mx-auto max-w-2xl px-6 py-20"
          style={{ filter: 'saturate(0.7) brightness(0.92)' }}
        >
          {/* Header */}
          <header className="mb-12">
            <p className="font-mono text-xs text-ink-400 mb-3 tracking-wider">
              {t('eyebrow')}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl text-ink-100 mb-4 tracking-tight leading-tight">
              {t('headline')}
            </h2>
            <p className="text-ink-300 leading-relaxed text-base sm:text-lg">
              {t('lede')}
            </p>
          </header>

          {/* Three cards stacked vertically */}
          <div className="flex flex-col gap-6">
            {CARDS.map(({ key, Frame }) => (
              <m.article
                key={key}
                {...fade}
                className="rounded-xl border border-ink-800 bg-ink-900 overflow-hidden"
              >
                <div className="relative h-64 bg-ink-950 overflow-hidden">
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{
                      background:
                        'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)',
                    }}
                  />
                  <div className="absolute top-3 left-4 z-20 font-mono text-[10px] text-ink-300 tracking-wider bg-ink-950/70 backdrop-blur-sm px-2 py-1 rounded">
                    {t(`cards.${key}.eyebrow`).toUpperCase()}
                  </div>
                  <Frame />
                </div>
                <div className="p-6 flex flex-col gap-2">
                  <p className="font-display text-lg text-ink-100 leading-snug tracking-tight">
                    {t(`cards.${key}.headline`)}
                  </p>
                  <p className="text-sm text-ink-300 leading-relaxed">
                    {t(`cards.${key}.caption`)}
                  </p>
                </div>
              </m.article>
            ))}
          </div>
        </div>
        <EmberSeam />
      </section>
    </LazyMotion>
  );
}
