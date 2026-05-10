'use client';

// Reduced-motion variant of the Reveal.
//
// No sticky stage, no scroll-driven filter, no rolling numbers. The dashboard
// mock renders ONCE in its final state with the stat row showing the final
// values inside a `role="status"` live region (handled inside StatRow when
// `staticFinal` is set). The cinematic "drop" is delivered by an explicit
// heading: "This is IronPath." with a 200ms opacity fade.

import { LazyMotion, domAnimation, m } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { DashboardMock } from './dashboard-mock';
import { Bento } from './bento';
import { Quote } from './quote';
import { EmberSeam } from '@/components/primitives/ember-seam';

const fade = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.2 },
};

export function StaticReveal() {
  const t = useTranslations('scenes.reveal');
  return (
    <LazyMotion features={domAnimation}>
      <section
        className="relative bg-ink-950 px-4 sm:px-6 py-24 space-y-16"
        aria-label={t('ariaLabel')}
      >
        <m.h2
          {...fade}
          data-font-display
          className="font-display text-3xl sm:text-5xl text-ink-50 text-center max-w-3xl mx-auto tracking-tight"
        >
          {t('headline')}
        </m.h2>

        <m.div {...fade} className="w-full max-w-[1100px] mx-auto">
          {/* Dropped + staticFinal -- the static final state, accessible live region. */}
          <DashboardMock dropped staticFinal />
        </m.div>

        <m.div {...fade} className="max-w-[1100px] mx-auto">
          <Bento />
        </m.div>

        <Quote />

        <EmberSeam />
      </section>
    </LazyMotion>
  );
}
