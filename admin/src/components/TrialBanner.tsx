// Phase C.3 β1 — TrialBanner. Always-visible header strip surfacing the
// trial countdown, gym-wide stats, and the convert-to-paid CTA. Per plan
// §4.4: "Persistent header banner: `Day 18/30 · 47 members active · 312
// workouts logged` with 'Convert to paid' CTA."
//
// Renders ONLY for gyms whose `subscription_status === 'trial'`. Active /
// expired / cancelled gyms see nothing — the orchestrator can mount this
// unconditionally between the LivePulseStrip and the topbar; the component
// self-suppresses for non-trial tenants.
//
// Color treatment shifts as the trial dwindles, so the banner becomes more
// urgent over time without ever being shouty:
//   days > 14   → ink baseline + 4px brand accent (subtle)
//   days 8-14   → amber band   (heads-up)
//   days 1-7    → brand-500 band (urgent)
//   days <= 0   → brand-600 saturated band (expired)
//
// On mount: fade + slide from -y8 → 0 (240ms VERCEL_EASE).
// On urgency-tier transition (we re-render with new tier): the left-edge
// accent pulses once. Both effects honor `useReducedMotion`.

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import api from '@/lib/api';
import { PrimaryButton } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { VERCEL_EASE } from '@/lib/motion';

// ---------- types ----------

type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';

interface MeGym {
  subscription_status?: SubscriptionStatus;
  subscription_tier?: string | null;
  subscription_expires_at?: string | null;
  trial_started_at?: string | null;
}

interface MeResponse {
  gym?: MeGym | null;
}

interface AdminStats {
  active_members?: number;
  workouts_this_month?: number;
}

type Tier = 'safe' | 'warn' | 'urgent' | 'expired';

// ---------- helpers ----------

const MS_PER_DAY = 86_400_000;

function daysFromNow(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / MS_PER_DAY);
}

function dayNumberSinceStart(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  // Day 1 is the start day itself, so floor + 1.
  return Math.floor((Date.now() - t) / MS_PER_DAY) + 1;
}

function urgencyTier(daysRemaining: number | null): Tier {
  if (daysRemaining === null) return 'safe';
  if (daysRemaining <= 0) return 'expired';
  if (daysRemaining <= 7) return 'urgent';
  if (daysRemaining <= 14) return 'warn';
  return 'safe';
}

// Container background + border classes per urgency tier. Kept as static
// strings so Tailwind's JIT can pick them up at build time.
function tierShellCx(tier: Tier): string {
  switch (tier) {
    case 'expired':
      return 'bg-brand-600 border-b border-brand-600 text-ink-50';
    case 'urgent':
      return 'bg-brand-500/15 border-b border-ink-800 text-ink-50';
    case 'warn':
      return 'bg-amber-500/15 border-b border-ink-800 text-ink-50';
    case 'safe':
    default:
      return 'bg-ink-850 border-b border-ink-800 text-ink-200';
  }
}

// Left-edge accent stripe — the colored "spine" of the banner. Slightly
// thicker than a hairline so it reads as a deliberate accent.
function tierAccentCx(tier: Tier): string {
  switch (tier) {
    case 'expired':
      return 'bg-ink-50/80';
    case 'urgent':
      return 'bg-brand-500';
    case 'warn':
      return 'bg-amber-500/70';
    case 'safe':
    default:
      return 'bg-brand-500/30';
  }
}

function formatNumber(n: number | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US');
}

// ---------- component ----------

