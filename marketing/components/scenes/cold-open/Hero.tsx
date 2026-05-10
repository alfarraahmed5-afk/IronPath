'use client';

// Hero — the foreground composition that sits over the LCP poster.
//
// Animation choreography (per motion-design lens, VERCEL_EASE everywhere):
//   t=0       : poster paints (LCP)
//   t=200ms   : <h1> opacity 0→1, blur(8px)→0, y 12→0          (600ms)
//   t=260ms   : sub-head opacity 0→1, y 8→0                     (480ms)
//   t=420ms   : CTA opacity 0→1, y 6→0                          (360ms)
//   LCP+1500  : CTA becomes interactive (pointer-events: auto)
//
// Reduced-motion fork: collapse all of the above to a single 200ms opacity
// fade. No translate, no blur. Same composition, same final state.
//
// CTA is the SOURCE of the cross-route morph — `layoutId="trialCta"`. α4
// will set the matching layoutId at the admin signup landing target.

import { LazyMotion, domAnimation, m } from 'framer-motion';
import { useEffect, useState } from 'react';
import { VERCEL_EASE, springMagnetic } from '@/lib/motion';
import { useReducedMotion } from '@/lib/preferences';

const SIGNUP_URL = 'https://admin.ironpath.health/signup';

// Performance hard-rule: defer CTA interactivity until LCP+1500ms so the
// click handler + nav prefetch can't contend with the LCP frame budget.
const CTA_INTERACTIVE_DELAY_MS = 1500;

export interface HeroProps {
  className?: string;
}

export function Hero({ className = '' }: HeroProps) {
  const reduced = useReducedMotion();
  const [ctaArmed, setCtaArmed] = useState(false);

  useEffect(() => {
    // Wait for first paint, then schedule arming via requestIdleCallback so
    // we don't fight LCP for main-thread time. Falls back to setTimeout for
    // Safari (no rIC).
    let timer: ReturnType<typeof setTimeout> | null = null;
    const arm = () => {
      timer = setTimeout(() => setCtaArmed(true), CTA_INTERACTIVE_DELAY_MS);
    };
    type WindowWithIdle = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const w = window as WindowWithIdle;
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(arm, { timeout: 2000 });
    } else {
      // Safari path — schedule on next macrotask after paint.
      timer = setTimeout(arm, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Reduced-motion variant: skip blur + translate, keep a 200ms opacity
  // tween so the page doesn't snap-pop.
  const headlineAnim = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.2, ease: VERCEL_EASE },
      }
    : {
        initial: { opacity: 0, y: 12, filter: 'blur(8px)' },
        animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
        transition: { duration: 0.6, ease: VERCEL_EASE, delay: 0.2 },
      };

  const subAnim = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.2, ease: VERCEL_EASE, delay: 0.06 },
      }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.48, ease: VERCEL_EASE, delay: 0.26 },
      };

  const ctaAnim = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.2, ease: VERCEL_EASE, delay: 0.12 },
      }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.36, ease: VERCEL_EASE, delay: 0.42 },
      };

  return (
    <LazyMotion features={domAnimation} strict>
      <div
        className={`relative z-10 flex h-full w-full flex-col ${className}`}
      >
        {/* Headline + sub-head block — top half on mobile, vertically
            centered on sm+ via the parent grid. */}
        <div className="flex flex-1 flex-col justify-center px-6 pt-24 sm:px-12 sm:pt-0 lg:px-20">
          <div className="max-w-3xl">
            <m.h1
              {...headlineAnim}
              className="font-display text-[clamp(2.75rem,8vw,5.5rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-ink-50"
            >
              Run your gym,
              <br />
              <span className="text-ink-100">not software.</span>
            </m.h1>
            <m.p
              {...subAnim}
              className="mt-6 max-w-xl text-base leading-relaxed text-ink-300 sm:text-lg"
            >
              For independent gym owners burned by Mindbody. Workouts in your
              members&apos; pockets. Members tracked, churn predicted.
            </m.p>
          </div>
        </div>

        {/* CTA cluster — center on sm+, bottom-thumb-arc on mobile.
            `pb-[max(env(safe-area-inset-bottom),1.5rem)]` honors iOS home
            indicator on mobile only; sm+ keeps the standard padding. */}
        <div
          className={[
            'px-6 sm:px-12 lg:px-20',
            // Mobile: pin to bottom 30% of viewport (thumb arc).
            'pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-6',
            // sm+: anchor under the headline block, not at the very bottom.
            'sm:pb-12',
          ].join(' ')}
        >
          <m.div
            {...ctaAnim}
            className="flex flex-col items-start gap-3"
          >
            <m.a
              href={SIGNUP_URL}
              data-testid="hero-cta"
              layoutId="trialCta"
              whileTap={reduced ? undefined : { scale: 0.97 }}
              transition={springMagnetic}
              tabIndex={ctaArmed ? 0 : -1}
              aria-disabled={!ctaArmed}
              style={{
                pointerEvents: ctaArmed ? 'auto' : 'none',
              }}
              className={[
                'inline-flex items-center justify-center',
                'rounded-md bg-brand-500 px-6 py-3.5',
                'font-display text-base font-semibold tracking-tight text-white',
                'shadow-[0_8px_32px_-8px_rgba(200,16,46,0.6)]',
                'transition-shadow duration-200',
                'hover:bg-[#D71B3A] hover:shadow-[0_12px_40px_-6px_rgba(200,16,46,0.75)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-350 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950',
                'min-h-[48px] min-w-[200px]',
              ].join(' ')}
            >
              Start free trial
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                width="16"
                height="16"
                className="ml-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </m.a>
            <p className="text-xs text-ink-400">
              30-day free trial. No card. Cancel anytime.
            </p>
          </m.div>
        </div>
      </div>
    </LazyMotion>
  );
}
