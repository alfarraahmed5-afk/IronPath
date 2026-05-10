'use client';

// Act 2 — Inciting Incident.
//
// The cinematic spec: 200vh of scroll feeds 100vh of pinned content. Three
// "before" frames cross-fade across the scrub progress. Tone is cold and
// monochrome — NO brand crimson appears here; the crimson drop is owned by
// the Reveal scene downstream.
//
// This index is a thin selector:
//   - Reduced motion ON  → render the static stacked variant (no GSAP, no pin)
//   - Reduced motion OFF → lazy-load the GSAP-pinned variant via next/dynamic
//                          so GSAP never lands in the initial JS chunk.

import dynamic from 'next/dynamic';
import { useReducedMotion } from '@/lib/preferences';
import { StaticStack } from './parts/static-stack';

// SSR-disabled lazy import. GSAP touches `window`/`document` at module-init
// time (ScrollTrigger), so it must only run client-side AND only after the
// user has scrolled into proximity. The `loading` prop renders a placeholder
// of the correct height so the page doesn't pop on hydration.
const PinnedStack = dynamic(
  () => import('./parts/pinned-stack').then((m) => m.PinnedStack),
  {
    ssr: false,
    loading: () => (
      <section
        aria-hidden
        className="relative md:h-[200vh] bg-ink-950"
      >
        <div className="md:h-screen md:sticky md:top-0" />
      </section>
    ),
  },
);

export default function IncitingIncidentScene() {
  const reduced = useReducedMotion();

  if (reduced) {
    return <StaticStack />;
  }

  return <PinnedStack />;
}
