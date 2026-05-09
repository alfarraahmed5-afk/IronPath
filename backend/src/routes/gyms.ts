import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { generateUniqueInviteCode } from '../lib/inviteCode';
import { sendWelcomeEmail, sendInviteEmail } from '../lib/email';
import { AppError } from '../middleware/errorHandler';
import { gymRegistrationLimiter, inviteLimiter, uploadLimiter } from '../middleware/rateLimit';
import { requireActiveUser } from '../middleware/requireActiveUser';

const router = Router();

// Shared accent_color regex — used by both POST and PATCH /:id schemas so
// the rules can never drift. Mirrors VARCHAR(7) constraint on gyms.accent_color.
const ACCENT_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

// Mirrors shared/types ONBOARDING_STEPS. Defined inline here because the
// backend does not currently import @ironpath/shared at runtime (no build step
// for the shared package). Keep these two lists in sync.
const ONBOARDING_STEPS = [
  'profile',
  'logo',
  'first_invite',
  'first_member',
  'first_announcement',
  'subscription_chosen',
] as const;
type OnboardingStepKey = typeof ONBOARDING_STEPS[number];
const ONBOARDING_STEP_SET = new Set<string>(ONBOARDING_STEPS);

// Mirrors shared/types TIER_MEMBER_CAPS. null = unlimited (no cap returned).
const TIER_MEMBER_CAPS: Record<string, number | null> = {
  starter: 50,
  growth: 200,
  unlimited: null,
};

const gymRegisterSchema = z.object({
  name: z.string().min(1).max(255),
  location: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  email: z.string().email(),
  password: z.string().min(8),
  accent_color: z.string().regex(ACCENT_COLOR_REGEX).optional(),
});

// GET /gyms/validate-invite/:code
router.get('/validate-invite/:code', inviteLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.params.code.toUpperCase();
    const { data: gym } = await supabase
      .from('gyms')
      .select('id, name, logo_url, is_active, invite_uses, invite_max_uses, invite_expires_at')
      .eq('invite_code', code)
      .single();
    if (!gym || !gym.is_active) return next(new AppError('INVITE_INVALID', 404, 'Invite code not found or inactive'));

    // Check expiry
    if (gym.invite_expires_at && new Date(gym.invite_expires_at) < new Date()) {
      return next(new AppError('INVITE_EXPIRED', 410, 'This invite code has expired'));
    }
    // Check max uses
    if (gym.invite_max_uses !== null && gym.invite_uses >= gym.invite_max_uses) {
      return next(new AppError('INVITE_EXHAUSTED', 410, 'This invite code has reached its maximum uses'));
    }

    res.json({ data: { gym_id: gym.id, gym_name: gym.name, logo_url: gym.logo_url } });
  } catch (err) { next(err); }
});

// POST /gyms
router.post('/', gymRegistrationLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = gymRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { name, location, description, email, password, accent_color } = parsed.data;
    const inviteCode = await generateUniqueInviteCode();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authError) {
      if (authError.message?.includes('already registered')) return next(new AppError('CONFLICT', 409, 'Email already registered'));
      throw authError;
    }
    const authUserId = authData.user.id;
    const { data: gym, error: gymError } = await supabase.from('gyms').insert({
      name, location: location || null, description: description || null,
      invite_code: inviteCode, accent_color: accent_color || '#FF6B35',
      subscription_status: 'trial',
    }).select().single();
    if (gymError) { await supabase.auth.admin.deleteUser(authUserId); throw gymError; }
    const username = 'owner_' + inviteCode.toLowerCase();
    const { error: userError } = await supabase.from('users').insert({
      id: authUserId, gym_id: gym.id, email, username,
      full_name: null, role: 'gym_owner',
    });
    if (userError) {
      await supabase.from('gyms').delete().eq('id', gym.id);
      await supabase.auth.admin.deleteUser(authUserId);
      throw userError;
    }
    await Promise.all([
      supabase.from('user_settings').insert({ user_id: authUserId }),
      supabase.from('streaks').insert({ user_id: authUserId, gym_id: gym.id }),
    ]);
    sendWelcomeEmail({ to: email, gymName: name, inviteCode, appDownloadUrl: process.env.APP_DOWNLOAD_URL || 'https://ironpath.app/download' }).catch(() => {});
    const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
    res.status(201).json({
      data: {
        gym: { id: gym.id, name: gym.name, invite_code: inviteCode, accent_color: gym.accent_color },
        access_token: signInData?.session?.access_token,
        refresh_token: signInData?.session?.refresh_token,
        user: { id: authUserId, email, username, role: 'gym_owner', gym_id: gym.id },
      },
    });
  } catch (err) { next(err); }
});

