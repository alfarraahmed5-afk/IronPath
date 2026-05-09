import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, ListChecks, Pencil } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import Pill, { statusTone, tierTone } from '../components/Pill';
import SubscriptionEditor from '../components/SubscriptionEditor';
import { useGymQuery, useGymAuditQuery } from '../lib/queries';
import { ONBOARDING_STEP_KEYS } from '../lib/constants';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function GymDetailPage() {
  const { gymId } = useParams<{ gymId: string }>();
  const { data, isLoading, isError } = useGymQuery(gymId);
  const { data: auditPage } = useGymAuditQuery(gymId);
  const [editorOpen, setEditorOpen] = useState(false);

  if (isLoading) {
    return <div className="space-y-3"><div className="h-8 w-1/3 bg-ink-800 rounded animate-pulse" /><div className="h-32 bg-ink-800 rounded animate-pulse" /></div>;
  }
  if (isError || !data) {
    return <EmptyState Icon={FileText} title="Could not load gym." body="Try again, or check that the URL is right." />;
  }

  const { gym, owner, onboarding_steps } = data;
  const completedKeys = new Set(onboarding_steps.filter(s => s.completed_at).map(s => s.step_key));
  const completedCount = ONBOARDING_STEP_KEYS.filter(k => completedKeys.has(k)).length;

  return (
    <div className="space-y-6">
      <Link to="/gyms" className="inline-flex items-center gap-1.5 text-xs text-ink-300 hover:text-brand-300 transition-colors">
        <ArrowLeft size={14} strokeWidth={1.75} />
        All gyms
      </Link>

      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50">{gym.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            {gym.subscription_tier && <Pill tone={tierTone(gym.subscription_tier)}>{gym.subscription_tier}</Pill>}
            {gym.subscription_status && <Pill tone={statusTone(gym.subscription_status)}>{gym.subscription_status}</Pill>}
          </div>
        </div>
        <div className="text-right text-xs text-ink-300 font-mono">
          <p>{gym.id}</p>
          <p>created {formatDate(gym.created_at)}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Profile">
          <Field label="Location" value={gym.location} />
          <Field label="Phone" value={gym.phone} />
          <Field label="Website" value={gym.website} />
          <Field label="Address" value={gym.address} />
          <Field label="Timezone" value={gym.timezone} />
          <Field label="Default units" value={gym.units_default} />
          <Field label="Invite code" value={gym.invite_code} mono />
        </Card>

        <Card title="Owner">
          {owner ? (
            <>
              <Field label="Name" value={owner.full_name} />
              <Field label="Email" value={owner.email} mono />
              <Field label="Last active" value={formatTime(owner.last_active_at)} mono />
            </>
          ) : (
            <p className="text-xs text-ink-300">No gym_owner user found.</p>
          )}
        </Card>

        <Card title="Subscription">
          <Field label="Members" value={`${gym.member_count}${gym.member_cap !== null ? ` / ${gym.member_cap}` : ''}`} mono />
          <Field label="MRR" value={gym.mrr_cents ? `$${(gym.mrr_cents / 100).toFixed(2)}/mo` : '—'} mono />
          <Field label="Trial started" value={formatDate(gym.trial_started_at)} mono />
          <Field label="Expires" value={formatDate(gym.subscription_expires_at)} mono />
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-ink-950 text-xs font-medium transition-colors"
          >
            <Pencil size={12} strokeWidth={1.75} />
            Edit subscription
          </button>
        </Card>
      </div>

      {gymId && (
        <SubscriptionEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          gymId={gymId}
          gymName={gym.name}
          current={{
            tier: (gym.subscription_tier as 'starter' | 'growth' | 'unlimited' | null) ?? null,
            status: (gym.subscription_status as 'trial' | 'active' | 'expired' | 'cancelled' | null) ?? null,
            expires_at: gym.subscription_expires_at,
            mrr_cents: gym.mrr_cents ?? null,
          }}
        />
      )}

      <Card title={`Onboarding (${completedCount} / ${ONBOARDING_STEP_KEYS.length})`} icon={ListChecks}>
        <ul className="space-y-1.5 text-sm">
          {ONBOARDING_STEP_KEYS.map(key => {
            const done = completedKeys.has(key);
            return (
              <li key={key} className="flex items-center gap-2">
                <span className={['inline-block w-2 h-2 rounded-full', done ? 'bg-emerald-400' : 'bg-ink-600'].join(' ')} aria-hidden />
                <span className={done ? 'text-ink-100' : 'text-ink-300'}>{key}</span>
                {done && <span className="ml-auto text-[11px] text-ink-400 font-mono">{formatTime(onboarding_steps.find(s => s.step_key === key)?.completed_at)}</span>}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Recent activity" icon={FileText}>
        {auditPage && auditPage.entries.length > 0 ? (
          <ul className="divide-y divide-ink-700/60">
            {auditPage.entries.map(e => (
              <li key={e.id} className="py-2 flex items-baseline justify-between gap-3">
                <span className="font-mono text-xs text-ink-300">{formatTime(e.created_at)}</span>
                <span className="text-sm text-ink-100 flex-1">{e.action}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-300">No audit entries yet.</p>
        )}
      </Card>
    </div>
  );
}

function Card({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: typeof FileText }) {
  return (
    <section className="bg-ink-800 border border-ink-700 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={14} strokeWidth={1.75} className="text-ink-400" />}
        <h2 className="text-xs font-medium uppercase tracking-wider text-ink-300">{title}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Field({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-ink-300 text-xs">{label}</span>
      <span className={['text-ink-100 text-right', mono ? 'font-mono text-xs' : ''].join(' ')}>{value || '—'}</span>
    </div>
  );
}
