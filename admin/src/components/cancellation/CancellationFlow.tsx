// Phase C.6 — Team Gamma γ2. The cancellation save flow modal. Three real
// stages plus a brief "done" beat:
//
//   reason  -> ReasonPicker — required reason taxonomy + optional free-form
//              text when "other" is picked.
//   offer   -> POSTs /admin/cancellation/start, then renders SaveOffer with
//              the contextual pitch the backend chose. If the backend says
//              kind:'none' (no save offer applies), we skip straight to
//              confirm — never show a dead-end empty offer card.
//   confirm -> ConfirmCancel — final "are you sure" with the consequences
//              spelled out. Confirm POSTs /admin/cancellation/confirm.
//   done    -> 2s "Cancelled. We'll miss you." beat, then onCancelled +
//              onClose so the orchestrator can route the operator out.
//
// Modal shell: full-screen on mobile (more room for the offer pitch), a
// centered max-w-lg surface-card on desktop. ESC, X icon, and backdrop
// click all close — except when a network call is in flight (we don't
// want the operator to half-cancel by mis-clicking the backdrop).

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from 'framer-motion';
import { X } from 'lucide-react';
import api from '@/lib/api';
import { extractError } from '@/lib/forms';
import { EmberSeam } from '@/components/EmberSeam';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { springModal, VERCEL_EASE } from '@/lib/motion';
import { ReasonPicker } from './ReasonPicker';
import { SaveOffer, type SaveOfferShape } from './SaveOffer';
import { ConfirmCancel } from './ConfirmCancel';

export interface CancellationFlowProps {
  open: boolean;
  onClose: () => void;
  onCancelled: () => void;
}

type Stage = 'reason' | 'offer' | 'confirm' | 'done';

interface ReasonState {
  reason: string;
  reasonText?: string;
}

// Mapping stage -> the "Step N of 3" label. The done stage isn't a real
// step (no operator action is required), so it inherits step 3.
function stepNumber(stage: Stage): number {
  if (stage === 'reason') return 1;
  if (stage === 'offer') return 2;
  return 3;
}