// GET /gyms/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const gymId = req.params.id;
    if (req.user.role !== 'super_admin' && req.user.gym_id !== gymId) {
      return next(new AppError('FORBIDDEN', 403, 'Access denied'));
    }
    const { data: gym, error } = await supabase.from('gyms').select('*').eq('id', gymId).single();
    if (error || !gym) return next(new AppError('NOT_FOUND', 404, 'Gym not found'));
    res.json({ data: gym });
  } catch (err) { next(err); }
});

// PATCH /gyms/:id
router.patch('/:id', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    if (!['gym_owner', 'super_admin'].includes(req.user.role)) return next(new AppError('FORBIDDEN', 403, 'gym_owner role required'));
    if (req.user.role === 'gym_owner' && req.user.gym_id !== req.params.id) return next(new AppError('FORBIDDEN', 403, 'Access denied'));
    const updateSchema = z.object({
      name: z.string().min(1).max(255).optional(),
      location: z.string().max(500).optional(),
      description: z.string().max(2000).optional(),
      accent_color: z.string().regex(ACCENT_COLOR_REGEX).optional(),
      phone: z.string().max(50).optional(),
      website: z.string().url().max(2000).optional(),
      address: z.string().max(500).optional(),
      timezone: z.string().max(100).optional(),
      units_default: z.enum(['metric', 'imperial']).optional(),
      logo_url: z.string().url().max(2000).optional(),
    });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { data: gym, error } = await supabase.from('gyms').update(parsed.data).eq('id', req.params.id).select().single();
    if (error || !gym) return next(new AppError('NOT_FOUND', 404, 'Gym not found'));
    res.json({ data: gym });
  } catch (err) { next(err); }
});

// GET /gyms/:id/subscription — current plan + usage snapshot
router.get('/:id/subscription', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const gymId = req.params.id;
    if (req.user.role !== 'super_admin' && !(req.user.role === 'gym_owner' && req.user.gym_id === gymId)) {
      return next(new AppError('FORBIDDEN', 403, 'Access denied'));
    }
    const { data: gym, error } = await supabase
      .from('gyms')
      .select('subscription_tier, subscription_status, subscription_expires_at, trial_started_at, mrr_cents')
      .eq('id', gymId)
      .single();
    if (error || !gym) return next(new AppError('NOT_FOUND', 404, 'Gym not found'));

    // Active member count: role=member, is_active=true, not soft-deleted.
    const { count: memberCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('role', 'member')
      .eq('is_active', true)
      .is('deleted_at', null);

    const tier = gym.subscription_tier as string | null;
    // Cap is null for unlimited tier (or for no tier set yet — treat as no cap surfaced).
    const memberCap = tier && tier in TIER_MEMBER_CAPS ? TIER_MEMBER_CAPS[tier] : null;

    res.json({
      data: {
        tier: gym.subscription_tier,
        status: gym.subscription_status,
        expires_at: gym.subscription_expires_at,
        trial_started_at: gym.trial_started_at,
        mrr_cents: gym.mrr_cents ?? 0,
        member_count: memberCount ?? 0,
        member_cap: memberCap,
      },
    });
  } catch (err) { next(err); }
});

// GET /gyms/:id/onboarding — checklist state, merging canonical steps with DB rows
router.get('/:id/onboarding', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const gymId = req.params.id;
    if (req.user.role !== 'super_admin' && !(req.user.role === 'gym_owner' && req.user.gym_id === gymId)) {
      return next(new AppError('FORBIDDEN', 403, 'Access denied'));
    }
    const { data: rows, error } = await supabase
      .from('gym_onboarding_steps')
      .select('step_key, completed_at, completed_by, metadata')
      .eq('gym_id', gymId);
    if (error) throw error;

    const byKey = new Map<string, { completed_at: string; completed_by: string | null; metadata: any }>(
      (rows ?? []).map(r => [r.step_key as string, {
        completed_at: r.completed_at as string,
        completed_by: (r.completed_by as string | null) ?? null,
        metadata: r.metadata ?? null,
      }])
    );
    const steps = ONBOARDING_STEPS.map(key => {
      const row = byKey.get(key);
      return {
        key,
        completed_at: row?.completed_at ?? null,
        completed_by: row?.completed_by ?? null,
        metadata: row?.metadata ?? null,
      };
    });
    res.json({ data: { steps } });
  } catch (err) { next(err); }
});

