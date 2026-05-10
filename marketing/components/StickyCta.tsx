'use client';

// Mobile-only sticky CTA pill that fades in once the visitor has scrolled
// past 50vh and disappears when they scroll BACK down (the down-scroll
// signal usually means they're re-reading something -- don't cover it).
//
// Why scroll-direction matters (per conversion-gtm council):
//   - Always-visible mobile CTAs hurt content engagement; the pill
//     covers prose, gets ignored as banner-blindness, and trains users
//     to distrust the page chrome.
//   - Reveal on UP-scroll signals "the user is heading back to the top
//     to look for the CTA" -- meet them where they are.
//   - Hide on DOWN-scroll signals "they're still reading" -- get out of
//     their way.
//
// Performance:
//   - Single passive scroll listener on window. Throttled via rAF -- no
//     mid-frame layout thrash even on a low-end Android.
//   - rAF-based; never blocks the main thread on long pages.
//   - Position: fixed; safe-area-inset-bottom for iPhone notch.
//
// Reduced-motion:
//   - When the user prefers reduced motion, we skip the slide-in
//     animation but still show/hide the pill. The CTA itself is too
//     important to hide entirely.

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/preferences';

export interface StickyCtaProps {
  /** Where the pill links to. Defaults to the page-local lead-form anchor. */
  href?: string;
  /** Override the default label (kept short -- "Start free trial" by default). */
  label?: string;
  className?: string;
}

const SHOW_THRESHOLD_PX = (): number =>
  typeof window === 'undefined' ? 600 : window.innerHeight * 0.5;

export function StickyCta({
  href = '#lead-form',
  label = 'Start free trial',
  className = '',
}: StickyCtaProps) {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  // Refs avoid re-renders on every scroll tick; we only setState when
  // the visibility decision actually flips.
  const lastYRef = useRef(0);
  const tickingRef = useRef(false);
  const visibleRef = useRef(false);

  useEffect(() => {
    function update() {
      tickingRef.current = false;
      const y = window.scrollY;
      const past = y > SHOW_THRESHOLD_PX();
      // Direction: positive delta = scrolling DOWN (page content moves up).
      const goingUp = y < lastYRef.current;
      lastYRef.current = y;

      // Decision matrix:
      //   - Below threshold → never visible (hero is right there).
      //   - Above threshold + going up → show.
      //   - Above threshold + going down → hide.
      //   - Above threshold + no movement (delta 0) → preserve previous
      //     state (handles touch-scroll inertia stalls cleanly).
      let next: boolean;
      if (!past) {
        next = false;
      } else if (goingUp) {
        next = true;
      } else if (y > lastYRef.current) {
        next = false;
      } else {
        // Down or stationary -- only hide once we're definitively past the
        // threshold AND the user is moving down. Otherwise hold.
        next = visibleRef.current;
        if (!goingUp && y - lastYRef.current === 0) {
          // stationary -- preserve
        } else {
          next = false;
        }
      }

      if (next !== visibleRef.current) {
        visibleRef.current = next;
        setVisible(next);
      }
    }

    function onScroll() {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(update);
    }

    lastYRef.current = window.scrollY;
    window.addEventListener('scroll', onScroll, { passive: true });
    // Re-evaluate on resize so the threshold tracks viewport changes.
    window.addEventListener('resize', onScroll, { passive: true });
    // Run once so we're consistent with the current scroll position.
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Hidden via translate so we don't trigger layout when the pill is
  // off-screen. With reduced motion, we toggle opacity only.
  const transform = reduceMotion
    ? ''
    : visible
      ? 'translate-y-0 opacity-100'
      : 'translate-y-[140%] opacity-0';
  const reducedTransform = reduceMotion
    ? visible
      ? 'opacity-100'
      : 'opacity-0 pointer-events-none'
    : '';

  return (
    <div
      // md:hidden -- desktop has the inline CTA + sticky header link, so
      // the pill is mobile-only. (Tablet portrait is still mobile here.)
      className={`fixed inset-x-4 bottom-0 z-50 flex justify-center pb-[max(env(safe-area-inset-bottom),12px)] md:hidden transition-all duration-300 ease-out ${transform} ${reducedTransform} ${className}`}
      aria-hidden={visible ? 'false' : 'true'}
    >
      <Link
        href={href}
        prefetch={false}
        className="pointer-events-auto inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_-8px_rgba(200,16,46,0.7)] ring-1 ring-brand-450 transition-colors hover:bg-brand-450 focus:outline-none focus:ring-2 focus:ring-brand-350 focus:ring-offset-2 focus:ring-offset-ink-950"
        // Don't let an invisible pill receive focus (keyboard tab-trap).
        tabIndex={visible ? 0 : -1}
      >
        {label}
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
