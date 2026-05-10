'use client';

// STUB — Team Gamma γ2 owns the real implementation (Howler + sprite).
// Public API: a labeled <button> with aria-pressed, persistent visible
// "Sound off" / "Sound on" text + icon. Clicks toggle sound preference.
// First "on" click also primes Howler with a silent buffer (iOS unlock).

import { useSoundOn, setSoundPreference } from '@/lib/preferences';

export function SoundToggle() {
  const on = useSoundOn();

  return (
    <button
      type="button"
      onClick={() => setSoundPreference(on ? 'off' : 'on')}
      aria-pressed={on}
      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-ink-300 hover:text-ink-100 transition-colors"
    >
      <span aria-hidden>{on ? '🔊' : '🔇'}</span>
      <span>Sound {on ? 'on' : 'off'}</span>
    </button>
  );
}