// POST /gyms/:id/onboarding/:stepKey/complete — idempotent UPSERT
router.post('/:id/onboarding/:stepKey/complete', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const gymId = req.params.id;
    if (req.user.role !== 'super_admin' && !(req.user.role === 'gym_owner' && req.user.gym_id === gymId)) {
      return next(new AppError('FORBIDDEN', 403, 'Access denied'));
    }
    const stepKey = req.params.stepKey;
    if (!ONBOARDING_STEP_SET.has(stepKey)) {
      return next(new AppError('VALIDATION_ERROR', 422, 'Unknown onboarding step', [
        { field: 'stepKey', message: `Must be one of: ${ONBOARDING_STEPS.join(', ')}` },
      ]));
    }
    const bodySchema = z.object({ metadata: z.record(z.any()).optional() });
    const parsed = bodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('gym_onboarding_steps')
      .upsert(
        {
          gym_id: gymId,
          step_key: stepKey as OnboardingStepKey,
          completed_at: nowIso,
          completed_by: req.user.id,
          metadata: parsed.data.metadata ?? null,
        },
        { onConflict: 'gym_id,step_key' }
      )
      .select()
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (err) { next(err); }
});

// POST /gyms/:id/logo/upload-url — mint a signed upload URL for the gym-assets bucket.
// Cleanup of the previous logo_url is deferred to Phase A4 (we currently leave
// orphaned objects in the bucket; the bucket is public-read, single small file
// per gym, so storage cost is negligible until then).
router.post('/:id/logo/upload-url', requireActiveUser, uploadLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const gymId = req.params.id;
    if (req.user.role !== 'super_admin' && !(req.user.role === 'gym_owner' && req.user.gym_id === gymId)) {
      return next(new AppError('FORBIDDEN', 403, 'Access denied'));
    }
    const bodySchema = z.object({
      content_type: z.string().regex(/^image\/(png|jpeg|webp)$/),
      size: z.number().int().positive().max(2 * 1024 * 1024),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    // png → png, jpeg → jpg, webp → webp
    const subtype = parsed.data.content_type.split('/')[1];
    const ext = subtype === 'jpeg' ? 'jpg' : subtype;
    // Folder structure must start with gym_id (see 033_storage_policies.sql).
    const path = `${gymId}/logo-${randomUUID()}.${ext}`;

    const { data: signed, error: signErr } = await supabase
      .storage
      .from('gym-assets')
      .createSignedUploadUrl(path);
    if (signErr || !signed) {
      return next(new AppError('INTERNAL_ERROR', 500, 'Failed to mint upload URL'));
    }
    const { data: pub } = supabase.storage.from('gym-assets').getPublicUrl(path);
    res.json({
      data: {
        upload_url: signed.signedUrl,
        public_url: pub.publicUrl,
        path,
      },
    });
  } catch (err) { next(err); }
});

// POST /gyms/:id/regenerate-invite
router.post('/:id/regenerate-invite', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    if (!['gym_owner', 'super_admin'].includes(req.user.role)) return next(new AppError('FORBIDDEN', 403, 'gym_owner role required'));
    if (req.user.role === 'gym_owner' && req.user.gym_id !== req.params.id) return next(new AppError('FORBIDDEN', 403, 'Access denied'));
    const newCode = await generateUniqueInviteCode();
    await supabase.from('gyms').update({ invite_code: newCode }).eq('id', req.params.id);
    res.json({ data: { invite_code: newCode } });
  } catch (err) { next(err); }
});

// POST /gyms/:id/invite-email
router.post('/:id/invite-email', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    if (!['gym_owner', 'super_admin'].includes(req.user.role)) return next(new AppError('FORBIDDEN', 403, 'gym_owner role required'));
    const emailSchema = z.object({ email: z.string().email() });
    const parsed = emailSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('VALIDATION_ERROR', 422, 'Valid email required', [{ field: 'email', message: 'Valid email required' }]));
    const { data: gym } = await supabase.from('gyms').select('name, invite_code').eq('id', req.params.id).single();
    if (!gym) return next(new AppError('NOT_FOUND', 404, 'Gym not found'));
    await sendInviteEmail({ to: parsed.data.email, gymName: gym.name, inviteCode: gym.invite_code, appDownloadUrl: process.env.APP_DOWNLOAD_URL || 'https://ironpath.app/download' });
    res.json({ data: { message: 'Invite email sent' } });
  } catch (err) { next(err); }
});

export default router;
