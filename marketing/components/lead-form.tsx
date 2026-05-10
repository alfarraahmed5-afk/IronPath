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

import { useEffect, useId, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  createLeadSchema,
  leadSchema,
  type LeadFormErrorMessages,
  type LeadFormValues,
} from '@/lib/lead-schema';

// Re-exports kept for backwards compat -- the schema lives in
// /lib/lead-schema.ts now so the edge API route can import it without
// pulling a 'use client' module into the server bundle.
export { createLeadSchema, leadSchema };
export type { LeadFormErrorMessages, LeadFormValues };

// WhatsApp fallback for the thank-you state. Same number used on /start.
const WHATSAPP_NUMBER = '+20 10 3659 6238';
const WHATSAPP_LINK =
  'https://wa.me/201036596238?text=' +
  encodeURIComponent(
    "Hi Ahmed, I just submitted the form on ironpath.health. Want to skip the queue.",
  );

export type LeadFormVariant = 'hero' | 'inline' | 'closing';

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
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  // If the page loaded with ?status=submitted (e.g. after the post-submit
  // redirect, or a refresh on the thank-you URL), show the thank-you state
  // immediately. Read this client-side only so SSR remains stable.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'submitted') {
      setSubmitted(true);
    }
  }, []);

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
        return;
      }
      // Default: flip to the thank-you state in place AND update the URL so a
      // refresh keeps the user on the thank-you state. We don't hard-navigate
      // because the redirect_url is currently same-page and a full reload
      // would be a wasted round-trip.
      setSubmitted(true);
      if (typeof window !== 'undefined' && json.redirect_url) {
        try {
          // History push, not assign, so the user can navigate Back into the
          // form if they realize they made a typo on the email field.
          window.history.pushState(null, '', json.redirect_url);
        } catch {
          /* history APIs may be unavailable in some sandboxed embeds */
        }
      }
      startTransition(() => {
        // No-op: kept so the button retains its disabled-while-pending state
        // momentarily after the success callback returns.
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('submit.genericError'));
    }
  }

  const inputBase =
    'w-full min-h-[44px] rounded-lg border bg-ink-900 px-4 py-2.5 text-base text-ink-50 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-350 focus:border-brand-400 transition-colors';
  const inputOk = 'border-ink-700';
  const inputErr = 'border-error focus:ring-error';

  // ─── Thank-you state ─────────────────────────────────────────────────────
  // Shown after a successful submit OR when the page loads with
  // ?status=submitted in the URL. Offers WhatsApp as the skip-the-queue path.
  if (submitted) {
    return (
      <div
        data-variant={variant}
        className={`flex flex-col gap-4 rounded-lg border border-ink-700 bg-ink-900 p-6 ${className}`}
        role="status"
        aria-live="polite"
      >
        <p className="font-mono text-[11px] tracking-wider text-brand-400">
          {t('success.eyebrow')}
        </p>
        <h3 className="font-display text-xl text-ink-50 tracking-tight leading-snug">
          {t('success.headline')}
        </h3>
        <p className="text-sm text-ink-300 leading-relaxed">
          {t('success.body')}
        </p>
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-[48px] items-center justify-center gap-3 rounded-lg bg-brand-500 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-450 focus:outline-none focus:ring-2 focus:ring-brand-350 focus:ring-offset-2 focus:ring-offset-ink-950"
        >
          <WhatsAppGlyph />
          <span>{t('success.whatsappCta')}</span>
        </a>
        <p className="text-center font-mono text-xs text-ink-400">
          {WHATSAPP_NUMBER}
        </p>
      </div>
    );
  }

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

// Inline WhatsApp glyph -- duplicated from /start so the lead-form's
// thank-you state stays self-contained and can be embedded anywhere.
function WhatsAppGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}
