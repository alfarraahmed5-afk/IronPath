import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { authLimiter } from '../middleware/rateLimit';
import { requireActiveUser } from '../middleware/requireActiveUser';
import { requireSuperAdmin } from '../middleware/roles';
import { logAudit } from '../lib/audit';
import { logger } from '../lib/logger';
import {
  CHALLENGE_TTL_SECONDS,
  createTotpEnrollment,
  generateRecoveryCodes,
  hashChallengeToken,
  hashRecoveryCode,
  normalizeRecoveryCode,
  verifyTotp,
} from '../lib/twoFactor';

// ─── Public router: mounted at /api/v1/auth/2fa ────────────────────────────
// Only one public endpoint: POST /verify exchanges a challenge_token (issued
// by /auth/login when a TOTP-enrolled super_admin authenticates) plus a
// TOTP/recovery code for the real Supabase session.
export const authTwoFactorRouter = Router();

const verifySchema = z.object({
  challenge_token: z.string().min(32).max(128),
  totp_code: z.string().regex(/^\d{6}$/).optional(),
  recovery_code: z.string().min(4).max(40).optional(),
}).refine(d => Boolean(d.totp_code) !== Boolean(d.recovery_code), {
  message: 'Provide exactly one of totp_code or recovery_code.',
});

authTwoFactorRouter.post('/verify', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { challenge_token, totp_code, recovery_code } = parsed.data;

    const tokenHash = hashChallengeToken(challenge_token);
    const { data: challenge, error: chErr } = await supabase
      .from('super_admin_2fa_challenges')
      .select('id, user_id, access_token, refresh_token, expires_at, consumed_at')
      .eq('challenge_token_hash', tokenHash)
      .maybeSingle();

    // .maybeSingle() above means chErr is always a real DB error (not "no rows"),
    // so we surface it as 500 instead of masking it as a 401 — same anti-pattern
    // we just split out of superAdmin.ts after the 036–042 schema-drift incident.
    if (chErr) {
      logger.error({ err: chErr }, '2FA challenge lookup failed');
      return next(new AppError('INTERNAL_ERROR', 500, 'Database error'));
    }
    if (!challenge) return next(new AppError('UNAUTHORIZED', 401, 'Invalid or expired challenge'));
    if (challenge.consumed_at) return next(new AppError('UNAUTHORIZED', 401, 'Challenge already used'));
    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      return next(new AppError('UNAUTHORIZED', 401, 'Challenge expired'));
    }

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, email, username, full_name, avatar_url, role, gym_id, totp_secret, totp_enabled_at, is_active, deleted_at')
      .eq('id', challenge.user_id)
      .single();
    if (userErr || !user) return next(new AppError('UNAUTHORIZED', 401, 'User not found'));
    if (user.deleted_at) return next(new AppError('FORBIDDEN', 403, 'Account removed'));
    if (!user.is_active) return next(new AppError('FORBIDDEN', 403, 'Account suspended'));
    if (!user.totp_secret || !user.totp_enabled_at) {
      // Defensive — challenge can only have been created for an enrolled user.
      return next(new AppError('UNAUTHORIZED', 401, 'TOTP not enabled for this account'));
    }

    let usedRecovery = false;
    if (totp_code) {
      if (!verifyTotp(user.totp_secret, totp_code)) {
        return next(new AppError('UNAUTHORIZED', 401, 'Invalid TOTP code'));
      }
    } else if (recovery_code) {
      const codeHash = hashRecoveryCode(normalizeRecoveryCode(recovery_code));
      const { data: rc, error: rcErr } = await supabase
        .from('super_admin_recovery_codes')
        .select('id, used_at')
        .eq('user_id', user.id)
        .eq('code_hash', codeHash)
        .maybeSingle();
      if (rcErr || !rc || rc.used_at) {
        return next(new AppError('UNAUTHORIZED', 401, 'Invalid or used recovery code'));
      }
      const { error: markErr } = await supabase
        .from('super_admin_recovery_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', rc.id)
        .is('used_at', null);
      if (markErr) {
        logger.error({ err: markErr, user_id: user.id }, 'Recovery code consume failed');
        return next(new AppError('UNAUTHORIZED', 401, 'Recovery code could not be consumed'));
      }
      usedRecovery = true;
    }

    // Consume the challenge atomically — guard with `is consumed_at null` so a
    // race between two tabs can only succeed once.
    const { data: consumed, error: consumeErr } = await supabase
      .from('super_admin_2fa_challenges')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', challenge.id)
      .is('consumed_at', null)
      .select('id')
      .maybeSingle();
    if (consumeErr || !consumed) {
      return next(new AppError('UNAUTHORIZED', 401, 'Challenge already used'));
    }

    // The challenge has already been consumed atomically above. From here the
    // operator is logged in regardless of whether bookkeeping writes succeed —
    // failing the response after consuming a single-use token would leave
    // them unable to retry without re-entering their password. We log
    // failures but never block the session.
    const { error: lastActiveErr } = await supabase
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', user.id);
    if (lastActiveErr) {
      logger.warn({ err: lastActiveErr, user_id: user.id }, 'last_active_at update failed (non-fatal)');
    }

    const auditAction = usedRecovery ? '2fa.login_recovery_code' : '2fa.login';
    const { error: auditErr } = await supabase.from('super_admin_audit_log').insert({
      actor_user_id: user.id,
      action: auditAction,
      target_type: 'user',
      target_id: user.id,
      ip: req.ip ?? null,
      user_agent: req.headers['user-agent'] ?? null,
    });
    if (auditErr) {
      logger.error({ err: auditErr, user_id: user.id, action: auditAction }, 'Audit insert failed (non-fatal)');
    }

    res.json({
      data: {
        access_token: challenge.access_token,
        refresh_token: challenge.refresh_token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          role: user.role,
          gym_id: user.gym_id,
          totp_enabled: true,
        },
        used_recovery_code: usedRecovery,
      },
    });
  } catch (err) { next(err); }
});

