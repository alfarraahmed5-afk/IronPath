'use client';

// Crescendo CTA -- the page's only full-bleed CTA. Single near-black
// section, centered crimson button with a 3s breathing radial pulse,
// trust line below.
//
// On click: animate the button to fill the viewport (480ms), THEN
// navigate to the admin signup. See `lib/cross-route-handoff.ts` for
// why we do it this way (cross-origin, no real Framer FLIP possible).
//
// This component shares `layoutId="trialCta"` with α1's Cold Open hero
// CTA -- within the marketing route, scrolling between them produces a
// real Framer FLIP morph using `springModal` (380/32, ~480ms).

import { m, useAnimationControls } from 'framer-motion';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { springModal } from '@/lib/motion';
import { useReducedMotion } from '@/lib/preferences';
import {
  TRIAL_CTA_LAYOUT_ID,
  HANDOFF_SCALE_OUT_MS,
  HANDOFF_EASE,
  navigateToSignup,
} from '@/lib/cross-route-handoff';

export function CrescendoCTA() {
  const reduced = useReducedMotion();
  const t = useTranslations('scenes.denouement.crescendo');
  const controls = useAnimationControls();
  const [navigating, setNavigating] = useState(false);

  async function handleClick() {
    if (navigating) return;
    setNavigating(true);

    if (reduced) {
      // Reduced motion: skip the scale-out, go straight to admin.
      navigateToSignup('hero');
      return;
    }

    // Animate the button to fill the viewport, then hand off.
    // We use viewport units so the morph reads as a true page-takeover
    // regardless of the source button's intrinsic size.
    await controls.start({
      scale: 12,
      borderRadius: 0,
      transition: {
        duration: HANDOFF_SCALE_OUT_MS / 1000,
        ease: HANDOFF_EASE,
      },
    });
    navigateToSignup('hero');
  }

  return (
    <section
      className="relative w-full min-h-[100svh] grid place-items-center px-4 bg-ink-950 overflow-hidden"
      aria-label={t('ariaLabel')}
    >
      {/* Near-black backdrop with a faint radial vignette so the crimson
          button reads as the only emitter of light in the frame. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(20,20,24,0) 0%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      <div className="relative flex flex-col items-center gap-6">
        {/* The CTA itself -- `layoutId` shares with α1's Cold Open button.
            Wrapped in a positioning shell so the scale-out doesn't shove
            the trust line around. */}
        <div className="relative w-[480px] max-w-[calc(100vw-2rem)] h-16">
          <m.button
            type="button"
            onClick={handleClick}
            layoutId={TRIAL_CTA_LAYOUT_ID}
            animate={controls}
            transition={springModal}
            whileHover={reduced ? undefined : { scale: 1.02 }}
            whileTap={reduced ? undefined : { scale: 0.98 }}
            className={[
              'absolute inset-0 grid place-items-center',
              'bg-brand-500 text-white font-display text-lg font-semibold tracking-tight',
              'rounded-2xl shadow-[0_0_60px_-10px_rgba(200,16,46,0.6)]',
              !reduced && 'animate-ember-breathe',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-350/60',
              navigating && 'pointer-events-none',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              // 3s breathing radial pulse loop on top of tailwind's
              // `ember-breathe` (8s opacity wash). The radial pulse uses
              // `background-image` so it composites on the GPU.
              backgroundImage: reduced
                ? undefined
                : 'radial-gradient(circle at center, rgba(255,69,102,0.45) 0%, transparent 70%)',
              backgroundSize: '200% 200%',
              backgroundPosition: 'center',
              animationDuration: reduced ? undefined : '3s',
            }}
            aria-label={t('ariaLabel')}
          >
            <span data-font-display>{t('cta')}</span>
          </m.button>
        </div>

        <p className="text-xs text-ink-400 text-center max-w-md">
          {t('trust')}
        </p>
      </div>
    </section>
  );
}

export default CrescendoCTA;
