// Phase C — Team Alpha α2. Onboarding wizard shell.
//
// Stand-alone, full-screen surface that the operator lands on the first
// time they sign in (or whenever `is_complete=false` from the backend).
// Lives OUTSIDE the regular <Layout> so the sidebar/topbar can't be used
// to navigate away mid-flow — onboarding is a focused gate, not a tab.
//
// Lifecycle on mount:
//   1. Fetch /admin/me to learn the gym_id + gym_name (used to label the page)
//   2. Fetch /gyms/:id to hydrate the full gym record (logo_url, accent_color)
//   3. Fetch /admin/onboarding to learn which steps are already done
//   4. Jump to the first incomplete step. Render its component.
//   5. Each step fires onComplete() → POST mark-step-complete → advance.
//   6. After step 4 (or any earlier "Skip remaining"), POST /admin/onboarding/complete
//      and navigate to /dashboard.
//
// We respect prefers-reduced-motion: the AnimatePresence step swap collapses
// to a hard cut, the radial bg loses its breathing animation, etc. (the latter
// already comes for free from the .ember-seam reduced-motion override in css).

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import api from '@/lib/api';
import { extractError } from '@/lib/forms';
import { Logomark } from '@/components/Logomark';
import { EmberSeam } from '@/components/EmberSeam';
import { Skeleton } from '@/components/ui/Skeleton';
import { StepIndicator } from '@/components/onboarding/StepIndicator';
import { Step1Brand } from '@/components/onboarding/Step1Brand';
import { Step2Poster } from '@/components/onboarding/Step2Poster';
import { Step3Announcement } from '@/components/onboarding/Step3Announcement';
import { Step4Trainer } from '@/components/onboarding/Step4Trainer';
import { pageTransition } from '@/lib/motion';
import { cn } from '@/lib/utils';

// ---------- types ----------

type StepKey =
  | 'brand'
  | 'qr_poster'
  | 'first_announcement'
  | 'trainer_invite';

interface OnboardingStepState {
  key: StepKey;
  completed_at: string | null;
}

interface OnboardingState {
  steps: OnboardingStepState[];
  complete_count: number;
  is_complete: boolean;
}

interface MeUser {
  id: string;
  email: string;
  username?: string;
  full_name?: string | null;
  gym_id?: string;
  gym_name?: string | null;
  role?: string;
}

interface Gym {
  id: string;
  name: string;
  accent_color: string | null;
  logo_url: string | null;
  invite_code?: string;
}

// ---------- constants ----------

const STEP_ORDER: StepKey[] = [
  'brand',
  'qr_poster',
  'first_announcement',
  'trainer_invite',
];

const STEP_LABELS = ['Brand', 'Poster', 'Announce', 'Trainer'];

// ---------- page ----------

