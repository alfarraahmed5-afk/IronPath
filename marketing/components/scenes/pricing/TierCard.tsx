'use client';

import { useRef } from 'react';
import { m, useInView } from 'framer-motion';
import NumberFlow from '@number-flow/react';
import { FeatureList, type Feature } from './parts/FeatureList';
import { springMagnetic, VERCEL_EASE } from '@/lib/motion';
import { useReducedMotion } from '@/lib/preferences';

// TierCard — a single pricing plan card.
//
// Behavior:
// - NumberFlow on the price digit, triggered the first time the card enters
//   the viewport. With reduced-motion, NumberFlow is skipped entirely and
//   we render the static price.
// - Hover lift (`y: -4, scale: 1.02`) with springMagnetic. Skipped when
//   reduced-motion is on.
// - Per-tier CTA opens admin signup with `?tier=<slug>` query.
// - The Growth tier opts in via the `accent` prop, which adds a 4s
//   boxShadow opacity loop (0.4 → 0.6 → 0.4). No "MOST POPULAR" badge.

export type TierSlug = 'starter' | 'growth' | 'unlimited';

export interface TierCardProps {
  slug: TierSlug;
  name: string;
  price: number;
  cap: string;
  tagline: string;
  features: Feature[];
  /** Subtle pulse + slightly stronger border, no badge. */
  accent?: boolean;
}

const ADMIN_SIGNUP = '/start';

export function TierCard({
  slug,
  name,
  price,
  cap,
  tagline,
  features,
  accent = false,
}: TierCardProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // `once: true` means we trigger the NumberFlow animation a single time —
  // re-entering the viewport doesn't replay it (would feel gimmicky).
  const inView = useInView(ref, { once: true, margin: '-100px' });

  const hover = reduced
    ? undefined
    : { y: -4, scale: 1.02, transition: springMagnetic };

  // Accent pulse: animate the boxShadow opacity in a 4s loop. Disabled when
  // reduced-motion is on — the static accent border is enough.
  const accentAnimate =
    accent && !reduced
      ? {
          boxShadow: [
            '0 0 0 1px rgba(255, 69, 102, 0.4), 0 30px 80px -40px rgba(255, 69, 102, 0.25)',
            '0 0 0 1px rgba(255, 69, 102, 0.6), 0 36px 90px -40px rgba(255, 69, 102, 0.4)',
            '0 0 0 1px rgba(255, 69, 102, 0.4), 0 30px 80px -40px rgba(255, 69, 102, 0.25)',
          ],
        }
      : undefined;

  const accentTransition = accent
    ? { duration: 4, repeat: Infinity, ease: 'easeInOut' as const }
    : undefined;

  return (
    <m.div
      ref={ref}
      data-tier={slug}
      whileHover={hover}
      animate={accentAnimate}
      transition={accentTransition}
      className={[
        'relative rounded-2xl border bg-ink-900 p-6 sm:p-7 flex flex-col',
        accent
          ? 'border-brand-500/40'
          : 'border-ink-800 hover:border-ink-700 transition-colors',
      ].join(' ')}
    >
      <header className="mb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-2">
          {name}
        </p>
        <p className="text-sm text-ink-300 mb-4">{tagline}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-ink-400 text-2xl">$</span>
          <span
            data-numeric
            className="font-display text-5xl sm:text-6xl tracking-tight tabular-nums text-ink-50"
          >
            {reduced ? (
              price
            ) : (
              <NumberFlow
                value={inView ? price : 0}
                transformTiming={{ duration: 700, easing: cubicBezierToCss(VERCEL_EASE) }}
                spinTiming={{ duration: 700, easing: cubicBezierToCss(VERCEL_EASE) }}
                opacityTiming={{ duration: 350, easing: 'ease-out' }}
              />
            )}
          </span>
          <span className="text-ink-400 text-sm">/mo</span>
        </div>
        <p className="mt-2 text-xs font-mono uppercase tracking-[0.14em] text-brand-400">
          {cap}
        </p>
      </header>

      <FeatureList items={features} />

      <div className="mt-6 pt-6 border-t border-ink-800/80">
        <a
          href={`${ADMIN_SIGNUP}?tier=${slug}`}
          className={[
            'block w-full text-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
            accent
              ? 'bg-brand-500 text-white hover:bg-brand-450'
              : 'bg-ink-50 text-ink-950 hover:bg-white',
          ].join(' ')}
        >
          Start free trial
        </a>
      </div>
    </m.div>
  );
}

/**
 * NumberFlow's *Timing options expect CSS easing strings. Convert framer's
 * cubic-bezier tuple so we keep a single source of truth for the curve.
 */
function cubicBezierToCss(b: [number, number, number, number]): string {
  return `cubic-bezier(${b[0]}, ${b[1]}, ${b[2]}, ${b[3]})`;
}
