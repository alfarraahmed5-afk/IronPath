import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyRound, UserPlus } from 'lucide-react';
import api from '../lib/api';
import {
  accentColorSchema,
  extractError,
  getStoredGymId,
  optionalUrl,
  z,
  zodResolver,
} from '../lib/forms';

// ---------- types ----------

interface Gym {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  accent_color: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  timezone: string | null;
  units_default: 'metric' | 'imperial' | null;
  logo_url: string | null;
}

interface Invite {
  id: string;
  code: string;
  is_active: boolean;
  uses: number;
  max_uses: number | null;
}

// ---------- zod schemas ----------

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must be 80 characters or fewer'),
  location: z
    .string()
    .trim()
    .max(120, 'Location must be 120 characters or fewer')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or fewer')
    .optional()
    .or(z.literal('')),
  accent_color: accentColorSchema,
});

type ProfileForm = z.infer<typeof profileSchema>;

const contactSchema = z.object({
  phone: z
    .string()
    .trim()
    .max(40, 'Phone must be 40 characters or fewer')
    .optional()
    .or(z.literal('')),
  website: optionalUrl,
  address: z
    .string()
    .trim()
    .max(200, 'Address must be 200 characters or fewer')
    .optional()
    .or(z.literal('')),
  timezone: z
    .string()
    .trim()
    .max(60, 'Timezone must be 60 characters or fewer')
    .optional()
    .or(z.literal('')),
  units_default: z.enum(['metric', 'imperial']),
});

type ContactForm = z.infer<typeof contactSchema>;

// ---------- shared UI bits ----------

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <header className="mb-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && (
          <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
        )}
      </header>
      {children}
    </section>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
      {message}
    </div>
  );
}

function FadingSuccess({ visible, label = 'Saved' }: { visible: boolean; label?: string }) {
  return (
    <span
      className={[
        'text-xs text-green-400 transition-opacity duration-500',
        visible ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
      aria-live="polite"
    >
      {visible ? label : ''}
    </span>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
      <div className="h-5 w-40 bg-gray-800 rounded animate-pulse" />
      <div className="h-4 w-full bg-gray-800 rounded animate-pulse" />
      <div className="h-4 w-2/3 bg-gray-800 rounded animate-pulse" />
    </div>
  );
}

const inputCx =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 disabled:opacity-50';
const labelCx = 'block text-sm text-gray-300 mb-1';
const primaryBtnCx =
  'px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold text-sm transition-colors';
const ghostBtnCx =
  'px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors disabled:opacity-50';

// ---------- profile card ----------

function ProfileCard({
  gym,
  gymId,
  onUpdated,
}: {
  gym: Gym;
  gymId: string;
  onUpdated: (g: Gym) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: gym.name ?? '',
      location: gym.location ?? '',
      description: gym.description ?? '',
      accent_color: gym.accent_color ?? '#C8102E',
    },
  });

  // Re-sync defaults if gym changes (e.g. after logo upload refresh)
  useEffect(() => {
    reset({
      name: gym.name ?? '',
      location: gym.location ?? '',
      description: gym.description ?? '',
      accent_color: gym.accent_color ?? '#C8102E',
    });
  }, [gym.name, gym.location, gym.description, gym.accent_color, reset]);

  // Fade out the "Saved" pill after 2s
  useEffect(() => {
    if (savedAt === null) return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(t);
  }, [savedAt]);

  const accent = watch('accent_color');

  async function onSubmit(values: ProfileForm) {
    setError(null);
    try {
      const res = await api.patch(`/gyms/${gymId}`, {
        name: values.name,
        location: values.location || null,
        description: values.description || null,
        accent_color: values.accent_color,
      });
      const updated = (res.data?.data ?? res.data) as Gym;
      onUpdated(updated);
      setSavedAt(Date.now());
    } catch (err) {
      setError(extractError(err, 'Could not save profile. Try again.'));
    }
  }

  return (
    <Card title="Profile" subtitle="The basics members see on your gym page.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label className={labelCx} htmlFor="gym-name">Name</label>
          <input
            id="gym-name"
            type="text"
            className={inputCx}
            placeholder="Iron Path Athletics"
            {...register('name')}
          />
          <FieldError message={errors.name?.message} />
        </div>

        <div>
          <label className={labelCx} htmlFor="gym-location">Location</label>
          <input
            id="gym-location"
            type="text"
            className={inputCx}
            placeholder="Brooklyn, NY"
            {...register('location')}
          />
          <FieldError message={errors.location?.message} />
        </div>

        <div>
          <label className={labelCx} htmlFor="gym-description">Description</label>
          <textarea
            id="gym-description"
            className={`${inputCx} min-h-[6rem] resize-y`}
            placeholder="One paragraph members will read on the join screen."
            {...register('description')}
          />
          <FieldError message={errors.description?.message} />
        </div>

        <div>
          <label className={labelCx} htmlFor="gym-accent">Accent color</label>
          <div className="flex items-center gap-3">
            <input
              id="gym-accent"
              type="color"
              className="h-10 w-14 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer"
              {...register('accent_color')}
            />
            <span className="font-mono text-sm text-gray-300">{accent}</span>
            <span
              className="inline-block h-6 w-12 rounded border border-gray-700"
              style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : 'transparent' }}
              aria-hidden
            />
          </div>
          <FieldError message={errors.accent_color?.message} />
        </div>

        {error && <InlineError message={error} />}

        <div className="flex items-center justify-end gap-3 pt-2">
          <FadingSuccess visible={showSaved} />
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className={primaryBtnCx}
          >
            {isSubmitting ? 'Saving' : 'Save profile'}
          </button>
        </div>
      </form>
    </Card>
  );
}

