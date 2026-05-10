'use client';

// LivePulseStrip -- the brand's heartbeat.
//
// A 1px ember sliver fixed to the very top of the marketing shell,
// edge-to-edge, dark background. A 12% wide crimson sweep travels
// left-to-right every 6-12 seconds -- frequent enough that you notice
// it even when nothing else is moving on the page, slow enough that
// it never reads as a strobe.
//
// Ported from admin/src/components/LivePulseStrip.tsx, but rewritten
// to use marketing's own `useReducedMotion` (from @/lib/preferences)
// which honors the in-app motion toggle in addition to the OS-level
// `prefers-reduced-motion` media query.
//
// Honors reduced motion: when on, the sweep is suppressed entirely
// and only the static 1px hairline baseline remains visible.

import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/lib/preferences';

// Sweep timing -- random within this window for an organic, non-metronomic feel.
const MIN_INTERVAL_MS = 6000;
const MAX_INTERVAL_MS = 12000;
// First sweep fires shortly after mount so the strip "comes alive" fast.
const FIRST_SWEEP_MS = 800;
// One sweep duration -- must match the inline animation below.
const SWEEP_DURATION_MS = 2200;

export function LivePulseStrip() {
  const reduced = useReducedMotion();
  // Bumping `pulseKey` re-mounts the sweep span, restarting the CSS
  // animation from frame 0.
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function schedule(delay: number) {
      timer = setTimeout(() => {
        if (!alive) return;
        setPulseKey((k) => k + 1);
        const next =
          MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
        schedule(next);
      }, delay);
    }

    schedule(FIRST_SWEEP_MS);

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [reduced]);

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-px z-50 pointer-events-none overflow-hidden bg-ink-950"
    >
      {/* Static baseline hairline -- visible whether or not motion is reduced. */}
      <div
        className="absolute inset-0 h-px"
        style={{ background: 'rgba(200, 16, 46, 0.10)' }}
      />
      {/* Travelling sweep -- suppressed under reduced motion. */}
      {!reduced && (
        <span
          key={pulseKey}
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '1px',
            width: '12%',
            background:
              'linear-gradient(90deg, transparent 0%, rgba(200, 16, 46, 0.95) 50%, transparent 100%)',
            transform: 'translateX(-100%)',
            animation: `live-pulse-sweep ${SWEEP_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
            willChange: 'transform',
          }}
        />
      )}
      {/* Inline keyframes -- keeps this primitive self-contained, no global
          CSS dependency beyond Tailwind utilities. */}
      <style>{`
        @keyframes live-pulse-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(900%); }
        }
      `}</style>
    </div>
  );
}
