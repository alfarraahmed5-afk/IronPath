import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import DataTable from '../components/DataTable';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Pill, { statusTone, tierTone } from '../components/Pill';
import { useGymsQuery, type GymRow } from '../lib/queries';

const STATUS_OPTIONS = ['all', 'trial', 'active', 'expired', 'cancelled'] as const;
const TIER_OPTIONS = ['all', 'starter', 'growth', 'unlimited'] as const;

function formatMoneyCents(c: number): string {
  if (!c) return '—';
  return `$${(c / 100).toFixed(2)}`;
}

function formatDateShort(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function trialDaysLeft(expiresAt: string | null, status: string | null): number | null {
  if (status !== 'trial' || !expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export default function GymsPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [tier, setTier] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGymsQuery({ q, status, tier, page });

  const columns = useMemo<ColumnDef<GymRow, unknown>[]>(() => [
    {
      header: 'Gym',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-ink-50">{row.original.name}</p>
          {row.original.location && <p className="text-xs text-ink-300">{row.original.location}</p>}
        </div>
      ),
    },
    {
      header: 'Owner',
      accessorKey: 'owner_email',
      cell: ({ row }) => row.original.owner_email
        ? <span className="text-ink-200 text-xs font-mono">{row.original.owner_email}</span>
        : <span className="text-ink-400 text-xs">—</span>,
    },
    {
      header: 'Tier',
      accessorKey: 'subscription_tier',
      cell: ({ row }) => row.original.subscription_tier
        ? <Pill tone={tierTone(row.original.subscription_tier)}>{row.original.subscription_tier}</Pill>
        : <span className="text-ink-400 text-xs">—</span>,
    },
    {
      header: 'Status',
      accessorKey: 'subscription_status',
      cell: ({ row }) => row.original.subscription_status
        ? <Pill tone={statusTone(row.original.subscription_status)}>{row.original.subscription_status}</Pill>
        : <span className="text-ink-400 text-xs">—</span>,
    },
    {
      header: 'Members',
      meta: { numeric: true },
      cell: ({ row }) => {
        const cap = row.original.member_cap;
        return <span>{row.original.member_count}{cap !== null ? ` / ${cap}` : ''}</span>;
      },
    },
    {
      header: 'MRR',
      meta: { numeric: true },
      cell: ({ row }) => formatMoneyCents(row.original.mrr_cents),
    },
    {
      header: 'Trial left',
      meta: { numeric: true },
      cell: ({ row }) => {
        const d = trialDaysLeft(row.original.subscription_expires_at, row.original.subscription_status);
        return d === null ? '—' : `${d}d`;
      },
    },
    {
      header: 'Last active',
      meta: { numeric: true },
      cell: ({ row }) => formatDateShort(row.original.last_active_at),
    },
  ], []);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-50">Gyms</h1>
          <p className="text-sm text-ink-300 mt-1">All gyms across the platform.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/gyms/new')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-ink-950 text-sm font-medium transition-colors"
        >
          <Plus size={14} strokeWidth={2} />
          Create gym
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            placeholder="Search by name or owner email"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 bg-ink-800 border border-ink-700 rounded-md text-sm text-ink-100 placeholder-ink-400 focus:outline-none focus:border-brand-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-ink-800 border border-ink-700 rounded-md text-sm text-ink-100 focus:outline-none focus:border-brand-500"
        >
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'all' ? 'all status' : s}</option>)}
        </select>
        <select
          value={tier}
          onChange={(e) => { setTier(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-ink-800 border border-ink-700 rounded-md text-sm text-ink-100 focus:outline-none focus:border-brand-500"
        >
          {TIER_OPTIONS.map(t => <option key={t} value={t}>{t === 'all' ? 'all tiers' : t}</option>)}
        </select>
      </div>

      <div className="bg-ink-800 border border-ink-700 rounded-lg overflow-hidden">
        <DataTable
          data={data?.gyms ?? []}
          columns={columns}
          isLoading={isLoading}
          getRowId={(row) => row.id}
          onRowClick={(row) => navigate(`/gyms/${row.id}`)}
          emptyState={<EmptyState Icon={Building2} title="No gyms match these filters." body="Try clearing the status or tier filters, or create a gym manually." />}
        />
        {data && data.total > 0 && (
          <Pagination page={data.page} pageSize={data.page_size} total={data.total} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}
