import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import Pill, { statusTone, tierTone } from '../components/Pill';
import { useGymQuery } from '../lib/queries';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const TABS: { to: string; label: string }[] = [
  { to: 'overview', label: 'Overview' },
  { to: 'subscription', label: 'Subscription' },
  { to: 'audit', label: 'Audit' },
  { to: 'onboarding', label: 'Onboarding' },
];

export default function GymDetailPage() {
  const { gymId } = useParams<{ gymId: string }>();
  const { data, isLoading, isError } = useGymQuery(gymId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-1/3 bg-ink-800 rounded animate-pulse" />
        <div className="h-32 bg-ink-800 rounded animate-pulse" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <EmptyState
        Icon={FileText}
        title="Could not load gym."
        body="Try again, or check that the URL is right."
      />
    );
  }

  const { gym } = data;

  return (
    <div className="space-y-6">
      <Link
        to="/gyms"
        className="inline-flex items-center gap-1.5 text-xs text-ink-300 hover:text-brand-300 transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={1.75} />
        All gyms
      </Link>

      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50">{gym.name}</h1>
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
        <div className="text-right text-xs text-ink-300 font-mono">
          <p>{gym.id}</p>
          <p>created {formatDate(gym.created_at)}</p>
        </div>
      </header>

      <nav role="tablist" aria-label="Gym detail" className="flex border-b border-ink-700">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            role="tab"
            className={({ isActive }) =>
              [
                'px-3 py-2 -mb-px text-sm transition-colors border-b-2',
                isActive
                  ? 'border-brand-500 text-brand-300'
                  : 'border-transparent text-ink-300 hover:text-ink-100',
              ].join(' ')
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
