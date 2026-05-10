import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import api from '../lib/api';
import { extractError, getStoredGymId } from '../lib/forms';
import { EmberSeam } from '@/components/EmberSeam';
import { cn } from '@/lib/utils';
import CancellationFlow from '@/components/cancellation/CancellationFlow';

// ---------- types ----------

type Tier = 'starter' | 'growth' | 'unlimited';
type Status = 'trial' | 'active' | 'expired' | 'cancelled';

interface Subscription {
  // Trial gyms can land before sales picks a tier — backend may return null.
  tier: Tier | null;
  status: Status;
  expires_at: string;
  trial_started_at: string | null;
  mrr_cents: number;
  member_count: number;
  member_cap: number | null;
}

interface TierDef {
  key: Tier;
  name: string;
  price: number; // dollars
  blurb: string;
  recommended?: boolean;
}

const TIERS: TierDef[] = [
  { key: 'starter', name: 'Starter', price: 49, blurb: 'Up to 50 members' },
  { key: 'growth', name: 'Growth', price: 99, blurb: 'Up to 200 members', recommended: true },
  { key: 'unlimited', name: 'Unlimited', price: 199, blurb: 'No member cap' },
];

// ---------- helpers ----------

function tierLabel(t: Tier | null): string {
  if (t === 'starter') return 'Starter';
  if (t === 'growth') return 'Growth';
  if (t === 'unlimited') return 'Unlimited';
  return 'No plan yet';
}

function tierPrice(t: Tier | null): number | null {
  const def = TIERS.find((x) => x.key === t);
  return def?.price ?? null;
}

function statusLabel(s: Status): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function statusPillCx(s: Status): string {
  if (s === 'active') return 'bg-green-100 text-green-800 border-green-300';
  if (s === 'trial') return 'bg-cyan-100 text-cyan-800 border-cyan-300';
  if (s === 'expired') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  return 'bg-ink-200 text-ink-700 border-ink-400';
}

