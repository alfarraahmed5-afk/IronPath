'use client';

// Hero -- the foreground composition that sits over the LCP poster.
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
// CTA is the SOURCE of the cross-route morph -- `layoutId="trialCta"`. α4
// will set the matching layoutId at the admin signup landing target.

import { LazyMotion, domAnimation, m } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { VERCEL_EASE, springMagnetic } from '@/lib/motion';
import { useReducedMotion } from '@/lib/preferences';

const SIGNUP_URL = '/start';

// Performance hard-rule: defer CTA interactivity until LCP+1500ms so the
// click handler + nav prefetch can't contend with the LCP frame budget.
const CTA_INTERACTIVE_DELAY_MS = 1500;

// Session-scoped flag used to skip the cold-open intro animation when the
// visitor returns to / a second time. Without this, every back-nav re-fires
// the blur(8px) -> 0 sequence and feels jarring (founder feedback).
//
// We READ on mount inside an effect so SSR + first paint render the
// pre-animated state (blur, opacity 0). The first frame after hydration
// then either plays the intro (first visit) or hard-snaps to the end state
// (return visit). Either way the static SSR markup matches what React
// renders on the client, so no hydration warning.
const HERO_PLAYED_KEY = 'ironpath-hero-played';

export interface HeroProps {
  className?: string;
}

export function Hero({ className = '' }: HeroProps) {
  const reduced = useReducedMotion();
  const t = useTranslations('scenes.coldOpen');
  const [ctaArmed, setCtaArmed] = useState(false);

  // `null` until we've checked sessionStorage. While null we render the
  // pre-animated state (matches SSR). After the effect resolves, either:
  //   - hasPlayed=true  -> snap to end state, no animation
  //   - hasPlayed=false -> play the intro, then mark the flag
  const [hasPlayed, setHasPlayed] = useState<boolean | null>(null);
  const flagWriteScheduled = useRef(false);

  useEffect(() => {
    // Read inside useEffect so SSR doesn't try to touch sessionStorage and
    // we don't get a hydration mismatch.
    let played = false;
    try {
      played = window.sessionStorage.getItem(HERO_PLAYED_KEY) === 'true';
    } catch {
      // Private browsing / disabled storage -- treat as first visit, the
      // animation just plays once per page load. Acceptable.
      played = false;
    }
    setHasPlayed(played);
  }, []);

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
      // Safari path -- schedule on next macrotask after paint.
      timer = setTimeout(arm, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Mark the flag once the headline animation has had time to land. We
  // schedule it after the animation duration + delay so a hard back-nav
  // mid-intro still records "played" for next time.
  useEffect(() => {
    if (hasPlayed !== false || flagWriteScheduled.current) return;
    flagWriteScheduled.current = true;
    const t = setTimeout(() => {
      try {
        window.sessionStorage.setItem(HERO_PLAYED_KEY, 'true');
      } catch {
        // No-op: see read path above.
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [hasPlayed]);

  // When we've confirmed the visitor has seen the intro this session,
  // collapse all three animations to a static end-state. No translate, no
  // blur, no opacity tween -- exactly matches the post-animation frame.
  const skipIntro = hasPlayed === true;

  // Reduced-motion variant: skip blur + translate, keep a 200ms opacity
  // tween so the page doesn't snap-pop.
  const headlineAnim = skipIntro
    ? {
        initial: { opacity: 1, y: 0, filter: 'blur(0px)' },
        animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
        transition: { duration: 0 },
      }
    : reduced
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

  const subAnim = skipIntro
    ? {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0 },
      }
    : reduced
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

  const ctaAnim = skipIntro
    ? {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0 },
      }
    : reduced
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
        {/* Headline + sub-head block -- top half on mobile, vertically
            centered on sm+ via the parent grid. */}
        <div className="flex flex-1 flex-col justify-center px-6 pt-24 sm:px-12 sm:pt-0 lg:px-20">
          <div className="max-w-3xl">
            <m.h1
              {...headlineAnim}
              data-font-display
              className="font-display text-[clamp(2.75rem,8vw,5.5rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-ink-50"
            >
              {t('headlineLine1')}
              <br />
              <span className="text-ink-100">{t('headlineLine2')}</span>
            </m.h1>
            <m.p
              {...subAnim}
              className="mt-6 max-w-xl text-base leading-relaxed text-ink-300 sm:text-lg"
            >
              {t('subhead')}
            </m.p>
          </div>
        </div>

        {/* CTA cluster -- center on sm+, bottom-thumb-arc on mobile.
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
              {t('cta')}
              {/* Forward-pointing arrow. Flips horizontally under RTL via
                  the rtl: variant so it always reads as "go forward" in
                  the document's reading direction. */}
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                width="16"
                height="16"
                className="ml-2 rtl:ml-0 rtl:mr-2 rtl:-scale-x-100"
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
              {t('trust')}
            </p>
          </m.div>
        </div>
      </div>
    </LazyMotion>
  );
}
