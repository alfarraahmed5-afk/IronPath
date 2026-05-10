// Team Alpha α4 — the brand's heartbeat. A 4px ember band fixed to the
// very top of the admin shell, edge-to-edge, ~1% opacity baseline. A
// pulse travels left-to-right every 6-12s (random) so the surface feels
// alive even when nothing is happening. A small mono counter in the
// top-right shows N members lifting right now (faked 0-12 for v1; real
// workout events wire in later).
//
// The travelling-pulse animation lives in the `.pulse-travel` CSS class
// (built by α3) — keying on `pulseKey` re-mounts the span so the CSS
// animation replays from the start.
//
// Honors prefers-reduced-motion: when reduced, no pulses fire and the
// timer never starts.

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export function LivePulseStrip() {
  const reduced = useReducedMotion();
  const [pulseKey, setPulseKey] = useState(0);
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (reduced) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function tick() {
      // Random delay 6-12s — feels organic, not metronomic.
      const delay = 6000 + Math.random() * 6000;
      timer = setTimeout(() => {
        if (!alive) return;
        setPulseKey((k) => k + 1);
        // 40% of the time, drift the counter ±1 within [0, 12].
        if (Math.random() < 0.4) {
          setCount((c) => {
            const next = c + (Math.random() < 0.5 ? -1 : 1);
            return Math.max(0, Math.min(12, next));
          });
        }
        tick();
      }, delay);
    }

    tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [reduced]);

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-1 z-50 pointer-events-none overflow-hidden"
      style={{ background: 'rgba(255, 107, 53, 0.04)' }}
    >
      {!reduced && <span key={pulseKey} className="pulse-travel" />}
      <div
        className="absolute top-2 right-4 text-[10px] font-mono uppercase tracking-wider text-brand-400/80 pointer-events-none"
        data-numeric
      >
        {count} lifting
      </div>
    </div>
  );
}
