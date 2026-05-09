import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { authLimiter, refreshLimiter } from '../middleware/rateLimit';
import { requireActiveUser } from '../middleware/requireActiveUser';
import { CHALLENGE_TTL_SECONDS, generateChallengeToken, hashChallengeToken } from '../lib/twoFactor';
import { logger } from '../lib/logger';
import { supabaseAuth } from '../lib/supabase';

const router = Router();

const registerSchema = z.object({
  // Allow any reasonable invite-code length so we don't have to ship a
  // mobile rebuild every time the generator is re-tuned. The DB column is
  // VARCHAR(10), so 4–10 covers the full range of legal codes.
  invite_code: z.string().min(4).max(10),
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
      .from('gyms')
      .select('id, name, is_active, subscription_tier, invite_uses, invite_max_uses, invite_expires_at')
      .eq('invite_code', invite_code.toUpperCase())
      .single();
    if (!gym || !gym.is_active) {
      return next(new AppError('INVITE_INVALID', 404, 'Invite code not found or inactive'));
    }
    // Check invite expiry
    if (gym.invite_expires_at && new Date(gym.invite_expires_at) < new Date()) {
      return next(new AppError('INVITE_EXPIRED', 410, 'This invite code has expired'));
    }
    // Check invite max uses
    if (gym.invite_max_uses !== null && gym.invite_uses >= gym.invite_max_uses) {
      return next(new AppError('INVITE_EXHAUSTED', 410, 'This invite code has reached its maximum uses'));
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
      // Increment invite use counter (best-effort — don't fail registration if this errors)
      supabase.from('gyms').update({ invite_uses: (gym.invite_uses ?? 0) + 1 }).eq('id', gym.id),
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
      .select('id, email, username, full_name, avatar_url, role, gym_id, is_active, deleted_at, totp_enabled_at')
      .eq('id', data.user.id).single();
    if (!user) return next(new AppError('UNAUTHORIZED', 401, 'User account not found'));
    if (user.deleted_at) return next(new AppError('FORBIDDEN', 403, 'Account removed'));
    if (!user.is_active) return next(new AppError('FORBIDDEN', 403, 'Account suspended'));

    const totpEnabled = Boolean(user.totp_enabled_at);

    // Phase B.5: super_admins with 2FA enrolled must clear a TOTP challenge
    // before the Supabase session is returned. We stash the freshly-minted
    // tokens in super_admin_2fa_challenges with a 5-min TTL; /auth/2fa/verify
    // looks them up by hashed challenge_token, validates the TOTP/recovery
    // code, then vends them. Plan §8.1 #1, §12.4 #4.
    if (user.role === 'super_admin' && totpEnabled) {
      const challengeToken = generateChallengeToken();
      const expiresAt = new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000).toISOString();
      const { error: chErr } = await supabase.from('super_admin_2fa_challenges').insert({
        user_id: user.id,
        challenge_token_hash: hashChallengeToken(challengeToken),
        access_token: data.session!.access_token,
        refresh_token: data.session!.refresh_token,
        ip: req.ip ?? null,
        user_agent: req.headers['user-agent'] ?? null,
        expires_at: expiresAt,
      });
      if (chErr) {
        logger.error({ err: chErr, user_id: user.id }, '2FA challenge insert failed');
        return next(new AppError('INTERNAL', 500, 'Could not initiate 2FA challenge'));
      }
      return res.json({
        data: {
          requires_2fa: true,
          challenge_token: challengeToken,
          expires_in: CHALLENGE_TTL_SECONDS,
        },
      });
    }

    await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', user.id);
    res.json({
      data: {
        access_token: data.session!.access_token,
        refresh_token: data.session!.refresh_token,
        user: {
          id: user.id, email: user.email, username: user.username, full_name: user.full_name,
          avatar_url: user.avatar_url, role: user.role, gym_id: user.gym_id,
          totp_enabled: totpEnabled,
        },
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
router.post('/refresh', refreshLimiter, async (req: Request, res: Response, next: NextFunction) => {
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

// POST /auth/set-password — final leg of the magic-link-on-create flow
// (Phase C onboarding, Q1 council vote 4-0). Owner clicks the recovery link
// in their welcome email → Supabase redirects them to admin /reset-password
// with `#access_token=...&refresh_token=...&type=recovery` in the URL hash
// → admin posts here with `{access_token, new_password}` → backend validates
// the access_token, sets the new password via the admin API, returns the
// public.users record so the SPA can store + navigate to /dashboard.
//
// Distinct from /reset-password (PKCE/code-exchange flow used elsewhere) —
// this one is purpose-built for the recovery-hash path.
const setPasswordSchema = z.object({
  access_token: z.string().min(20),
  new_password: z.string().min(8),
});

router.post('/set-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = setPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { access_token, new_password } = parsed.data;

    const { data: { user: authUser }, error: tokenErr } = await supabaseAuth.auth.getUser(access_token);
    if (tokenErr || !authUser) {
      return next(new AppError('UNAUTHORIZED', 401, 'Invalid or expired recovery link'));
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: new_password,
    });
    if (updateErr) {
      logger.error({ err: updateErr, user_id: authUser.id }, 'Password update failed');
      return next(new AppError('INTERNAL_ERROR', 500, 'Could not update password'));
    }

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, email, username, full_name, avatar_url, role, gym_id, is_active, deleted_at')
      .eq('id', authUser.id)
      .single();
    if (userErr || !user) return next(new AppError('UNAUTHORIZED', 401, 'User account not found'));
    if (user.deleted_at) return next(new AppError('FORBIDDEN', 403, 'Account removed'));
    if (!user.is_active) return next(new AppError('FORBIDDEN', 403, 'Account suspended'));

    await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', user.id);

    res.json({
      data: {
        access_token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          role: user.role,
          gym_id: user.gym_id,
        },
      },
    });
  } catch (err) { next(err); }
});

export default router;
