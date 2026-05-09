import type { ReactNode } from 'react';

/**
 * Pill — small inline status / tier badge.
 *
 * Tone palette is muted to match the console's near-black canvas; the brand
 * cyan is reserved for primary actions, so status pills lean on neutrals plus
 * a single hue per state. Numbers stay in JetBrains Mono via `font-mono` from
 * the parent context (we don't override here).
 */

export type PillTone =
  | 'neutral'
  | 'cyan'
  | 'green'
  | 'amber'
  | 'red'
  | 'violet';

const TONE_CLASSES: Record<PillTone, string> = {
  neutral: 'bg-ink-700 text-ink-100 border-ink-600',
  cyan: 'bg-brand-900/40 text-brand-300 border-brand-700/60',
  green: 'bg-emerald-900/30 text-emerald-300 border-emerald-800/60',
  amber: 'bg-amber-900/30 text-amber-300 border-amber-800/60',
  red: 'bg-red-900/30 text-red-300 border-red-800/60',
  violet: 'bg-violet-900/30 text-violet-300 border-violet-800/60',
};

export function statusTone(
  status: string | null | undefined
): PillTone {
  switch (status) {
    case 'active':
      return 'green';
    case 'trial':
      return 'cyan';
    case 'expired':
      return 'amber';
    case 'cancelled':
      return 'red';
    default:
      return 'neutral';
  }
}

export function tierTone(tier: string | null | undefined): PillTone {
  switch (tier) {
    case 'starter':
      return 'neutral';
    case 'growth':
      return 'cyan';
    case 'unlimited':
      return 'violet';
    default:
      return 'neutral';
  }
}

interface PillProps {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}

export default function Pill({ tone = 'neutral', children, className = '' }: PillProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-xs border text-[11px] font-medium uppercase tracking-wider',
        TONE_CLASSES[tone],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
