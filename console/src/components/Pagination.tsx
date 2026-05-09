import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/**
 * Pagination — single row, left side shows the current window, right side
 * has prev/next chevrons. Operator console tone: numbers, not adjectives.
 */
export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-ink-700 text-xs text-ink-300">
      <p className="font-mono" data-numeric>
        {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <span className="font-mono text-ink-400" data-numeric>
          page {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={prevDisabled}
          className="p-1.5 rounded-xs border border-ink-700 text-ink-200 hover:border-brand-500 hover:text-brand-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-ink-700 disabled:hover:text-ink-200 transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={nextDisabled}
          className="p-1.5 rounded-xs border border-ink-700 text-ink-200 hover:border-brand-500 hover:text-brand-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-ink-700 disabled:hover:text-ink-200 transition-colors"
          aria-label="Next page"
        >
          <ChevronRight size={14} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
