import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  /** Optional click handler — fires the row record when an operator selects it. */
  onRowClick?: (row: TData) => void;
  /** Skeleton state — renders 5 placeholder rows so the layout never jumps. */
  isLoading?: boolean;
  /** Empty-state slot rendered inside `<tbody>` when there are zero rows. */
  emptyState?: React.ReactNode;
  /** Stable key extractor; falls back to TanStack's row id. */
  getRowId?: (row: TData) => string;
}

/**
 * DataTable — thin TanStack Table wrapper, cyan-themed for the operator
 * console. Mono numerics live on individual column defs via the `meta.numeric`
 * flag (see GymsPage); the wrapper just renders what TanStack tells it to.
 */
export default function DataTable<TData>({
  data,
  columns,
  onRowClick,
  isLoading,
  emptyState,
  getRowId,
}: DataTableProps<TData>) {
  const table = useReactTable<TData>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
  });

  const colCount = columns.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-ink-800 border-b border-ink-700">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const numeric =
                  (header.column.columnDef.meta as { numeric?: boolean } | undefined)
                    ?.numeric ?? false;
                return (
                  <th
                    key={header.id}
                    className={[
                      'px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-ink-300',
                      numeric ? 'text-right' : 'text-left',
                    ].join(' ')}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-ink-700/70">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skel-${i}`}>
                {Array.from({ length: colCount }).map((__, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-3.5 bg-ink-700/70 rounded-xs animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-4 py-10">
                {emptyState ?? (
                  <p className="text-center text-sm text-ink-300">No results</p>
                )}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row: Row<TData>) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={[
                  'transition-colors',
                  onRowClick ? 'cursor-pointer hover:bg-ink-700/40' : '',
                ].join(' ')}
              >
                {row.getVisibleCells().map((cell) => {
                  const numeric =
                    (cell.column.columnDef.meta as { numeric?: boolean } | undefined)
                      ?.numeric ?? false;
                  return (
                    <td
                      key={cell.id}
                      className={[
                        'px-4 py-3 text-ink-100',
                        numeric ? 'text-right font-mono' : '',
                      ].join(' ')}
                      data-numeric={numeric ? '' : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
