import { useEffect, useState } from 'react';
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
        setError(err?.response?.data?.message ?? 'Failed to load stats');
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

  const last14 = stats.workouts_by_day.slice(-14);
  const maxCount = Math.max(...last14.map((d) => d.count), 1);

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
          <div className="overflow-x-auto">
            <div className="flex items-end gap-3 min-w-max pb-2" style={{ height: '100px' }}>
              {last14.map((day) => {
                const barHeightPct = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1">
                    <span className="text-gray-500 text-xs">{day.count}</span>
                    <div
                      className="bg-orange-500 rounded-t"
                      style={{
                        width: '32px',
                        height: `${Math.max(barHeightPct * 0.56, 2)}px`, // scale to ~56px max
                      }}
                    />
                    <span className="text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(day.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
