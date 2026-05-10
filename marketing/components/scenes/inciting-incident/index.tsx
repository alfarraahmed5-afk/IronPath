'use client';

// Act 2 -- Inciting Incident.
//
// Iteration history:
//   v1: GSAP-pinned 200vh cross-fade between 3 isolated frames. Cinematic in
//       motion but at any single scroll position the visitor saw exactly one
//       artifact with a low-opacity caption -- founder feedback was "phone
//       signifies nothing, looks broken".
//   v2: Static 3-up grid with eyebrow + caption per card. Read at any
//       position but founder feedback was "looks cheap, scroller animations
//       are gone".
//   v3 (this): Restore the GSAP-pinned scrub BUT lay the three cards out
//       side-by-side so all three captions are always visible. Scroll
//       progress drives WHICH card is "active" (full opacity, slight scale-up)
//       while the other two are dimmed. Best of both: cinematic motion AND
//       no orphan-artifact moments. See parts/pinned-stack.tsx for the impl.
//
// This file is the dispatcher: motion-on users get the GSAP scrub (loaded
// dynamically with ssr:false so GSAP stays out of the initial bundle);
// reduced-motion users get the StaticStack variant (vertical stack, plain
// fade-in, no GSAP imported at all).

import dynamic from 'next/dynamic';
import { useReducedMotion } from '@/lib/preferences';
import { StaticStack } from './parts/static-stack';

// Dynamic import keeps GSAP out of the SSR bundle and out of the
// reduced-motion path entirely -- a reduced-motion visitor never even
// downloads the ScrollTrigger code.
const PinnedStack = dynamic(
  () => import('./parts/pinned-stack').then((m) => m.PinnedStack),
  {
    ssr: false,
    // No loading fallback: render the StaticStack while we wait so the
    // visitor never sees a blank gap. This also doubles as a graceful
    // degradation if the GSAP chunk fails to load.
    loading: () => <StaticStack />,
  },
);

export default function IncitingIncidentScene() {
  const reduced = useReducedMotion();
  return reduced ? <StaticStack /> : <PinnedStack />;
}
