'use client';

// Inciting Incident -- pinned, scroll-scrubbed.
//
// Iteration history:
//   v1: ScrollTrigger pinned a 200vh container and cross-faded between three
//       full-bleed frames with one floating caption. Cinematic but at any
//       single scroll position only ONE frame was visible -- the visitor
//       saw a phone in isolation and read it as "this signifies nothing".
//   v2: Static 3-up grid with always-visible captions. Read at any position
//       but founder feedback was "looks cheap, scroller animations are gone".
//   v3 (this): Restore the GSAP-pinned scrub BUT lay the three cards out
//       side-by-side so all three captions are always visible. Scroll
//       progress drives which card is "active" (full opacity, slight scale-up)
//       while the other two are dimmed.
//
// Why GSAP and not framer-motion: we need ScrollTrigger's pin + scrub. Framer's
// scroll primitives can't pin a sticky element for an exact viewport range
// while scrubbing arbitrary properties on multiple children. GSAP also lets
// us write through `gsap.quickSetter` which avoids the React-state-in-onUpdate
// trap that drops 60fps to 20.
//
// Mobile fork (< 768px): ScrollTrigger.matchMedia bypasses the pin entirely
// and renders the three cards as a vertical stack. Pinning on small touch
// viewports is jarring + battery-expensive, and the always-visible captions
// already give the desktop scrub its informational payload.
//
// This module is loaded via next/dynamic with ssr:false so GSAP stays out of
// the initial client bundle.

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { useTranslations } from 'next-intl';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SpreadsheetFragment } from './spreadsheet-fragment';
import { StoppedClock } from './stopped-clock';
import { SilentPhone } from './silent-phone';
import { EmberSeam } from '@/components/primitives/ember-seam';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

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

