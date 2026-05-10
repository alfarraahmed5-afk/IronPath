'use client';

// Team Gamma γ3 — Real implementation.
// Renders the SoundToggle (γ2) + MotionToggle (γ3), top-right of the header.
// Both child controls own their own visible text labels, ARIA semantics,
// touch-target sizing, and persistence.

import { SoundToggle } from '@/components/sound/sound-toggle';
import { MotionToggle } from '@/components/chrome/MotionToggle';

export function PreferencesBar() {
  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label="Site preferences"
    >
      <SoundToggle />
      <MotionToggle />
    </div>
  );
}
