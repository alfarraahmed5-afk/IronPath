// Team Alpha α4 — Phase C onboarding wizard top-of-screen progress indicator.
//
// Horizontal row of numbered chips connected by hairlines. Each chip shows
// one of three states:
//   - past    (idx < current): brand-filled chip with a Check icon, brand
//             line trailing into the next chip.
//   - current (idx === current): outlined brand chip, brand-400 number,
//             ink-50 label.
//   - future  (idx > current): ink-700 outlined chip, ink-400 number and
//             label, ink-700 line trailing forward.
//
// The connector line between chip N and chip N+1 is treated as "filled"
// when chip N is past — i.e. the user has truly crossed it. When `current`
// advances and a previously-future line transitions to past, the fill
// scaleX-animates from left to right (300ms ease) for a satisfying "I just
// completed that step" beat. Reduced-motion users get a snap.

import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepIndicatorProps {
  current: number;
  total: number;
  labels?: string[];
}

const VERCEL_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

type ChipState = 'past' | 'current' | 'future';

function chipStateFor(idx: number, current: number): ChipState {
  if (idx < current) return 'past';
  if (idx === current) return 'current';
  return 'future';
}

export function StepIndicator({ current, total, labels = [] }: StepIndicatorProps) {
  const reduced = useReducedMotion();
  const steps = Array.from({ length: total }, (_, i) => i);
  // The chip is considered visually "complete" when the user is past it. A
  // past chip's trailing connector is also filled.
  const completedIdx = current - 1;

  return (
    <nav
      aria-label="Onboarding progress"
      className="w-full"
    >
      <ol className="flex items-start justify-between gap-1 sm:gap-2">
        {steps.map((idx) => {
          const state = chipStateFor(idx, current);
          const label = labels[idx] ?? `Step ${idx + 1}`;
          const isLast = idx === total - 1;
          // The connector that trails THIS chip is filled when this chip is
          // past (not when the *next* chip is current — the current chip is
          // a goal, not a victory).
          const connectorFilled = idx <= completedIdx;

          return (
            <li
              key={idx}
              className={cn(
                'flex flex-col items-center text-center',
                // Each step occupies an equal slice. The connector lives in
                // the right portion of the chip's row.
                isLast ? 'flex-none' : 'flex-1 min-w-0'
              )}
            >
              <div className="flex items-center w-full">
                {/* Chip */}
                <Chip state={state} idx={idx} reduced={!!reduced} />

                {/* Connector (omit after the last chip) */}
                {!isLast && (
                  <div
                    className="relative flex-1 h-px mx-1.5 sm:mx-2 bg-ink-700 overflow-hidden rounded-full"
                    aria-hidden="true"
                  >
                    <motion.div
                      key={`conn-${idx}-${connectorFilled ? 'on' : 'off'}`}
                      initial={
                        reduced
                          ? { scaleX: connectorFilled ? 1 : 0 }
                          : { scaleX: connectorFilled ? 0 : 0 }
                      }
                      animate={{ scaleX: connectorFilled ? 1 : 0 }}
                      transition={{
                        duration: reduced ? 0 : 0.3,
                        ease: VERCEL_EASE,
                      }}
                      style={{ transformOrigin: 'left center' }}
                      className="absolute inset-0 bg-brand-500"
                    />
                  </div>
                )}
              </div>

              {/* Label sits centered below the chip column. */}
              <span
                className={cn(
                  'mt-2 text-[11px] sm:text-xs font-medium leading-tight',
                  'max-w-[6rem] sm:max-w-[8rem] truncate',
                  // The chip's left edge is the label's anchor. We pull the
                  // label slightly right so it sits under the chip rather
                  // than the connector. Equal padding on both sides keeps
                  // the visual balance for non-flex-1 (last) items too.
                  state === 'past' || state === 'current'
                    ? 'text-ink-50'
                    : 'text-ink-400',
                  // Connector-bearing items are flex-1; their chip lives at
                  // the start of the row, so push the label hard left.
                  isLast ? '' : 'self-start'
                )}
                title={label}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ----------------------------------------------------------------------
// Chip — the numbered/check circle that represents one wizard step.
// ----------------------------------------------------------------------

function Chip({
  state,
  idx,
  reduced,
}: {
  state: ChipState;
  idx: number;
  reduced: boolean;
}) {
  const isPast = state === 'past';
  const isCurrent = state === 'current';

  return (
    <motion.div
      initial={false}
      animate={{
        backgroundColor: isPast
          ? 'rgba(200, 16, 46, 1)' // brand-500 fill
          : 'rgba(0, 0, 0, 0)', // transparent for current/future
        borderColor: isPast || isCurrent
          ? 'rgba(200, 16, 46, 1)' // brand-500 border
          : 'rgba(42, 42, 49, 1)', // ink-700 border
      }}
      transition={{ duration: reduced ? 0 : 0.24, ease: VERCEL_EASE }}
      className={cn(
        'flex-none flex items-center justify-center',
        'h-7 w-7 sm:h-8 sm:w-8 rounded-full border',
        'font-mono text-xs sm:text-sm font-semibold tabular-nums',
        // Tiny inner glow on the active chip so the eye locks to it.
        isCurrent && 'shadow-[0_0_0_3px_rgba(200,16,46,0.12)]'
      )}
      aria-current={isCurrent ? 'step' : undefined}
    >
      {isPast ? (
        <Check
          size={14}
          strokeWidth={3}
          aria-hidden="true"
          className="text-ink-950"
        />
      ) : (
        <span
          className={cn(
            isCurrent ? 'text-brand-400' : 'text-ink-400'
          )}
        >
          {idx + 1}
        </span>
      )}
    </motion.div>
  );
}
