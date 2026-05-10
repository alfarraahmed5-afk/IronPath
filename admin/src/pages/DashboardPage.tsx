import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { motion, useReducedMotion } from 'framer-motion';
import NumberFlow from '@number-flow/react';
import api from '../lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmberSeam } from '@/components/EmberSeam';
import { listStagger, listItem, VERCEL_EASE } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface WorkoutByDay {
  date: string;
  count: number;
}

interface DashboardStats {
  active_members: number;
  new_members_this_month: number;
  workouts_this_month: number;
  volume_this_month: number;
  workouts_by_day: WorkoutByDay[];
}

interface ChartDatum {
  date: string;
  label: string;
  count: number;
}

// Hero photo — Anastase Maragos's chalk-hands macro from Unsplash. Picked
// over the Victor Freitas barbell because the chalk dust hits the
// "First Light" mood (cold dawn, particulate light) better than a clean
// bar shot. Loaded as a direct CDN URL — no npm dep, browser-cached.
const HERO_PHOTO_URL =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=2400&q=80&auto=format&fit=crop';

interface StatCardProps {
  label: string;
  value: number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <motion.div
      {...listItem}
      className={cn(
        'surface-card hover-lift p-5',
        'transition-transform duration-200 ease-out'
      )}
    >
      <p className="text-xs uppercase tracking-wider text-ink-400">{label}</p>
      <p className="font-mono text-4xl font-medium text-ink-50 mt-2" data-numeric>
        <NumberFlow value={value} />
      </p>
    </motion.div>
  );
}

/**
 * Volume card — the raw stat is in kg; we want to display in thousands.
 * NumberFlow rolls the integer (e.g. 12400) and we render a derived
 * "12.4k kg" label beside it for readability. Splitting it out as its
 * own component keeps StatCard's shape simple.
 */
function VolumeStatCard({ valueKg }: { valueKg: number }) {
  return (
    <motion.div
      {...listItem}
      className={cn(
        'surface-card hover-lift p-5',
        'transition-transform duration-200 ease-out'
      )}
    >
      <p className="text-xs uppercase tracking-wider text-ink-400">Volume This Month</p>
      <p className="font-mono text-4xl font-medium text-ink-50 mt-2" data-numeric>
        <NumberFlow
          value={Number((valueKg / 1000).toFixed(1))}
          format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
        />
        <span className="text-ink-400 text-2xl ml-1">k kg</span>
      </p>
    </motion.div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDatum }>;
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0].payload;
  return (
    <div className="surface-card px-3 py-2 shadow-xl font-mono">
      <p className="text-ink-400 text-xs">{datum.label}</p>
      <p className="text-ink-50 text-sm">{datum.count}</p>
    </div>
  );
}

// LivePulse component removed — the "N lifting now" counter was placeholder
// data, not real workout-event-wired. Will return in Phase E once the
// backend exposes a live-workout SSE / poll endpoint and the count is real.

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    api
      .get('/admin/stats')
      .then((res) => {
        setStats(res.data.data as DashboardStats);
      })
      .catch((err) => {
        setError(err?.response?.data?.error?.message ?? 'Failed to load stats');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    // Skeleton scaffold mirrors the live layout (header + hero band + 4
    // stat cards + chart) so the page doesn't shift when data arrives.
    // Plan §3.7.
    return (
      <div>
        <div className="mb-6">
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-[280px] w-full rounded-xl mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400 text-sm">{error ?? 'Unknown error'}</p>
      </div>
    );
  }

  const last14: ChartDatum[] = stats.workouts_by_day.slice(-14).map((d) => ({
    date: d.date,
    label: formatDate(d.date),
    count: d.count,
  }));

  // Stagger config — disabled when prefers-reduced-motion. We still mount
  // the same DOM so layout/spacing is identical; just skip the choreography.
  const staggerProps = reducedMotion ? {} : listStagger;

  return (
    <div>
      {/* Header — page title with EmberSeam hairline underneath as the
          chromatic event between header and hero. */}
      <div className="relative mb-6 pb-6">
        <h1 className="text-2xl font-bold text-ink-50">Dashboard</h1>
        <p className="text-ink-400 text-sm mt-1">First light — gym overview</p>
        <EmberSeam className="absolute bottom-0 left-0 right-0 h-px" />
      </div>

      {/* Hero band — full-bleed (within the 8-padding main column) 280px-tall
          B&W gym macro. Multiply-blend ember gradient bottom-up; mask carves
          out clean negative space on the right where copy sits. The image
          slow-zooms via Ken Burns so the hero is always alive even when
          nothing else on the page moves. */}
      <div className="relative h-[280px] w-full rounded-xl overflow-hidden mb-8 surface-card">
        <img
          src={HERO_PHOTO_URL}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            !reducedMotion && 'animate-ken-burns'
          )}
          style={{
            filter: 'grayscale(100%) contrast(1.1) brightness(0.9)',
            WebkitMaskImage:
              'linear-gradient(to right, black 40%, transparent 100%)',
            maskImage:
              'linear-gradient(to right, black 40%, transparent 100%)',
            transformOrigin: 'center',
          }}
        />
        {/* Ember gradient overlay — bottom-up, multiply blend, capped at 8% */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(200, 16, 46, 0.08) 0%, transparent 60%)',
            mixBlendMode: 'multiply',
          }}
          aria-hidden="true"
        />
        {/* Optional copy slot — top-left, reinforces the "First Light" mood */}
        <div className="absolute top-4 left-4 z-10">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-400">
            Today
          </p>
          <p className="font-sans text-xl font-semibold text-ink-50 mt-1">
            Open the floor.
          </p>
        </div>
      </div>

      {/* Stats grid — staggered fade-and-rise on mount. */}
      <motion.div
        {...staggerProps}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        <StatCard label="Active Members" value={stats.active_members} />
        <StatCard label="New This Month" value={stats.new_members_this_month} />
        <StatCard
          label="Workouts This Month"
          value={stats.workouts_this_month}
        />
        <VolumeStatCard valueKg={stats.volume_this_month} />
      </motion.div>

      {/* Workouts trend — chart wipes in via clip-path on first scroll/view. */}
      <motion.div
        initial={
          reducedMotion ? false : { clipPath: 'inset(0 100% 0 0)' }
        }
        whileInView={
          reducedMotion ? undefined : { clipPath: 'inset(0 0% 0 0)' }
        }
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: VERCEL_EASE }}
        className="surface-feature p-6"
      >
        <h2 className="text-lg font-semibold text-ink-50 mb-6">
          Workouts — Last 14 Days
        </h2>

        {last14.length === 0 ? (
          <p className="text-ink-400 text-sm">No workout data available.</p>
        ) : (
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={last14}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <XAxis
                  dataKey="label"
                  axisLine={{ stroke: '#2A2A31' }}
                  tickLine={false}
                  tick={{ fill: '#8A8A95', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(200, 16, 46, 0.08)' }}
                  content={<ChartTooltip />}
                />
                <Bar dataKey="count" fill="#C8102E" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>
    </div>
  );
}
