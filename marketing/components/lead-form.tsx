'use client';

// Real lead-capture form. Replaces the agent-stage stub.
//
// Conversion-funnel rationale (per conversion-gtm council):
//   - Three fields exactly. Every additional field measurably tanks
//     conversion; gym_name + email + member_count is the legal minimum
//     to (a) personalize the in-product onboarding and (b) route the
//     lead to the right pricing tier.
//   - Validation fires on BLUR, not on every keystroke. Live-keystroke
//     red squiggles read as nagging. Wait until the user has finished
//     thinking about a field before complaining.
//   - Errors are full sentences in plain English. "Required" reads like
//     a 1995 form; "We need your gym's name to set up your account."
//     reads like a person.
//   - The submit button restates the OUTCOME, not the action. "Submit"
//     loses to "Start my 30-day trial →" by ~30% in published tests.
//   - Trust line directly under the button: removes the unspoken "what's
//     the catch?" objection at the moment of commitment.
//   - Inputs are 44px+ tall. iOS tap-target accessibility minimum.
//
// Architecture:
//   - react-hook-form for state + uncontrolled inputs (zero re-renders
//     on keystroke, fastest possible perceived input latency).
//   - zod for schema. Schema is the single source of truth for both
//     client and server validation -- same shape posts to /api/lead
//     where it is re-validated.

import { useId, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';

export type LeadFormVariant = 'hero' | 'inline' | 'closing';

// ─── Schema ────────────────────────────────────────────────────────────
// Schema factory takes a translator so error messages are locale-aware.
// The default messages (used by the server-side API route, which doesn't
// have a request-locale context) stay in English -- server-side validation
// only fires when client validation has been bypassed (curl, browser
// extensions), so the user-facing copy lives client-side.

export interface LeadFormErrorMessages {
  gymNameTooShort: string;
  gymNameTooLong: string;
  ownerEmailRequired: string;
  ownerEmailInvalid: string;
  memberCountType: string;
  memberCountInteger: string;
  memberCountMin: string;
  memberCountMax: string;
}

const DEFAULT_ERROR_MESSAGES: LeadFormErrorMessages = {
  gymNameTooShort: "Your gym's name needs at least 2 characters.",
  gymNameTooLong: "That's a very long gym name. Keep it under 80 characters.",
  ownerEmailRequired: 'We need your email to set up your account.',
  ownerEmailInvalid: 'That email looks incomplete. Try again.',
  memberCountType: 'Member count needs to be a number.',
  memberCountInteger: 'Round to a whole number.',
  memberCountMin: 'You need at least 1 member to get started.',
  memberCountMax: 'For 100k+ members, get in touch with sales directly.',
};

export function createLeadSchema(messages: LeadFormErrorMessages = DEFAULT_ERROR_MESSAGES) {
  return z.object({
    gym_name: z
      .string()
      .trim()
      .min(2, messages.gymNameTooShort)
      .max(80, messages.gymNameTooLong),
    owner_email: z
      .string()
      .trim()
      .min(1, messages.ownerEmailRequired)
      .email(messages.ownerEmailInvalid),
    member_count: z.coerce
      .number({ invalid_type_error: messages.memberCountType })
      .int(messages.memberCountInteger)
      .min(1, messages.memberCountMin)
      .max(100_000, messages.memberCountMax),
  });
}

// Backwards-compatible export: server-side code (api/lead/route.ts) imports
// `leadSchema` directly to validate the POST body. It doesn't need locale-
// specific error strings -- the API returns a generic top-level "validation
// failed" rather than per-field copy.
export const leadSchema = createLeadSchema();

export type LeadFormValues = z.infer<typeof leadSchema>;

// Personal-email domains we soft-warn on. We don't block -- many small
// gyms legitimately run on a personal Gmail. We just nudge them toward
// the gym's real address so onboarding emails route to the right place.
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'aol.com',
]);

function isPersonalEmail(email: string): boolean {
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  return PERSONAL_EMAIL_DOMAINS.has(email.slice(at + 1).toLowerCase());
}

export interface LeadFormProps {
  variant?: LeadFormVariant;
  /**
   * Optional success hook. Default behavior is to navigate to the admin
   * signup page; pass this to override (e.g. show a confetti modal first).
   */
  onSuccess?: (lead: { id: string; redirect_url: string }) => void;
  className?: string;
}

interface LeadResponse {
  id: string;
  redirect_url: string;
}