export default function TrialBanner() {
  const reduced = useReducedMotion();
  const [gym, setGym] = useState<MeGym | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  // Track the previous urgency tier so we can pulse the accent stripe
  // when it transitions (e.g. day 15 → day 14 = safe → warn).
  const prevTierRef = useRef<Tier | null>(null);
  const [accentPulseKey, setAccentPulseKey] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([api.get('/admin/me'), api.get('/admin/stats')])
      .then(([meRes, statsRes]) => {
        if (!alive) return;
        if (meRes.status === 'fulfilled') {
          const data = (meRes.value.data?.data ?? meRes.value.data) as MeResponse;
          setGym(data?.gym ?? null);
        } else {
          setErrored(true);
        }
        if (statsRes.status === 'fulfilled') {
          const data = (statsRes.value.data?.data ?? statsRes.value.data) as AdminStats;
          setStats(data ?? null);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // ---------- derived state ----------

  const status = gym?.subscription_status;
  const daysRemaining = daysFromNow(gym?.subscription_expires_at ?? null);
  const dayN = dayNumberSinceStart(gym?.trial_started_at ?? null);
  const tier = urgencyTier(daysRemaining);

  // Pulse the accent when the urgency tier changes mid-session (e.g. a
  // long-lived tab tips from day 15 → day 14). On first non-loading render
  // we just record the current tier without pulsing.
  useEffect(() => {
    if (loading) return;
    const prev = prevTierRef.current;
    if (prev !== null && prev !== tier) {
      setAccentPulseKey((k) => k + 1);
    }
    prevTierRef.current = tier;
  }, [tier, loading]);

  // ---------- render gates ----------

  // Loading: keep the banner area reserved with skeletons so we don't
  // ship a layout-shift on the first paint of the shell. We don't yet
  // know the trial status, so show a neutral baseline.
  if (loading) {
    return (
      <div
        className="relative h-10 w-full bg-ink-850 border-b border-ink-800"
        aria-busy="true"
      >
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500/30"
        />
        <div className="h-full flex items-center gap-4 pl-4 pr-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-56" />
          <div className="flex-1" />
          <Skeleton className="h-7 w-32 rounded-md" />
        </div>
      </div>
    );
  }

  // Hard render gate per spec: only trial gyms see this banner.
  if (errored || !status || status !== 'trial') {
    return null;
  }

  // ---------- copy ----------

  const dayLabel = dayN === null ? 'Day ?/30' : `Day ${dayN}/30`;
  const membersLabel = `${formatNumber(stats?.active_members)} members`;
  const workoutsLabel = `${formatNumber(stats?.workouts_this_month)} workouts logged this month`;

  const statText =
    daysRemaining !== null && daysRemaining <= 0
      ? 'Trial expired — convert to keep your data live'
      : `${membersLabel} · ${workoutsLabel}`;

  // ---------- view ----------

  // Reduced-motion: skip entrance animation entirely; render the banner
  // in its final state.
  const initial = reduced ? false : { opacity: 0, y: -8 };
  const animate = reduced ? undefined : { opacity: 1, y: 0 };

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={initial}
      animate={animate}
      transition={{ duration: 0.24, ease: VERCEL_EASE }}
      className={cn(
        'relative h-10 w-full z-40 select-none',
        tierShellCx(tier)
      )}
    >
      {/* Left-edge accent stripe. Re-keyed when the urgency tier transitions
          so the entrance scale-in plays once as a visual "tick" notifying
          the operator that the trial just got more urgent. */}
      <motion.span
        key={accentPulseKey}
        aria-hidden="true"
        initial={
          reduced || accentPulseKey === 0
            ? false
            : { scaleY: 0.6, opacity: 0.4 }
        }
        animate={reduced ? undefined : { scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.32, ease: VERCEL_EASE }}
        style={{ transformOrigin: 'center' }}
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1',
          tierAccentCx(tier)
        )}
      />

      <div className="h-full flex items-center gap-4 pl-4 pr-4">
        {/* Day pill — uppercase mono so it reads as data, not chrome. */}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm',
            'font-mono text-[11px] uppercase tracking-[0.08em]',
            tier === 'expired'
              ? 'bg-ink-50/15 text-ink-50'
              : 'bg-ink-900/60 text-ink-50'
          )}
          data-numeric
        >
          <Calendar size={12} strokeWidth={2} aria-hidden="true" />
          {dayLabel}
        </span>

        {/* Mini-stats — secondary, smaller, mono numerics. */}
        <span
          className={cn(
            'font-mono text-[11px] tracking-tight truncate',
            tier === 'expired' ? 'text-ink-50/90' : 'text-ink-200'
          )}
          data-numeric
        >
          {statText}
        </span>

        <div className="flex-1" />

        {/* CTA. The orchestrator wires routing globally, but a hard
            location.assign keeps this component decoupled from
            react-router and safe to mount in any subtree. */}
        <PrimaryButton
          magnetic
          onClick={() => {
            window.location.assign('/subscription');
          }}
          className="px-3 py-1 text-xs"
        >
          Convert to paid
        </PrimaryButton>
      </div>
    </motion.div>
  );
}
