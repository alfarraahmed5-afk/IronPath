// Phase C.4 — β2 — Tier-cap warning banner.
//
// Inline banner inserted at the top of pages where the operator should be
// reminded that they're approaching (or have hit) their plan's member cap.
// Pure presentation: caller passes `memberCount` + `tier` so the same
// component can be mounted on MembersPage, InvitesPage, or anywhere else.
//
// Thresholds:
//   - < 80%  → render nothing
//   - 80-99% → amber soft-warning ("approaching cap")
//   - ≥ 100% → brand-crimson hard-warning ("plan is full")
//
// Tier 'unlimited' (and any future infinite tier) never renders.

import { AlertTriangle, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export type TierCapTier = 'starter' | 'growth' | 'unlimited' | null;

interface TierCapWarningProps {
  memberCount: number;
  tier: TierCapTier;
}

const TIER_CAPS: Record<'starter' | 'growth' | 'unlimited', number> = {
  starter: 50,
  growth: 200,
  unlimited: Infinity,
};

function tierLabel(t: 'starter' | 'growth'): string {
  return t === 'starter' ? 'Starter' : 'Growth';
}

export default function TierCapWarning({
  memberCount,
  tier,
}: TierCapWarningProps) {
  // Hooks must run unconditionally on every render — call them first, then
  // gate on the result. Otherwise React throws "rendered fewer hooks…".
  const navigate = useNavigate();

  // Unlimited tiers (and any non-finite cap) never warn.
  if (tier === 'unlimited') return null;

  // Treat null/unknown tier as Starter — most conservative cap, so the
  // operator is still nudged toward picking a plan if they're close.
  const effectiveTier: 'starter' | 'growth' = tier === 'growth' ? 'growth' : 'starter';
  const cap = TIER_CAPS[effectiveTier];

  if (!Number.isFinite(cap)) return null;

  const pct = memberCount / cap;
  if (pct < 0.8) return null;

  const isHard = pct >= 1.0;

  const Icon = isHard ? Ban : AlertTriangle;

  // Two visual languages: amber for "you're approaching", brand-crimson
  // (saturated) for "you're at/over the cap and we're about to block you".
  const containerCx = isHard
    ? 'bg-brand-500/15 border border-brand-500/60 text-ink-50'
    : 'bg-amber-500/10 border border-amber-500/40 text-amber-200';

  const iconCx = isHard ? 'text-brand-500' : 'text-amber-400';

  const message = isHard
    ? `${memberCount} of ${cap} members. Your ${tierLabel(effectiveTier)} plan is full. Upgrade to invite more.`
    : `${memberCount} of ${cap} members. You're approaching your ${tierLabel(effectiveTier)} cap — upgrade to keep growing.`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-3 rounded-xl px-4 py-3 sm:px-5 sm:py-4',
        'mb-4',
        containerCx
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn('h-5 w-5 shrink-0', iconCx)}
      />
      <p className="flex-1 text-sm leading-snug">{message}</p>
      <PrimaryButton
        magnetic
        onClick={() => navigate('/subscription')}
        className="shrink-0"
      >
        Upgrade plan
      </PrimaryButton>
    </div>
  );
}
