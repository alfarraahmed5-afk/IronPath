'use client';

// The three "drop" stats. Uses NumberFlow for the rolling odometer effect on
// the active-members count and MRR; retention is a plain animated percent so
// the row has a rhythm of three different number types instead of three
// identical odometers.
//
// Locale-awareness: MRR currency switches between USD ($4,851) on EN and EGP
// (118,500 ج.م) on AR. The ratio is anchored to the in-page mock gym, not to
// any real exchange rate, so the EGP figure is chosen to feel plausible for
// an Egyptian gym at the same member count rather than being a literal
// conversion. Western Arabic numerals stay in both locales per the i18n
// architect's spec.

import NumberFlow from '@number-flow/react';
import { useTranslations, useLocale } from 'next-intl';

interface StatRowProps {
  /** When true, the numbers count up from 0 to their target values. Driven
   *  by parent -- usually flips at the drop boundary (~340vh global). */
  active: boolean;
  /** When true, render final values immediately (reduced-motion variant). */
  staticFinal?: boolean;
}

export function StatRow({ active, staticFinal = false }: StatRowProps) {
  const t = useTranslations('scenes.reveal.dashboard.stats');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const target = active || staticFinal;

  // Currency block: EN puts the symbol BEFORE the number; AR conventionally
  // puts it AFTER. NumberFlow's prefix/suffix handles either side as opaque
  // strings, so we just pick the right slot per locale.
  const mrrTarget = isAr ? 118_500 : 4_851;
  const mrrPrefix = isAr ? '' : '$';
  const mrrSuffix = isAr ? ' ج.م' : '';

  return (
    <div
      className="grid grid-cols-3 gap-4 sm:gap-8 w-full"
      role={staticFinal ? 'status' : undefined}
      aria-live={staticFinal ? 'polite' : undefined}
    >
      <Stat
        label={t('activeMembers')}
        value={target ? 217 : 0}
        prefix=""
        suffix=""
      />
      <Stat
        label={t('monthlyRecurring')}
        value={target ? mrrTarget : 0}
        prefix={mrrPrefix}
        suffix={mrrSuffix}
      />
      <Stat
        label={t('retention')}
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
