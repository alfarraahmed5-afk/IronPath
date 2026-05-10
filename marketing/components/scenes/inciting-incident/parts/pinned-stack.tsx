'use client';

// The animated, pinned variant of the Inciting Incident.
//
// Why GSAP and not framer-motion: we need ScrollTrigger's pinning. Framer's
// scroll primitives can't pin a sticky element for an exact viewport range
// while scrubbing arbitrary properties on multiple children. GSAP also lets
// us write to refs via `gsap.quickSetter` which avoids the React-state-in-
// onUpdate trap that drops 60fps to 20.
//
// Mobile fork: ScrollTrigger.matchMedia disables pinning under 768px -- on
// touch + small viewports the pin behavior is jarring and battery-expensive,
// so we collapse to a normal stacked flow there too.
//
// This module is loaded via next/dynamic with ssr:false so GSAP stays out of
// the initial client bundle.

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SpreadsheetFragment } from './spreadsheet-fragment';
import { StoppedClock } from './stopped-clock';
import { SilentPhone } from './silent-phone';
import { EmberSeam } from '@/components/primitives/ember-seam';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export function PinnedStack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frame1Ref = useRef<HTMLDivElement>(null);
  const frame2Ref = useRef<HTMLDivElement>(null);
  const frame3Ref = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const seamRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const container = containerRef.current;
      const stage = stageRef.current;
      if (!container || !stage) return;

      const mm = gsap.matchMedia();

      // Desktop / large-tablet: full pinned scrub experience.
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        // quickSetter writes are committed straight to the DOM without any
        // React reconciliation. This is the only sane way to scrub at 60fps.
        const set1 = frame1Ref.current ? gsap.quickSetter(frame1Ref.current, 'opacity') : null;
        const set2 = frame2Ref.current ? gsap.quickSetter(frame2Ref.current, 'opacity') : null;
        const set3 = frame3Ref.current ? gsap.quickSetter(frame3Ref.current, 'opacity') : null;
        const setSeam = seamRef.current
          ? gsap.quickSetter(seamRef.current, 'height', 'px')
          : null;
        const setCaption = captionRef.current
          ? gsap.quickSetter(captionRef.current, 'opacity')
          : null;

        // Initial state -- only frame 1 visible, hairline at 1px, caption muted.
        set1?.(1);
        set2?.(0);
        set3?.(0);
        setSeam?.(1);
        setCaption?.(0.55);

        const trigger = ScrollTrigger.create({
          trigger: container,
          start: 'top top',
          end: '+=200%',
          pin: stage,
          pinSpacing: true,
          scrub: 1,
          // Three-way crossfade. progress range:
          //   0.00 - 0.33  spreadsheet visible, others hidden
          //   0.33 - 0.66  clock fading in, spreadsheet fading out
          //   0.66 - 1.00  phone fading in, clock fading out
          onUpdate: (self) => {
            const p = self.progress;

            // Frame 1: 1 → 0 across [0.20, 0.40]
            const o1 = 1 - clamp01((p - 0.2) / 0.2);
            // Frame 2: 0 → 1 across [0.30, 0.50], 1 → 0 across [0.55, 0.72]
            const o2In = clamp01((p - 0.3) / 0.2);
            const o2Out = 1 - clamp01((p - 0.55) / 0.17);
            const o2 = Math.min(o2In, o2Out);
            // Frame 3: 0 → 1 across [0.65, 0.85]
            const o3 = clamp01((p - 0.65) / 0.2);

            set1?.(o1);
            set2?.(o2);
            set3?.(o3);

            // Hairline thickens 1 → 2px
            setSeam?.(1 + p);
            // Caption rises in opacity slightly through scrub
            setCaption?.(0.55 + p * 0.45);
          },
        });

        return () => trigger.kill();
      });

      // Mobile / reduced-motion-not-yet-engaged-by-OS: NO pinning. Just stack
      // the frames vertically so scroll feels native. Reduced-motion users hit
      // the upstream branch in index.tsx and never load this module at all,
      // but matchMedia still guards in case the OS pref flips mid-session.
      mm.add('(max-width: 767px)', () => {
        // Show all three at full opacity -- the layout below already stacks
        // them in normal flow on mobile via CSS.
        if (frame1Ref.current) frame1Ref.current.style.opacity = '1';
        if (frame2Ref.current) frame2Ref.current.style.opacity = '1';
        if (frame3Ref.current) frame3Ref.current.style.opacity = '1';
        if (captionRef.current) captionRef.current.style.opacity = '1';
        if (seamRef.current) seamRef.current.style.height = '1px';
      });

      return () => mm.revert();
    },
    { scope: containerRef },
  );

  return (
    <section
      ref={containerRef}
      // 200vh container; the stage child is pinned for the duration.
      className="relative md:h-[200vh] bg-ink-950"
      aria-label="Inciting incident -- the silence before"
    >
      <div
        ref={stageRef}
        // Pinned stage: full viewport on desktop. On mobile this becomes a
        // normal-flow column where the three frames just stack.
        className="md:h-screen md:sticky md:top-0 flex flex-col items-stretch overflow-hidden"
      >
        {/* Saturation -30%, monochrome tilt -- this entire stage stays cold. */}
        <div
          className="relative flex-1 flex md:block flex-col"
          style={{ filter: 'saturate(0.7) brightness(0.92)' }}
        >
          {/* Three crossfade frames. Absolute on desktop (one slot), static on mobile. */}
          <div className="relative flex-1 md:flex-none md:absolute md:inset-0 min-h-[50vh] md:min-h-0">
            <SpreadsheetFragment ref={frame1Ref} />
          </div>
          <div className="relative flex-1 md:flex-none md:absolute md:inset-0 min-h-[50vh] md:min-h-0">
            <StoppedClock ref={frame2Ref} />
          </div>
          <div className="relative flex-1 md:flex-none md:absolute md:inset-0 min-h-[50vh] md:min-h-0">
            <SilentPhone ref={frame3Ref} />
          </div>
        </div>

        {/* Caption -- fixed center-bottom on the pinned stage. */}
        <div className="relative md:absolute md:inset-x-0 md:bottom-[18vh] z-10 px-6 py-10 md:py-0 grid place-items-center pointer-events-none">
          <p
            ref={captionRef}
            className="font-display text-2xl sm:text-3xl md:text-4xl text-ink-100 text-center max-w-[28ch] tracking-tight"
          >
            Forty members. One spreadsheet. No signal.
          </p>
        </div>

        {/* Hairline -- thickens through scrub, hands off to Reveal. */}
        <div
          ref={seamRef}
          className="absolute inset-x-0 bottom-0 overflow-hidden"
          style={{ height: '1px' }}
        >
          <EmberSeam />
        </div>
      </div>
    </section>
  );
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
