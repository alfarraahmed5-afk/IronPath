import { useState } from 'react';
import { Inbox as InboxIcon, Search } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { useLeadsQuery, useUpdateLeadMutation, type Lead, type LeadStatus } from '../lib/mutations';

const STATUS_OPTIONS = ['all', 'new', 'contacted', 'demo_booked', 'trialing', 'negotiating', 'won', 'lost', 'dropped'] as const;

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function InboxPage() {
  const [status, setStatus] = useState<string>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useLeadsQuery({ status: status as LeadStatus | 'all', q, page });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-ink-50">Inbox</h1>
        <p className="text-sm text-ink-300 mt-1">Leads from the marketing site and inbound channels.</p>
      </header>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            placeholder="Search by email or gym name"
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
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-ink-800 border border-ink-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !data || data.leads.length === 0 ? (
        <EmptyState Icon={InboxIcon} title="No leads yet." body="Hook up the marketing form and they'll land here." />
      ) : (
        <>
          <ul className="space-y-2">
            {data.leads.map(lead => <LeadCard key={lead.id} lead={lead} />)}
          </ul>
          <div className="bg-ink-800 border border-ink-700 rounded-lg">
            <Pagination page={data.page} pageSize={data.page_size} total={data.total} onPageChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const update = useUpdateLeadMutation();

  return (
    <li className="bg-ink-800 border border-ink-700 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-medium text-ink-50">{lead.gym_name || lead.name || lead.email || 'Unknown'}</p>
          <p className="text-xs text-ink-300 font-mono mt-0.5">{lead.email || '—'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-400 font-mono">{formatRelative(lead.created_at)}</span>
          <select
            value={lead.status}
            onChange={(e) => update.mutate({ id: lead.id, body: { status: e.target.value as LeadStatus } })}
            className="px-2 py-1 bg-ink-900 border border-ink-700 rounded-xs text-xs text-ink-100 focus:outline-none focus:border-brand-500"
          >
            {(['new', 'contacted', 'demo_booked', 'trialing', 'negotiating', 'won', 'lost', 'dropped'] as const).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      {lead.message && <p className="text-xs text-ink-300 line-clamp-2 mb-1">{lead.message}</p>}
      {(lead.source || lead.utm_source) && (
        <p className="text-[11px] text-ink-400 font-mono">
          {lead.source && <>source: {lead.source}</>}
          {lead.source && lead.utm_source && ' · '}
          {lead.utm_source && <>utm: {lead.utm_source}{lead.utm_campaign ? `/${lead.utm_campaign}` : ''}</>}
        </p>
      )}
    </li>
  );
}
