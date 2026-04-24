import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
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

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const isPublic = PUBLIC_PATHS.some(path => req.originalUrl.startsWith(path)) ||
    (req.method === 'POST' && /^\/api\/v1\/gyms\/?$/.test(req.originalUrl));

  if (isPublic) return next();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next(new AppError('UNAUTHORIZED', 401, 'Missing token'));

  try {
    const decoded: any = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!);
    const gymId = decoded.app_metadata?.gym_id || null;
    const role = decoded.app_metadata?.role ?? 'member';

    if (!gymId && role !== 'super_admin') {
      return next(new AppError('UNAUTHORIZED', 401, 'Invalid token claims'));
    }

    req.user = { id: decoded.sub, gym_id: gymId, role };
    next();
  } catch {
    return next(new AppError('UNAUTHORIZED', 401, 'Invalid or expired token'));
  }
}
