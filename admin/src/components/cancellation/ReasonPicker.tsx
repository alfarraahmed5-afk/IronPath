// Phase C.6 — Team Gamma γ2. Step 1 of the cancellation save flow: ask
// *why*. The reason taxonomy doubles as the input the backend uses to pick
// a contextual save offer (handled by §4.3 endpoints), so this picker is a
// hard requirement — operators cannot skip it.
//
// "Other" reveals a textarea for free-form context (10–500 chars). The
// Continue button is disabled until the picker is in a valid state, so we
// never POST a half-formed reason.

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { PrimaryButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { listStagger, listItem } from '@/lib/motion';

export interface ReasonPickerProps {
  onPick: (reason: string, reasonText?: string) => void;
}

interface ReasonOption {
  value: string;
  label: string;
}

// Order matters — most-common-first so the eye lands on the likely answer.
const REASONS: ReasonOption[] = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'not_using', label: 'Not using it enough' },
  { value: 'missing_feature', label: 'Missing a feature I need' },
  { value: 'bug_reliability', label: 'Bugs or reliability' },
  { value: 'closing_gym', label: 'Closing my gym' },
  { value: 'other', label: 'Other' },
];

const OTHER_MIN = 10;
const OTHER_MAX = 500;

export function ReasonPicker({ onPick }: ReasonPickerProps) {
  const reduced = useReducedMotion();
  const [reason, setReason] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When the operator switches into "Other," focus the textarea so they can
  // start typing immediately. Skip the autofocus when reduced motion is set
  // (a softer default for assistive setups that don't expect focus jumps).
  useEffect(() => {
    if (reason === 'other' && !reduced) {
      // RAF lets the textarea finish mounting before we steal focus.
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [reason, reduced]);

  const trimmedLen = reasonText.trim().length;
  const otherValid =
    reason !== 'other' || (trimmedLen >= OTHER_MIN && trimmedLen <= OTHER_MAX);
  const canContinue = reason !== null && otherValid;

  function handleContinue() {
    if (!canContinue || !reason) return;
    if (reason === 'other') {
      onPick(reason, reasonText.trim());
    } else {
      onPick(reason);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm text-ink-200 font-sans">
          Help us understand why you're cancelling.
        </h3>
        <p className="mt-0.5 text-xs text-ink-400">
          Pick the closest reason — we'll suggest something based on your answer.
        </p>
      </div>

      <motion.fieldset
        initial={listStagger.initial}
        animate={listStagger.animate}
        variants={listStagger.variants}
        className="space-y-2 border-0 p-0 m-0"
      >
        <legend className="sr-only">Reason for cancelling</legend>
        {REASONS.map((opt) => {
          const selected = reason === opt.value;
          return (
            <motion.label
              key={opt.value}
              variants={listItem.variants}
              transition={listItem.transition}
              className={cn(
                'press-compress hover-lift block cursor-pointer',
                'rounded-lg border bg-ink-900/40 px-4 py-3',
                'transition-colors duration-150',
                selected
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-ink-700 hover:border-ink-500'
              )}
            >
              <span className="flex items-center gap-3">
                {/* Custom radio indicator — native browser radios look broken
                    against the dark surface. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative inline-flex h-4 w-4 shrink-0 items-center justify-center',
                    'rounded-full border transition-colors',
                    selected
                      ? 'border-brand-500'
                      : 'border-ink-600'
                  )}
                >
                  {selected && (
                    <span className="h-2 w-2 rounded-full bg-brand-500" />
                  )}
                </span>
                <span
                  className={cn(
                    'text-sm font-sans',
                    selected ? 'text-ink-50' : 'text-ink-200'
                  )}
                >
                  {opt.label}
                </span>
                <input
                  type="radio"
                  name="cancellation-reason"
                  value={opt.value}
                  checked={selected}
                  onChange={() => setReason(opt.value)}
                  className="sr-only"
                />
              </span>
            </motion.label>
          );
        })}
      </motion.fieldset>

      {reason === 'other' && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          <label
            htmlFor="cancellation-reason-text"
            className="block text-xs text-ink-300 mb-1.5 font-sans"
          >
            Tell us a bit more
          </label>
          <textarea
            id="cancellation-reason-text"
            ref={textareaRef}
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            rows={3}
            maxLength={OTHER_MAX}
            placeholder="What's going on?"
            className={cn(
              'w-full bg-ink-900 border border-ink-700 rounded-lg px-3 py-2.5',
              'text-sm text-ink-50 placeholder-ink-500 font-sans',
              'focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30',
              'transition-colors resize-none'
            )}
          />
          <div className="mt-1 flex items-center justify-between text-[11px] font-mono">
            <span
              className={cn(
                trimmedLen > 0 && trimmedLen < OTHER_MIN
                  ? 'text-amber-400'
                  : 'text-ink-500'
              )}
            >
              {trimmedLen < OTHER_MIN
                ? `${OTHER_MIN - trimmedLen} more characters needed`
                : 'Looks good'}
            </span>
            <span className="text-ink-500 tabular-nums">
              {trimmedLen} / {OTHER_MAX}
            </span>
          </div>
        </motion.div>
      )}

      <div className="flex justify-end pt-1">
        <PrimaryButton
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className="min-w-[140px]"
        >
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}
