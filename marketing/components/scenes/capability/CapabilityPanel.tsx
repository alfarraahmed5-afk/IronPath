'use client';

import { m } from 'framer-motion';
import { useTranslations, useMessages, useLocale } from 'next-intl';
import { VERCEL_EASE } from '@/lib/motion';

// CapabilityPanel -- single horizontal-scroll panel inside the Capability act.
// Visuals are CSS-rendered mocks that mirror admin's surface treatment so the
// panel reads as "this is the actual product" without needing a screenshot
// pipeline. Replace the inline mock with an AVIF (`/scene-4/<slug>.avif`)
// when art is finalized -- the prop API is intentionally flexible.
//
// Locale-awareness:
//   - Roster member names + initials flip per locale (Latin in EN, Arabic in
//     AR). Founder mandate after first deploy: no Latin mock names bleeding
//     into the Arabic page.
//   - Receipt currency switches between USD ($) on EN and EGP (ج.م) on AR
//     with locale-appropriate amounts.
//   - Pulse lifter names + movements flip per locale.
//   - Member name <span lang/dir> attributes follow the active locale so the
//     bidirectional algorithm doesn't garble runs.

export type CapabilitySlug = 'roster' | 'grow' | 'receipt' | 'pulse';

export interface CapabilityPanelProps {
  index: number;
  slug: CapabilitySlug;
  eyebrow: string;
  title: string;
  copy: string;
  /** Optional override visual; defaults to the slug-matched CSS mock. */
  children?: React.ReactNode;
}

/**
 * Each panel is a fixed-width column in the horizontal track. Width is set
 * to `100vw` on mobile (irrelevant -- mobile forks to vertical stack) and
 * `min(90vw, 1100px)` on desktop so 4 panels span ~360–400% of viewport,
 * matching the GSAP `xPercent: -75` translation.
 */
export function CapabilityPanel({
  index,
  slug,
  eyebrow,
  title,
  copy,
  children,
}: CapabilityPanelProps) {
  return (
    <article
      data-capability-panel
      data-slug={slug}
      className={[
        'capability-panel',
        'shrink-0 w-screen md:w-[min(92vw,1180px)]',
        'h-full min-h-[100svh] md:min-h-0',
        'flex items-center justify-center px-4 md:px-10',
      ].join(' ')}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-16 items-center w-full max-w-[1100px]">
        <header className="space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400">
            {/* Index numerals stay Latin in any locale; wrap in <bdi> so the
                bidirectional algorithm doesn't reorder "01 · الأعضاء" weirdly. */}
            <bdi>{String(index + 1).padStart(2, '0')}</bdi> · {eyebrow}
          </p>
          <h3
            data-font-display
            className="font-display text-3xl sm:text-4xl lg:text-5xl leading-[1.05] tracking-tight"
          >
            {title}
          </h3>
          <p className="text-ink-300 text-base sm:text-lg max-w-md">{copy}</p>
        </header>

        <m.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.5, ease: VERCEL_EASE }}
          className="relative"
        >
          {children ?? <DefaultMock slug={slug} />}
        </m.div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// CSS mocks -- purposefully geometric, never photographic. They evoke admin's
// dark-surface UI without forcing a network round-trip for an image.
// ---------------------------------------------------------------------------

function DefaultMock({ slug }: { slug: CapabilitySlug }) {
  switch (slug) {
    case 'roster':
      return <RosterMock />;
    case 'grow':
      return <GrowMock />;
    case 'receipt':
      return <ReceiptMock />;
    case 'pulse':
      return <PulseMock />;
  }
}

