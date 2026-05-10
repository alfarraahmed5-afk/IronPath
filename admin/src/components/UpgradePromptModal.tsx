// Phase C.4 — β2 — Upgrade-prompt modal (hard block).
//
// Opened when the operator tries an action that would push them past their
// plan's member cap (e.g. clicking "Generate invite" on a full Starter
// plan). Shows the count, names the next tier up, and links to the
// /subscription page where they can actually upgrade.
//
// Self-contained: includes its own backdrop, focus trap, ESC handling, and
// portal mount. Intentionally does NOT depend on a /console <Modal>
// primitive — admin and console are separate apps.

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Ban, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { springModal } from '@/lib/motion';

export type UpgradePromptTier = 'starter' | 'growth' | 'unlimited' | null;

interface UpgradePromptModalProps {
  open: boolean;
  onClose: () => void;
  tier: UpgradePromptTier;
  memberCount: number;
  /**
   * Optional override for the body copy's first sentence. Use this when
   * the trigger has a more specific reason than the default ("you can't
   * add more members") — e.g. "You can't generate another invite while
   * your plan is full."
   */
  reason?: string;
}

interface TierMeta {
  key: 'starter' | 'growth' | 'unlimited';
  name: string;
  cap: number;
  capLabel: string;
  price: number; // dollars/mo
}

const TIERS: Record<'starter' | 'growth' | 'unlimited', TierMeta> = {
  starter: { key: 'starter', name: 'Starter', cap: 50, capLabel: '50 members', price: 49 },
  growth: { key: 'growth', name: 'Growth', cap: 200, capLabel: '200 members', price: 99 },
  unlimited: { key: 'unlimited', name: 'Unlimited', cap: Infinity, capLabel: 'Unlimited members', price: 199 },
};

function currentTierMeta(t: UpgradePromptTier): TierMeta {
  if (t === 'growth') return TIERS.growth;
  if (t === 'unlimited') return TIERS.unlimited;
  // null → assume starter (most conservative cap).
  return TIERS.starter;
}

function nextTierMeta(t: UpgradePromptTier): TierMeta | null {
  if (t === 'starter' || t === null) return TIERS.growth;
  if (t === 'growth') return TIERS.unlimited;
  return null; // unlimited has no upgrade target
}

export default function UpgradePromptModal({
  open,
  onClose,
  tier,
  memberCount,
  reason,
}: UpgradePromptModalProps) {
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement | null>(null);

  // ESC closes — capturing handler so we beat any inner inputs that might
  // otherwise swallow the key.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  // Focus trap: when the modal opens, focus the card; on Tab/Shift+Tab,
  // cycle focus inside the modal so it can't escape into the page below.
  useEffect(() => {
    if (!open) return;
    const card = cardRef.current;
    if (!card) return;

    // Save the previously-focused element so we can restore it on close.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the card itself first; the user will Tab forward into the
    // first actionable element from there.
    card.focus();

    function trap(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const focusables = card!.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', trap);
    return () => {
      window.removeEventListener('keydown', trap);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  // Lock body scroll while open so the page underneath can't drift.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function handleUpgrade() {
    onClose();
    navigate('/subscription');
  }

  const current = currentTierMeta(tier);
  const next = nextTierMeta(tier);
  const capDisplay = Number.isFinite(current.cap) ? current.cap.toString() : '∞';
  const reasonText = reason ?? "You can't add more members on your current plan.";

  // Server-side rendering safety: createPortal needs a real document.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="upgrade-prompt-backdrop"
          // Fixed full-viewport backdrop. Click anywhere outside the card
          // to close — matches OS-native modal expectation.
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 0.16, ease: [0.32, 0.72, 0, 1] }
          }
          onMouseDown={(e) => {
            // Only close on backdrop clicks — not clicks bubbling up from
            // the card. We use mousedown so a drag started inside the card
            // and ending on the backdrop doesn't close.
            if (e.target === e.currentTarget) onClose();
          }}
          aria-hidden={false}
        >
          <motion.div
            ref={cardRef}
            key="upgrade-prompt-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-prompt-title"
            tabIndex={-1}
            className={cn(
              'surface-card relative w-full max-w-md p-7',
              'focus:outline-none'
            )}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={
              reduced ? { duration: 0 } : { ...springModal, duration: 0.22 }
            }
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Close (X) — top-right of the card */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 p-1.5 rounded-md text-ink-400 hover:text-ink-50 hover:bg-ink-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>

            {/* Brand-colored icon mark */}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/15">
              <Ban
                aria-hidden="true"
                className="h-6 w-6 text-brand-500"
              />
            </div>

            <h2
              id="upgrade-prompt-title"
              className="text-xl font-semibold text-ink-50"
            >
              Plan limit reached
            </h2>

            <p className="mt-2 text-sm text-ink-400 leading-relaxed">
              {reasonText} Upgrade to keep growing your gym.
            </p>

            {/* Cap visualization */}
            <div className="mt-5 rounded-lg border border-ink-800 bg-ink-950/40 px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-ink-400">
                Current usage
              </p>
              <p className="mt-1 font-mono text-base text-ink-50 tabular-nums">
                {memberCount} / {capDisplay} members
              </p>
            </div>

            {/* Suggested next tier card. Hidden when the user is already
                on the top tier (no upgrade target). */}
            {next && (
              <div className="mt-4 rounded-lg border border-brand-500/40 bg-brand-500/5 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-brand-400">
                      Suggested upgrade
                    </p>
                    <p className="mt-0.5 text-base font-semibold text-ink-50">
                      {next.name}
                    </p>
                    <p className="text-xs text-ink-400 mt-0.5">
                      {next.capLabel}
                    </p>
                  </div>
                  <p className="font-mono text-lg font-bold text-ink-50 tabular-nums">
                    ${next.price}
                    <span className="text-xs font-normal text-ink-400">/mo</span>
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-md text-sm font-medium text-ink-400 hover:text-ink-50 transition-colors focus:outline-none focus:ring-2 focus:ring-ink-600"
              >
                Maybe later
              </button>
              <PrimaryButton magnetic onClick={handleUpgrade}>
                Upgrade plan
              </PrimaryButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
