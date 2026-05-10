'use client';

/**
 * Sound on/off toggle — the ONLY surface that may un-mute the
 * marketing site. Per spec (sound-design + a11y council):
 *   - Real <button> with aria-pressed reflecting state.
 *   - Visible text label ("Sound on" / "Sound off") AND speaker icon
 *     — never icon-only (a11y: WCAG 1.4.1 / 2.5.3).
 *   - Touch target ≥44×44 (WCAG 2.5.5 AAA via min-h/min-w).
 *   - First "on" click awaits initAudio() INSIDE the gesture handler
 *     so iOS Safari unlocks the AudioContext on the same user
 *     interaction. We intentionally do NOT setSoundPreference until
 *     the prime resolves — if init throws, we stay muted and surface
 *     nothing to the user (silent failure is the right product call
 *     here; sound is a nice-to-have).
 *   - When the user toggles OFF we call `setMuted(true)` immediately
 *     and stopAmbient() to kill any in-flight bed without waiting on
 *     the React effect to re-render.
 */

import { useEffect, useState } from 'react';
import { useSoundOn, setSoundPreference } from '@/lib/preferences';
import { initAudio, setMuted, stopAmbient } from '@/lib/audio';

export function SoundToggle() {
  const on = useSoundOn();
  const [busy, setBusy] = useState(false);

  // Mirror the React preference into the audio module so play() /
  // playAmbient() short-circuit without a localStorage read.
  useEffect(() => {
    setMuted(!on);
    if (!on) stopAmbient();
  }, [on]);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      if (!on) {
        // Going from off -> on. The await MUST complete inside this
        // gesture handler for the iOS unlock to take effect; React
        // setState alone won't trigger a fresh user gesture.
        await initAudio();
        setMuted(false);
        setSoundPreference('on');
      } else {
        setMuted(true);
        stopAmbient();
        setSoundPreference('off');
      }
    } catch {
      // initAudio failed — stay muted, do not change preference.
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={on}
      aria-label={on ? 'Sound on. Click to mute.' : 'Sound off. Click to enable sound.'}
      disabled={busy}
      className="
        inline-flex items-center gap-2
        min-h-[44px] min-w-[44px] px-3 py-2
        text-xs text-ink-300 hover:text-ink-100
        transition-colors
        rounded-md
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-350
        disabled:opacity-60
      "
    >
      <SpeakerIcon on={on} />
      <span aria-hidden="true">Sound {on ? 'on' : 'off'}</span>
    </button>
  );
}

/**
 * Inline SVG speaker icon. Two states (on = waves, off = X overlay).
 * `aria-hidden` because the visible text label already conveys state
 * to assistive tech — we don't want screen readers double-announcing.
 */
function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* Speaker body — present in both states */}
      <path d="M3 6h2l3.5-2.5v9L5 10H3V6Z" />
      {on ? (
        <>
          <path d="M11 5.5a3 3 0 0 1 0 5" />
          <path d="M12.8 3.8a5.5 5.5 0 0 1 0 8.4" />
        </>
      ) : (
        <>
          <path d="M11 6l3 4" />
          <path d="M14 6l-3 4" />
        </>
      )}
    </svg>
  );
}
