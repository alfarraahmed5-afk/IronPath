import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
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

const PUBLIC_PATHS = [
  '/api/v1/auth/register',
  '/api/v1/auth/login',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/refresh',
  '/api/v1/gyms/validate-invite',
];

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const isPublic = PUBLIC_PATHS.some(path => req.originalUrl.startsWith(path)) ||
    (req.method === 'POST' && /^\/api\/v1\/gyms\/?$/.test(req.originalUrl));

  if (isPublic) return next();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next(new AppError('UNAUTHORIZED', 401, 'Missing token'));

  try {
    // Use Supabase's own token validation — no SUPABASE_JWT_SECRET required,
    // no manual jwt.verify() that breaks if the secret is misconfigured.
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
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
