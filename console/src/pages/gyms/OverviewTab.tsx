import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { useGymQuery } from '../../lib/queries';
import { ONBOARDING_STEP_KEYS } from '../../lib/constants';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OverviewTab() {
  const { gymId } = useParams<{ gymId: string }>();
  const { data } = useGymQuery(gymId);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  if (!data) return null;
  const { gym, owner, onboarding_steps } = data;

  async function handlePreview() {
    if (!gymId || !owner) return;
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const res = await api.post(`/super-admin/preview/${gymId}`);
      const url: string | undefined = res.data?.data?.preview_url;
      if (!url) throw new Error('No preview URL returned');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
          : null;
      setPreviewError(msg ?? 'Could not start preview.');
    } finally {
      setPreviewLoading(false);
    }
  }

  const completedKeys = new Set(
    onboarding_steps.filter((s) => s.completed_at).map((s) => s.step_key)
  );
  const completedCount = ONBOARDING_STEP_KEYS.filter((k) =>
    completedKeys.has(k)
  ).length;

  return (
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
            <div className="pt-3 mt-1 border-t border-ink-700">
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewLoading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="preview-as-owner"
              >
                {previewLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} strokeWidth={1.75} />}
                <span>{previewLoading ? 'Opening preview' : 'Preview as owner'}</span>
              </button>
              {previewError && (
                <p role="alert" className="text-red-300 text-xs mt-2">{previewError}</p>
              )}
              <p className="text-ink-400 text-[11px] mt-2 leading-snug">
                Opens the admin panel in a new tab as this owner. Audited; no
                persistent banner yet — close the tab when done.
              </p>
            </div>
          </>
        ) : (
          <p className="text-xs text-ink-300">No gym_owner user found.</p>
        )}
      </Card>

      <Card title="Subscription">
        <Field
          label="Members"
          value={`${gym.member_count}${gym.member_cap !== null ? ` / ${gym.member_cap}` : ''}`}
          mono
        />
        <Field
          label="MRR"
          value={`$${(gym.mrr_cents / 100).toFixed(2)}/mo`}
          mono
        />
        <Field label="Trial started" value={formatDate(gym.trial_started_at)} mono />
        <Field label="Expires" value={formatDate(gym.subscription_expires_at)} mono />
        <Field
          label="Onboarding"
          value={`${completedCount} / ${ONBOARDING_STEP_KEYS.length} complete`}
          mono
        />
      </Card>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-ink-800 border border-ink-700 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-ink-300">
          {title}
        </h2>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-ink-300 text-xs">{label}</span>
      <span
        className={['text-ink-100 text-right', mono ? 'font-mono text-xs' : ''].join(
          ' '
        )}
      >
        {value || '—'}
      </span>
    </div>
  );
}
