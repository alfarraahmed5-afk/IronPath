// Team Alpha α4 — the brand artifact. A 1px horizontal hairline gradient
// with 12px blur halo, breathing via background-position over 8s. Used
// along the bottom edge of every page header and the top edge of every
// hero/photo band. Visual styling lives in the `.ember-seam` CSS class
// (built by α3); this component is the React surface only.

import { cn } from '@/lib/utils';

interface EmberSeamProps {
  className?: string;
  /**
   * If true, rotate 90deg for use as a vertical divider (e.g. between
   * sidebar and main content). Default false (horizontal).
   */
  vertical?: boolean;
}

export function EmberSeam({ className, vertical = false }: EmberSeamProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'ember-seam pointer-events-none',
        vertical && 'rotate-90 origin-left',
        className
      )}
    />
  );
}
