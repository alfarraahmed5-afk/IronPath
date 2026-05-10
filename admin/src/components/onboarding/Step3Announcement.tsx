// Team Alpha α3 — Onboarding wizard, Step 3: post the first announcement.
//
// The first announcement is the start of the gym's community channel — the
// moment a member joins, they should see a warm note from their owner. We
// pre-fill both fields with sensible templates so the operator can post in
// one click; everything stays editable.

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Megaphone, Pin } from 'lucide-react';
import api from '@/lib/api';
import { EmberSeam } from '@/components/EmberSeam';
import { PrimaryButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { extractError, z, zodResolver } from '@/lib/forms';

export interface Step3AnnouncementProps {
  onComplete: () => void;
  gym: { id: string; name?: string };
}

const announcementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(120, 'Title must be 120 characters or fewer'),
  body: z
    .string()
    .trim()
    .min(10, 'Say a little more — at least 10 characters')
    .max(2000, 'Body must be 2000 characters or fewer'),
  is_pinned: z.boolean(),
});

type AnnouncementForm = z.infer<typeof announcementSchema>;

function defaultTitle(gymName: string): string {
  return `Welcome to ${gymName} on IronPath!`;
}

function defaultBody(gymName: string): string {
  return [
    `Hi! We just launched our gym on IronPath.`,
    `Track your workouts, see the leaderboard, and challenge your gym mates.`,
    `Glad you're here. — ${gymName}`,
  ].join('\n\n');
}

export function Step3Announcement({ onComplete, gym }: Step3AnnouncementProps) {
  const gymName = gym.name?.trim() || 'your gym';
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AnnouncementForm>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: defaultTitle(gymName),
      body: defaultBody(gymName),
      is_pinned: true,
    },
  });

  async function onSubmit(values: AnnouncementForm) {
    setServerError(null);
    try {
      await api.post('/admin/announcements', {
        title: values.title.trim(),
        body: values.body.trim(),
        is_pinned: values.is_pinned,
      });
      onComplete();
    } catch (err) {
      setServerError(
        extractError(err, 'Could not post announcement. Try again.'),
      );
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-2">
        <h1 className="text-2xl font-semibold text-white tracking-tight">
          Welcome your members
        </h1>
        <p className="text-gray-400 text-sm mt-1 max-w-prose">
          Your first announcement is the start of community. Members will see
          this in the mobile app the moment they join.
        </p>
      </header>
      <EmberSeam className="mb-6" />

      {serverError && (
        <div
          role="alert"
          className="bg-red-950/40 border border-red-800 text-red-300 rounded-md px-3 py-2 mb-5 text-sm"
        >
          {serverError}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        <div className="surface-card px-5 py-5 space-y-4">
          <div>
            <label
              htmlFor="onboarding-announcement-title"
              className="block text-sm text-gray-300 mb-1"
            >
              Title
            </label>
            <input
              id="onboarding-announcement-title"
              type="text"
              autoComplete="off"
              className={cn(
                'w-full bg-ink-900 border border-ink-700 rounded-lg px-3 py-2',
                'text-sm text-white placeholder-gray-500',
                'focus:outline-none focus:border-brand-500',
                'disabled:opacity-50',
              )}
              placeholder={`Welcome to ${gymName} on IronPath!`}
              data-testid="onboarding-announcement-title"
              {...register('title')}
            />
            {errors.title?.message && (
              <p className="mt-1 text-xs text-red-400">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="onboarding-announcement-body"
              className="block text-sm text-gray-300 mb-1"
            >
              Message
            </label>
            <textarea
              id="onboarding-announcement-body"
              rows={6}
              className={cn(
                'w-full bg-ink-900 border border-ink-700 rounded-lg px-3 py-2',
                'text-sm text-white placeholder-gray-500',
                'focus:outline-none focus:border-brand-500',
                'disabled:opacity-50 resize-y min-h-[8rem]',
              )}
              placeholder="A short note for your members…"
              data-testid="onboarding-announcement-body"
              {...register('body')}
            />
            {errors.body?.message && (
              <p className="mt-1 text-xs text-red-400">
                {errors.body.message}
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 accent-brand-500"
              data-testid="onboarding-announcement-pin"
              {...register('is_pinned')}
            />
            <Pin size={14} className="text-gray-400" aria-hidden="true" />
            <span className="text-sm text-gray-300">
              Pin this announcement so it stays at the top
            </span>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <PrimaryButton
            type="submit"
            disabled={isSubmitting}
            data-testid="onboarding-announcement-submit"
            className="min-w-[200px]"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Megaphone size={16} />
            )}
            <span>{isSubmitting ? 'Posting…' : 'Post announcement'}</span>
          </PrimaryButton>

          <button
            type="button"
            onClick={onComplete}
            disabled={isSubmitting}
            className={cn(
              'text-xs text-gray-500 hover:text-gray-300 transition-colors',
              'underline-offset-2 hover:underline disabled:opacity-50',
              'self-start sm:self-center',
            )}
          >
            Skip for now
          </button>
        </div>
      </form>
    </div>
  );
}
