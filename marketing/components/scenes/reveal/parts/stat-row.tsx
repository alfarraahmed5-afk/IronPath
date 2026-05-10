'use client';

// The three "drop" stats. Uses NumberFlow for the rolling odometer effect on
// the active-members count and MRR; retention is a plain animated percent so
// the row has a rhythm of three different number types instead of three
// identical odometers.

import NumberFlow from '@number-flow/react';

interface StatRowProps {
  /** When true, the numbers count up from 0 to their target values. Driven
   *  by parent — usually flips at the drop boundary (~340vh global). */
  active: boolean;
  /** When true, render final values immediately (reduced-motion variant). */
  staticFinal?: boolean;
}

export function StatRow({ active, staticFinal = false }: StatRowProps) {
  const target = active || staticFinal;
  return (
    <div
      className="grid grid-cols-3 gap-4 sm:gap-8 w-full"
      role={staticFinal ? 'status' : undefined}
      aria-live={staticFinal ? 'polite' : undefined}
    >
      <Stat
        label="Active members"
        value={target ? 217 : 0}
        prefix=""
        suffix=""
      />
      <Stat
        label="Monthly recurring"
        value={target ? 4851 : 0}
        prefix="$"
        suffix=""
      />
      <Stat
        label="Retention"
        value={target ? 89 : 0}
        prefix=""
        suffix="%"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  prefix: string;
  suffix: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div
        data-numeric
        className="font-display text-2xl sm:text-4xl md:text-5xl tracking-tight text-ink-50 tabular-nums"
      >
        <NumberFlow
          value={value}
          prefix={prefix}
          suffix={suffix}
          format={{ notation: 'standard', maximumFractionDigits: 0 }}
        />
      </div>
      <div className="text-[10px] sm:text-xs uppercase tracking-wider text-ink-400">
        {label}
      </div>
    </div>
  );
}
