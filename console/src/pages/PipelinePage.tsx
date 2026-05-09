import { Kanban } from 'lucide-react';

export default function PipelinePage() {
  return (
    <div className="max-w-5xl">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-ink-50 tracking-tight">Sales Pipeline</h1>
        <p className="text-sm text-ink-300 mt-1">
          Deal stages from lead through close.
        </p>
      </header>

      <div className="bg-ink-800 border border-ink-700 rounded-lg p-10 flex flex-col items-center text-center">
        <Kanban size={32} className="text-ink-400 mb-3" />
        <p className="text-sm text-ink-100">Pipeline is empty</p>
        <p className="text-xs text-ink-300 mt-1">Stage board ships in Phase D.</p>
      </div>
    </div>
  );
}
