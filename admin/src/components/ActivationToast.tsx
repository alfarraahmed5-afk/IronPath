// Phase C.7 — activation milestone celebration toast.
//
// Polls /admin/milestones on mount and on every route change. If any
// milestone has been hit but not yet acknowledged, slides a brand-tinted
// celebration card up from the bottom of the page. The operator dismisses
// it with the "Nice." button, which POSTs the acknowledge endpoint and
// slides the card back down. The unique constraint in migration 046
// guarantees the toast fires at most once per milestone per gym.
//
// This component is mounted once in admin/Layout.tsx (alongside the
// TrialBanner). It owns its own state and renders nothing when there's
// nothing to celebrate.

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles, Flame, X, type LucideIcon } from 'lucide-react';
import api from '@/lib/api';
import { PrimaryButton } from '@/components/ui/Button';
import { EmberSeam } from '@/components/EmberSeam';
import { cn } from '@/lib/utils';

type MilestoneKey = 'activated' | 'sticky';

interface MilestoneRow {
  key: MilestoneKey;
  hit_at: string;
  metadata: Record<string, unknown> | null;
  acknowledged_at: string | null;
}

interface ApiMilestoneRow {
  key: string;
  hit_at: string;
  metadata: Record<string, unknown> | null;
  acknowledged_at: string | null;
}

interface MilestoneCopy {
  Icon: LucideIcon;
  headline: string;
  // Renders the metadata block as up to three big mono numbers.
  stats: (meta: Record<string, unknown> | null) => Array<{ value: number; label: string }>;
}

const COPY: Record<MilestoneKey, MilestoneCopy> = {
  activated: {
    Icon: Sparkles,
    headline: 'Your gym is alive.',
    stats: (meta) => [
      { value: numberOf(meta, 'members'), label: 'Members' },
      { value: numberOf(meta, 'announcements'), label: 'Announcements' },
      { value: numberOf(meta, 'workouts_14d'), label: 'Workouts / 14d' },
    ],
  },
  sticky: {
    Icon: Flame,
    headline: "You've got a sticky gym.",
    stats: (meta) => [
      { value: numberOf(meta, 'members'), label: 'Members' },
      { value: numberOf(meta, 'workouts_week'), label: 'Workouts / week' },
    ],
  },
};

function numberOf(meta: Record<string, unknown> | null, key: string): number {
  const v = meta?.[key];
  return typeof v === 'number' ? v : 0;
}

export default function ActivationToast() {
  const location = useLocation();
  const reduced = useReducedMotion();
  const [unack, setUnack] = useState<MilestoneRow | null>(null);
  // Tracks an in-flight acknowledge call so the dismiss button can
  // disable itself; also prevents double-firing if the operator jabs the
  // button twice before the slide-out animation completes.
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await api.get<{ data: { milestones: ApiMilestoneRow[] } }>('/admin/milestones');
        if (cancelled) return;
        const rows = res.data?.data?.milestones ?? [];
        // Pick the first unacknowledged milestone. There are only two
        // total in v1 and they're returned in hit_at order; if the
        // operator has both un-ack'd, "activated" comes first which is
        // also the more meaningful first-time celebration.
        const next = rows.find(r => r.acknowledged_at === null && isMilestoneKey(r.key));
        if (next) {
          setUnack({
            key: next.key as MilestoneKey,
            hit_at: next.hit_at,
            metadata: next.metadata,
            acknowledged_at: null,
          });
        } else {
          setUnack(null);
        }
      } catch {
        // Best-effort: a transient API failure should not flash an error
        // to the operator. The next route change re-polls.
        if (!cancelled) setUnack(null);
      }
    }
    poll();
    return () => { cancelled = true; };
    // Re-poll on every route change. location.key changes on every
    // navigation (including Replace), which is what we want.
  }, [location.key]);

  async function dismiss() {
    if (!unack || dismissing) return;
    setDismissing(true);
    const key = unack.key;
    try {
      await api.post(`/admin/milestones/${key}/acknowledge`);
    } catch {
      // Even if the POST fails, hide the toast locally so the operator
      // isn't trapped behind a stale celebration. The next page load
      // will re-fetch from the server and re-show if it's truly still
      // un-ack'd.
    } finally {
      setUnack(null);
      setDismissing(false);
    }
  }

  return (
    <AnimatePresence>
      {unack && (
        <Toast key={unack.key} milestone={unack} onDismiss={dismiss} reduced={!!reduced} dismissing={dismissing} />
      )}
    </AnimatePresence>
  );
}

function isMilestoneKey(k: string): k is MilestoneKey {
  return k === 'activated' || k === 'sticky';
}

interface ToastProps {
  milestone: MilestoneRow;
  onDismiss: () => void;
  reduced: boolean;
  dismissing: boolean;
}

function Toast({ milestone, onDismiss, reduced, dismissing }: ToastProps) {
  const copy = COPY[milestone.key];
  const stats = copy.stats(milestone.metadata);
  const { Icon } = copy;

  // Slide-up + fade entrance with spring physics. Reduced-motion users
  // get a plain fade with no translation.
  const initial = reduced ? { opacity: 0 } : { opacity: 0, y: 80 };
  const animate = reduced ? { opacity: 1 } : { opacity: 1, y: 0 };
  const exit = reduced ? { opacity: 0 } : { opacity: 0, y: 80 };
  const transition = reduced
    ? { duration: 0.18 }
    : { type: 'spring' as const, stiffness: 320, damping: 28, mass: 0.9 };

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={initial}
      animate={animate}
      exit={exit}
      transition={transition}
      className={cn(
        'surface-feature',
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-40',
        'w-[calc(100vw-3rem)] max-w-md',
        'overflow-hidden'
      )}
    >
      {/* Decorative ember seam along the top edge of the card. */}
      <EmberSeam className="absolute top-0 left-0 right-0 h-px" />

      {/* Close affordance — a small icon button mirroring the "Nice." CTA
          for operators who'd rather dismiss without engaging the primary
          button. Both call onDismiss so the acknowledge round-trip happens
          either way. */}
      <button
        type="button"
        onClick={onDismiss}
        disabled={dismissing}
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-ink-400 hover:text-ink-50 transition-colors disabled:opacity-50"
      >
        <X size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>

      <div className="px-6 pt-6 pb-5">
        <div className="flex items-center gap-2 mb-2 text-brand-500">
          <Icon size={18} strokeWidth={2} aria-hidden="true" />
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-400">
            Milestone
          </span>
        </div>

        <h2 className="font-sans font-bold text-ink-50 text-xl leading-tight mb-4">
          {copy.headline}
        </h2>

        {/* Big mono numbers in a row. data-numeric matches the codebase
            convention (see Layout.tsx's email line) so any global numeric
            font tweaks pick this up too. */}
        <div className="flex gap-6 mb-5">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col">
              <span
                className="font-mono text-2xl text-ink-50 leading-none tabular-nums"
                data-numeric
              >
                {s.value}
              </span>
              <span className="text-[10px] text-ink-400 uppercase tracking-[0.12em] mt-1">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <PrimaryButton onClick={onDismiss} loading={dismissing}>
            Nice.
          </PrimaryButton>
        </div>
      </div>
    </motion.div>
  );
}
