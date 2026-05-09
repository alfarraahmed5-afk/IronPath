import { useParams } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import { useGymQuery } from '../../lib/queries';
import { ONBOARDING_STEP_KEYS } from '../../lib/constants';

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STEP_LABELS: Record<string, string> = {
  profile: 'Confirm gym profile',
  logo: 'Upload logo',
  first_invite: 'Generate first invite code',
  first_member: 'First member joined',
  first_announcement: 'Post first announcement',
  subscription_chosen: 'Pick a subscription tier',
};

export default function OnboardingTab() {
  const { gymId } = useParams<{ gymId: string }>();
  const { data } = useGymQuery(gymId);
  if (!data) return null;
  const { onboarding_steps } = data;

  const byKey = new Map(onboarding_steps.map((s) => [s.step_key, s]));
  const completedCount = ONBOARDING_STEP_KEYS.filter(
    (k) => byKey.get(k)?.completed_at
  ).length;

  if (onboarding_steps.length === 0) {
    return (
      <EmptyState
        Icon={ListChecks}
        title="No onboarding activity yet."
        body="Steps land here as the gym owner completes them."
      />
    );
  }

  return (
    <section className="bg-ink-800 border border-ink-700 rounded-lg p-5">
      <header className="flex items-baseline justify-between mb-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-ink-300">
          Onboarding
        </h2>
        <span className="font-mono text-xs text-ink-300">
          {completedCount} / {ONBOARDING_STEP_KEYS.length} complete
        </span>
      </header>
      <ul className="space-y-2">
        {ONBOARDING_STEP_KEYS.map((key) => {
          const step = byKey.get(key);
          const done = Boolean(step?.completed_at);
          return (
            <li
              key={key}
              className="flex items-center gap-3 px-3 py-2 rounded-md border border-ink-700 bg-ink-900/40"
            >
              <span
                className={[
                  'inline-block w-2 h-2 rounded-full shrink-0',
                  done ? 'bg-emerald-400' : 'bg-ink-600',
                ].join(' ')}
                aria-hidden
              />
              <div className="flex-1">
                <p className={done ? 'text-sm text-ink-100' : 'text-sm text-ink-300'}>
                  {STEP_LABELS[key] ?? key}
                </p>
                <p className="text-[11px] font-mono text-ink-400">{key}</p>
              </div>
              {done && (
                <span className="text-[11px] text-ink-400 font-mono">
                  {formatTime(step?.completed_at)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