export default function OnboardingPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const [user, setUser] = useState<MeUser | null>(null);
  const [gym, setGym] = useState<Gym | null>(null);
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  // ---------- bootstrap ----------

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const meRes = await api.get('/admin/me');
        const meUser = (meRes.data?.data?.user ?? null) as MeUser | null;
        if (!alive) return;

        if (!meUser?.gym_id) {
          setLoadError(
            'No gym is linked to this account. Contact support before continuing onboarding.'
          );
          setUser(meUser);
          return;
        }

        const [gymRes, onbRes] = await Promise.all([
          api.get(`/gyms/${meUser.gym_id}`),
          api.get('/admin/onboarding'),
        ]);
        if (!alive) return;

        const gymData = (gymRes.data?.data ?? gymRes.data) as Gym;
        const onbData = (onbRes.data?.data ?? onbRes.data) as OnboardingState;

        setUser(meUser);
        setGym(gymData);
        setState(onbData);

        // If the wizard is already marked complete server-side, leave the
        // page immediately — never trap the operator on /onboarding.
        if (onbData.is_complete) {
          navigate('/dashboard', { replace: true });
          return;
        }

        // Jump to the first incomplete step.
        const firstIncomplete = STEP_ORDER.findIndex((key) => {
          const entry = onbData.steps.find((s) => s.key === key);
          return !entry || !entry.completed_at;
        });
        setActiveIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
      } catch (err) {
        if (!alive) return;
        setLoadError(extractError(err, 'Could not load onboarding state.'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);

  // ---------- helpers ----------

  const activeStepKey = STEP_ORDER[activeIndex];

  // The indicator is 1-based per the StepIndicator convention. We treat
  // "current step" as the one being worked on right now, regardless of
  // whether it's been completed yet.
  const indicatorCurrent = activeIndex + 1;

  // Mark a step complete server-side and decide what to do next. If we just
  // completed the last step OR the caller asked to finish, also POST the
  // wizard-complete endpoint and navigate home.
  async function completeStep(
    stepKey: StepKey,
    opts: { andFinish?: boolean } = {}
  ) {
    setAdvanceError(null);
    setAdvancing(true);
    try {
      const res = await api.post(`/admin/onboarding/${stepKey}/complete`, {});
      const next = (res.data?.data ?? res.data) as OnboardingState;
      setState(next);

      const isLast = stepKey === STEP_ORDER[STEP_ORDER.length - 1];
      if (opts.andFinish || isLast || next.is_complete) {
        await api.post('/admin/onboarding/complete', {});
        navigate('/dashboard', { replace: true });
        return;
      }

      // Otherwise: advance to next step (and skip any already-complete ones,
      // in case the operator's progress jumped on the server).
      const nextIdx = (() => {
        for (let i = activeIndex + 1; i < STEP_ORDER.length; i++) {
          const key = STEP_ORDER[i];
          const entry = next.steps.find((s) => s.key === key);
          if (!entry || !entry.completed_at) return i;
        }
        return -1;
      })();

      if (nextIdx === -1) {
        await api.post('/admin/onboarding/complete', {});
        navigate('/dashboard', { replace: true });
        return;
      }
      setActiveIndex(nextIdx);
    } catch (err) {
      setAdvanceError(extractError(err, 'Could not save progress. Try again.'));
    } finally {
      setAdvancing(false);
    }
  }

  async function skipAll() {
    setAdvanceError(null);
    setAdvancing(true);
    try {
      await api.post('/admin/onboarding/complete', {});
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setAdvanceError(extractError(err, 'Could not skip onboarding. Try again.'));
      setAdvancing(false);
    }
  }

  // ---------- step renderers ----------

  // Memoize the gym shim we hand to children so a stable identity prevents
  // unnecessary re-renders inside the step components.
  const gymForSteps = useMemo(() => {
    if (!gym) return null;
    return {
      id: gym.id,
      name: gym.name,
      accent_color: gym.accent_color,
      logo_url: gym.logo_url,
      invite_code: gym.invite_code,
    };
  }, [gym]);

  function renderActiveStep() {
    if (!gymForSteps) return null;
    switch (activeStepKey) {
      case 'brand':
        return (
          <Step1Brand
            gym={gymForSteps}
            onComplete={() => void completeStep('brand')}
          />
        );
      case 'qr_poster':
        return (
          <Step2Poster
            gym={gymForSteps}
            onComplete={() => void completeStep('qr_poster')}
          />
        );
      case 'first_announcement':
        return (
          <Step3Announcement
            gym={gymForSteps}
            onComplete={() => void completeStep('first_announcement')}
          />
        );
      case 'trainer_invite':
        return (
          <Step4Trainer
            gym={gymForSteps}
            onComplete={() =>
              void completeStep('trainer_invite', { andFinish: true })
            }
            onSkip={() => void skipAll()}
          />
        );
      default:
        return null;
    }
  }

  // ---------- render ----------

  return (
    <div
      className={cn(
        'surface-shell relative min-h-screen text-ink-50 overflow-hidden',
        // Subtle ember radial in the top-left — sets the stage without
        // distracting from the centered card. Pure CSS gradient, no JS.
        'before:pointer-events-none before:absolute before:inset-0',
        "before:bg-[radial-gradient(60%_40%_at_0%_0%,rgba(200,16,46,0.08)_0%,transparent_60%)]"
      )}
    >
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        {/* ---------- header ---------- */}
        <header className="flex items-center gap-2.5">
          <Logomark size={32} />
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-wider text-ink-400 font-sans">
              Setting up your gym
            </p>
            <p className="text-sm font-medium text-ink-100">
              {user?.gym_name || gym?.name || 'IronPath'}
            </p>
          </div>
        </header>

        {/* ---------- step indicator ---------- */}
        <div className="mt-6">
          <StepIndicator
            current={indicatorCurrent}
            total={STEP_ORDER.length}
            labels={STEP_LABELS}
          />
        </div>

        <EmberSeam className="mt-4" />

        {/* ---------- body ---------- */}
        <main className="mt-6 flex-1">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-7 w-1/2 rounded-md" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
          ) : loadError ? (
            <div className="surface-card p-6">
              <h2 className="text-base font-medium text-ink-50">
                Onboarding unavailable
              </h2>
              <p className="mt-2 text-sm text-red-300">{loadError}</p>
              <button
                type="button"
                onClick={() => navigate('/dashboard', { replace: true })}
                className="mt-4 text-sm text-brand-500 hover:text-brand-400 link-underline-draw"
              >
                Continue to dashboard
              </button>
            </div>
          ) : (
            <>
              {advanceError && (
                <div
                  role="alert"
                  className="mb-4 rounded-md border border-red-900 bg-red-900/20 px-3 py-2 text-sm text-red-300"
                >
                  {advanceError}
                </div>
              )}

              {prefersReducedMotion ? (
                // Reduced motion: skip the AnimatePresence transition entirely
                // (a hard cut is honest — we're not faking motion the user
                // explicitly disabled).
                <div key={activeStepKey}>{renderActiveStep()}</div>
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeStepKey}
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                    transition={pageTransition.transition}
                  >
                    {renderActiveStep()}
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Disable overlay during advance — keeps the operator from
                  double-firing onComplete while we're round-tripping. */}
              {advancing && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                />
              )}
            </>
          )}
        </main>

        {/* ---------- footer ---------- */}
        <footer className="mt-8 flex items-center justify-end">
          <button
            type="button"
            onClick={() => void skipAll()}
            disabled={loading || advancing || !!loadError}
            className={cn(
              'text-xs text-ink-400 hover:text-ink-200 transition-colors',
              'link-underline-draw px-1',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            Skip remaining and go to dashboard
          </button>
        </footer>
      </div>
    </div>
  );
}
