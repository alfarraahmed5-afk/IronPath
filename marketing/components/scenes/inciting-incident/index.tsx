'use client';

// Act 2 -- Inciting Incident.
//
// Iteration history:
//   v1 (initial): GSAP-pinned 200vh cross-fade between 3 frames. Cinematic
//       in motion but at any single scroll position the visitor saw exactly
//       ONE artifact in isolation with the caption rendering at low opacity.
//       Founder feedback: "phone signifies nothing, looks broken."
//   v2 (founder-fix attempt): static 3-up grid with eyebrow + caption on
//       each card. Read-at-any-position but founder feedback: "looks cheap,
//       scroller animations are gone."
//   v3 (this): keep the 3-up grid (clarity wins) BUT restore cinematic
//       motion via Framer Motion scroll-driven reveal + hover lift +
//       parallax inside each card. Three distinct pain points (no two
//       cards showing the same time). Cards feel like documentary film
//       stills with captions, not stock cards.

import { LazyMotion, domAnimation, m } from 'framer-motion';
import { SpreadsheetFragment } from './parts/spreadsheet-fragment';
import { StoppedClock } from './parts/stopped-clock';
import { SilentPhone } from './parts/silent-phone';
import { EmberSeam } from '@/components/primitives/ember-seam';
import { VERCEL_EASE, springMagnetic } from '@/lib/motion';

interface BeforeCard {
  Frame: React.ForwardRefExoticComponent<React.RefAttributes<HTMLDivElement>>;
  eyebrow: string;
  headline: string;
  caption: string;
}

// Three distinct pain points. The earlier version had two cards both
// showing 11:47 (analog clock + iPhone lock screen) which was visually
// redundant. Reframed each card around a different operational gap.
const CARDS: BeforeCard[] = [
  {
    Frame: SpreadsheetFragment,
    eyebrow: 'Memberships',
    headline: 'Two hundred rows in Excel.',
    caption:
      "One coach who knows where the truth is. The new hire stares at the file and asks who's still active.",
  },
  {
    Frame: StoppedClock,
    eyebrow: 'Schedule',
    headline: 'Class times live in your head.',
    caption:
      "You changed Tuesday's slot last week. Half the regulars showed up at the old time anyway.",
  },
  {
    Frame: SilentPhone,
    eyebrow: 'Signal',
    headline: 'No reach between sessions.',
    caption:
      "Members close the app and forget you exist. New sign-ups flow to whoever follows up first, and you're running the front desk.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 32, scale: 0.98 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
  viewport: { once: true, amount: 0.3 },
};

const headerFadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.6 },
  transition: { duration: 0.6, ease: VERCEL_EASE },
};

export default function IncitingIncidentScene() {
  return (
    <LazyMotion features={domAnimation} strict>
      <section
        className="relative bg-ink-950"
        aria-label="Inciting incident, what gym ownership looks like before IronPath"
      >
        <div
          className="mx-auto max-w-6xl px-6 py-24 sm:py-32"
          style={{ filter: 'saturate(0.7) brightness(0.92)' }}
        >
          <m.p
            {...headerFadeUp}
            className="font-mono text-xs text-ink-400 mb-3 tracking-wider"
          >
            BEFORE
          </m.p>
          <m.h2
            {...headerFadeUp}
            transition={{ duration: 0.7, ease: VERCEL_EASE, delay: 0.1 }}
            className="font-display text-3xl sm:text-4xl md:text-5xl text-ink-100 mb-5 tracking-tight max-w-2xl leading-tight"
          >
            What ownership looks like at 11:47am.
          </m.h2>
          <m.p
            {...headerFadeUp}
            transition={{ duration: 0.7, ease: VERCEL_EASE, delay: 0.2 }}
            className="text-ink-300 max-w-xl mb-14 sm:mb-20 leading-relaxed text-base sm:text-lg"
          >
            Forty members. One spreadsheet. No signal. The work is real but
            the system is held together by you remembering everything.
          </m.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {CARDS.map(({ Frame, eyebrow, headline, caption }, i) => (
              <m.article
                key={eyebrow}
                {...fadeUp}
                transition={{
                  duration: 0.7,
                  ease: VERCEL_EASE,
                  delay: 0.1 + i * 0.12,
                }}
                whileHover={{ y: -4 }}
                style={{ transition: 'box-shadow 200ms ease' }}
                className="group relative rounded-xl border border-ink-800 bg-ink-900 overflow-hidden flex flex-col hover:border-ink-700 hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]"
              >
                {/* Visual area, framed like a documentary still */}
                <div className="relative h-72 sm:h-80 bg-ink-950 overflow-hidden">
                  {/* Subtle vignette to make the artifact feel photographed */}
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{
                      background:
                        'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)',
                    }}
                  />
                  {/* Eyebrow stamped over the still, top-left */}
                  <div className="absolute top-3 left-4 z-20 font-mono text-[10px] text-ink-300 tracking-wider bg-ink-950/70 backdrop-blur-sm px-2 py-1 rounded">
                    {eyebrow.toUpperCase()}
                  </div>
                  <Frame />
                </div>
                {/* Caption block, like a film still title card */}
                <div className="p-6 sm:p-7 flex flex-col gap-2.5 flex-1">
                  <p className="font-display text-lg sm:text-xl text-ink-100 leading-snug tracking-tight">
                    {headline}
                  </p>
                  <p className="text-sm text-ink-300 leading-relaxed">
                    {caption}
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
