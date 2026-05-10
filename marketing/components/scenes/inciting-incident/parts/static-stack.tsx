'use client';

// Reduced-motion variant of the Inciting Incident.
//
// No pinning, no scrub, no GSAP. The three frames simply stack vertically and
// fade in via Framer's `whileInView` (opacity-only, 200ms). The caption is a
// normal heading. γ3 verifies this branch passes the reduced-motion audit.

import { LazyMotion, domAnimation, m } from 'framer-motion';
import { SpreadsheetFragment } from './spreadsheet-fragment';
import { StoppedClock } from './stopped-clock';
import { SilentPhone } from './silent-phone';
import { EmberSeam } from '@/components/primitives/ember-seam';

const fade = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.2 },
};

export function StaticStack() {
  return (
    <LazyMotion features={domAnimation}>
      <section
        className="relative bg-ink-950"
        aria-label="Inciting incident -- the silence before"
      >
        <div style={{ filter: 'saturate(0.7) brightness(0.92)' }}>
          {/* Three frames stacked vertically. Each occupies ~70vh so they
              breathe but don't dominate. */}
          {[SpreadsheetFragment, StoppedClock, SilentPhone].map((Frame, i) => (
            <m.div
              key={i}
              {...fade}
              className="relative h-[70vh] min-h-[420px]"
            >
              <Frame />
            </m.div>
          ))}
          <m.div
            {...fade}
            className="px-6 py-16 grid place-items-center"
          >
            <p className="font-display text-2xl sm:text-3xl md:text-4xl text-ink-100 text-center max-w-[28ch] tracking-tight">
              Forty members. One spreadsheet. No signal.
            </p>
          </m.div>
        </div>
        <EmberSeam />
      </section>
    </LazyMotion>
  );
}
