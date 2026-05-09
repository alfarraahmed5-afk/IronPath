import { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler';

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
  if (req.user.role !== 'super_admin') return next(new AppError('FORBIDDEN', 403, 'Super admin required'));
  next();
}