// ---------- branding card ----------

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface UploadUrlResponse {
  upload_url: string;
  public_url: string;
  path: string;
}

function BrandingCard({
  gym,
  gymId,
  onUpdated,
}: {
  gym: Gym;
  gymId: string;
  onUpdated: (g: Gym) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<'idle' | 'signing' | 'uploading' | 'patching'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (savedAt === null) return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(t);
  }, [savedAt]);

  const busy = stage !== 'idle';

  async function handleFile(file: File) {
    setError(null);
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setError('Logo must be PNG, JPEG, or WebP.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError('Logo must be 2MB or smaller.');
      return;
    }

    try {
      setStage('signing');
      const signRes = await api.post(`/gyms/${gymId}/logo/upload-url`, {
        content_type: file.type,
        size: file.size,
      });
      const signed = (signRes.data?.data ?? signRes.data) as UploadUrlResponse;

      setStage('uploading');
      // NOTE: do NOT use the api axios client — the signed URL rejects our Bearer header.
      const putRes = await fetch(signed.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`Upload failed (${putRes.status})`);
      }

      setStage('patching');
      const patchRes = await api.patch(`/gyms/${gymId}`, {
        logo_url: signed.public_url,
      });
      const updated = (patchRes.data?.data ?? patchRes.data) as Gym;
      onUpdated(updated);
      setSavedAt(Date.now());
    } catch (err) {
      setError(extractError(err, 'Logo upload failed. Try a different file.'));
    } finally {
      setStage('idle');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function statusLabel(): string | null {
    if (stage === 'signing') return 'Preparing upload';
    if (stage === 'uploading') return 'Uploading';
    if (stage === 'patching') return 'Saving';
    return null;
  }

  return (
    <Card title="Branding" subtitle="A logo shown on member apps and invites.">
      <div className="flex items-start gap-5">
        <div
          className="w-24 h-24 rounded-full border border-gray-800 bg-gray-800 overflow-hidden flex items-center justify-center text-gray-500 text-xs"
          aria-label="Current logo"
        >
          {gym.logo_url ? (
            <img
              src={gym.logo_url}
              alt={`${gym.name} logo`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>No logo</span>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <div className="text-sm text-gray-400">
            PNG, JPEG, or WebP. 2MB max. Square images render best.
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className={primaryBtnCx}
            >
              {busy ? statusLabel() : 'Upload new logo'}
            </button>
            <FadingSuccess visible={showSaved} label="Logo saved" />
          </div>

          {error && <InlineError message={error} />}
        </div>
      </div>
    </Card>
  );
}

// ---------- contact card ----------

function ContactCard({
  gym,
  gymId,
  onUpdated,
}: {
  gym: Gym;
  gymId: string;
  onUpdated: (g: Gym) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      phone: gym.phone ?? '',
      website: gym.website ?? '',
      address: gym.address ?? '',
      timezone: gym.timezone ?? '',
      units_default: gym.units_default ?? 'metric',
    },
  });

  useEffect(() => {
    reset({
      phone: gym.phone ?? '',
      website: gym.website ?? '',
      address: gym.address ?? '',
      timezone: gym.timezone ?? '',
      units_default: gym.units_default ?? 'metric',
    });
  }, [gym.phone, gym.website, gym.address, gym.timezone, gym.units_default, reset]);

  useEffect(() => {
    if (savedAt === null) return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(t);
  }, [savedAt]);

  async function onSubmit(values: ContactForm) {
    setError(null);
    try {
      const res = await api.patch(`/gyms/${gymId}`, {
        phone: values.phone || null,
        website: values.website || null,
        address: values.address || null,
        timezone: values.timezone || null,
        units_default: values.units_default,
      });
      const updated = (res.data?.data ?? res.data) as Gym;
      onUpdated(updated);
      setSavedAt(Date.now());
    } catch (err) {
      setError(extractError(err, 'Could not save contact info. Try again.'));
    }
  }

  return (
    <Card title="Contact" subtitle="Where members can reach you.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCx} htmlFor="gym-phone">Phone</label>
            <input
              id="gym-phone"
              type="tel"
              className={inputCx}
              placeholder="+1 555 123 4567"
              {...register('phone')}
            />
            <FieldError message={errors.phone?.message} />
          </div>
          <div>
            <label className={labelCx} htmlFor="gym-website">Website</label>
            <input
              id="gym-website"
              type="url"
              className={inputCx}
              placeholder="https://example.com"
              {...register('website')}
            />
            <FieldError message={errors.website?.message} />
          </div>
        </div>

        <div>
          <label className={labelCx} htmlFor="gym-address">Address</label>
          <input
            id="gym-address"
            type="text"
            className={inputCx}
            placeholder="123 Main St, Brooklyn, NY 11201"
            {...register('address')}
          />
          <FieldError message={errors.address?.message} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCx} htmlFor="gym-tz">Timezone</label>
            <input
              id="gym-tz"
              type="text"
              className={inputCx}
              placeholder="America/New_York"
              {...register('timezone')}
            />
            <FieldError message={errors.timezone?.message} />
            <p className="text-xs text-gray-500 mt-1">
              Phase C will replace this with a picker.
            </p>
          </div>
          <div>
            <span className={labelCx}>Default units</span>
            <div className="flex items-center gap-4 pt-1">
              <label className="inline-flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
                <input
                  type="radio"
                  value="metric"
                  className="accent-brand-500"
                  {...register('units_default')}
                />
                Metric
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
                <input
                  type="radio"
                  value="imperial"
                  className="accent-brand-500"
                  {...register('units_default')}
                />
                Imperial
              </label>
            </div>
            <FieldError message={errors.units_default?.message} />
          </div>
        </div>

        {error && <InlineError message={error} />}

        <div className="flex items-center justify-end gap-3 pt-2">
          <FadingSuccess visible={showSaved} />
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className={primaryBtnCx}
          >
            {isSubmitting ? 'Saving' : 'Save contact'}
          </button>
        </div>
      </form>
    </Card>
  );
}

