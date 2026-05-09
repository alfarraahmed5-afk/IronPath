import { LineChart } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="max-w-5xl">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-ink-50 tracking-tight">Analytics</h1>
        <p className="text-sm text-ink-300 mt-1">
          Cross-tenant operator metrics.
        </p>
      </header>

      <div className="bg-ink-800 border border-ink-700 rounded-lg p-10 flex flex-col items-center text-center">
        <LineChart size={32} className="text-ink-400 mb-3" />
        <p className="text-sm text-ink-100">No metrics yet</p>
        <p className="text-xs text-ink-300 mt-1">Dashboards arrive in Phase E.</p>
      </div>
    </div>
  );
}