export function PinnedStack() {
  const t = useTranslations('scenes.incitingIncident');

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const card0Ref = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const seamRef = useRef<HTMLDivElement>(null);

  const cardRefs = [card0Ref, card1Ref, card2Ref];

  useGSAP(
    () => {
      const container = containerRef.current;
      const stage = stageRef.current;
      if (!container || !stage) return;

      const mm = gsap.matchMedia();

      // Desktop / large-tablet: pinned scrub. Three cards laid out in a row;
      // scroll progress drives which one is "active".
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        // Per-card setters. quickSetter writes go straight to the DOM with no
        // React reconciliation -- the only sane way to scrub at 60fps.
        const setters = cardRefs.map((ref) => {
          const el = ref.current;
          if (!el) return null;
          return {
            opacity: gsap.quickSetter(el, 'opacity'),
            scale: gsap.quickSetter(el, 'scale'),
          };
        });
        const setSeam = seamRef.current
          ? gsap.quickSetter(seamRef.current, 'height', 'px')
          : null;

        // Initial state -- card 0 active, others dimmed.
        applyCardState(setters, 0);
        setSeam?.(1);

        const trigger = ScrollTrigger.create({
          trigger: container,
          start: 'top top',
          end: '+=200%',
          pin: stage,
          pinSpacing: true,
          scrub: 1,
          onUpdate: (self) => {
            const p = self.progress;
            // Map scroll progress to "active card index":
            //   0.00 - 0.33  card 0 (spreadsheet) active
            //   0.33 - 0.66  card 1 (clock) active
            //   0.66 - 1.00  card 2 (phone) active
            const active = p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2;
            applyCardState(setters, active);

            // Hairline thickens 1 -> 2px through the scrub.
            setSeam?.(1 + p);
          },
        });

        return () => trigger.kill();
      });

      // Mobile / small viewport: NO pinning, NO scrub. The cards stack
      // vertically in normal flow (handled by the CSS grid below) and we just
      // make sure all of them are at full opacity + scale.
      mm.add('(max-width: 767px)', () => {
        cardRefs.forEach((ref) => {
          if (ref.current) {
            ref.current.style.opacity = '1';
            ref.current.style.transform = 'scale(1)';
          }
        });
        if (seamRef.current) seamRef.current.style.height = '1px';
      });

      return () => mm.revert();
    },
    { scope: containerRef },
  );

  return (
    <section
      ref={containerRef}
      // 200vh container on desktop -- the stage child is pinned for the
      // duration of the scroll. On mobile (md:hidden) the container collapses
      // to natural height and the stage flows in a normal column.
      className="relative md:h-[200vh] bg-ink-950"
      aria-label={t('ariaLabel')}
    >
      <div
        ref={stageRef}
        // Pinned stage: full viewport on desktop. Saturation/brightness reduced
        // so the entire act stays cold -- before the brand color arrives in
        // the next scene.
        className="md:h-screen md:sticky md:top-0 flex flex-col overflow-hidden"
        style={{ filter: 'saturate(0.7) brightness(0.92)' }}
      >
        <div className="flex-1 flex flex-col px-6 md:px-10 py-10 md:py-14 mx-auto max-w-7xl w-full">
          {/* Header */}
          <header className="mb-8 md:mb-10 max-w-2xl">
            <p className="font-mono text-xs text-ink-400 mb-3 tracking-wider">
              {t('eyebrow')}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-ink-100 mb-4 tracking-tight leading-tight">
              {t('headline')}
            </h2>
            <p className="text-ink-300 max-w-xl leading-relaxed text-base sm:text-lg">
              {t('lede')}
            </p>
          </header>

          {/* The three cards. On desktop they live in a 3-column grid that
              fills the remaining stage height; on mobile they stack. */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 min-h-0">
            {CARDS.map(({ key, Frame }, i) => (
              <article
                key={key}
                ref={cardRefs[i]}
                // Cards are positioned/scaled by GSAP via quickSetter on
                // desktop. We set transform-origin so the scale-up reads as
                // "stepping forward" rather than "growing from a corner".
                style={{ transformOrigin: 'center center' }}
                className="group relative rounded-xl border border-ink-800 bg-ink-900 overflow-hidden flex flex-col will-change-transform"
              >
                {/* Visual area -- documentary still */}
                <div className="relative h-56 md:h-[42vh] md:max-h-[420px] bg-ink-950 overflow-hidden flex-none">
                  {/* Vignette */}
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
                    {t(`cards.${key}.eyebrow`).toUpperCase()}
                  </div>
                  <Frame />
                </div>
                {/* Caption block -- always visible, baked into the card.
                    This is the v1 -> v3 fix: no more captions floating
                    separately from their visuals. */}
                <div className="p-5 md:p-6 flex flex-col gap-2 flex-1">
                  <p className="font-display text-base md:text-lg text-ink-100 leading-snug tracking-tight">
                    {t(`cards.${key}.headline`)}
                  </p>
                  <p className="text-sm text-ink-300 leading-relaxed">
                    {t(`cards.${key}.caption`)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Hairline -- thickens through scrub, hands off to Reveal scene. */}
        <div
          ref={seamRef}
          className="absolute inset-x-0 bottom-0 overflow-hidden"
          style={{ height: '1px' }}
        >
          <EmberSeam />
        </div>
      </div>
    </section>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────

type CardSetter = {
  opacity: ReturnType<typeof gsap.quickSetter>;
  scale: ReturnType<typeof gsap.quickSetter>;
} | null;

// Apply the "one active, two dimmed" state. Active card: opacity 1, scale 1.
// Inactive cards: opacity 0.45, scale 0.96. Values picked so the active card
// reads as "stepping forward" without the others disappearing -- the visitor
// can still read all three captions at once.
function applyCardState(setters: CardSetter[], activeIdx: number) {
  for (let i = 0; i < setters.length; i++) {
    const s = setters[i];
    if (!s) continue;
    if (i === activeIdx) {
      s.opacity(1);
      s.scale(1);
    } else {
      s.opacity(0.45);
      s.scale(0.96);
    }
  }
}
