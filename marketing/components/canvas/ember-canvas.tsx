'use client';

// STUB — Team Gamma γ1 owns the real implementation (OGL ember-particle layer).
// Public API: a positioned <canvas> that crossfades over the AVIF poster
// AFTER LCP. Mounts via dynamic import + requestIdleCallback. Returns null
// on weak devices (per device-tier check); the AVIF poster stays as the
// hero in that case.
//
// Until γ1 fills in: returns null. The hero is just the AVIF poster.

export interface EmberCanvasProps {
  /** Class to apply to the canvas wrapper. Should set absolute positioning,
   *  inset-0, opacity-0 initially. */
  className?: string;
  /** Crossfade-in trigger. When true, the canvas fades from 0 → 1 over 200ms. */
  visible?: boolean;
}

export function EmberCanvas(_props: EmberCanvasProps): null {
  return null;
}