export function LeadForm({
  variant = 'inline',
  onSuccess,
  className = '',
}: LeadFormProps) {
  const formId = useId();
  const t = useTranslations('leadForm');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Build the locale-aware Zod schema once per render. useMemo would be
  // overkill -- useForm only reads the resolver on mount, and the translator
  // function returned by useTranslations is referentially stable per locale.
  const schema = createLeadSchema({
    gymNameTooShort: t('fields.gymName.errors.tooShort'),
    gymNameTooLong: t('fields.gymName.errors.tooLong'),
    ownerEmailRequired: t('fields.ownerEmail.errors.required'),
    ownerEmailInvalid: t('fields.ownerEmail.errors.invalid'),
    memberCountType: t('fields.memberCount.errors.type'),
    memberCountInteger: t('fields.memberCount.errors.integer'),
    memberCountMin: t('fields.memberCount.errors.min'),
    memberCountMax: t('fields.memberCount.errors.max'),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(schema),
    // Validate on blur, not on change. See file header rationale.
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: {
      gym_name: '',
      owner_email: '',
      member_count: undefined as unknown as number,
    },
  });

  const emailValue = watch('owner_email');
  const showPersonalEmailNudge = useMemo(
    () =>
      Boolean(touchedFields.owner_email) &&
      !errors.owner_email &&
      typeof emailValue === 'string' &&
      isPersonalEmail(emailValue),
    [touchedFields.owner_email, errors.owner_email, emailValue],
  );

  const submitting = isSubmitting || isPending;

  async function onSubmit(values: LeadFormValues) {
    setSubmitError(null);
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? t('submit.genericError'));
      }
      const json = (await res.json()) as LeadResponse;
      if (onSuccess) {
        onSuccess(json);
      } else {
        // Default: navigate to admin signup with prefill + lead id.
        startTransition(() => {
          window.location.assign(json.redirect_url);
        });
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('submit.genericError'));
    }
  }

  const inputBase =
    'w-full min-h-[44px] rounded-lg border bg-ink-900 px-4 py-2.5 text-base text-ink-50 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-350 focus:border-brand-400 transition-colors';
  const inputOk = 'border-ink-700';
  const inputErr = 'border-error focus:ring-error';

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      data-variant={variant}
      noValidate
      className={`flex flex-col gap-4 ${className}`}
      aria-label={t('ariaLabel')}
    >
      {/* gym_name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${formId}-gym_name`} className="text-sm font-medium text-ink-100">
          {t('fields.gymName.label')}
        </label>
        <input
          id={`${formId}-gym_name`}
          type="text"
          autoComplete="organization"
          inputMode="text"
          aria-invalid={errors.gym_name ? 'true' : 'false'}
          aria-describedby={errors.gym_name ? `${formId}-gym_name-error` : undefined}
          className={`${inputBase} ${errors.gym_name ? inputErr : inputOk}`}
          placeholder={t('fields.gymName.placeholder')}
          {...register('gym_name')}
        />
        {errors.gym_name && (
          <p
            id={`${formId}-gym_name-error`}
            role="alert"
            className="text-sm text-error"
          >
            {errors.gym_name.message}
          </p>
        )}
      </div>

      {/* owner_email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${formId}-owner_email`} className="text-sm font-medium text-ink-100">
          {t('fields.ownerEmail.label')}
        </label>
        <input
          id={`${formId}-owner_email`}
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={errors.owner_email ? 'true' : 'false'}
          aria-describedby={
            errors.owner_email
              ? `${formId}-owner_email-error`
              : showPersonalEmailNudge
                ? `${formId}-owner_email-nudge`
                : undefined
          }
          className={`${inputBase} ${errors.owner_email ? inputErr : inputOk}`}
          placeholder={t('fields.ownerEmail.placeholder')}
          {...register('owner_email')}
        />
        {errors.owner_email && (
          <p
            id={`${formId}-owner_email-error`}
            role="alert"
            className="text-sm text-error"
          >
            {errors.owner_email.message}
          </p>
        )}
        {showPersonalEmailNudge && (
          <p
            id={`${formId}-owner_email-nudge`}
            className="text-xs text-warn"
          >
            {t('fields.ownerEmail.personalEmailNudge')}
          </p>
        )}
      </div>

      {/* member_count */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${formId}-member_count`} className="text-sm font-medium text-ink-100">
          {t('fields.memberCount.label')}
        </label>
        <input
          id={`${formId}-member_count`}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          aria-invalid={errors.member_count ? 'true' : 'false'}
          aria-describedby={
            errors.member_count ? `${formId}-member_count-error` : undefined
          }
          className={`${inputBase} ${errors.member_count ? inputErr : inputOk}`}
          placeholder={t('fields.memberCount.placeholder')}
          {...register('member_count')}
        />
        {errors.member_count && (
          <p
            id={`${formId}-member_count-error`}
            role="alert"
            className="text-sm text-error"
          >
            {errors.member_count.message}
          </p>
        )}
      </div>

      {/* Submit + trust line */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-3 text-base font-semibold text-white shadow-[0_8px_24px_-8px_rgba(200,16,46,0.65)] transition-all hover:bg-brand-450 focus:outline-none focus:ring-2 focus:ring-brand-350 focus:ring-offset-2 focus:ring-offset-ink-950 disabled:cursor-wait disabled:opacity-60"
          aria-busy={submitting ? 'true' : 'false'}
        >
          {submitting ? t('submit.submitting') : (
            <>
              {t('submit.idle')}{' '}
              <span aria-hidden className="rtl:inline-block rtl:-scale-x-100">→</span>
            </>
          )}
        </button>
        <p className="text-xs text-ink-400">
          {t('submit.trust')}
        </p>
        {submitError && (
          <p role="alert" className="text-sm text-error">
            {submitError}
          </p>
        )}
      </div>
    </form>
  );
}