// ─── Authenticated router: mounted at /api/v1/super-admin/2fa ──────────────
// Every endpoint requires an active super_admin. The login-bridge POST /verify
// above is intentionally NOT here because it runs before a session exists.
export const superAdminTwoFactorRouter = Router();
superAdminTwoFactorRouter.use(requireActiveUser, requireSuperAdmin);

superAdminTwoFactorRouter.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('totp_enabled_at, email')
      .eq('id', req.user!.id)
      .single();
    if (userErr || !user) return next(new AppError('NOT_FOUND', 404, 'User not found'));

    let recovery_codes_remaining = 0;
    if (user.totp_enabled_at) {
      const { count } = await supabase
        .from('super_admin_recovery_codes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.user!.id)
        .is('used_at', null);
      recovery_codes_remaining = count ?? 0;
    }

    res.json({
      data: {
        enrolled: Boolean(user.totp_enabled_at),
        enrolled_at: user.totp_enabled_at,
        recovery_codes_remaining,
      },
    });
  } catch (err) { next(err); }
});

// POST /enroll — generates a fresh secret + QR for the operator. The secret
// is returned to the client (NOT persisted) so the operator can paste it into
// their authenticator app, then echo it back to /confirm with a valid TOTP
// code. Re-enrollment while already enabled is allowed (rotates the secret on
// confirm); recovery codes are also regenerated by /confirm.
superAdminTwoFactorRouter.post('/enroll', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('email')
      .eq('id', req.user!.id)
      .single();
    if (userErr || !user) return next(new AppError('NOT_FOUND', 404, 'User not found'));

    const enrollment = await createTotpEnrollment(user.email);
    res.json({ data: enrollment });
  } catch (err) { next(err); }
});

const confirmSchema = z.object({
  secret: z.string().min(16).max(64),
  totp_code: z.string().regex(/^\d{6}$/),
});

