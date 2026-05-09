import { cn } from '@/lib/utils';

/**
 * Loading-state primitive per plan §3.7. Replaces the various "Loading…"
 * text bandages currently scattered across pages — the motion designer
 * council called those out as a §3.7 violation.
 *
 * Usage:
 *   <Skeleton className="h-6 w-32" />
 *   <Skeleton className="h-24 w-full rounded-xl" />
 *
 * The shimmer animation lives in index.css (.skeleton-shimmer + @keyframes
 * shimmer). Pure CSS — no framer-motion, no JS — so this stays free in
 * bundle terms even when used hundreds of times.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('skeleton-shimmer rounded-md', className)}
      aria-busy="true"
      aria-live="polite"
      {...props}
    />
  );
}
