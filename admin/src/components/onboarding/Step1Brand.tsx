// Phase C — Team Alpha α2. Step 1 of the onboarding wizard: brand the gym.
// Three editable fields (name, accent color, logo) plus a Continue / Skip
// pair. The logo upload uses the existing 3-step pattern from SettingsPage:
// POST sign-url → PUT to signed URL → PATCH gym with the public_url. We
// deliberately reuse `/gyms/:id/logo/upload-url` and `PATCH /gyms/:id` rather
// than wiring a new onboarding-specific endpoint, so SettingsPage stays the
// single source of truth for branding.
//
// PATCH on Continue only sends FIELDS THAT CHANGED — if the operator hits
// Continue without touching anything, we skip the network call entirely
// and call props.onComplete() directly. The "Skip for now" link does the
// same thing (no save). Either way, the wizard advances.

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Check, Upload, X } from 'lucide-react';
import api from '@/lib/api';
import {
  accentColorSchema,
  extractError,
  z,
  zodResolver,
} from '@/lib/forms';
import { PrimaryButton } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmberSeam } from '@/components/EmberSeam';
import { cn } from '@/lib/utils';

// ---------- types ----------

export interface Step1BrandProps {
  onComplete: () => void;
  gym: {
    id: string;
    name?: string;
    accent_color?: string | null;
    logo_url?: string | null;
  };
}

interface UploadUrlResponse {
  upload_url: string;
  public_url: string;
  path: string;
}

// ---------- constants ----------

// 6 preset swatches anchored on the brand crimson. The remaining five are
// chosen to span the hue wheel so most operators find a starting point they
// like without dropping into the hex input. Order matters — left-to-right
// reads as a small spectrum.
const PRESET_COLORS = [
  '#C8102E', // brand crimson (default)
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // sapphire
  '#8B5CF6', // violet
  '#EC4899', // magenta
] as const;

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// ---------- form schema ----------

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must be 80 characters or fewer'),
  accent_color: accentColorSchema,
});

type BrandForm = z.infer<typeof formSchema>;

// ---------- component ----------

