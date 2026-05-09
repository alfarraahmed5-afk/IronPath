import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import Modal from './Modal';
import {
  extractError,
  z,
  zodResolver,
  centsToDollars,
  dollarsToCents,
} from '../lib/forms';
import {
  useUpdateSubscriptionMutation,
  useMarkPaidMutation,
  useExtendTrialMutation,
} from '../lib/mutations';

type TabKey = 'update' | 'paid' | 'trial';

interface SubscriptionSeed {
  tier: 'starter' | 'growth' | 'unlimited' | null;
  status: 'trial' | 'active' | 'expired' | 'cancelled' | null;
  expires_at: string | null;
  mrr_cents: number | null;
}

interface SubscriptionEditorProps {
  open: boolean;
  onClose: () => void;
  gymId: string;
  gymName: string;
  current: SubscriptionSeed;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'update', label: 'Update plan' },
  { key: 'paid', label: 'Mark paid' },
  { key: 'trial', label: 'Extend trial' },
];

export default function SubscriptionEditor({
  open,
  onClose,
  gymId,
  gymName,
  current,
}: SubscriptionEditorProps) {
  const [tab, setTab] = useState<TabKey>('update');
  const initialFocusRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) setTab('update');
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit subscription"
      description={gymName}
      size="lg"
      initialFocusRef={initialFocusRef}
    >
      <div
        role="tablist"
        aria-label="Subscription actions"
        className="flex border-b border-ink-700 -mx-5 px-5 mb-4"
      >
        {TABS.map((t, idx) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              ref={idx === 0 ? initialFocusRef : undefined}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={[
                'px-3 py-2 -mb-px text-sm transition-colors border-b-2',
                active
                  ? 'border-brand-500 text-brand-300'
                  : 'border-transparent text-ink-300 hover:text-ink-100',
              ].join(' ')}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'update' && (
        <UpdatePlanForm gymId={gymId} current={current} onDone={onClose} />
      )}
      {tab === 'paid' && <MarkPaidForm gymId={gymId} onDone={onClose} />}
      {tab === 'trial' && <ExtendTrialForm gymId={gymId} onDone={onClose} />}
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Update plan
// ────────────────────────────────────────────────────────────────────────────

const updateSchema = z.object({
  tier: z.enum(['starter', 'growth', 'unlimited']).optional(),
  status: z.enum(['trial', 'active', 'expired', 'cancelled']).optional(),
  expires_at_local: z.string().optional(),
  mrr_dollars: z.union([z.string(), z.number()]).optional(),
});

// `<option value="">— no change —</option>` makes the select submit `""`, which
// `z.enum(...).optional()` rejects (it only short-circuits on undefined). RHF's
// `setValueAs` maps the empty string back to undefined at input-bind time so
// the schema stays strict. Phase B frontend review caught the prior breakage.
const emptyToUndefined = (v: unknown): unknown =>
  v === '' || v === undefined ? undefined : v;

type UpdateForm = z.infer<typeof updateSchema>;

function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function UpdatePlanForm({
  gymId,
  current,
  onDone,
}: {
  gymId: string;
  current: SubscriptionSeed;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const mutation = useUpdateSubscriptionMutation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = useForm<UpdateForm>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      tier: current.tier ?? undefined,
      status: current.status ?? undefined,
      expires_at_local: isoToLocalInput(current.expires_at),
      mrr_dollars:
        current.mrr_cents !== null ? centsToDollars(current.mrr_cents) : '',
    },
  });

  function onSubmit(values: UpdateForm) {
    setError(null);
    const body: {
      tier?: 'starter' | 'growth' | 'unlimited';
      status?: 'trial' | 'active' | 'expired' | 'cancelled';
      expires_at?: string;
      mrr_cents?: number;
    } = {};

    // We ship only fields the operator actually touched. Without `dirtyFields`,
    // the previous diff-against-current strategy spuriously re-sent expires_at
    // because <input type="datetime-local"> is minute-precision and the seeded
    // ISO timestamp carries seconds — round-tripping never compared equal.
    if (dirtyFields.tier && values.tier) body.tier = values.tier;
    if (dirtyFields.status && values.status) body.status = values.status;
    if (
      dirtyFields.expires_at_local &&
      values.expires_at_local &&
      values.expires_at_local.length > 0
    ) {
      body.expires_at = new Date(values.expires_at_local).toISOString();
    }
    if (
      dirtyFields.mrr_dollars &&
      values.mrr_dollars !== undefined &&
      values.mrr_dollars !== ''
    ) {
      body.mrr_cents = dollarsToCents(values.mrr_dollars);
    }

    if (Object.keys(body).length === 0) {
      setError('No changes to save.');
      return;
    }

    mutation.mutate(
      { gymId, body },
      {
        onSuccess: () => onDone(),
        onError: (err) =>
          setError(extractError(err, 'Could not update subscription. Try again.')),
      }
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Tier" error={errors.tier?.message}>
        <select {...register('tier', { setValueAs: emptyToUndefined })} className={inputCx}>
          <option value="">— no change —</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="unlimited">Unlimited</option>
        </select>
      </Field>

      <Field label="Status" error={errors.status?.message}>
        <select {...register('status', { setValueAs: emptyToUndefined })} className={inputCx}>
          <option value="">— no change —</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </Field>

      <Field label="Expires at" error={errors.expires_at_local?.message}>
        <input
          type="datetime-local"
          {...register('expires_at_local')}
          className={`${inputCx} font-mono`}
        />
      </Field>

      <Field label="MRR (USD / month)" error={errors.mrr_dollars?.message}>
        <input
          type="number"
          step="0.01"
          min="0"
          {...register('mrr_dollars')}
          placeholder="99.00"
          className={`${inputCx} font-mono`}
        />
      </Field>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onDone} className={secondaryBtn}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className={primaryBtn}
        >
          {isSubmitting ? 'Saving' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Mark paid
// ────────────────────────────────────────────────────────────────────────────

const markPaidSchema = z
  .object({
    amount_dollars: z.coerce
      .number({ invalid_type_error: 'Enter an amount' })
      .nonnegative('Must be zero or more'),
    period_start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
    period_end: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
    note: z.string().max(500, 'Max 500 characters').optional().or(z.literal('')),
  })
  .refine((d) => d.period_end >= d.period_start, {
    message: 'End must be on or after start.',
    path: ['period_end'],
  });

type MarkPaidForm = z.infer<typeof markPaidSchema>;

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function plusOneMonthISO(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function MarkPaidForm({
  gymId,
  onDone,
}: {
  gymId: string;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const mutation = useMarkPaidMutation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MarkPaidForm>({
    resolver: zodResolver(markPaidSchema),
    defaultValues: {
      amount_dollars: 0,
      period_start: todayISO(),
      period_end: plusOneMonthISO(),
      note: '',
    },
  });

  function onSubmit(values: MarkPaidForm) {
    setError(null);
    mutation.mutate(
      {
        gymId,
        body: {
          amount_cents: dollarsToCents(values.amount_dollars),
          period_start: values.period_start,
          period_end: values.period_end,
          note: values.note ? values.note : undefined,
        },
      },
      {
        onSuccess: () => onDone(),
        onError: (err) =>
          setError(extractError(err, 'Could not record payment. Try again.')),
      }
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Amount (USD)" error={errors.amount_dollars?.message}>
        <input
          type="number"
          step="0.01"
          min="0"
          {...register('amount_dollars')}
          className={`${inputCx} font-mono`}
          placeholder="99.00"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Period start" error={errors.period_start?.message}>
          <input
            type="date"
            {...register('period_start')}
            className={`${inputCx} font-mono`}
          />
        </Field>
        <Field label="Period end" error={errors.period_end?.message}>
          <input
            type="date"
            {...register('period_end')}
            className={`${inputCx} font-mono`}
          />
        </Field>
      </div>

      <Field label="Note (optional)" error={errors.note?.message}>
        <textarea
          {...register('note')}
          rows={3}
          className={`${inputCx} min-h-[5rem]`}
          placeholder="Stripe invoice ID, deal terms, etc."
        />
      </Field>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onDone} className={secondaryBtn}>
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className={primaryBtn}>
          {isSubmitting ? 'Recording' : 'Record payment'}
        </button>
      </div>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Extend trial
// ────────────────────────────────────────────────────────────────────────────

const extendSchema = z.object({
  days: z.coerce
    .number({ invalid_type_error: 'Enter a number of days' })
    .int('Whole days only')
    .min(1, 'At least 1 day')
    .max(90, 'At most 90 days'),
  reason: z
    .string()
    .trim()
    .min(3, 'At least 3 characters')
    .max(500, 'Max 500 characters'),
});

type ExtendForm = z.infer<typeof extendSchema>;

const QUICK_DAYS = [7, 14, 30] as const;

function ExtendTrialForm({
  gymId,
  onDone,
}: {
  gymId: string;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const mutation = useExtendTrialMutation();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExtendForm>({
    resolver: zodResolver(extendSchema),
    defaultValues: { days: 14, reason: '' },
  });

  const currentDays = watch('days');

  function onSubmit(values: ExtendForm) {
    setError(null);
    mutation.mutate(
      { gymId, body: { days: values.days, reason: values.reason.trim() } },
      {
        onSuccess: () => onDone(),
        onError: (err) =>
          setError(extractError(err, 'Could not extend trial. Try again.')),
      }
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Extend by (days)" error={errors.days?.message}>
        <div className="flex items-center gap-2">
          {QUICK_DAYS.map((d) => {
            const active = Number(currentDays) === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() =>
                  setValue('days', d, { shouldValidate: true, shouldDirty: true })
                }
                className={[
                  'px-3 py-1.5 rounded-md border text-sm transition-colors',
                  active
                    ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                    : 'border-ink-700 text-ink-200 hover:border-brand-500',
                ].join(' ')}
              >
                +{d}
              </button>
            );
          })}
          <input
            type="number"
            min={1}
            max={90}
            {...register('days', { valueAsNumber: true })}
            className={`${inputCx} font-mono w-24`}
          />
        </div>
      </Field>

      <Field label="Reason" error={errors.reason?.message}>
        <textarea
          {...register('reason')}
          rows={3}
          className={`${inputCx} min-h-[5rem]`}
          placeholder="Owner asked for more time to evaluate."
        />
      </Field>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onDone} className={secondaryBtn}>
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className={primaryBtn}>
          {isSubmitting ? 'Extending' : 'Extend trial'}
        </button>
      </div>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Shared bits
// ────────────────────────────────────────────────────────────────────────────

const inputCx =
  'w-full bg-ink-900 border border-ink-700 rounded-md px-3 py-2 text-sm text-ink-100 placeholder-ink-400 focus:outline-none focus:border-brand-500';

const primaryBtn =
  'px-4 py-2 rounded-md bg-brand-500 hover:bg-brand-600 disabled:bg-ink-700 disabled:text-ink-400 text-ink-950 text-sm font-medium transition-colors';

const secondaryBtn =
  'px-4 py-2 rounded-md border border-ink-700 text-ink-200 hover:border-brand-500 hover:text-brand-300 text-sm font-medium transition-colors';

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-ink-300 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-md px-3 py-2 text-sm">
      {children}
    </div>
  );
}
