// Phase C.5 §4.4 — Gamma-4 — TrialLockout
//
// Plan §4.4 trial mechanics: "Day 31 (expired): owner panel locked to
// billing screen only. Members keep read-only access for 7 days."
//
// This component is mounted alongside TrialBanner / ActivationToast in the
// admin Layout. It manages its OWN visibility — the parent never decides
// when to render the lockout. Logic:
//
//   - active                                       → null (no lockout)
//   - paused                                       → null (paused gyms keep
//                                                    full access until pause
//                                                    expires; the pause flow
//                                                    is sales-managed)
//   - trial AND expires_at > now()                 → null
//   - expired OR cancelled OR (trial past expiry)  → render the overlay
//
// Escape hatches — the lockout never fully traps the operator:
//   - On `/subscription/*` we render null so the owner can actually pay.
//   - The "Sign out" link works from inside the overlay.
//
// Polling — refetch every 60s so the lockout dismisses automatically once
// payment lands (no need for the operator to refresh the page).
//
// We hit two endpoints: `/admin/me` (per spec — confirms session is alive
// + grabs gym name) AND `/gyms/${gym_id}/subscription` (the actual source
// of truth for status / tier / expires_at — same endpoint SubscriptionPage
// uses). Stats come from `/admin/stats`.

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Lock, LogOut } from 'lucide-react';
import api from '@/lib/api';
import { PrimaryButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { springModal } from '@/lib/motion';
import { signOut, readStoredUser } from '@/lib/session';

// ───────────────────────── types ─────────────────────────

type Tier = 'starter' | 'growth' | 'unlimited';
type Status = 'trial' | 'active' | 'expired' | 'cancelled' | 'paused';

interface SubscriptionShape {
  tier: Tier | null;
  status: Status;
  expires_at: string | null;
  trial_started_at: string | null;
}

interface StatsShape {
  active_members: number;
  workouts_this_month: number;
  // The spec asks for "workouts logged this trial" + "days since expiry".
  // /admin/stats currently returns workouts_this_month, which is the closest
  // proxy in the wild today; the orchestrator can enrich the endpoint later
  // without touching this component.
}

// ───────────────────────── helpers ─────────────────────────

const TIER_PRICE: Record<Tier, number> = {
  starter: 49,
  growth: 99,
  unlimited: 199,
};

function tierLabel(t: Tier | null): string {
  if (t === 'starter') return 'Starter';
  if (t === 'growth') return 'Growth';
  if (t === 'unlimited') return 'Unlimited';
  return 'a plan';
}

/** Days since a date (clamped at 0). */
function daysSince(iso: string | null): number {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Decide whether the lockout should be shown given the current sub state.
 * Pure function — easy to reason about in isolation. Order matters:
 * `active` and `paused` short-circuit before any expiry check.
 */
function shouldLock(sub: SubscriptionShape | null): boolean {
  if (!sub) return false;
  if (sub.status === 'active') return false;
  if (sub.status === 'paused') return false;
  if (sub.status === 'cancelled' || sub.status === 'expired') return true;
  if (sub.status === 'trial') {
    if (!sub.expires_at) return false;
    return new Date(sub.expires_at).getTime() <= Date.now();
  }
  return false;
}

// ───────────────────────── motion variants ─────────────────────────

const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const cardVariants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: springModal },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
};

// Word-by-word reveal for the headline. Each word fades up with a 60ms
// stagger — gives the headline a brief "settle into place" feel that
// matches the springModal card arrival.
const headlineParent = {
  initial: { opacity: 1 },
  animate: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const headlineWord = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] as const } },
};

// One-shot shake for the lock icon on mount. Honors reducedMotion (we
// just don't apply the animate prop in that branch).
const shakeKeyframes = {
  rotate: [0, -5, 5, -3, 3, 0],
  transition: { duration: 0.5, ease: 'easeInOut' as const },
};

// ───────────────────────── pieces ─────────────────────────

function StatColumn({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="font-mono text-2xl font-medium text-ink-50 tabular-nums" data-numeric>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-ink-400 mt-1">{label}</p>
    </div>
  );
}

// ───────────────────────── component ─────────────────────────

