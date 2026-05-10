// Team Alpha α4 — Phase C onboarding wizard, Step 4 (optional).
//
// Encourage the operator to bring their first staff member in by sending an
// invite email. There is no separate "trainer" role yet (Phase F territory),
// so the recipient registers as a regular member. The semantic value is
// purely activation: a gym that already has a teammate in the door on day
// one feels meaningfully more "alive" than one with a single founder
// account staring at empty roster lists.
//
// Wires to the existing `POST /gyms/:id/invite-email` endpoint
// (backend/src/routes/gyms.ts:339) which sends a templated invite with the
// gym's invite_code. Body: `{ email }`.

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Mail, Send, Check, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { extractError, z, zodResolver } from '@/lib/forms';
import { cn } from '@/lib/utils';
import { EmberSeam } from '@/components/EmberSeam';
import { PrimaryButton } from '@/components/ui/Button';

export interface Step4TrainerProps {
  onComplete: () => void;
  onSkip: () => void;
  gym: { id: string };
}

const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter an email address')
    .email('Enter a valid email address'),
});

type InviteForm = z.infer<typeof inviteSchema>;

export function Step4Trainer({ onComplete, onSkip, gym }: Step4TrainerProps) {
  const reduced = useReducedMotion();
  const [error, setError] = useState<string | null>(null);
  const [lastSentTo, setLastSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: InviteForm) {
    setError(null);
    try {
      await api.post(`/gyms/${gym.id}/invite-email`, { email: values.email });
      setLastSentTo(values.email);
      reset({ email: '' });
      // Per spec: advance immediately on successful send. The operator can
      // navigate back if they want to send another, but most owners stop at
      // one. Leaving the confirmation pill visible keeps the moment of
      // success on screen as the wizard transitions away.
      onComplete();
    } catch (err) {
      setError(extractError(err, 'Could not send the invite. Try again.'));
    }
  }

  return (
    <div className="surface-card p-8 sm:p-10 max-w-2xl mx-auto">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-brand-500">
          <Mail size={18} strokeWidth={2} aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em]">
            Step 4 — Optional
          </span>
        </div>
        <h2 className="text-2xl font-bold text-ink-50">Bring your team in</h2>
        <p className="text-sm text-ink-200 leading-relaxed">
          Invite a trainer or staff member so the gym feels active from day
          one. They&rsquo;ll get an invite link in their inbox.
        </p>
      </header>

      <EmberSeam className="my-6" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <label
            htmlFor="trainer-email"
            className="block text-sm text-ink-200 mb-1.5"
          >
            Email address
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="trainer-email"
              type="email"
              autoComplete="email"
              placeholder="coach@yourgym.com"
              className={cn(
                'flex-1 bg-ink-850 border border-ink-700 rounded-md',
                'px-3 py-2.5 text-sm text-ink-50 placeholder-ink-400',
                'focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
                'disabled:opacity-50',
                errors.email && 'border-brand-500'
              )}
              disabled={isSubmitting}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'trainer-email-error' : undefined}
              {...register('email')}
            />
            <PrimaryButton type="submit" loading={isSubmitting}>
              <Send size={16} strokeWidth={2} aria-hidden="true" />
              Send invite
            </PrimaryButton>
          </div>
          {errors.email && (
            <p
              id="trainer-email-error"
              className="mt-1.5 text-xs text-brand-400"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="text-sm text-brand-400 bg-brand-500/10 border border-brand-500/30 rounded-md px-3 py-2"
          >
            {error}
          </div>
        )}

        <AnimatePresence>
          {lastSentTo && (
            <motion.div
              key={lastSentTo}
              initial={reduced ? { opacity: 1 } : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
                'bg-brand-500/10 border border-brand-500/30 text-brand-400',
                'text-xs font-medium'
              )}
              aria-live="polite"
            >
              <Check size={14} strokeWidth={2.5} aria-hidden="true" />
              <span>
                Invite sent to <span className="font-mono">{lastSentTo}</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <div className="mt-8 pt-6 border-t border-ink-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          You can always invite teammates later from the Settings page.
        </p>
        <button
          type="button"
          onClick={onSkip}
          disabled={isSubmitting}
          className={cn(
            'press-compress',
            'inline-flex items-center justify-center px-4 py-2 rounded-md',
            'bg-ink-800 hover:bg-ink-700 text-ink-50 font-medium text-sm',
            'border border-ink-700 hover:border-ink-600',
            'transition-colors duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSubmitting ? (
            <Loader2
              size={16}
              strokeWidth={2}
              aria-hidden="true"
              className="animate-spin"
            />
          ) : (
            <>Skip &mdash; I&rsquo;ll do this later</>
          )}
        </button>
      </div>
    </div>
  );
}