function formatMrr(cents: number): string {
  if (!cents) return '—';
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}/mo`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

// ---------- shared UI ----------

function InlineError({ message }: { message: string }) {
  return (
    <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
      {message}
    </div>
  );
}

function ReceiptSkeleton() {
  return (
    <div className="max-w-md mx-auto bg-ink-50/90 rounded-sm p-6 space-y-3 animate-pulse">
      <div className="h-3 w-2/3 mx-auto bg-ink-400/40 rounded" />
      <div className="h-3 w-1/3 mx-auto bg-ink-400/40 rounded" />
      <div className="h-px w-full bg-ink-400/30 my-3" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-3 w-full bg-ink-400/30 rounded" />
      ))}
    </div>
  );
}

// ---------- THE RECEIPT ----------

/**
 * Perforated edge — small triangular notches across the top/bottom of the
 * receipt card. Implemented as repeating-radial-gradient bites taken out of
 * the receipt's background. We mask the bite shape via an SVG row of
 * triangles for crispness on hidpi.
 */
function PerforatedEdge({ position }: { position: 'top' | 'bottom' }) {
  // Triangular notch row — alternating downward/upward triangles in negative
  // space. The receipt's background (ink-50) shows through the SVG fill;
  // the page background (ink-950) shows through the transparent notches.
  return (
    <div
      aria-hidden="true"
      className={cn(
        'h-3 w-full',
        position === 'top' ? '-mb-px' : '-mt-px'
      )}
      style={{
        backgroundColor: 'transparent',
        backgroundImage:
          position === 'top'
            ? 'radial-gradient(circle at 6px 0px, transparent 4px, #FAFAFB 4.5px)'
            : 'radial-gradient(circle at 6px 12px, transparent 4px, #FAFAFB 4.5px)',
        backgroundSize: '12px 12px',
        backgroundRepeat: 'repeat-x',
      }}
    />
  );
}

interface ReceiptProps {
  sub: Subscription;
  gymName?: string;
  onCancel?: () => void;
}

function Receipt({ sub, gymName, onCancel }: ReceiptProps) {
  const isUnlimited = sub.member_cap === null;
  const trialDaysLeft = sub.status === 'trial' ? daysUntil(sub.expires_at) : null;
  const isPaid = sub.status === 'active';
  const price = tierPrice(sub.tier);

  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="max-w-md mx-auto">
      {/* Receipt body */}
      <div className="relative">
        <PerforatedEdge position="top" />

        <div className="relative bg-ink-50 text-ink-900 px-7 py-6 font-mono shadow-2xl overflow-hidden">
          {/* PAID stamp */}
          {isPaid && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute"
              style={{
                top: '28%',
                right: '8%',
                transform: 'rotate(-12deg)',
              }}
            >
              <div
                className="border-4 px-3 py-1 text-3xl font-extrabold tracking-wider"
                style={{
                  color: '#A50D24',
                  borderColor: '#A50D24',
                  opacity: 0.35,
                }}
              >
                PAID
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-4">
            <h2 className="text-base font-bold tracking-[0.18em] uppercase text-ink-900">
              IRONPATH GYM
            </h2>
            {gymName && (
              <p className="text-xs uppercase tracking-wider text-ink-700 mt-0.5">
                {gymName}
              </p>
            )}
            <p className="text-[10px] uppercase tracking-widest text-ink-600 mt-1">
              {today}
            </p>
          </div>

          <div className="border-t border-dashed border-ink-700/60 my-3" />

          {/* Tier banner */}
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[10px] uppercase tracking-widest text-ink-600">
              Plan
            </span>
            <span className="text-base font-bold uppercase tracking-wider">
              {tierLabel(sub.tier)}
            </span>
          </div>

          {/* Line items */}
          <div className="space-y-1.5 text-sm">
            <Line label="Tier rate">
              {price !== null ? (
                <>
                  <span className="font-semibold">${price.toFixed(2)}</span>
                  <span className="text-ink-600 text-xs">/mo</span>
                </>
              ) : (
                <span className="text-ink-600">—</span>
              )}
            </Line>
            <Line label="Members">
              <span className="font-semibold tabular-nums">
                {sub.member_count}
              </span>
              <span className="text-ink-600">
                {' '}
                /{' '}
                {isUnlimited ? '∞' : sub.member_cap}
              </span>
            </Line>
            <Line label="Status">
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider border',
                  statusPillCx(sub.status)
                )}
              >
                {statusLabel(sub.status)}
              </span>
            </Line>
            {sub.trial_started_at && (
              <Line label="Trial started">
                <span className="tabular-nums">
                  {formatDate(sub.trial_started_at)}
                </span>
              </Line>
            )}
            <Line label="MRR">
              <span className="font-semibold tabular-nums">
                {formatMrr(sub.mrr_cents)}
              </span>
            </Line>
          </div>

          <div className="border-t border-dashed border-ink-700/60 my-4" />

          {/* Total / next bill */}
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-widest text-ink-600">
                {trialDaysLeft !== null
                  ? 'Trial ends'
                  : sub.status === 'active'
                  ? 'Renews'
                  : sub.status === 'expired'
                  ? 'Expired'
                  : 'Ends'}
              </span>
              <span className="text-base font-bold tabular-nums">
                {formatDate(sub.expires_at)}
              </span>
            </div>
            {trialDaysLeft !== null && (
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-ink-600 uppercase tracking-widest text-[10px]">
                  Days left
                </span>
                <span className="tabular-nums font-semibold">
                  {trialDaysLeft}
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-ink-700/60 my-4" />

          <p className="text-center text-[9px] uppercase tracking-[0.2em] text-ink-600">
            Thank you — keep lifting
          </p>

          {/* Tear-off corner — cancellation */}
          {onCancel && sub.status !== 'cancelled' && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel subscription"
              title="Cancel subscription"
              className="group absolute bottom-0 right-0 w-12 h-12 focus:outline-none"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 transition-transform group-hover:translate-x-1 group-hover:translate-y-1"
                style={{
                  background:
                    'linear-gradient(135deg, transparent 50%, #D4D4DA 50%, #8A8A95 100%)',
                  clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                }}
              />
              <span className="absolute bottom-1 right-1 text-[8px] uppercase tracking-widest text-ink-700 font-semibold rotate-[-45deg] origin-bottom-right">
                cancel
              </span>
            </button>
          )}
        </div>

        <PerforatedEdge position="bottom" />
      </div>
    </div>
  );
}

function Line({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] uppercase tracking-widest text-ink-600 whitespace-nowrap">
        {label}
      </span>
      <span className="flex-1 mx-2 border-b border-dotted border-ink-400/50 self-end mb-1" />
      <span className="text-right tabular-nums">{children}</span>
    </div>
  );
}

// ---------- Upgrade tiers ----------

interface UpgradePickerProps {
  sub: Subscription;
  reduceMotion: boolean;
}

function UpgradePicker({ sub, reduceMotion }: UpgradePickerProps) {
  return (
    <section className="surface-card p-6">
      <header className="mb-5">
        <h2 className="text-lg font-semibold text-ink-50">Plans</h2>
        <p className="text-ink-400 text-sm mt-1">
          Pick a plan that fits your member count.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIERS.map((t) => {
          const current = t.key === sub.tier;
          const recommended = t.recommended && !current;
          // v1: mailto placeholder. Phase C will replace with a real upgrade flow.
          const mailto = `mailto:sales@ironpath.app?subject=Upgrade%20to%20${encodeURIComponent(t.name)}`;
          return (
            <div
              key={t.key}
              className={cn(
                'relative rounded-xl p-5 border bg-ink-950/40 flex flex-col overflow-hidden',
                'transition-transform hover:-translate-y-0.5',
                current
                  ? 'border-brand-500 ring-1 ring-brand-500'
                  : 'border-ink-800'
              )}
            >
              {/* Foil overlay on recommended tier */}
              {recommended && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
                  style={{
                    backgroundImage:
                      'conic-gradient(from 0deg, #C8102E, #FFD089, #C8102E, #B53A18, #E63946, #C8102E)',
                    backgroundSize: '200% 200%',
                    animation: reduceMotion ? undefined : 'spin 12s linear infinite',
                  }}
                />
              )}
              {recommended && (
                <span className="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-500 text-ink-950">
                  Recommended
                </span>
              )}
              <div className="flex items-center justify-between mb-2 relative">
                <h3 className="text-ink-50 font-semibold">{t.name}</h3>
                {current && (
                  <span className="text-xs font-medium text-brand-500">
                    Current
                  </span>
                )}
              </div>
              <p className="font-mono text-2xl font-bold text-ink-50 relative">
                ${t.price}
                <span className="text-sm font-normal text-ink-400">/mo</span>
              </p>
              <p className="text-sm text-ink-400 mt-1 mb-4 relative">{t.blurb}</p>
              <a
                href={mailto}
                className={cn(
                  'mt-auto text-center px-3 py-2 rounded-lg text-sm font-semibold transition-colors relative',
                  current
                    ? 'bg-ink-800 text-ink-400 cursor-default pointer-events-none'
                    : 'bg-brand-500 hover:bg-brand-600 text-ink-950'
                )}
                aria-disabled={current}
              >
                {current ? 'On this plan' : 'Request upgrade'}
              </a>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-ink-400 mt-4">
        Self-serve checkout arrives in Phase C. For now, sales handles upgrades.
      </p>
    </section>
  );
}

// ---------- invoices + export cards ----------

function InvoicesCard() {
  return (
    <section className="surface-card p-6">
      <header className="mb-5">
        <h2 className="text-lg font-semibold text-ink-50">Invoices</h2>
      </header>
      <div className="text-center py-8">
        <FileText
          size={32}
          strokeWidth={1.5}
          className="mx-auto text-ink-600 mb-2"
          aria-hidden="true"
        />
        <p className="text-ink-200 text-sm font-medium">No invoices yet</p>
        <p className="text-ink-400 text-xs mt-1">
          Phase C will surface payment history here.
        </p>
      </div>
    </section>
  );
}

function DataExportCard() {
  return (
    <section className="surface-card p-6">
      <header className="mb-5">
        <h2 className="text-lg font-semibold text-ink-50">Data export</h2>
        <p className="text-ink-400 text-sm mt-1">
          Export your members and workouts as CSV.
        </p>
      </header>
      <button
        type="button"
        disabled
        title="Available after activation"
        className="px-4 py-2 rounded-lg bg-ink-800 text-ink-400 text-sm font-semibold cursor-not-allowed"
      >
        Export CSV
      </button>
      <p className="text-xs text-ink-400 mt-2">
        Available after activation. Phase C will wire this up.
      </p>
    </section>
  );
}

// ---------- page ----------

export default function SubscriptionPage() {
  const reduceMotion = useReducedMotion() ?? false;
  const gymId = getStoredGymId();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function load(id: string) {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get(`/gyms/${id}/subscription`);
      setSub((res.data?.data ?? res.data) as Subscription);
    } catch (err) {
      setLoadError(extractError(err, 'Could not load subscription.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!gymId) {
      setLoading(false);
      return;
    }
    load(gymId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId]);

  // Phase C.6 cancellation flow — opens the multi-step modal (reason →
  // contextual save offer → final confirm). On confirmed cancellation we
  // reload the subscription so the receipt + status pill update.
  const [cancelOpen, setCancelOpen] = useState(false);
  function handleCancel() {
    setCancelOpen(true);
  }
  function handleCancelled() {
    if (gymId) load(gymId);
  }

  return (
    <div className="surface-shell -mx-4 -my-4 px-4 py-4 min-h-full">
      <div className="max-w-4xl mx-auto">
        <header className="mb-3">
          <h1 className="text-2xl font-bold text-ink-50">Subscription</h1>
          <p className="text-ink-400 text-sm mt-1">Plan, usage, and billing.</p>
        </header>

        <EmberSeam className="mb-8 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

        {/* Spin keyframe for foil — defined once, reused by all foil overlays */}
        <style>{`@keyframes spin { to { background-position: 200% 0; } }`}</style>

        {!gymId ? (
          <InlineError message="No gym is linked to this admin account. Sign out and back in to refresh." />
        ) : loading ? (
          <div className="space-y-6">
            <ReceiptSkeleton />
          </div>
        ) : loadError ? (
          <div className="space-y-3">
            <InlineError message={loadError} />
            <button
              type="button"
              onClick={() => load(gymId)}
              className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-ink-950 font-semibold text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        ) : sub ? (
          <div className="space-y-8">
            <Receipt sub={sub} onCancel={handleCancel} />
            <UpgradePicker sub={sub} reduceMotion={reduceMotion} />
            <InvoicesCard />
            <DataExportCard />
          </div>
        ) : null}
      </div>

      <CancellationFlow
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onCancelled={handleCancelled}
      />
    </div>
  );
}
