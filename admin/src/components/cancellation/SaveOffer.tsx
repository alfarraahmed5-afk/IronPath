// Phase C.6 — Team Gamma γ2. Step 2 of the cancellation save flow: the
// contextual save pitch. The backend (Gamma-3) returns one of four offer
// kinds based on the reason the operator picked. We render a one-screen
// pitch + a binary "accept / no thanks" choice.
//
// Note: the `'none'` branch should never reach this component — the parent
// `CancellationFlow` skips straight to the confirm stage when the backend
// returns `kind:'none'`. We still defensively handle it (render nothing)
// so the type stays honest with the API contract.

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { PrimaryButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { springModal } from '@/lib/motion';

export type SaveOfferKind = 'pause' | 'free_month' | 'downgrade' | 'none';
export type TierSuggestion = 'starter' | 'growth';

export interface SaveOfferShape {
  kind: SaveOfferKind;
  tier_suggestion?: TierSuggestion;
}

export interface SaveOfferProps {
  offer: SaveOfferShape;
  onAccept: () => void;
  onDecline: () => void;
}

interface Pitch {
  headline: string;
  subtext: string;
}

function pitchFor(offer: SaveOfferShape): Pitch | null {
  switch (offer.kind) {
    case 'pause':
      return {
        headline: 'Pause your account for 60 days.',
        subtext:
          "We'll hold your gym, members, and data exactly as-is. No charges. Resume anytime.",
      };
    case 'free_month':
      return {
        headline: 'One month on us.',
        subtext:
          'Stay another month free. No catch — just a thank you for trying us.',
      };
    case 'downgrade': {
      const tier = tierLabel(offer.tier_suggestion);
      return {
        headline: 'Move to a smaller plan.',
        subtext: `We can drop you to ${tier} — same gym, lower cost. You keep everything except the cap difference.`,
      };
    }
    case 'none':
    default:
      return null;
  }
}

function tierLabel(tier?: TierSuggestion): string {
  if (tier === 'starter') return 'Starter';
  if (tier === 'growth') return 'Growth';
  return 'a smaller plan';
}

export function SaveOffer({ offer, onAccept, onDecline }: SaveOfferProps) {
  const reduced = useReducedMotion();
  // Local "accepted" beat — the parent (CancellationFlow) closes the modal
  // ~1.2s after onAccept fires, so we want a short, satisfying confirmation
  // before the modal disappears. Without this beat, the modal vanishes
  // instantly on click and the operator misses the "we did it" cue.
  const [accepted, setAccepted] = useState(false);

  const pitch = pitchFor(offer);

  function handleAccept() {
    if (accepted) return;
    setAccepted(true);
    // Defer the parent callback so the "Done" beat is visible. The parent
    // owns the actual modal close, so all we need is enough time for the
    // success state to register.
    window.setTimeout(() => {
      onAccept();
    }, 1200);
  }

  // Defensive — should be unreachable because CancellationFlow skips this
  // stage when kind:'none'. If we land here anyway, render nothing rather
  // than a dead-end empty card.
  if (!pitch) return null;

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait" initial={false}>
        {accepted ? (
          <motion.div
            key="accepted"
            initial={reduced ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.98 }}
            transition={reduced ? { duration: 0 } : springModal}
            className="flex flex-col items-center justify-center gap-3 py-8 text-center"
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full',
                'bg-brand-500/15 border border-brand-500/40'
              )}
            >
              <Check size={22} strokeWidth={2.5} className="text-brand-400" />
            </span>
            <h3 className="text-lg font-mono text-ink-50">
              Done. We've applied it.
            </h3>
            <p className="text-sm text-ink-400">
              Closing this in just a moment…
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="pitch"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: reduced ? 0 : 0.22 }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-brand-400 font-mono">
                Before you go
              </p>
              <h3 className="text-2xl font-mono text-ink-50 leading-tight">
                {pitch.headline}
              </h3>
              <p className="text-sm text-ink-300 leading-relaxed">
                {pitch.subtext}
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={onDecline}
                className={cn(
                  'press-compress flex-1',
                  'inline-flex items-center justify-center px-4 py-2.5 rounded-md',
                  'bg-transparent text-ink-300 hover:text-ink-100 font-medium text-sm',
                  'border border-ink-700 hover:border-ink-500',
                  'transition-colors duration-150'
                )}
              >
                No thanks, cancel anyway
              </button>
              <PrimaryButton
                type="button"
                onClick={handleAccept}
                magnetic
                className="flex-1"
              >
                Accept this
              </PrimaryButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