function MockShell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="relative rounded-2xl border border-ink-800 bg-ink-900 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-ink-800/80 bg-ink-950/40">
        <span className="size-2 rounded-full bg-ink-700" />
        <span className="size-2 rounded-full bg-ink-700" />
        <span className="size-2 rounded-full bg-ink-700" />
        <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">
          {label}
        </span>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function Sparkline({ values, accent = false }: { values: number[]; accent?: boolean }) {
  const w = 60;
  const h = 18;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * (h - 2) - 1).toFixed(1)}`)
    .join(' ');
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="overflow-visible"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={accent ? '#FF4566' : '#76767D'}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface RosterMember {
  initials: string;
  name: string;
  weeks: number[];
  streak: number;
  accent?: boolean;
}

interface PulseLifter {
  who: string;
  move: string;
  weight: string;
  mins: number;
}

// Helper: pull an array out of the message catalog. next-intl's
// useTranslations doesn't support arrays directly, so we tap useMessages and
// narrow the shape ourselves.
function useMockArray<T>(path: string[], fallback: T[]): T[] {
  const messages = useMessages() as Record<string, unknown>;
  let cursor: unknown = messages;
  for (const segment of path) {
    if (cursor && typeof cursor === 'object' && segment in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[segment];
    } else {
      return fallback;
    }
  }
  return Array.isArray(cursor) ? (cursor as T[]) : fallback;
}

function RosterMock() {
  const t = useTranslations('scenes.capability.mocks');
  const locale = useLocale();
  const isAr = locale === 'ar';

  // EN defaults; AR catalog overrides via scenes.capability.mocks.rosterMembers.
  const defaultRows: RosterMember[] = [
    { initials: 'AM', name: 'Alex Morgan',    weeks: [3, 4, 4, 3, 5, 4, 5, 5], streak: 12 },
    { initials: 'JR', name: 'Jamie Reyes',    weeks: [2, 3, 3, 4, 3, 4, 4, 4], streak: 8 },
    { initials: 'KP', name: 'Kai Patel',      weeks: [5, 5, 4, 5, 5, 4, 5, 5], streak: 22 },
    { initials: 'MS', name: 'Morgan Smith',   weeks: [1, 2, 2, 1, 2, 1, 2, 2], streak: 3, accent: true },
    { initials: 'TC', name: 'Taylor Chen',    weeks: [4, 4, 3, 3, 4, 4, 4, 5], streak: 9 },
    { initials: 'RW', name: 'Riley Walker',   weeks: [3, 3, 4, 5, 4, 5, 5, 4], streak: 11 },
  ];
  const rows = useMockArray<RosterMember>(['scenes', 'capability', 'mocks', 'rosterMembers'], defaultRows);
  const streakSuffix = t('rosterStreakSuffix');

  return (
    <MockShell label={t('rosterLabel')}>
      <ul className="divide-y divide-ink-800/70">
        {rows.map((r) => (
          <li
            key={r.name}
            className="flex items-center gap-4 py-2.5 first:pt-0 last:pb-0"
          >
            <span
              lang={isAr ? 'ar' : 'en'}
              dir={isAr ? 'rtl' : 'ltr'}
              className={[
                'size-8 rounded-full grid place-items-center text-[11px] font-mono',
                r.accent
                  ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/40'
                  : 'bg-ink-800 text-ink-300',
              ].join(' ')}
            >
              {r.initials}
            </span>
            <span
              lang={isAr ? 'ar' : 'en'}
              dir={isAr ? 'rtl' : 'ltr'}
              className="flex-1 text-sm text-ink-100 truncate"
            >
              {r.name}
            </span>
            <Sparkline values={r.weeks} accent={r.accent} />
            <span
              data-numeric
              className={[
                'tabular-nums text-xs w-10 text-right',
                r.accent ? 'text-brand-400' : 'text-ink-400',
              ].join(' ')}
            >
              <bdi>{r.streak}</bdi>{streakSuffix}
            </span>
          </li>
        ))}
      </ul>
    </MockShell>
  );
}

function GrowMock() {
  const t = useTranslations('scenes.capability.mocks');
  // QR poster forge -- the "print this, members scan" moment.
  return (
    <MockShell label={t('growLabel')}>
      <div className="grid grid-cols-[1fr_auto] gap-6 items-center">
        <div className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">
            {t('posterDimensions')}
          </p>
          <div className="rounded-xl bg-ink-50 text-ink-950 p-5 space-y-3">
            <p data-font-display className="font-display text-2xl leading-tight tracking-tight">
              {t('posterHeadline')}
            </p>
            <p className="text-xs text-ink-700">
              {t('posterBody')}
            </p>
            <div className="flex items-center gap-3">
              <FakeQR />
              {/* "IRONPATH" is the brand wordmark and the URL is a slug -- both
                  stay LTR in any locale. */}
              <div className="text-[10px] font-mono text-ink-700 leading-tight" lang="en" dir="ltr">
                IRONPATH
                <br />
                {t('posterUrl')}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-3 text-right">
          <button
            type="button"
            disabled
            className="px-3 py-1.5 rounded-md text-xs bg-brand-500/90 text-white font-medium cursor-default"
          >
            {t('printButton')}
          </button>
          <p className="font-mono text-[10px] text-ink-500">
            {t('posterScans', { count: 42 })}
            <br />
            {t('posterScansSuffix')}
          </p>
        </div>
      </div>
    </MockShell>
  );
}

function FakeQR() {
  // Deterministic 9x9 pseudo-QR. Just for visual texture.
  const cells = Array.from({ length: 81 }, (_, i) => {
    // Corner registration squares
    const x = i % 9;
    const y = Math.floor(i / 9);
    const inCorner =
      (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
    if (inCorner) {
      const isEdge = x === 0 || x === 2 || y === 0 || y === 2 || (x > 5 && (x === 6 || x === 8)) || (y > 5 && (y === 6 || y === 8));
      const isCenter = (x === 1 && y === 1) || (x === 7 && y === 1) || (x === 1 && y === 7);
      return isEdge || isCenter ? 1 : 0;
    }
    // Pseudorandom but deterministic
    return ((x * 7 + y * 13 + 11) % 5) < 2 ? 1 : 0;
  });
  return (
    <div
      className="grid bg-ink-50 p-1 rounded"
      style={{
        gridTemplateColumns: 'repeat(9, 6px)',
        gridTemplateRows: 'repeat(9, 6px)',
        gap: '1px',
      }}
      aria-hidden
    >
      {cells.map((c, i) => (
        <span
          key={i}
          className={c ? 'bg-ink-950' : 'bg-ink-50'}
          style={{ width: 6, height: 6 }}
        />
      ))}
    </div>
  );
}

function ReceiptMock() {
  const t = useTranslations('scenes.capability.mocks');
  const messages = useMessages() as {
    scenes?: { capability?: { mocks?: {
      receiptCurrency?: string;
      receiptAmounts?: { standard?: string; coached?: string; dropIn?: string; refunds?: string; net?: string };
    } } };
  };
  const locale = useLocale();
  const isAr = locale === 'ar';

  // Currency + amounts come from the catalog so AR shows EGP and EN shows USD.
  // Defaults preserve the original EN behavior.
  const currency = messages.scenes?.capability?.mocks?.receiptCurrency ?? '$';
  const amounts = messages.scenes?.capability?.mocks?.receiptAmounts ?? {
    standard: '8,520',
    coached: '1,710',
    dropIn: '60',
    refunds: '−45',
    net: '10,245',
  };

  // Format the amount with the currency on the natural side per locale.
  // EN: "$8,520". AR: "8,520 ج.م" (number then unit, like spoken Arabic).
  function fmt(value: string | undefined, fallback: string): string {
    const v = value ?? fallback;
    if (isAr) return `${v} ${currency}`;
    // For negatives in EN we want "−$45", not "$−45". Detect leading sign.
    if (v.startsWith('−') || v.startsWith('-')) {
      return `${v[0]}${currency}${v.slice(1)}`;
    }
    return `${currency}${v}`;
  }

  const lines = [
    { label: t('receiptLines.standard', { count: 142 }), amount: fmt(amounts.standard, '8,520') },
    { label: t('receiptLines.coached', { count: 18 }), amount: fmt(amounts.coached, '1,710') },
    { label: t('receiptLines.dropIn', { count: 4 }), amount: fmt(amounts.dropIn, '60') },
    { label: t('receiptLines.refunds'), amount: fmt(amounts.refunds, '−45') },
  ];
  const netAmount = fmt(amounts.net, '10,245');

  return (
    <MockShell label={t('receiptLabel')}>
      <div className="font-mono text-[12px] text-ink-200 leading-relaxed">
        <div className="text-center pb-2 border-b border-dashed border-ink-700/70">
          {/* Receipt header is the example brand name. EN: "IRONPATH GYM ·
              OAK ST" (Latin). AR: "نادي الحديد · فرع المعادي" (Arabic). The
              lang/dir attributes flip per locale so the bidirectional
              algorithm respects the script. */}
          <div
            className="text-[10px] text-ink-500"
            lang={isAr ? 'ar' : 'en'}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {t('receiptHeader')}
          </div>
          <div className="text-[10px] text-ink-500">{t('receiptPeriod')}</div>
        </div>
        <ul className="py-3 space-y-1.5">
          {lines.map((l) => (
            <li
              key={l.label}
              className="grid grid-cols-[1fr_auto] gap-3 items-baseline"
            >
              <span className="truncate text-ink-300">{l.label}</span>
              <span data-numeric className="tabular-nums text-ink-100">
                <bdi>{l.amount}</bdi>
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-dashed border-ink-700/70 pt-2 grid grid-cols-[1fr_auto] gap-3">
          <span className="text-ink-400">{t('receiptNet')}</span>
          <span data-numeric className="tabular-nums text-brand-400 font-semibold">
            <bdi>{netAmount}</bdi>
          </span>
        </div>
        <div className="text-center pt-3 text-[10px] text-ink-500">
          ──── {t('receiptDeposit')} ────
        </div>
      </div>
    </MockShell>
  );
}

function PulseMock() {
  const t = useTranslations('scenes.capability.mocks');
  const locale = useLocale();
  const isAr = locale === 'ar';

  // Lifter names + movements flip per locale. Defaults preserve EN behavior.
  const defaultLifts: PulseLifter[] = [
    { who: 'Kai',   move: 'Back squat',   weight: '275 lb', mins: 1 },
    { who: 'Jamie', move: 'Bench press',  weight: '185 lb', mins: 2 },
    { who: 'Alex',  move: 'Deadlift',     weight: '315 lb', mins: 3 },
    { who: 'Riley', move: 'Front squat',  weight: '205 lb', mins: 5 },
  ];
  const lifts = useMockArray<PulseLifter>(['scenes', 'capability', 'mocks', 'pulseLifters'], defaultLifts);

  return (
    <MockShell label={t('pulseLabel')}>
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-500">
            {t('pulseActiveNow')}
          </span>
          <span data-numeric className="tabular-nums text-3xl text-ink-50">
            17
          </span>
        </div>
        <div className="relative h-px w-full bg-ink-800 overflow-hidden rounded-full">
          <span className="absolute inset-y-0 left-0 w-[20%] bg-gradient-to-r from-transparent via-brand-500 to-transparent animate-pulse-travel" />
        </div>
        <ul className="pt-2 space-y-2">
          {lifts.map((l) => (
            <li
              key={l.who}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2.5">
                <span className="size-1.5 rounded-full bg-brand-450" />
                <span lang={isAr ? 'ar' : 'en'} dir={isAr ? 'rtl' : 'ltr'} className="text-ink-100">
                  {l.who}
                </span>
                <span lang={isAr ? 'ar' : 'en'} dir={isAr ? 'rtl' : 'ltr'} className="text-ink-400">
                  , {l.move}
                </span>
              </span>
              <span className="flex items-center gap-3 text-xs">
                {/* Weight string contains a unit ("kg", "lb", "كجم") -- keep
                    it in its own bidi-isolated run so digits + unit stick. */}
                <span data-numeric className="tabular-nums text-ink-200">
                  <bdi>{l.weight}</bdi>
                </span>
                <span className="text-ink-500 w-16 text-right">
                  {t('pulseMinutesAgo', { mins: l.mins })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </MockShell>
  );
}
