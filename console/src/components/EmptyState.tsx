import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  Icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}

/**
 * EmptyState — centered Lucide icon + headline + subtext, per PLATFORM_PLAN
 * §3.7. The icon stays muted (ink-400) and 32px; verb-first copy on the
 * action; no exclamation marks.
 */
export default function EmptyState({ Icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="bg-ink-800 border border-ink-700 rounded-lg p-10 flex flex-col items-center text-center">
      <Icon size={32} strokeWidth={1.5} className="text-ink-400 mb-3" />
      <p className="text-sm text-ink-100">{title}</p>
      {body && <p className="text-xs text-ink-300 mt-1 max-w-md">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