export default function TrialLockout() {
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion() ?? false;

  const [sub, setSub] = useState<SubscriptionShape | null>(null);
  const [stats, setStats] = useState<StatsShape | null>(null);
  const [gymName, setGymName] = useState<string | null>(null);

  // Fetch on mount + every 60s. Refetching is cheap (3 small GETs) and
  // means the lockout self-dismisses the moment the operator finishes
  // payment in another tab.
  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        // /admin/me confirms the session is still alive and gives us the
        // gym_id to scope the subscription lookup with. We also grab
        // gym_name from this response (the existing endpoint returns it).
        const meRes = await api.get('/admin/me');
        const user = meRes.data?.data?.user;
        if (cancelled) return;
        if (!user || user.role !== 'gym_owner' || !user.gym_id) {
          // Not a gym owner with a linked gym — nothing to lock.
          setSub(null);
          return;
        }
        setGymName(user.gym_name ?? null);

        // Real subscription state. Same endpoint SubscriptionPage uses.
        const subRes = await api.get(`/gyms/${user.gym_id}/subscription`);
        if (cancelled) return;
        const subData = (subRes.data?.data ?? subRes.data) as Partial<SubscriptionShape>;
        setSub({
          tier: (subData.tier ?? null) as Tier | null,
          status: (subData.status ?? 'trial') as Status,
          expires_at: subData.expires_at ?? null,
          trial_started_at: subData.trial_started_at ?? null,
        });

        // Stats are nice-to-have for the overlay copy; failure is
        // non-fatal so we wrap independently.
        try {
          const statsRes = await api.get('/admin/stats');
          if (cancelled) return;
          const s = statsRes.data?.data as Partial<StatsShape> | undefined;
          if (s) {
            setStats({
              active_members: s.active_members ?? 0,
              workouts_this_month: s.workouts_this_month ?? 0,
            });
          }
        } catch {
          // ignore — stats are decorative
        }
      } catch {
        // Any failure here (network, 401, etc.) — leave sub as null so we
        // don't accidentally LOCK the user out due to a transient error.
        // The api interceptor handles 401-driven sign-outs separately.
      }
    }

    fetchAll();
    const interval = window.setInterval(fetchAll, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  // Hydrate gym_name from localStorage as a fallback for the headline copy
  // (so the very first render has *something* even before /admin/me lands).
  useEffect(() => {
    if (gymName) return;
    const stored = readStoredUser();
    if (stored?.gym_name) setGymName(stored.gym_name);
  }, [gymName]);

  const locked = shouldLock(sub);

  // Escape hatch: the subscription page is always reachable. We render
  // null on /subscription* so the owner can interact with the pricing UI
  // and complete checkout.
  const onSubscriptionPage = location.pathname.startsWith('/subscription');

  // Headline + copy depend on status. trial-past-expiry collapses into
  // the "expired" headline since UX-wise they're identical.
  const headline = useMemo(() => {
    if (sub?.status === 'cancelled') return 'Your IronPath subscription is cancelled.';
    return 'Your IronPath trial ended.';
  }, [sub?.status]);

  const subtext = useMemo(() => {
    const name = gymName ?? 'your gym';
    return `Members keep read-only access for 7 more days. After that, ${name} will need to renew.`;
  }, [gymName]);

  const ctaLabel = useMemo(() => {
    if (!sub?.tier) return 'Choose a plan';
    const price = TIER_PRICE[sub.tier];
    return `Reactivate ${tierLabel(sub.tier)} for $${price}/mo`;
  }, [sub?.tier]);

  const daysExpired = useMemo(() => daysSince(sub?.expires_at ?? null), [sub?.expires_at]);

  // Render guard — AnimatePresence wraps the conditional so the overlay
  // can fade out cleanly when the operator pays + the next poll flips
  // status to 'active'.
  const showOverlay = locked && !onSubscriptionPage;

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          key="trial-lockout"
          aria-modal="true"
          role="dialog"
          aria-labelledby="trial-lockout-headline"
          variants={reduced ? undefined : backdropVariants}
          initial={reduced ? false : 'initial'}
          animate={reduced ? undefined : 'animate'}
          exit={reduced ? undefined : 'exit'}
          className={cn(
            // z-[60] sits above LivePulseStrip's z-50.
            'fixed inset-0 z-[60] flex items-center justify-center p-6',
            'bg-ink-950/95 backdrop-blur-md'
          )}
        >
          <motion.div
            variants={reduced ? undefined : cardVariants}
            initial={reduced ? false : 'initial'}
            animate={reduced ? undefined : 'animate'}
            exit={reduced ? undefined : 'exit'}
            className={cn(
              'surface-feature w-full max-w-md p-8',
              'pointer-events-auto'
            )}
          >
            {/* Lock icon — single shake on mount, brand-500 tint, 32px. */}
            <div className="flex justify-center mb-5">
              <motion.div
                animate={reduced ? undefined : shakeKeyframes}
                className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-500/10 border border-brand-500/30"
              >
                <Lock size={32} strokeWidth={1.75} className="text-brand-500" aria-hidden="true" />
              </motion.div>
            </div>

            {/* Headline — word-by-word reveal. Splitting on whitespace so
                each word animates in independently. */}
            <motion.h2
              id="trial-lockout-headline"
              variants={reduced ? undefined : headlineParent}
              initial={reduced ? false : 'initial'}
              animate={reduced ? undefined : 'animate'}
              className="text-ink-50 text-2xl font-semibold tracking-tight text-center leading-tight"
            >
              {reduced
                ? headline
                : headline.split(' ').map((word, i, arr) => (
                    <motion.span
                      key={`${word}-${i}`}
                      variants={headlineWord}
                      className="inline-block"
                    >
                      {word}
                      {i < arr.length - 1 ? ' ' : ''}
                    </motion.span>
                  ))}
            </motion.h2>

            <p className="text-ink-300 text-sm text-center mt-3 leading-relaxed">
              {subtext}
            </p>

            {/* Three big mono numbers — members / workouts logged this trial /
                days since expiry. Pulled from /admin/stats; renders even when
                stats are still loading (zeros) so the layout doesn't shift. */}
            <div className="grid grid-cols-3 gap-3 my-7 py-5 border-y border-ink-800">
              <StatColumn label="Members" value={String(stats?.active_members ?? 0)} />
              <StatColumn label="Workouts" value={String(stats?.workouts_this_month ?? 0)} />
              <StatColumn label="Days expired" value={String(daysExpired)} />
            </div>

            {/* Primary CTA → /subscription. Magnetic per spec. */}
            <PrimaryButton
              type="button"
              magnetic
              onClick={() => navigate('/subscription')}
              className="w-full justify-center"
            >
              {ctaLabel}
            </PrimaryButton>

            {/* Secondary sign-out link — bottom, ink-400. signOut() clears
                tokens + bounces to /login, which is reachable through the
                lockout because it sits above this DOM. */}
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-200 transition-colors"
              >
                <LogOut size={12} strokeWidth={1.75} aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
