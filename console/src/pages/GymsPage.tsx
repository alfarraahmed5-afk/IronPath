import { Building2 } from 'lucide-react';

export default function GymsPage() {
  return (
    <div className="max-w-5xl">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-ink-50 tracking-tight">All Gyms</h1>
        <p className="text-sm text-ink-300 mt-1">
          Tenants under operator oversight.
        </p>
      </header>

      <div className="bg-ink-800 border border-ink-700 rounded-lg p-10 flex flex-col items-center text-center">
        <Building2 size={32} className="text-ink-400 mb-3" />
        <p className="text-sm text-ink-100">No gyms loaded yet</p>
        <p className="text-xs text-ink-300 mt-1">
          Tenant directory wires up in Phase B.
        </p>
      </div>
    </div>
  );
}
