import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { AppError } from './errorHandler';

export async function requireActiveUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Not authenticated'));

  const { data, error } = await supabase
    .from('users')
    .select('is_active, deleted_at')
    .eq('id', req.user.id)
    .single();

  if (error || !data) return next(new AppError('UNAUTHORIZED', 401, 'User not found'));
  if (data.deleted_at) return next(new AppError('FORBIDDEN', 403, 'Account removed'));
  if (!data.is_active) return next(new AppError('FORBIDDEN', 403, 'Account suspended'));
  next();
}
