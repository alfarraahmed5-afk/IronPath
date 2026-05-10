'use client';

// The "real admin dashboard" mock that fills the viewport at the drop.
//
// This is HTML/CSS rather than a screenshot so it's crisp at every density,
// inherits CSS theming, and lets the sidebar pill animate live. A static
// AVIF poster from /public/scene-3 could be swapped in later if mid-tier
// mobile renders this slowly -- slot for that exists below.

import { useTranslations } from 'next-intl';
import { SidebarPill } from './sidebar-pill';
import { StatRow } from './stat-row';

interface DashboardMockProps {
  /** When true, the rolling stats engage and the sliding pill is animated. */
  dropped: boolean;
  /** Reduced-motion variant -- render final values immediately. */
  staticFinal?: boolean;
}

export function DashboardMock({ dropped, staticFinal = false }: DashboardMockProps) {
  const t = useTranslations('scenes.reveal.dashboard');
  return (
    <div
      className="w-full max-w-[1100px] mx-auto rounded-2xl border border-ink-800 bg-ink-900/80 backdrop-blur-sm shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)] overflow-hidden"
      // The admin app uses this approximate layout; mirroring it gives the
      // visitor an instant "oh, that's the actual product" recognition.
    >
      {/* Browser chrome -- three dots, address bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-ink-800 bg-ink-950/60">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
        </div>
        <div className="ml-3 px-3 py-1 rounded text-[10px] font-mono text-ink-400 bg-ink-900 border border-ink-800">
          admin.ironpath.health
        </div>
      </div>

      <div className="grid grid-cols-[160px_1fr]">
        {/* Sidebar */}
        <aside className="border-r border-ink-800 bg-ink-950/40 min-h-[320px]">
          <div
            className="px-3 py-3 text-[10px] font-display tracking-tight text-ink-100 border-b border-ink-800"
            // Gym name "Iron & Oak" stays Latin script in Arabic -- it's a
            // proper noun in the example brand.
            lang="en"
            dir="ltr"
          >
            {t('gymName')}
          </div>
          <SidebarPill />
        </aside>

        {/* Main panel */}
        <main className="p-5 sm:p-7 flex flex-col gap-6">
          <header className="flex items-center justify-between">
            <h3 data-font-display className="font-display text-lg text-ink-50">{t('title')}</h3>
            <span className="text-[10px] font-mono text-ink-400">{t('todayAt')}</span>
          </header>

          <StatRow active={dropped} staticFinal={staticFinal} />

          <div className="rounded-lg border border-ink-800 bg-ink-950/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-wider text-ink-400">
                {t('activity')}
              </span>
              <span className="text-[10px] font-mono text-ink-300">{t('lastSevenDays')}</span>
            </div>
            <ActivityBars />
          </div>
        </main>
      </div>
    </div>
  );
}

// Tiny CSS-only bar chart -- 7 bars, varied heights. Fixed values so SSR is
// stable; no hydration mismatch.
function ActivityBars() {
  const heights = [40, 62, 48, 75, 58, 90, 70];
  return (
    <div className="flex items-end gap-2 h-16">
      {heights.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-gradient-to-t from-brand-500/60 to-brand-400"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}
