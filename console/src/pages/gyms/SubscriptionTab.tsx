import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import Pill, { statusTone, tierTone } from '../../components/Pill';
import SubscriptionEditor from '../../components/SubscriptionEditor';
import { useGymQuery } from '../../lib/queries';

// Canonical enums — used to validate the backend's nullable string columns
// before forwarding them to the editor. Without this, a legacy or hand-edited
// `subscription_tier` would silently leak through the `as Tier` cast and break
// the editor's enum guard upstream.
const SUBSCRIPTION_TIERS = ['starter', 'growth', 'unlimited'] as const;
const SUBSCRIPTION_STATUSES = ['trial', 'active', 'expired', 'cancelled'] as const;
type Tier = typeof SUBSCRIPTION_TIERS[number];
type Status = typeof SUBSCRIPTION_STATUSES[number];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysUntil(iso: string | null | undefined): string {
  if (!iso) return '—';
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.round(ms / 86_400_000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'today';
  return `in ${days}d`;
}

export default function SubscriptionTab() {
  const { gymId } = useParams<{ gymId: string }>();
  const { data } = useGymQuery(gymId);
  const [editorOpen, setEditorOpen] = useState(false);
  if (!data || !gymId) return null;
  const { gym } = data;

  return (
    <div className="space-y-4">
      <section className="bg-ink-800 border border-ink-700 rounded-lg p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-medium text-ink-50">Current plan</h2>
            <div className="flex items-center gap-2 mt-2">
              {gym.subscription_tier && (
                <Pill tone={tierTone(gym.subscription_tier)}>
                  {gym.subscription_tier}
                </Pill>
              )}
              {gym.subscription_status && (
                <Pill tone={statusTone(gym.subscription_status)}>
                  {gym.subscription_status}
                </Pill>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-ink-950 text-xs font-medium transition-colors"
          >
            <Pencil size={12} strokeWidth={1.75} />
            Edit subscription
          </button>
        </div>

        <dl className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-6 text-sm">
          <Stat label="Members" value={`${gym.member_count}${gym.member_cap !== null ? ` / ${gym.member_cap}` : ''}`} />
          <Stat
            label="MRR"
            value={`$${(gym.mrr_cents / 100).toFixed(2)}`}
            suffix="/mo"
          />
          <Stat label="Trial started" value={formatDate(gym.trial_started_at)} />
          <Stat
            label="Expires"
            value={formatDate(gym.subscription_expires_at)}
            suffix={gym.subscription_expires_at ? daysUntil(gym.subscription_expires_at) : undefined}
          />
        </dl>
      </section>

      <section className="bg-ink-800 border border-ink-700 rounded-lg p-5">
        <h3 className="text-xs font-medium uppercase tracking-wider text-ink-300 mb-3">
          Payment history
        </h3>
        <p className="text-xs text-ink-400">
          Listing endpoint lands later in Phase B. Mark a payment via the editor — it inserts into
          <span className="font-mono"> subscription_payments</span> and bumps the expiry.
        </p>
      </section>

      {/*
        `key` flips with `editorOpen` so each open re-mounts the editor from
        scratch. Combined with TanStack Query invalidation on each editor
        mutation, this guarantees the seeded defaults always reflect the
        latest server state (Phase B frontend review caught the prior stale
        seeding when re-opening the editor after a mark-paid).
      */}
      <SubscriptionEditor
        key={editorOpen ? 'open' : 'closed'}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        gymId={gymId}
        gymName={gym.name}
        current={{
          tier: (SUBSCRIPTION_TIERS as readonly string[]).includes(gym.subscription_tier ?? '')
            ? (gym.subscription_tier as Tier)
            : null,
          status: (SUBSCRIPTION_STATUSES as readonly string[]).includes(gym.subscription_status ?? '')
            ? (gym.subscription_status as Status)
            : null,
          expires_at: gym.subscription_expires_at,
          mrr_cents: gym.mrr_cents ?? null,
        }}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-ink-300 mb-0.5">{label}</dt>
      <dd className="font-mono text-sm text-ink-100">
        {value}
        {suffix && <span className="text-ink-400 ml-1">{suffix}</span>}
      </dd>
    </div>
  );
}