// ---------- invite code card ----------

function InviteCodeCard() {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/admin/invites');
        const list = (res.data?.data?.invites ?? []) as Invite[];
        if (!alive) return;
        const active = list.find((i) => i.is_active) ?? list[0] ?? null;
        setInvite(active);
      } catch (err) {
        if (!alive) return;
        setError(extractError(err, 'Could not load invite code.'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function copy() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // best effort — silently ignore on browsers that block clipboard
    }
  }

  return (
    <Card title="Invite code" subtitle="Members enter this code to join your gym.">
      {loading ? (
        <div className="space-y-3">
          <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-800 rounded animate-pulse" />
        </div>
      ) : error ? (
        <InlineError message={error} />
      ) : !invite ? (
        <div className="text-center py-6">
          <KeyRound size={32} strokeWidth={1.5} className="mx-auto text-gray-600 mb-2" aria-hidden="true" />
          <p className="text-gray-300 text-sm font-medium">No active invite code</p>
          <p className="text-gray-500 text-xs mt-1">Create one on the Invites page.</p>
          <a
            href="/invites"
            className="inline-block mt-3 text-brand-500 hover:text-brand-400 text-sm font-medium"
          >
            Go to Invites
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-bold text-brand-500 tracking-wider">
              {invite.code}
            </span>
            <span className="text-xs text-gray-500">
              {invite.uses}
              {' / '}
              {invite.max_uses ?? '∞'}
              {' uses'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copy}
              className={primaryBtnCx}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              disabled
              title="Coming in Phase C"
              className={ghostBtnCx + ' cursor-not-allowed'}
            >
              Download QR poster
            </button>
            <a
              href="/invites"
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors"
            >
              Email invite
            </a>
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------- coach roster placeholder ----------

function CoachRosterCard() {
  return (
    <Card title="Coach roster" subtitle="Add staff and assign roles.">
      <div className="text-center py-8">
        <UserPlus size={32} strokeWidth={1.5} className="mx-auto text-gray-600 mb-2" aria-hidden="true" />
        <p className="text-gray-300 text-sm font-medium">Coach role launches in Phase F</p>
        <p className="text-gray-500 text-xs mt-1">
          Today every admin sees everything. Per-coach permissions arrive next.
        </p>
      </div>
    </Card>
  );
}

// ---------- danger zone ----------

function DangerZoneCard() {
  return (
    <section className="bg-gray-900 rounded-xl p-6 border border-red-900/60">
      <h2 className="text-lg font-semibold text-red-400">Danger zone</h2>
      <p className="text-gray-400 text-sm mt-1 mb-4">
        Irreversible account actions.
      </p>
      <button
        type="button"
        disabled
        title="Available after first paid month"
        className="px-4 py-2 rounded-lg border border-red-900 text-red-400/70 text-sm font-semibold cursor-not-allowed disabled:opacity-60"
      >
        Cancel subscription
      </button>
      <p className="text-xs text-gray-500 mt-2">
        Available after first paid month.
      </p>
    </section>
  );
}

// ---------- page ----------

export default function SettingsPage() {
  const gymId = getStoredGymId();
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function load(id: string) {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get(`/gyms/${id}`);
      setGym((res.data?.data ?? res.data) as Gym);
    } catch (err) {
      setLoadError(extractError(err, 'Could not load gym settings.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!gymId) {
      setLoading(false);
      return;
    }
    load(gymId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId]);

  return (
    <div className="max-w-3xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">Gym settings</h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage your gym profile, branding, and contact info.
        </p>
      </header>

      {!gymId ? (
        <InlineError message="No gym is linked to this admin account. Sign out and back in to refresh." />
      ) : loading ? (
        <div className="space-y-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : loadError ? (
        <div className="space-y-3">
          <InlineError message={loadError} />
          <button
            type="button"
            onClick={() => load(gymId)}
            className={primaryBtnCx}
          >
            Retry
          </button>
        </div>
      ) : gym ? (
        <div className="space-y-6">
          <ProfileCard gym={gym} gymId={gymId} onUpdated={setGym} />
          <BrandingCard gym={gym} gymId={gymId} onUpdated={setGym} />
          <ContactCard gym={gym} gymId={gymId} onUpdated={setGym} />
          <InviteCodeCard />
          <CoachRosterCard />
          <DangerZoneCard />
        </div>
      ) : null}
    </div>
  );
}