export function Step1Brand({ onComplete, gym }: Step1BrandProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(gym.logo_url ?? null);
  const [uploadStage, setUploadStage] = useState<
    'idle' | 'signing' | 'uploading' | 'patching'
  >('idle');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const initialAccent =
    gym.accent_color && HEX_RE.test(gym.accent_color)
      ? gym.accent_color
      : '#C8102E';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<BrandForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: gym.name ?? '',
      accent_color: initialAccent,
    },
  });

  const accent = watch('accent_color');
  const accentValid = HEX_RE.test(accent ?? '');
  const uploading = uploadStage !== 'idle';

  // ---------- logo upload ----------

  async function handleFile(file: File) {
    setLogoError(null);
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setLogoError('Logo must be PNG, JPEG, or WebP.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('Logo must be 2MB or smaller.');
      return;
    }

    try {
      setUploadStage('signing');
      const signRes = await api.post(`/gyms/${gym.id}/logo/upload-url`, {
        content_type: file.type,
        size: file.size,
      });
      const signed = (signRes.data?.data ?? signRes.data) as UploadUrlResponse;

      setUploadStage('uploading');
      // Use raw fetch — the signed URL rejects our Bearer header.
      const putRes = await fetch(signed.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`Upload failed (${putRes.status})`);
      }

      setUploadStage('patching');
      const patchRes = await api.patch(`/gyms/${gym.id}`, {
        logo_url: signed.public_url,
      });
      const updated = (patchRes.data?.data ?? patchRes.data) as {
        logo_url?: string | null;
      };
      setLogoUrl(updated.logo_url ?? signed.public_url);
    } catch (err) {
      setLogoError(extractError(err, 'Logo upload failed. Try a different file.'));
    } finally {
      setUploadStage('idle');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // ---------- drop zone handlers ----------

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  }

  function onDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  // ---------- submit ----------

  async function onSubmit(values: BrandForm) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const patch: Record<string, unknown> = {};
      if (values.name !== (gym.name ?? '')) patch.name = values.name;
      if (values.accent_color !== initialAccent)
        patch.accent_color = values.accent_color;

      if (Object.keys(patch).length > 0) {
        await api.patch(`/gyms/${gym.id}`, patch);
      }
      onComplete();
    } catch (err) {
      setSubmitError(extractError(err, 'Could not save brand details. Try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- skip ----------

  function handleSkip() {
    onComplete();
  }

  // Sync hex input when a swatch is clicked.
  function pickSwatch(color: string) {
    setValue('accent_color', color, { shouldDirty: true, shouldValidate: true });
  }

  // Auto-clear logoError after the upload state changes (so the inline
  // success/failure pill never lingers across attempts).
  useEffect(() => {
    if (uploading && logoError) setLogoError(null);
  }, [uploading, logoError]);

  // ---------- render ----------

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="surface-card p-6 sm:p-8 space-y-6"
      noValidate
    >
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-ink-50">
          Brand your gym
        </h2>
        <p className="text-sm text-ink-300">
          Members see this on the join screen, in invites, and across the
          mobile app.
        </p>
      </header>

      {/* ---------- gym name ---------- */}
      <div>
        <label
          htmlFor="onb-gym-name"
          className="block text-sm text-ink-200 mb-1.5 font-sans"
        >
          Gym name
        </label>
        <input
          id="onb-gym-name"
          type="text"
          autoComplete="organization"
          className={cn(
            'w-full bg-ink-900 border border-ink-700 rounded-lg px-3 py-2.5',
            'text-sm text-ink-50 placeholder-ink-500',
            'focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30',
            'transition-colors'
          )}
          placeholder="Iron Path Athletics"
          {...register('name')}
        />
        {errors.name?.message && (
          <p className="mt-1.5 text-xs text-red-400">{errors.name.message}</p>
        )}
      </div>

      <EmberSeam />

      {/* ---------- accent color ---------- */}
      <div>
        <label className="block text-sm text-ink-200 mb-2 font-sans">
          Accent color
        </label>
        <div className="flex flex-wrap items-center gap-2.5">
          {PRESET_COLORS.map((color) => {
            const selected = accent?.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                onClick={() => pickSwatch(color)}
                aria-label={`Use accent color ${color}`}
                aria-pressed={selected}
                className={cn(
                  'press-compress relative h-9 w-9 rounded-full border-2 transition-all',
                  selected
                    ? 'border-ink-50 ring-2 ring-ink-50/20 scale-105'
                    : 'border-ink-700 hover:border-ink-500'
                )}
                style={{ backgroundColor: color }}
              >
                {selected && (
                  <Check
                    aria-hidden="true"
                    size={14}
                    strokeWidth={3}
                    className="absolute inset-0 m-auto text-ink-950"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <span className="text-xs text-ink-400 font-sans">Hex</span>
          <input
            type="text"
            maxLength={7}
            spellCheck={false}
            className={cn(
              'w-32 bg-ink-900 border border-ink-700 rounded-md px-2.5 py-1.5',
              'text-sm text-ink-50 placeholder-ink-500 font-mono uppercase',
              'focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30',
              'transition-colors'
            )}
            placeholder="#C8102E"
            {...register('accent_color')}
          />
          <span
            aria-hidden="true"
            className="inline-block h-7 w-7 rounded border border-ink-700"
            style={{
              backgroundColor: accentValid ? accent : 'transparent',
            }}
          />
        </div>
        {errors.accent_color?.message && (
          <p className="mt-1.5 text-xs text-red-400">
            {errors.accent_color.message}
          </p>
        )}
      </div>

      <EmberSeam />

      {/* ---------- logo upload ---------- */}
      <div>
        <label className="block text-sm text-ink-200 mb-2 font-sans">
          Logo
        </label>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />

        <div
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          aria-label="Upload logo"
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
          className={cn(
            'group relative flex items-center gap-4 rounded-lg border-2 border-dashed',
            'p-4 cursor-pointer transition-colors',
            dragActive
              ? 'border-brand-500 bg-brand-500/5'
              : 'border-ink-700 hover:border-ink-500 bg-ink-900/40',
            uploading && 'cursor-wait opacity-80'
          )}
        >
          <div
            className="shrink-0 h-16 w-16 rounded-lg border border-ink-800 bg-ink-900 overflow-hidden flex items-center justify-center"
            aria-label="Logo preview"
          >
            {uploading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt="Gym logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <Upload
                aria-hidden="true"
                size={20}
                strokeWidth={1.75}
                className="text-ink-500"
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-ink-100 font-medium">
              {uploading
                ? uploadStage === 'signing'
                  ? 'Preparing upload…'
                  : uploadStage === 'uploading'
                    ? 'Uploading…'
                    : 'Saving…'
                : logoUrl
                  ? 'Logo uploaded — click to replace'
                  : 'Drag an image here, or click to browse'}
            </p>
            <p className="mt-0.5 text-xs text-ink-400">
              PNG, JPEG, or WebP. 2MB max. Square images render best.
            </p>
          </div>

          {logoUrl && !uploading && (
            <Check
              aria-hidden="true"
              size={18}
              className="shrink-0 text-emerald-400"
            />
          )}
        </div>

        {logoError && (
          <div
            role="alert"
            className="mt-2 flex items-start gap-2 rounded-md border border-red-900 bg-red-900/20 px-3 py-2 text-xs text-red-300"
          >
            <X size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{logoError}</span>
          </div>
        )}
      </div>

      {/* ---------- footer actions ---------- */}
      {submitError && (
        <div
          role="alert"
          className="rounded-md border border-red-900 bg-red-900/20 px-3 py-2 text-sm text-red-300"
        >
          {submitError}
        </div>
      )}

      <div className="flex flex-col items-center gap-2 pt-1">
        <PrimaryButton
          type="submit"
          magnetic
          loading={submitting}
          disabled={submitting || uploading || !accentValid}
          className="w-full sm:w-auto sm:min-w-[180px]"
        >
          {submitting ? 'Saving' : isDirty ? 'Save & continue' : 'Continue'}
        </PrimaryButton>
        <button
          type="button"
          onClick={handleSkip}
          disabled={submitting}
          className={cn(
            'text-xs text-ink-400 hover:text-ink-200 transition-colors',
            'link-underline-draw px-1',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          Skip for now
        </button>
      </div>
    </form>
  );
}
