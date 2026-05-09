import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { useGymAuditQuery, type AuditEntry } from '../../lib/queries';

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditTab() {
  const { gymId } = useParams<{ gymId: string }>();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGymAuditQuery(gymId, page);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 bg-ink-800 border border-ink-700 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!data || data.entries.length === 0) {
    return (
      <EmptyState
        Icon={FileText}
        title="No audit entries yet."
        body="Every super_admin action against this gym lands here."
      />
    );
  }

  return (
    <div className="bg-ink-800 border border-ink-700 rounded-lg">
      <ul className="divide-y divide-ink-700">
        {data.entries.map((e) => (
          <AuditRow key={e.id} entry={e} />
        ))}
      </ul>
      <Pagination
        page={data.page}
        pageSize={data.page_size}
        total={data.total}
        onPageChange={setPage}
      />
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const [open, setOpen] = useState(false);
  const hasDiff = Boolean(
    (entry.before && Object.keys(entry.before as object).length > 0) ||
      (entry.after && Object.keys(entry.after as object).length > 0)
  );

  return (
    <li className="px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-baseline justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <span className="font-mono text-xs text-ink-300 shrink-0">
          {formatTime(entry.created_at)}
        </span>
        <span className="text-sm text-ink-100 flex-1">{entry.action}</span>
        {entry.ip && (
          <span className="font-mono text-[11px] text-ink-400 shrink-0">{entry.ip}</span>
        )}
      </button>
      {open && hasDiff && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <DiffPane label="Before" payload={entry.before} />
          <DiffPane label="After" payload={entry.after} />
        </div>
      )}
    </li>
  );
}

function DiffPane({ label, payload }: { label: string; payload: unknown }) {
  return (
    <div className="bg-ink-900 border border-ink-700 rounded-md p-3">
      <p className="text-[11px] uppercase tracking-wider text-ink-400 mb-2">{label}</p>
      <pre className="font-mono text-[11px] text-ink-100 whitespace-pre-wrap break-words">
        {payload ? JSON.stringify(payload, null, 2) : '—'}
      </pre>
    </div>
  );
}
