'use client';

import { useEffect, useRef, useState } from 'react';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { CapabilityPanel, type CapabilitySlug } from './CapabilityPanel';
import { useReducedMotion } from '@/lib/preferences';
import { VERCEL_EASE } from '@/lib/motion';

// Act 4 -- Capability.
// Desktop (>=768px, motion ON): a vertically pinned section whose 4 child
//   panels translate horizontally as the user scrolls. ~600vh of scroll is
//   consumed (header + pin window + release).
// Mobile (<768px) OR reduced-motion: pinning + horizontal translation cut
//   entirely. Panels restack vertically and reveal with framer-motion's
//   whileInView (opacity-only when reduced).
//
// GSAP is dynamically imported INSIDE the effect so it never enters the
// initial JS payload -- keeps the marketing bundle lean for LCP-bound users.

// Panel copy is locale-driven (see messages/{en,ar}.json `scenes.capability.panels`).
// We keep only the slug + visual ordering here; the eyebrow / title / copy
// strings are pulled from the message catalog at render time.
const PANEL_SLUGS: CapabilitySlug[] = ['roster', 'grow', 'receipt', 'pulse'];

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
  const t = useTranslations('scenes.capability');
  return (
    <header className="px-4 sm:px-6 pt-20 sm:pt-28 pb-10 max-w-[1200px] mx-auto">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400 mb-3">
        {t('eyebrow')}
      </p>
      <h2
        id="capability-heading"
        data-font-display
        className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05] max-w-3xl"
      >
        {t('headline')}
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
        // Don't kill all ScrollTriggers -- other scenes may share the singleton.
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  const t = useTranslations('scenes.capability.panels');
  return (
    <div ref={sectionRef} className="relative overflow-hidden h-screen">
      <div
        ref={trackRef}
        className="flex h-full items-stretch will-change-transform"
      >
        {PANEL_SLUGS.map((slug, i) => (
          <CapabilityPanel
            key={slug}
            index={i}
            slug={slug}
            eyebrow={t(`${slug}.eyebrow`)}
            title={t(`${slug}.title`)}
            copy={t(`${slug}.copy`)}
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
  const t = useTranslations('scenes.capability.panels');
  return (
    <div className="px-4 sm:px-6 pb-24 max-w-[1200px] mx-auto space-y-16">
      {PANEL_SLUGS.map((slug, i) => (
        <m.div
          key={slug}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
          whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.5, ease: VERCEL_EASE }}
        >
          <CapabilityPanel
            index={i}
            slug={slug}
            eyebrow={t(`${slug}.eyebrow`)}
            title={t(`${slug}.title`)}
            copy={t(`${slug}.copy`)}
          />
        </m.div>
      ))}
    </div>
  );
}
