'use client';

// Act 3 -- Reveal. "The drop."
//
// This index is a thin selector mirroring inciting-incident:
//   - Reduced motion ON  → static final-state variant, no scroll-driven anim
//   - Reduced motion OFF → animated sticky-stage variant with saturation snap

import { useReducedMotion } from '@/lib/preferences';
import { AnimatedReveal } from './parts/animated';
import { StaticReveal } from './parts/static';

export default function RevealScene() {
  const reduced = useReducedMotion();
  if (reduced) return <StaticReveal />;
  return <AnimatedReveal />;
}
