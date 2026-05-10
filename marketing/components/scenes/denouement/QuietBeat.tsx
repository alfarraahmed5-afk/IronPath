'use client';

// Quiet Beat — the breath before the Crescendo CTA.
// 50vh tall, one centered line, ONE expo.out reveal (the only place that
// curve appears on the page). A tighter ember seam sits above the line:
// 12px halo, opacity 0.12 — quieter than every other seam.

import { m, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useReducedMotion } from '@/lib/preferences';

// expo.out — `1 - 2^(-10x)`. Approximated as a cubic-bezier so it
// composites on the GPU and obeys MotionConfig's reducedMotion rule.
// This is the ONLY place this curve appears on the page; please keep it
// that way (see the creative-director's red lines).
const EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function QuietBeat() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // `once: true` so scrolling back up doesn't replay the reveal.
  const inView = useInView(ref, { once: true, amount: 0.6 });

  return (
    <section
      ref={ref}
      className="relative h-[50vh] grid place-items-center px-4"
      aria-label="Free trial reassurance"
    >
      {/* Tighter ember seam — 12px halo, opacity 0.12. Authored inline
          (not via `<EmberSeam />`) because we need the unique geometry. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[calc(50%-3.5rem)] -translate-x-1/2 w-48 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(200,16,46,0.12) 50%, transparent 100%)',
          boxShadow: '0 0 12px rgba(200,16,46,0.12)',
        }}
      />

      <m.p
        initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : undefined}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 1.2, ease: EXPO_OUT }
        }
        className="font-display text-2xl sm:text-3xl text-ink-100 text-center tracking-tight"
      >
        30 days free. Members never pay.
      </m.p>
    </section>
  );
}

export default QuietBeat;
