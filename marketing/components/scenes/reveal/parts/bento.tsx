'use client';

// The 3-panel admin-style bento that staggers in after the drop. Uses the
// shared `listStagger` / `listItem` motion presets so the cadence matches the
// rest of the marketing site (and the admin app).
//
// Locale-aware data: member names, MRR amount, and currency symbol all flow
// from the message catalog so the AR variant shows Egyptian names + EGP and
// the EN variant shows Latin names + USD. Founder mandate after first deploy:
// no Latin mock names bleeding into the Arabic flow.

import { LazyMotion, domAnimation, m } from 'framer-motion';
import { useTranslations, useMessages, useLocale } from 'next-intl';
import { listStagger, listItem } from '@/lib/motion';

interface BentoMember {
  name: string;
  days: number;
}

export function Bento() {
  const t = useTranslations('scenes.reveal.bento');
  const messages = useMessages() as {
    scenes?: {
      reveal?: {
        bento?: {
          members?: BentoMember[];
          monthlyRevenue?: string;
          currencySymbol?: string;
        };
      };
    };
  };
  const locale = useLocale();
  const isAr = locale === 'ar';

  // Locale-keyed mock members. Defaults preserve EN behavior if a message
  // catalog ever omits the array.
  const defaultMembers: BentoMember[] = [
    { name: 'Marcus T.', days: 11 },
    { name: 'Sara K.', days: 9 },
    { name: 'Dev P.', days: 7 },
  ];
  const members = messages.scenes?.reveal?.bento?.members ?? defaultMembers;

  // MRR is rendered as a pre-formatted string per locale: "$4,851" in EN,
  // "118,500" + "ج.م" suffix in AR. The AR side puts the currency word AFTER
  // the number, which is the natural order in spoken Arabic ("ميتين جنيه").
  const mrrAmount = messages.scenes?.reveal?.bento?.monthlyRevenue ?? '4,851';
  const currencySymbol = messages.scenes?.reveal?.bento?.currencySymbol ?? '$';

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        {...listStagger}
        viewport={{ once: true, amount: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full"
      >
        <m.div {...listItem} className="rounded-xl border border-ink-800 bg-ink-900/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-ink-400">{t('churn.eyebrow')}</span>
            <span className="text-[10px] font-mono text-brand-400">{t('churn.flagged', { count: 3 })}</span>
          </div>
          <ul className="space-y-2 text-xs">
            {members.map((member) => (
              <ChurnRow
                key={member.name}
                name={member.name}
                days={member.days}
                dayLabel={t('churn.quietDays', { days: member.days })}
              />
            ))}
          </ul>
        </m.div>

        <m.div {...listItem} className="rounded-xl border border-ink-800 bg-ink-900/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-ink-400">{t('week.eyebrow')}</span>
            <span className="text-[10px] font-mono text-ink-300">{t('week.delta', { count: 12 })}</span>
          </div>
          {/* Tiny sparkline */}
          <Sparkline values={[3, 5, 4, 6, 7, 9, 12]} />
          <p className="mt-3 text-xs text-ink-300">{t('week.caption')}</p>
        </m.div>

        <m.div {...listItem} className="rounded-xl border border-ink-800 bg-ink-900/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-ink-400">{t('billing.eyebrow')}</span>
            <span className="text-[10px] font-mono text-success">{t('billing.status')}</span>
          </div>
          {/* Currency block: in EN we render "$4,851" as a single LTR run; in
              AR the natural order is "118,500 ج.م" (number then unit). Wrap
              the numeric span in <bdi> so the bidirectional algorithm keeps
              the digits together regardless of surrounding direction. */}
          <div className="flex items-baseline gap-2">
            <div data-numeric className="font-display text-2xl text-ink-50">
              {isAr ? (
                <>
                  <bdi>{mrrAmount}</bdi>
                  <span className="text-ink-300 text-base ms-1.5">{currencySymbol}</span>
                </>
              ) : (
                <>
                  {currencySymbol}
                  <bdi>{mrrAmount}</bdi>
                </>
              )}
            </div>
            <div className="text-[10px] text-ink-400">{t('billing.perMonth')}</div>
          </div>
          <p className="mt-2 text-xs text-ink-300">{t('billing.caption')}</p>
        </m.div>
      </m.div>
    </LazyMotion>
  );
}

function ChurnRow({
  name,
  dayLabel,
}: {
  name: string;
  // The numeric value, kept for prop-stability even though `dayLabel` carries
  // the rendered string. Future variants may want both.
  days: number;
  dayLabel: string;
}) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-ink-200">{name}</span>
      <span className="font-mono text-ink-400">{dayLabel}</span>
    </li>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 160;
  const h = 36;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = w / (values.length - 1);
  const path = values
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9" aria-hidden>
      <path d={path} stroke="#FF4566" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
