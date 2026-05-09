import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import api from '../lib/api';

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

interface StatCardProps {
  label: string;
  value: string | number;
}

interface ChartDatum {
  date: string;
  label: string;
  count: number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
    </div>
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
    <div
      className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 shadow-xl"
      style={{ fontFamily: 'JetBrains Mono, monospace' }}
    >
      <p className="text-gray-500 text-xs">{datum.label}</p>
      <p className="text-white text-sm">{datum.count}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Loading…</p>
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

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Gym overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Members" value={stats.active_members} />
        <StatCard label="New This Month" value={stats.new_members_this_month} />
        <StatCard label="Workouts This Month" value={stats.workouts_this_month} />
        <StatCard
          label="Volume This Month"
          value={`${(stats.volume_this_month / 1000).toFixed(1)}k kg`}
        />
      </div>

      {/* Workouts trend */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-6">Workouts — Last 14 Days</h2>

        {last14.length === 0 ? (
          <p className="text-gray-500 text-sm">No workout data available.</p>
        ) : (
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last14} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="label"
                  axisLine={{ stroke: '#2A2A31' }}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(249, 115, 22, 0.08)' }}
                  content={<ChartTooltip />}
                />
                <Bar dataKey="count" fill="#F97316" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
