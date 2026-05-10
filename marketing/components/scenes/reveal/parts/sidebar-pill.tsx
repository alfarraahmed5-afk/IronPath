'use client';

// Sliding sidebar pill for the dashboard mock.
//
// 4 simulated nav items; the active item rotates every 3s. The pill is a
// shared layoutId element (`navActivePillDemo`) so Framer animates it
// between positions instead of remounting it. This mirrors the actual admin
// shell pattern, which uses `navActivePill` — using a `Demo` suffix here
// keeps marketing isolated from any cross-route morph.

import { useEffect, useState } from 'react';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { useReducedMotion } from '@/lib/preferences';

const ITEMS = ['Members', 'Workouts', 'Billing', 'Insights'] as const;

export function SidebarPill() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % ITEMS.length);
    }, 3000);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <LazyMotion features={domAnimation}>
      <nav
        aria-label="Dashboard demo navigation"
        className="flex flex-col gap-1 p-2"
      >
        {ITEMS.map((label, i) => {
          const isActive = i === active;
          return (
            <div
              key={label}
              className="relative px-3 py-2 text-xs font-medium text-ink-300"
            >
              {isActive && (
                <m.span
                  layoutId="navActivePillDemo"
                  className="absolute inset-0 rounded-md bg-brand-500/15 border border-brand-500/30"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span
                className={`relative ${isActive ? 'text-ink-50' : 'text-ink-400'}`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </nav>
    </LazyMotion>
  );
}
