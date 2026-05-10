'use client';

// EmberCanvas — public API for the cold-open scene.
//
// This file is a thin re-export of the bootstrap component, which itself
// gates everything behind a device-tier check + requestIdleCallback +
// dynamic-import. The real OGL implementation lives in
// `./ember-canvas-real.tsx` and only loads on tier A/B clients after the
// browser is idle (so it cannot contend with LCP for main-thread time).
//
// The shape of `EmberCanvasProps` is preserved so the cold-open scene's
// existing import keeps working without changes.

export { default as EmberCanvas } from '@/lib/canvas-bootstrap';

export interface EmberCanvasProps {
  /** Class to apply to the canvas wrapper. Should set absolute positioning,
   *  inset-0, opacity-0 initially. */
  className?: string;
  /** Crossfade-in trigger. When true, the canvas fades from 0 → 1 over 200ms. */
  visible?: boolean;
}
