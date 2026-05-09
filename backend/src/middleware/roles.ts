import { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler';

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
  if (req.user.role !== 'super_admin') return next(new AppError('FORBIDDEN', 403, 'Super admin required'));
  next();
}

/**
 * `requireGymOwner` — gates `/admin/*` (and any other gym-owner-scoped route).
 *
 * Per plan §6.1 / §8.1 #3, super_admin is intentionally NOT routed through this
 * middleware: super_admin operates via `/super-admin/*` and acquires owner
 * scope through impersonation (a short-lived owner-scoped token), not by
 * inheriting role permissions on `/admin/*`. Folding super_admin in here was
 * the "confusing dead-end" the plan called out.
 *
 * If the route has a `:id` (or `:gymId`) param, we additionally enforce that
 * it matches the JWT-scoped gym_id — defense-in-depth on top of zod schemas
 * that already strip `gym_id` from request bodies.
 */
export function requireGymOwner(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
  if (req.user.role !== 'gym_owner') return next(new AppError('FORBIDDEN', 403, 'Gym owner required'));
  if (!req.user.gym_id) return next(new AppError('NO_GYM', 403, 'No gym associated with this account'));
  const paramGymId = req.params.id || req.params.gymId;
  if (paramGymId && paramGymId !== req.user.gym_id) {
    return next(new AppError('FORBIDDEN', 403, 'Gym scope mismatch'));
  }
  next();
}

/**
 * `requireSelfOrSuperAdmin` — for endpoints that read/write a specific user
 * (e.g. /users/:id). Super admin always passes; otherwise the JWT subject must
 * match the URL param.
 */
export function requireSelfOrSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
  if (req.user.role === 'super_admin') return next();
  const paramUserId = req.params.userId || req.params.id;
  if (paramUserId && paramUserId === req.user.id) return next();
  return next(new AppError('FORBIDDEN', 403, 'Self or super admin required'));
}
