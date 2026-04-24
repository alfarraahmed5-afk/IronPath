import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { generateUniqueInviteCode } from '../lib/inviteCode';
import { sendWelcomeEmail, sendInviteEmail } from '../lib/email';
import { AppError } from '../middleware/errorHandler';
import { gymRegistrationLimiter, inviteLimiter } from '../middleware/rateLimit';
import { requireActiveUser } from '../middleware/requireActiveUser';

const router = Router();

const gymRegisterSchema = z.object({
  name: z.string().min(1).max(255),
  location: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  email: z.string().email(),
  password: z.string().min(8),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
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
      accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
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
