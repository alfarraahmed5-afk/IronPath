// The brand's heartbeat. A 4px ember band fixed to the very top of the
// admin shell, edge-to-edge, with a low-opacity baseline. A pulse travels
// left-to-right every 3-6 seconds — frequent enough that you notice it
// even when nothing else is moving on the page, slow enough that it
// doesn't feel like a strobe.
//
// V1 used to render a faked "N lifting" counter — removed because the
// number wasn't real. Will return as a live count once the backend
// exposes a workout-event SSE / poll endpoint (Phase E).
//
// The travelling-pulse animation lives in the `.pulse-travel` CSS class
// (so the work happens on the GPU). Bumping `pulseKey` re-mounts the
// span which restarts the CSS animation from the start.
//
// Honors prefers-reduced-motion: no pulses fire; baseline strip is
// still visible.

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export function LivePulseStrip() {
  const reduced = useReducedMotion();
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function schedule(delay: number) {
      timer = setTimeout(() => {
        if (!alive) return;
        setPulseKey((k) => k + 1);
        // Subsequent pulses every 3-6 seconds — feels organic, not metronomic.
        schedule(3000 + Math.random() * 3000);
      }, delay);
    }

    // First pulse fires within ~700ms of mount so the user sees the strip
    // is alive within the first second on the page.
    schedule(700);

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [reduced]);

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-1 z-50 pointer-events-none overflow-hidden"
      style={{ background: 'rgba(200, 16, 46, 0.06)' }}
    >
      {!reduced && <span key={pulseKey} className="pulse-travel" />}
    </div>
  );
}
