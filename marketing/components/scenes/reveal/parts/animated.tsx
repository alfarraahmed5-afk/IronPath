'use client';

// Animated Reveal — Act 3, "the drop".
//
// Layout:
//   - Outer section is 200vh tall.
//   - First 100vh: a sticky stage holds the dashboard mock; saturation lifts
//     from grayscale to full crimson at ~30% scroll progress (the drop).
//   - The remaining 100vh is normal flow: bento, then quote, then a final
//     hairline that hands off to whatever scene is mounted next.

import { useEffect, useRef, useState } from 'react';
import { LazyMotion, domAnimation, m, useScroll, useTransform } from 'framer-motion';
import { DashboardMock } from './dashboard-mock';
import { Bento } from './bento';
import { Quote } from './quote';
import { EmberSeam } from '@/components/primitives/ember-seam';

export function AnimatedReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const [dropped, setDropped] = useState(false);

  // Scroll progress local to this section. `start end` = section enters
  // viewport, `end start` = section leaves; we slice the middle.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // Saturation: 0 (grayscale) until ~30% through the section, then snaps to 1.
  // We use a sharp-but-not-instant transform so the snap reads as deliberate
  // rather than a frame-skip.
  const saturation = useTransform(scrollYProgress, [0.22, 0.32], [0, 1]);
  const brightness = useTransform(scrollYProgress, [0.22, 0.32], [0.85, 1]);
  // Bind the two channels into a single CSS filter string. This is
  // GPU-composited and doesn't trigger React renders.
  const filter = useTransform(
    [saturation, brightness],
    ([s, b]: number[]) => `saturate(${s}) brightness(${b})`,
  );

  // Boolean drop trigger — flips once when we cross the threshold so child
  // components (NumberFlow stats) can roll exactly once. The subscribe
  // callback runs in the rAF loop, not on every React render, which keeps
  // this cheap.
  useEffect(() => {
    const unsub = scrollYProgress.on('change', (v) => {
      if (v > 0.3 && !dropped) setDropped(true);
    });
    return () => unsub();
  }, [scrollYProgress, dropped]);

  return (
    <LazyMotion features={domAnimation}>
      <section
        ref={sectionRef}
        className="relative bg-ink-950"
        aria-label="Reveal — this is IronPath"
      >
        {/* Sticky stage — 100vh of pinned content as the section's first half scrolls past. */}
        <div className="relative h-[200vh]">
          <div className="sticky top-0 h-screen flex items-center justify-center px-4 sm:px-6">
            <m.div style={{ filter }} className="w-full">
              <DashboardMock dropped={dropped} />
            </m.div>
          </div>
        </div>

        {/* Bento + quote — normal flow below the sticky stage. */}
        <div className="px-4 sm:px-6 pb-32 -mt-32 space-y-24">
          <div className="max-w-[1100px] mx-auto">
            <Bento />
          </div>
          <Quote />
        </div>

        {/* Hairline — match-cut into the next scene. */}
        <EmberSeam />
      </section>
    </LazyMotion>
  );
}