export default function CancellationFlow({
  open,
  onClose,
  onCancelled,
}: CancellationFlowProps) {
  const reduced = useReducedMotion();

  const [stage, setStage] = useState<Stage>('reason');
  const [reasonState, setReasonState] = useState<ReasonState | null>(null);
  const [offer, setOffer] = useState<SaveOfferShape | null>(null);
  const [loadingOffer, setLoadingOffer] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Used to guard against the modal closing mid-network-call (e.g. backdrop
  // click while POST /confirm is in flight). When `busy` is true, ESC and
  // backdrop close are disabled; the X button also hides.
  const busy = loadingOffer || confirming || acceptingOffer;

  // ---------- reset on close ----------
  // We hard-reset state when the modal transitions from open -> closed so
  // the next open starts clean, no matter what stage we exited from.
  useEffect(() => {
    if (!open) {
      // Run on the next tick to avoid clobbering the exit animation read.
      const t = window.setTimeout(() => {
        setStage('reason');
        setReasonState(null);
        setOffer(null);
        setLoadingOffer(false);
        setConfirming(false);
        setAcceptingOffer(false);
        setError(null);
      }, 240); // matches modal exit duration
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // ---------- POST /cancellation/start whenever we enter the offer stage ----------
  useEffect(() => {
    if (stage !== 'offer' || !reasonState) return;
    let cancelled = false;
    setLoadingOffer(true);
    setError(null);
    (async () => {
      try {
        const res = await api.post('/admin/cancellation/start', {
          reason: reasonState.reason,
          ...(reasonState.reasonText
            ? { reason_text: reasonState.reasonText }
            : {}),
        });
        if (cancelled) return;
        const payload = (res.data?.data ?? res.data) as {
          offer: SaveOfferShape;
        };
        const next = payload.offer ?? { kind: 'none' as const };
        setOffer(next);
        // If the backend says no offer applies, skip straight to confirm.
        // The operator never sees an empty save card.
        if (next.kind === 'none') {
          setStage('confirm');
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          extractError(err, "Couldn't load save options. You can still cancel.")
        );
        // Soft-fail: drop the operator into the confirm stage so the flow
        // doesn't dead-end. They came here to cancel; let them.
        setStage('confirm');
      } finally {
        if (!cancelled) setLoadingOffer(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stage, reasonState]);

  // ---------- handlers ----------
  const handleReasonPicked = useCallback(
    (reason: string, reasonText?: string) => {
      setReasonState({ reason, reasonText });
      setStage('offer');
    },
    []
  );

  const handleAcceptOffer = useCallback(async () => {
    if (!offer || acceptingOffer) return;
    setAcceptingOffer(true);
    setError(null);
    try {
      await api.post('/admin/cancellation/accept-offer', {
        offer_kind: offer.kind,
      });
      // Operator stayed — the offer was applied. Close the modal; do NOT
      // call onCancelled (they didn't cancel). The SaveOffer component
      // shows its own "Done. We've applied it." beat before this fires.
      onClose();
    } catch (err) {
      setError(
        extractError(err, "Couldn't apply that offer. Try again or cancel.")
      );
      setAcceptingOffer(false);
    }
  }, [offer, acceptingOffer, onClose]);

  const handleDeclineOffer = useCallback(() => {
    setStage('confirm');
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!reasonState || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      await api.post('/admin/cancellation/confirm', {
        reason: reasonState.reason,
        ...(reasonState.reasonText
          ? { reason_text: reasonState.reasonText }
          : {}),
      });
      setStage('done');
    } catch (err) {
      setError(extractError(err, 'Cancellation failed. Try again.'));
      setConfirming(false);
    }
  }, [reasonState, confirming]);

  const handleBackToOffer = useCallback(() => {
    // Only allow back-to-offer when there was actually an offer to show.
    // Otherwise fall back to the reason picker.
    if (offer && offer.kind !== 'none') {
      setStage('offer');
    } else {
      setStage('reason');
    }
  }, [offer]);

  // ---------- "done" auto-close ----------
  // Per spec: the done stage shows for ~2s, then we fire onCancelled and
  // onClose so the orchestrator can navigate the operator away.
  useEffect(() => {
    if (stage !== 'done') return;
    const t = window.setTimeout(() => {
      onCancelled();
      onClose();
    }, 2000);
    return () => window.clearTimeout(t);
  }, [stage, onCancelled, onClose]);

  // ---------- ESC closes ----------
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  // ---------- focus trap entry ----------
  // Move focus into the modal on open so keyboard users land somewhere
  // sensible. We focus the close button — it's always present (except when
  // busy) and gives a clear "you're inside a dialog" cue.
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open && stage === 'reason') {
      // RAF: wait one paint so the modal is mounted before we steal focus.
      requestAnimationFrame(() => closeBtnRef.current?.focus());
    }
  }, [open, stage]);

  // ---------- body scroll lock ----------
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cancellation-backdrop"
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.16, ease: VERCEL_EASE }}
          onClick={() => {
            if (!busy) onClose();
          }}
          className={cn(
            'fixed inset-0 z-50 flex sm:items-center justify-center',
            'bg-black/70 backdrop-blur-sm'
          )}
          aria-hidden={!open}
        >
          <motion.div
            key="cancellation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancellation-modal-title"
            initial={
              reduced
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 0.96 }
            }
            animate={{ opacity: 1, scale: 1 }}
            exit={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96 }
            }
            transition={
              reduced
                ? { duration: 0 }
                : { ...springModal, opacity: { duration: 0.22, ease: VERCEL_EASE } }
            }
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'surface-card relative',
              // Mobile: full screen, no rounding. Desktop: centered card.
              'w-full h-full sm:h-auto sm:max-w-lg sm:w-[min(100%,32rem)]',
              'sm:rounded-xl rounded-none border-x-0 sm:border-x border-y-0 sm:border-y',
              'flex flex-col overflow-hidden'
            )}
          >
            {/* Header */}
            <header className="relative px-5 sm:px-6 pt-5 pb-4">
              <div className="pr-9">
                <p className="text-[11px] uppercase tracking-wider text-ink-500 font-mono">
                  Step {stepNumber(stage)} of 3
                </p>
                <h2
                  id="cancellation-modal-title"
                  className="mt-1 text-lg font-mono text-ink-50 leading-tight"
                >
                  Cancel your IronPath subscription
                </h2>
              </div>
              {!busy && (
                <button
                  ref={closeBtnRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Close cancellation flow"
                  className={cn(
                    'press-compress absolute top-4 right-4',
                    'inline-flex items-center justify-center h-8 w-8 rounded-md',
                    'text-ink-400 hover:text-ink-100 hover:bg-ink-800/60',
                    'transition-colors duration-150',
                    'focus:outline-none focus:ring-1 focus:ring-brand-500/40'
                  )}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              )}
            </header>

            <EmberSeam />

            {/* Body — scrollable on mobile if content overflows. */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-md border border-red-900 bg-red-900/20 px-3 py-2 text-xs text-red-300"
                >
                  {error}
                </div>
              )}

              <AnimatePresence mode="wait" initial={false}>
                {stage === 'reason' && (
                  <motion.div
                    key="stage-reason"
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: reduced ? 0 : 0.18, ease: VERCEL_EASE }}
                  >
                    <ReasonPicker onPick={handleReasonPicked} />
                  </motion.div>
                )}

                {stage === 'offer' && (
                  <motion.div
                    key="stage-offer"
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: reduced ? 0 : 0.18, ease: VERCEL_EASE }}
                  >
                    {loadingOffer || !offer ? (
                      <OfferSkeleton />
                    ) : (
                      <SaveOffer
                        offer={offer}
                        onAccept={handleAcceptOffer}
                        onDecline={handleDeclineOffer}
                      />
                    )}
                  </motion.div>
                )}

                {stage === 'confirm' && reasonState && (
                  <motion.div
                    key="stage-confirm"
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: reduced ? 0 : 0.18, ease: VERCEL_EASE }}
                  >
                    <ConfirmCancel
                      reason={reasonState.reason}
                      onConfirm={handleConfirm}
                      onBack={handleBackToOffer}
                      loading={confirming}
                    />
                  </motion.div>
                )}

                {stage === 'done' && (
                  <motion.div
                    key="stage-done"
                    initial={reduced ? false : { opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduced ? undefined : { opacity: 0 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : springModal
                    }
                    className="flex flex-col items-center justify-center gap-3 py-10 text-center"
                  >
                    <h3 className="text-2xl font-mono text-ink-50">
                      Cancelled.
                    </h3>
                    <p className="text-sm text-ink-300">
                      We'll miss you. Come back anytime.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ----------------------------------------------------------------------
// Loading skeleton for the offer stage. Mirrors the SaveOffer layout —
// small label, big headline, two lines of body, two buttons — so the
// transition into the real pitch doesn't shift the operator's eye.
// ----------------------------------------------------------------------

function OfferSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="space-y-2.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton className="h-10 flex-1 rounded-md" />
      </div>
    </div>
  );
}
