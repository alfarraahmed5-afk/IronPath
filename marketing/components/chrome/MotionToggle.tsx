'use client';

// Team Gamma γ3 — Motion preference toggle.
//
// Tri-state cycle: System → Reduced → Full → System.
// - "System" follows the OS `prefers-reduced-motion` media query (no override).
// - "Reduced" forces motion off, regardless of OS.
// - "Full"    forces motion on, regardless of OS.
//
// We expose the control as `role="switch"` with `aria-checked` taking the
// values `'true' | 'false' | 'mixed'`. WAI-ARIA permits `mixed` on switches
// and we use it to express the "follow system" tri-state. The button always
// renders a visible TEXT label ("Motion: System", etc.) — no icon-only.

import { useEffect, useState } from 'react';
import { setMotionPreference, useReducedMotion } from '@/lib/preferences';

const MOTION_KEY = 'ironpath-motion';

type Mode = 'system' | 'reduced' | 'full';

function readMode(): Mode {
  if (typeof window === 'undefined') return 'system';
  const v = window.localStorage.getItem(MOTION_KEY);
  if (v === 'on') return 'full';
  if (v === 'off') return 'reduced';
  return 'system';
}

function nextMode(current: Mode): Mode {
  if (current === 'system') return 'reduced';
  if (current === 'reduced') return 'full';
  return 'system';
}

function modeLabel(mode: Mode): string {
  if (mode === 'system') return 'Motion: System';
  if (mode === 'reduced') return 'Motion: Reduced';
  return 'Motion: Full';
}

function ariaChecked(mode: Mode): 'true' | 'false' | 'mixed' {
  // For a tri-state switch:
  //   reduced (off) → false
  //   full    (on)  → true
  //   system        → mixed (defer to OS)
  if (mode === 'reduced') return 'false';
  if (mode === 'full') return 'true';
  return 'mixed';
}

export function MotionToggle() {
  // useReducedMotion gives us the *effective* state (after OS + override),
  // which the hook keeps in sync. We track our own *mode* state separately
  // because the OS-effective boolean alone cannot distinguish System-off
  // from Reduced.
  const reducedEffective = useReducedMotion();
  const [mode, setMode] = useState<Mode>('system');

  // Sync mode from localStorage on mount + on storage events.
  useEffect(() => {
    function sync() {
      setMode(readMode());
    }
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  function handleClick() {
    const next = nextMode(mode);
    setMode(next);
    if (next === 'system') setMotionPreference('system');
    else if (next === 'reduced') setMotionPreference('off');
    else setMotionPreference('on');
  }

  // Title text adds extra context for screen-reader users about what the
  // current effective state is when in System mode.
  const title =
    mode === 'system'
      ? `Motion follows your operating-system setting (currently ${reducedEffective ? 'reduced' : 'full'})`
      : modeLabel(mode);

  return (
    <button
      type="button"
      onClick={handleClick}
      role="switch"
      aria-checked={ariaChecked(mode)}
      aria-label={modeLabel(mode)}
      title={title}
      data-motion-mode={mode}
      // 44x44 minimum touch target (WCAG 2.5.5 Level AAA / 2.5.8 Level AA).
      // Padding + line-height combine to satisfy the target without bloating
      // the visual button.
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs text-ink-300 transition-colors hover:text-ink-100 focus-visible:outline-2 focus-visible:outline-offset-3"
    >
      <span aria-hidden="true">
        {mode === 'system' ? '◐' : mode === 'reduced' ? '⏸' : '▶'}
      </span>
      <span>{modeLabel(mode)}</span>
    </button>
  );
}