superAdminTwoFactorRouter.post('/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = confirmSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { secret, totp_code } = parsed.data;

    if (!verifyTotp(secret, totp_code)) {
      return next(new AppError('UNAUTHORIZED', 401, 'Invalid TOTP code'));
    }

    const enabledAt = new Date().toISOString();
    const { error: updErr } = await supabase
      .from('users')
      .update({ totp_secret: secret, totp_enabled_at: enabledAt })
      .eq('id', req.user!.id);
    if (updErr) throw updErr;

    // Wipe any prior recovery codes (re-enrollment) and issue a fresh batch.
    await supabase.from('super_admin_recovery_codes').delete().eq('user_id', req.user!.id);

    const codes = generateRecoveryCodes();
    const rows = codes.map(c => ({ user_id: req.user!.id, code_hash: hashRecoveryCode(c) }));
    const { error: rcErr } = await supabase.from('super_admin_recovery_codes').insert(rows);
    if (rcErr) throw rcErr;

    await logAudit(req, {
      action: '2fa.enroll',
      target_type: 'user',
      target_id: req.user!.id,
      after: { enabled_at: enabledAt, recovery_codes_issued: codes.length },
    });

    res.json({ data: { enabled_at: enabledAt, recovery_codes: codes } });
  } catch (err) { next(err); }
});

const disableSchema = z.object({
  totp_code: z.string().regex(/^\d{6}$/),
});

superAdminTwoFactorRouter.post('/disable', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = disableSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { totp_code } = parsed.data;

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('totp_secret, totp_enabled_at')
      .eq('id', req.user!.id)
      .single();
    if (userErr || !user) return next(new AppError('NOT_FOUND', 404, 'User not found'));
    if (!user.totp_secret || !user.totp_enabled_at) {
      return next(new AppError('CONFLICT', 409, '2FA is not enabled'));
    }
    if (!verifyTotp(user.totp_secret, totp_code)) {
      return next(new AppError('UNAUTHORIZED', 401, 'Invalid TOTP code'));
    }

    const { error: updErr } = await supabase
      .from('users')
      .update({ totp_secret: null, totp_enabled_at: null })
      .eq('id', req.user!.id);
    if (updErr) throw updErr;

    await supabase.from('super_admin_recovery_codes').delete().eq('user_id', req.user!.id);

    await logAudit(req, {
      action: '2fa.disable',
      target_type: 'user',
      target_id: req.user!.id,
      before: { enabled_at: user.totp_enabled_at },
    });

    res.json({ data: { enabled: false } });
  } catch (err) { next(err); }
});

superAdminTwoFactorRouter.post('/recovery-codes/regenerate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = disableSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { totp_code } = parsed.data;

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('totp_secret, totp_enabled_at')
      .eq('id', req.user!.id)
      .single();
    if (userErr || !user) return next(new AppError('NOT_FOUND', 404, 'User not found'));
    if (!user.totp_secret || !user.totp_enabled_at) {
      return next(new AppError('CONFLICT', 409, '2FA is not enabled'));
    }
    if (!verifyTotp(user.totp_secret, totp_code)) {
      return next(new AppError('UNAUTHORIZED', 401, 'Invalid TOTP code'));
    }

    await supabase.from('super_admin_recovery_codes').delete().eq('user_id', req.user!.id);
    const codes = generateRecoveryCodes();
    const rows = codes.map(c => ({ user_id: req.user!.id, code_hash: hashRecoveryCode(c) }));
    const { error: rcErr } = await supabase.from('super_admin_recovery_codes').insert(rows);
    if (rcErr) throw rcErr;

    await logAudit(req, {
      action: '2fa.recovery_codes.regenerate',
      target_type: 'user',
      target_id: req.user!.id,
    });

    res.json({ data: { recovery_codes: codes } });
  } catch (err) { next(err); }
});

export { CHALLENGE_TTL_SECONDS };
