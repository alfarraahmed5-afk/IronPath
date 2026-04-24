import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { authLimiter } from '../middleware/rateLimit';
import { requireActiveUser } from '../middleware/requireActiveUser';

const router = Router();

const registerSchema = z.object({
  invite_code: z.string().length(6),
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores'),
  full_name: z.string().max(255).optional(),
  sex: z.enum(['male', 'female']).optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /auth/register
router.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { invite_code, email, password, username, full_name, sex, date_of_birth } = parsed.data;
    const { data: gym } = await supabase
      .from('gyms').select('id, name, is_active, subscription_tier')
      .eq('invite_code', invite_code.toUpperCase()).single();
    if (!gym || !gym.is_active) {
      return next(new AppError('INVITE_INVALID', 404, 'Invite code not found or inactive'));
    }
    const tierLimits: Record<string, number> = { starter: 50, growth: 200, unlimited: Infinity };
    const limit = gym.subscription_tier ? (tierLimits[gym.subscription_tier] ?? 50) : 50;
    const { count: memberCount } = await supabase.from('users')
      .select('id', { count: 'exact', head: true }).eq('gym_id', gym.id).is('deleted_at', null);
    if (memberCount !== null && memberCount >= limit) {
      return next(new AppError('FORBIDDEN', 403, 'This gym has reached its member limit'));
    }
    const { data: existingUsername } = await supabase
      .from('users').select('id').eq('username', username).maybeSingle();
    if (existingUsername) {
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', [
        { field: 'username', message: 'Username is already taken' }
      ]));
    }
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authError) {
      if (authError.message?.includes('already registered')) {
        return next(new AppError('CONFLICT', 409, 'Email already registered'));
      }
      throw authError;
    }
    const authUserId = authData.user.id;
    const { error: userError } = await supabase.from('users').insert({
      id: authUserId, gym_id: gym.id, email, username,
      full_name: full_name || null, sex: sex || null,
      date_of_birth: date_of_birth || null, role: 'member',
    });
    if (userError) { await supabase.auth.admin.deleteUser(authUserId); throw userError; }
    await Promise.all([
      supabase.from('user_settings').insert({ user_id: authUserId }),
      supabase.from('streaks').insert({ user_id: authUserId, gym_id: gym.id }),
    ]);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    res.status(201).json({
      data: {
        access_token: signInData.session!.access_token,
        refresh_token: signInData.session!.refresh_token,
        user: { id: authUserId, email, username, full_name: full_name || null, avatar_url: null, role: 'member', gym_id: gym.id },
      },
    });
  } catch (err) { next(err); }
});

// POST /auth/login
router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { email, password } = parsed.data;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return next(new AppError('UNAUTHORIZED', 401, 'Invalid email or password'));
    const { data: user } = await supabase.from('users')
      .select('id, email, username, full_name, avatar_url, role, gym_id, is_active, deleted_at')
      .eq('id', data.user.id).single();
    if (!user) return next(new AppError('UNAUTHORIZED', 401, 'User account not found'));
    if (user.deleted_at) return next(new AppError('FORBIDDEN', 403, 'Account removed'));
    if (!user.is_active) return next(new AppError('FORBIDDEN', 403, 'Account suspended'));
    await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', user.id);
    res.json({
      data: {
        access_token: data.session!.access_token,
        refresh_token: data.session!.refresh_token,
        user: { id: user.id, email: user.email, username: user.username, full_name: user.full_name, avatar_url: user.avatar_url, role: user.role, gym_id: user.gym_id },
      },
    });
  } catch (err) { next(err); }
});

// POST /auth/logout
router.post('/logout', requireActiveUser, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ data: { message: 'Logged out successfully' } });
  } catch (err) { next(err); }
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return next(new AppError('UNAUTHORIZED', 401, 'Missing refresh_token'));
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error || !data.session) return next(new AppError('UNAUTHORIZED', 401, 'Invalid or expired refresh token'));
    res.json({ data: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
  } catch (err) { next(err); }
});

// POST /auth/forgot-password
router.post('/forgot-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return next(new AppError('VALIDATION_ERROR', 422, 'Email is required', [{ field: 'email', message: 'Email is required' }]));
    }
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'ironpath://reset-password' });
    res.json({ data: { message: 'If an account exists, a reset link has been sent.' } });
  } catch (err) { next(err); }
});

// POST /auth/reset-password
router.post('/reset-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) return next(new AppError('VALIDATION_ERROR', 422, 'token and new_password required'));
    if (new_password.length < 8) {
      return next(new AppError('VALIDATION_ERROR', 422, 'Password too short', [{ field: 'new_password', message: 'Minimum 8 characters' }]));
    }
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(token);
    if (sessionError || !sessionData.session) {
      return next(new AppError('UNAUTHORIZED', 401, 'Invalid or expired reset token'));
    }
    const { createClient } = await import('@supabase/supabase-js');
    const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    await userClient.auth.setSession(sessionData.session);
    const { error: updateError } = await userClient.auth.updateUser({ password: new_password });
    if (updateError) return next(new AppError('UNAUTHORIZED', 401, 'Failed to reset password'));
    res.json({ data: { message: 'Password reset successfully' } });
  } catch (err) { next(err); }
});

export default router;
