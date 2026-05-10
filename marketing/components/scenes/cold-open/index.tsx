'use client';

// Cold Open scene -- Act 1, 0–100svh. The hero.
//
// Stack from bottom up:
//   1. <HeroPoster/>   -- AVIF chalk-hands, full-bleed, B&W. The LCP element.
//   2. <EmberCanvas/>  -- OGL ember particles (γ1). Mounts AFTER poster paints.
//                        Returns null on weak devices (γ1's check).
//   3. <Hero/>         -- headline / sub-head / CTA, fades in from t=200ms.
//   4. <EmberSeam/>    -- breathing crimson hairline at the bottom of the act.
//
// The ember canvas is gated behind `requestIdleCallback` so it cannot steal
// main-thread time from LCP. If rIC fires later than 1500ms (load is busy)
// we still arm via the fallback timeout so the canvas is up by the time the
// user starts scrolling.

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EmberCanvas } from '@/components/canvas/ember-canvas';
import { EmberSeam } from '@/components/primitives/ember-seam';
import { Hero } from './Hero';
import { HeroPoster } from './HeroPoster';

const EMBER_MOUNT_TIMEOUT_MS = 1500;

export default function ColdOpenScene() {
  const t = useTranslations('scenes.coldOpen');
  const [emberArmed, setEmberArmed] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    type WindowWithIdle = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const w = window as WindowWithIdle;
    const fire = () => setEmberArmed(true);
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(fire, { timeout: EMBER_MOUNT_TIMEOUT_MS });
    } else {
      timer = setTimeout(fire, EMBER_MOUNT_TIMEOUT_MS);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <section
      aria-label={t('ariaLabel')}
      className="relative isolate min-h-[100svh] w-full overflow-hidden bg-ink-950"
    >
      {/* Layer 1 -- LCP poster. */}
      <HeroPoster />

      {/* Layer 2 -- ember canvas. Crossfades in after poster paints.
          γ1's component returns null on weak devices; this is fine -- the
          poster carries the entire hero on its own. */}
      <EmberCanvas
        className="absolute inset-0 z-[1] mix-blend-screen"
        visible={emberArmed}
      />

      {/* Layer 3 -- foreground composition (headline, sub, CTA). */}
      <Hero />

      {/* Layer 4 -- ember seam at the act boundary. */}
      <div className="absolute inset-x-0 bottom-0 z-20">
        <EmberSeam />
      </div>
    </section>
  );
}
