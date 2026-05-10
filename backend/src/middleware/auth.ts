import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAuth } from '../lib/supabase';
import { AppError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        gym_id: string | null;
        role: string;
      };
    }
  }
}

// Public paths are matched as anchored regexes — `startsWith` would let any
// future route accidentally inherit anonymity (`/auth/login-bypass-foo`,
// `/auth/refresh-anything`, etc.). Each entry must end with `/?(\?.*)?$`.
const PUBLIC_PATH_RES: { method?: string; re: RegExp }[] = [
  { re: /^\/api\/v1\/auth\/register\/?(\?.*)?$/ },
  { re: /^\/api\/v1\/auth\/login\/?(\?.*)?$/ },
  { re: /^\/api\/v1\/auth\/forgot-password\/?(\?.*)?$/ },
  { re: /^\/api\/v1\/auth\/reset-password\/?(\?.*)?$/ },
  { re: /^\/api\/v1\/auth\/refresh\/?(\?.*)?$/ },
  // Phase B.5: TOTP challenge exchange runs before any session exists. Only
  // POST /auth/2fa/verify is public — the super_admin enroll/confirm/disable
  // endpoints sit under /super-admin/2fa and require an active session.
  { method: 'POST', re: /^\/api\/v1\/auth\/2fa\/verify\/?(\?.*)?$/ },
  // Phase C onboarding magic-link-on-create: the recovery-hash flow lands
  // unauthenticated owners here to complete password setup.
  { method: 'POST', re: /^\/api\/v1\/auth\/set-password\/?(\?.*)?$/ },
  { re: /^\/api\/v1\/gyms\/validate-invite\/?(\?.*)?$/ },
  { method: 'POST', re: /^\/api\/v1\/gyms\/?(\?.*)?$/ },
  // Public lead capture: only POST /api/v1/leads is unauthenticated. The
  // super_admin GET/PATCH list endpoints sit under /api/v1/super-admin/leads
  // and are not affected by this exemption.
  { method: 'POST', re: /^\/api\/v1\/leads\/?(\?.*)?$/ },
  // Phase C / γ4 — Marketing-site no-auth demo deep-link. Only POST
  // /api/v1/demo/spawn is unauthenticated; rate-limited 5/min/IP inside
  // the route handler.
  { method: 'POST', re: /^\/api\/v1\/demo\/spawn\/?(\?.*)?$/ },
];

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const isPublic = PUBLIC_PATH_RES.some(p =>
    (!p.method || p.method === req.method) && p.re.test(req.originalUrl)
  );

  if (isPublic) return next();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next(new AppError('UNAUTHORIZED', 401, 'Missing token'));

  try {
    // Use Supabase's own token validation — no SUPABASE_JWT_SECRET required,
    // no manual jwt.verify() that breaks if the secret is misconfigured.
    // IMPORTANT: use the dedicated `supabaseAuth` client so that any internal
    // session-state mutation from getUser() cannot leak into the main DB
    // client's Authorization header (which is what was causing RLS to fire on
    // service-role DB queries).
    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authUser) {
      return next(new AppError('UNAUTHORIZED', 401, 'Invalid or expired token'));
    }

    // Always read role and gym_id from the DB — it is the source of truth.
    const { data: userRow, error: dbError } = await supabase
      .from('users')
      .select('gym_id, role')
      .eq('id', authUser.id)
      .single();

    if (dbError || !userRow) {
      return next(new AppError('UNAUTHORIZED', 401, 'User not found'));
    }

    req.user = { id: authUser.id, gym_id: userRow.gym_id, role: userRow.role };
    next();
  } catch {
    return next(new AppError('UNAUTHORIZED', 401, 'Invalid or expired token'));
  }
}
