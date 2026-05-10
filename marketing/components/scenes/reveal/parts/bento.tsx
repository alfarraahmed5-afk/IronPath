'use client';

// The 3-panel admin-style bento that staggers in after the drop. Uses the
// shared `listStagger` / `listItem` motion presets so the cadence matches the
// rest of the marketing site (and the admin app).

import { LazyMotion, domAnimation, m } from 'framer-motion';
import { listStagger, listItem } from '@/lib/motion';

export function Bento() {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        {...listStagger}
        viewport={{ once: true, amount: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full"
      >
        <m.div {...listItem} className="rounded-xl border border-ink-800 bg-ink-900/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-ink-400">Churn risk</span>
            <span className="text-[10px] font-mono text-brand-400">3 flagged</span>
          </div>
          <ul className="space-y-2 text-xs">
            <ChurnRow name="Marcus T." days={11} />
            <ChurnRow name="Sara K." days={9} />
            <ChurnRow name="Dev P." days={7} />
          </ul>
        </m.div>

        <m.div {...listItem} className="rounded-xl border border-ink-800 bg-ink-900/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-ink-400">This week</span>
            <span className="text-[10px] font-mono text-ink-300">+12 sessions</span>
          </div>
          {/* Tiny sparkline */}
          <Sparkline values={[3, 5, 4, 6, 7, 9, 12]} />
          <p className="mt-3 text-xs text-ink-300">Monday surge held through Thursday.</p>
        </m.div>

        <m.div {...listItem} className="rounded-xl border border-ink-800 bg-ink-900/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-ink-400">Billing</span>
            <span className="text-[10px] font-mono text-success">All paid</span>
          </div>
          <div className="flex items-baseline gap-2">
            <div data-numeric className="font-display text-2xl text-ink-50">$4,851</div>
            <div className="text-[10px] text-ink-400">/mo</div>
          </div>
          <p className="mt-2 text-xs text-ink-300">No failed charges this cycle.</p>
        </m.div>
      </m.div>
    </LazyMotion>
  );
}

function ChurnRow({ name, days }: { name: string; days: number }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-ink-200">{name}</span>
      <span className="font-mono text-ink-400">{days}d quiet</span>
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
