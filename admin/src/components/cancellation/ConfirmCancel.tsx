// Phase C.6 — Team Gamma γ2. Step 3 of the cancellation save flow: the
// "are you sure" gate. We list the concrete consequences (data archive,
// member access, invite link) so the operator can't say later that nobody
// warned them. The destructive action is a ghost button with red text —
// less seductive than a filled red button, more honest than a bare link.

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listStagger, listItem } from '@/lib/motion';

export interface ConfirmCancelProps {
  reason: string;
  onConfirm: () => void;
  onBack: () => void;
  /**
   * Optional — when the parent is mid-POST to /cancellation/confirm, it
   * passes `loading` to disable both buttons and surface a spinner-like
   * label on the destructive action. Kept optional so the component is
   * usable in isolation tests.
   */
  loading?: boolean;
}

const CONSEQUENCES = [
  'All workout data archives in 30 days',
  'Members lose access in 7 days',
  'QR poster invite stops working',
];

export function ConfirmCancel({
  onConfirm,
  onBack,
  loading,
}: ConfirmCancelProps) {
  const reduced = useReducedMotion();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-2xl font-mono text-ink-50 leading-tight">
          Cancel anyway?
        </h3>
        <p className="text-sm text-ink-300">
          Here's what happens after you confirm.
        </p>
      </div>

      <motion.ul
        initial={reduced ? false : listStagger.initial}
        animate={listStagger.animate}
        variants={listStagger.variants}
        className="space-y-2"
      >
        {CONSEQUENCES.map((line) => (
          <motion.li
            key={line}
            variants={listItem.variants}
            transition={listItem.transition}
            className={cn(
              'flex items-start gap-3 rounded-md',
              'border border-ink-800 bg-ink-900/40',
              'px-3 py-2.5 text-sm text-ink-200 font-sans'
            )}
          >
            <span
              aria-hidden="true"
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"
            />
            <span>{line}</span>
          </motion.li>
        ))}
      </motion.ul>

      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className={cn(
            'press-compress flex-1',
            'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md',
            'bg-transparent text-ink-300 hover:text-ink-100 font-medium text-sm',
            'border border-ink-700 hover:border-ink-500',
            'transition-colors duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Go back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'press-compress flex-1',
            'inline-flex items-center justify-center px-4 py-2.5 rounded-md',
            'bg-transparent font-medium text-sm',
            'border border-red-900/60 text-red-400 hover:text-red-300',
            'hover:bg-red-950/40 hover:border-red-800',
            'transition-colors duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {loading ? 'Cancelling…' : 'Yes, cancel'}
        </button>
      </div>
    </div>
  );
}
