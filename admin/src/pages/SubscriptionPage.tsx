import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import api from '../lib/api';
import { extractError, getStoredGymId } from '../lib/forms';

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
}

const TIERS: TierDef[] = [
  { key: 'starter', name: 'Starter', price: 49, blurb: 'Up to 50 members' },
  { key: 'growth', name: 'Growth', price: 99, blurb: 'Up to 200 members' },
  { key: 'unlimited', name: 'Unlimited', price: 199, blurb: 'No member cap' },
];

// ---------- helpers ----------

function tierLabel(t: Tier | null): string {
  if (t === 'starter') return 'Starter';
  if (t === 'growth') return 'Growth';
  if (t === 'unlimited') return 'Unlimited';
  return 'No plan yet';
}

function statusLabel(s: Status): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function statusPillCx(s: Status): string {
  if (s === 'active') return 'bg-green-900/40 text-green-400 border-green-800';
  if (s === 'trial') return 'bg-cyan-900/40 text-cyan-300 border-cyan-800';
  if (s === 'expired') return 'bg-yellow-900/40 text-yellow-400 border-yellow-800';
  return 'bg-gray-800 text-gray-400 border-gray-700'; // cancelled
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

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <header className="mb-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && (
          <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
        )}
      </header>
      {children}
    </section>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
      {message}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
      <div className="h-5 w-40 bg-gray-800 rounded animate-pulse" />
      <div className="h-4 w-full bg-gray-800 rounded animate-pulse" />
      <div className="h-4 w-2/3 bg-gray-800 rounded animate-pulse" />
    </div>
  );
}

// ---------- current plan card ----------

function CurrentPlanCard({ sub }: { sub: Subscription }) {
  const isUnlimited = sub.member_cap === null;
  const usagePct = isUnlimited
    ? 0
    : Math.min(100, Math.round((sub.member_count / Math.max(1, sub.member_cap ?? 1)) * 100));

  const trialDaysLeft = sub.status === 'trial' ? daysUntil(sub.expires_at) : null;

  return (
    <Card title="Current plan">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span
          className={[
            'inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold uppercase tracking-wider border',
            sub.tier
              ? 'bg-orange-500/10 text-orange-400 border-orange-500/40'
              : 'bg-gray-800 text-gray-300 border-gray-700',
          ].join(' ')}
        >
          {tierLabel(sub.tier)}
        </span>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusPillCx(sub.status)}`}
        >
          {statusLabel(sub.status)}
        </span>
      </div>

      <div className="space-y-2">
        {isUnlimited ? (
          <p className="text-gray-200 text-sm">
            <span className="font-semibold">{sub.member_count}</span>{' '}
            members. Unlimited members on this plan.
          </p>
        ) : (
          <>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-gray-300">Members</span>
              <span className="font-mono text-gray-200">
                {sub.member_count} / {sub.member_cap}
              </span>
            </div>
            <div
              className="h-2 w-full bg-gray-800 rounded overflow-hidden"
              role="progressbar"
              aria-valuenow={usagePct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-orange-500 transition-all"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-gray-800 text-sm text-gray-300">
        {trialDaysLeft !== null ? (
          <p>
            <span className="font-mono text-white">{trialDaysLeft}</span>{' '}
            days left in trial. Trial ends {formatDate(sub.expires_at)}.
          </p>
        ) : sub.status === 'active' ? (
          <p>Renews {formatDate(sub.expires_at)}.</p>
        ) : sub.status === 'expired' ? (
          <p className="text-yellow-400">Expired {formatDate(sub.expires_at)}.</p>
        ) : sub.status === 'cancelled' ? (
          <p className="text-gray-400">Cancelled. Ends {formatDate(sub.expires_at)}.</p>
        ) : null}
      </div>
    </Card>
  );
}

// ---------- MRR card ----------

function MrrCard({ sub }: { sub: Subscription }) {
  return (
    <Card title="Recorded MRR" subtitle="What's recorded — not necessarily what's collected.">
      <p className="font-mono text-3xl font-bold text-white">
        {formatMrr(sub.mrr_cents)}
      </p>
    </Card>
  );
}

// ---------- upgrade card ----------

function UpgradeCard({ sub }: { sub: Subscription }) {
  return (
    <Card title="Plans" subtitle="Pick a plan that fits your member count.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIERS.map((t) => {
          const current = t.key === sub.tier;
          // v1: mailto placeholder. Phase C will replace with a real upgrade flow.
          const mailto = `mailto:sales@ironpath.app?subject=Upgrade%20to%20${encodeURIComponent(t.name)}`;
          return (
            <div
              key={t.key}
              className={[
                'rounded-xl p-5 border bg-gray-950/40 flex flex-col',
                current
                  ? 'border-orange-500 ring-1 ring-orange-500'
                  : 'border-gray-800',
              ].join(' ')}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold">{t.name}</h3>
                {current && (
                  <span className="text-xs font-medium text-orange-400">
                    Current
                  </span>
                )}
              </div>
              <p className="font-mono text-2xl font-bold text-white">
                ${t.price}
                <span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <p className="text-sm text-gray-400 mt-1 mb-4">{t.blurb}</p>
              <a
                href={mailto}
                className={[
                  'mt-auto text-center px-3 py-2 rounded-lg text-sm font-semibold transition-colors',
                  current
                    ? 'bg-gray-800 text-gray-400 cursor-default pointer-events-none'
                    : 'bg-orange-500 hover:bg-orange-600 text-white',
                ].join(' ')}
                aria-disabled={current}
              >
                {current ? 'On this plan' : 'Request upgrade'}
              </a>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-4">
        Self-serve checkout arrives in Phase C. For now, sales handles upgrades.
      </p>
    </Card>
  );
}

// ---------- invoices card ----------

function InvoicesCard() {
  return (
    <Card title="Invoices">
      <div className="text-center py-8">
        <FileText size={32} strokeWidth={1.5} className="mx-auto text-gray-600 mb-2" aria-hidden="true" />
        <p className="text-gray-300 text-sm font-medium">No invoices yet</p>
        <p className="text-gray-500 text-xs mt-1">
          Phase C will surface payment history here.
        </p>
      </div>
    </Card>
  );
}

// ---------- data export card ----------

function DataExportCard() {
  return (
    <Card title="Data export" subtitle="Export your members and workouts as CSV.">
      <button
        type="button"
        disabled
        title="Available after activation"
        className="px-4 py-2 rounded-lg bg-gray-800 text-gray-500 text-sm font-semibold cursor-not-allowed"
      >
        Export CSV
      </button>
      <p className="text-xs text-gray-500 mt-2">
        Available after activation. Phase C will wire this up.
      </p>
    </Card>
  );
}

// ---------- page ----------

export default function SubscriptionPage() {
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

  return (
    <div className="max-w-4xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">Subscription</h1>
        <p className="text-gray-400 text-sm mt-1">Plan, usage, and billing.</p>
      </header>

      {!gymId ? (
        <InlineError message="No gym is linked to this admin account. Sign out and back in to refresh." />
      ) : loading ? (
        <div className="space-y-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : loadError ? (
        <div className="space-y-3">
          <InlineError message={loadError} />
          <button
            type="button"
            onClick={() => load(gymId)}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      ) : sub ? (
        <div className="space-y-6">
          <CurrentPlanCard sub={sub} />
          <MrrCard sub={sub} />
          <UpgradeCard sub={sub} />
          <InvoicesCard />
          <DataExportCard />
        </div>
      ) : null}
    </div>
  );
}
