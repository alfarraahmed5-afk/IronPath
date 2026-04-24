import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
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
    const decoded: any = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!);
    const userId: string = decoded.sub;

    // Always resolve gym_id and role from the database — never rely solely on
    // JWT app_metadata claims, which require the Supabase auth hook to be
    // perfectly configured. The DB is the source of truth.
    const { data: userRow, error } = await supabase
      .from('users')
      .select('gym_id, role')
      .eq('id', userId)
      .single();

    if (error || !userRow) {
      return next(new AppError('UNAUTHORIZED', 401, 'User not found'));
    }

    req.user = { id: userId, gym_id: userRow.gym_id, role: userRow.role };
    next();
  } catch {
    return next(new AppError('UNAUTHORIZED', 401, 'Invalid or expired token'));
  }
}
