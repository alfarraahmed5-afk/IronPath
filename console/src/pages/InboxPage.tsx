import { Inbox as InboxIcon } from 'lucide-react';

export default function InboxPage() {
  return (
    <div className="max-w-5xl">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-ink-50 tracking-tight">Lead Inbox</h1>
        <p className="text-sm text-ink-300 mt-1">
          Inbound leads awaiting operator triage.
        </p>
      </header>

      <div className="bg-ink-800 border border-ink-700 rounded-lg p-10 flex flex-col items-center text-center">
        <InboxIcon size={32} className="text-ink-400 mb-3" />
        <p className="text-sm text-ink-100">Inbox is quiet</p>
        <p className="text-xs text-ink-300 mt-1">Lead intake comes online in Phase D.</p>
      </div>
    </div>
  );
}
