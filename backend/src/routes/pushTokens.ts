import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';

const router = Router();

router.use(requireActiveUser);

const registerTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

const removeTokenSchema = z.object({
  token: z.string().min(1),
});

// POST /push-tokens
// Register a push notification token (upsert with ignore duplicate)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({
        field: String(e.path.join('.')),
        message: e.message,
      }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }

    await supabase.from('user_push_tokens').upsert(
      {
        user_id: req.user!.id,
        token: parsed.data.token,
        platform: parsed.data.platform,
      },
      { onConflict: 'user_id,token', ignoreDuplicates: true }
    );

    res.json({ data: { registered: true } });
  } catch (err) {
    next(err);
  }
});

// DELETE /push-tokens
// Remove a push notification token (token in body to prevent enumeration)
router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = removeTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({
        field: String(e.path.join('.')),
        message: e.message,
      }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }

    await supabase
      .from('user_push_tokens')
      .delete()
      .eq('user_id', req.user!.id)
      .eq('token', parsed.data.token);

    res.json({ data: { removed: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
