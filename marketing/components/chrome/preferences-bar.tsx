'use client';

// STUB — Team Gamma γ3 owns the real implementation.
// Public API: chrome bar with sound toggle + reduce-motion toggle, ARIA
// pressed-state, persistent visible labels (no icon-only).

import { SoundToggle } from '@/components/sound/sound-toggle';
import { useReducedMotion, setMotionPreference } from '@/lib/preferences';

export function PreferencesBar() {
  const reduced = useReducedMotion();

  return (
    <div className="flex items-center gap-3">
      <SoundToggle />
      <button
        type="button"
        onClick={() => setMotionPreference(reduced ? 'on' : 'off')}
        aria-pressed={reduced}
        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-ink-300 hover:text-ink-100 transition-colors"
      >
        <span aria-hidden>{reduced ? '⏸' : '▶'}</span>
        <span>Motion {reduced ? 'reduced' : 'on'}</span>
      </button>
    </div>
  );
}
