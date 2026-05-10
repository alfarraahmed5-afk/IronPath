'use client';

import { useEffect, useRef, useState } from 'react';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { CapabilityPanel, type CapabilitySlug } from './CapabilityPanel';
import { useReducedMotion } from '@/lib/preferences';
import { VERCEL_EASE } from '@/lib/motion';

// Act 4 — Capability.
// Desktop (>=768px, motion ON): a vertically pinned section whose 4 child
//   panels translate horizontally as the user scrolls. ~600vh of scroll is
//   consumed (header + pin window + release).
// Mobile (<768px) OR reduced-motion: pinning + horizontal translation cut
//   entirely. Panels restack vertically and reveal with framer-motion's
//   whileInView (opacity-only when reduced).
//
// GSAP is dynamically imported INSIDE the effect so it never enters the
// initial JS payload — keeps the marketing bundle lean for LCP-bound users.

const PANELS: Array<{
  slug: CapabilitySlug;
  eyebrow: string;
  title: string;
  copy: string;
}> = [
  {
    slug: 'roster',
    eyebrow: 'Roster',
    title: 'Every member, every workout, every week.',
    copy: 'A living grid of who walked in, who skipped, who is on a streak. Catch churn before it leaves.',
  },
  {
    slug: 'grow',
    eyebrow: 'Grow',
    title: 'Print one poster. Members scan. They are in.',
    copy: 'Generate a QR poster for the front door. Walk-ins self-onboard from their phone — no front-desk laptop required.',
  },
  {
    slug: 'receipt',
    eyebrow: 'Receipt',
    title: 'Your gym’s books. No spreadsheets.',
    copy: 'Subscriptions, drop-ins, refunds — totalled and reconciled by Friday. Paper receipt, pixel-perfect.',
  },
  {
    slug: 'pulse',
    eyebrow: 'Live pulse',
    title: 'See lifts as they happen.',
    copy: 'Members log sets from the floor. You see the room breathe — active counts, fresh PRs, the live current.',
  },
];

/**
 * SSR-safe matchMedia hook. Returns `false` on first render to keep server
 * + client markup in sync, then upgrades after hydration.
 */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

export default function CapabilityScene() {
  const reduced = useReducedMotion();
  const isDesktop = useIsDesktop();
  const useHorizontal = isDesktop && !reduced;

  return (
    <LazyMotion features={domAnimation} strict>
      <section
        aria-labelledby="capability-heading"
        className="relative border-t border-ink-900 bg-ink-950"
      >
        <SceneHeader />
        {useHorizontal ? <HorizontalPanels /> : <StackedPanels reduced={reduced} />}
      </section>
    </LazyMotion>
  );
}

function SceneHeader() {
  return (
    <header className="px-4 sm:px-6 pt-20 sm:pt-28 pb-10 max-w-[1200px] mx-auto">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400 mb-3">
        Act 4 · Capability
      </p>
      <h2
        id="capability-heading"
        className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05] max-w-3xl"
      >
        Four screens. One operating room for your gym.
      </h2>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Desktop / motion-on: GSAP horizontal scroll inside a pinned section.
// ---------------------------------------------------------------------------

function HorizontalPanels() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      // Total horizontal travel: distance from track right edge to viewport
      // right edge. Computed live to avoid layout thrash on resize.
      const tween = gsap.to(track, {
        x: () => -(track.scrollWidth - section.clientWidth),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${track.scrollWidth - section.clientWidth}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });

      cleanup = () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        // Don't kill all ScrollTriggers — other scenes may share the singleton.
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <div ref={sectionRef} className="relative overflow-hidden h-screen">
      <div
        ref={trackRef}
        className="flex h-full items-stretch will-change-transform"
      >
        {PANELS.map((p, i) => (
          <CapabilityPanel
            key={p.slug}
            index={i}
            slug={p.slug}
            eyebrow={p.eyebrow}
            title={p.title}
            copy={p.copy}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile / reduced-motion fork: simple vertical stack with whileInView fades.
// ---------------------------------------------------------------------------

function StackedPanels({ reduced }: { reduced: boolean }) {
  return (
    <div className="px-4 sm:px-6 pb-24 max-w-[1200px] mx-auto space-y-16">
      {PANELS.map((p, i) => (
        <m.div
          key={p.slug}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
          whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.5, ease: VERCEL_EASE }}
        >
          <CapabilityPanel
            index={i}
            slug={p.slug}
            eyebrow={p.eyebrow}
            title={p.title}
            copy={p.copy}
          />
        </m.div>
      ))}
    </div>
  );
}
