import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { extractError, z, zodResolver } from '../lib/forms';

const schema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(80, 'Max 80 characters'),
  owner_email: z.string().email('Enter a valid email'),
  tier: z.enum(['starter', 'growth', 'unlimited']),
  trial_days: z.coerce.number().int('Whole days').min(1).max(90),
  note: z.string().max(500).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface CreatedGym {
  gym: { id: string; name: string };
  invite_code: string;
  owner_email: string;
}

export default function GymsNewPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [created, setCreated] = useState<CreatedGym | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tier: 'starter', trial_days: 30 },
  });

  const mutation = useMutation({
    mutationFn: async (body: FormValues) => {
      const res = await api.post('/super-admin/gyms', { ...body, note: body.note || undefined });
      return (res.data?.data ?? res.data) as CreatedGym;
    },
    onSuccess: (data) => {
      setCreated(data);
      setError(null);
      qc.invalidateQueries({ queryKey: ['gyms'] });
    },
    onError: (err) => setError(extractError(err, 'Could not create gym. Try again.')),
  });

  function onSubmit(values: FormValues) {
    setError(null);
    mutation.mutate(values);
  }

  function startAnother() {
    setCreated(null);
    reset({ tier: 'starter', trial_days: 30 });
  }

  return (
    <div className="max-w-xl space-y-5">
      <Link to="/gyms" className="inline-flex items-center gap-1.5 text-xs text-ink-300 hover:text-brand-300 transition-colors">
        <ArrowLeft size={14} strokeWidth={1.75} />
        All gyms
      </Link>

      <header>
        <h1 className="text-xl font-semibold text-ink-50">Create gym manually</h1>
        <p className="text-sm text-ink-300 mt-1">For sales calls where you onboard the customer yourself.</p>
      </header>

      {created ? (
        <section className="bg-ink-800 border border-emerald-700/40 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={18} strokeWidth={1.75} className="text-emerald-400" />
            <h2 className="text-base font-medium text-ink-50">Gym created.</h2>
          </div>
          <dl className="space-y-2 text-sm">
            <Row label="Name" value={created.gym.name} />
            <Row label="Owner email" value={created.owner_email} mono />
            <Row label="Invite code" value={created.invite_code} mono />
          </dl>
          <div className="flex gap-2 mt-5">
            <button
              type="button"
              onClick={() => navigate(`/gyms/${created.gym.id}`)}
              className="px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-ink-950 text-sm font-medium transition-colors"
            >
              View gym
            </button>
            <button
              type="button"
              onClick={startAnother}
              className="px-3 py-1.5 rounded-md border border-ink-700 text-ink-200 hover:border-brand-500 hover:text-brand-300 text-sm font-medium transition-colors"
            >
              Create another
            </button>
          </div>
        </section>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-ink-800 border border-ink-700 rounded-lg p-6 space-y-4">
          <Field label="Gym name" error={errors.name?.message}>
            <input type="text" {...register('name')} className={inputCx} placeholder="Iron Path Athletics" />
          </Field>

          <Field label="Owner email" error={errors.owner_email?.message}>
            <input type="email" {...register('owner_email')} className={inputCx} placeholder="owner@gym.com" />
          </Field>

          <Field label="Tier" error={errors.tier?.message}>
            <div className="flex gap-2">
              {(['starter', 'growth', 'unlimited'] as const).map(t => (
                <label key={t} className="flex-1 cursor-pointer">
                  <input type="radio" value={t} {...register('tier')} className="peer sr-only" />
                  <span className="block text-center px-3 py-2 rounded-md border border-ink-700 text-sm text-ink-200 peer-checked:border-brand-500 peer-checked:bg-brand-500/10 peer-checked:text-brand-300 transition-colors capitalize">
                    {t}
                  </span>
                </label>
              ))}
            </div>
          </Field>

          <Field label="Trial length (days)" error={errors.trial_days?.message}>
            <input type="number" min={1} max={90} {...register('trial_days', { valueAsNumber: true })} className={`${inputCx} font-mono`} />
          </Field>

          <Field label="Sales note" error={errors.note?.message}>
            <textarea {...register('note')} className={`${inputCx} min-h-[5rem]`} placeholder="Optional context — call notes, deal terms, etc." />
          </Field>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-md px-3 py-2 text-sm">{error}</div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md bg-brand-500 hover:bg-brand-600 disabled:bg-ink-700 disabled:text-ink-400 text-ink-950 text-sm font-medium transition-colors"
            >
              {isSubmitting ? 'Creating' : 'Create gym'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const inputCx = 'w-full bg-ink-900 border border-ink-700 rounded-md px-3 py-2 text-sm text-ink-100 placeholder-ink-400 focus:outline-none focus:border-brand-500';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-ink-300 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-xs text-ink-300">{label}</dt>
      <dd className={['text-ink-100', mono ? 'font-mono text-xs' : 'text-sm'].join(' ')}>{value}</dd>
    </div>
  );
}
