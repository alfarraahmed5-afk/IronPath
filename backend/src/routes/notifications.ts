import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';

const router = Router();

router.use(requireActiveUser);

// GET /notifications
// Cursor-based pagination (cursor = created_at ISO string)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cursor = req.query.cursor as string | undefined;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data } = await query;
    const next_cursor = data && data.length === 20 ? data[19].created_at : null;

    res.json({ data: { notifications: data ?? [], next_cursor } });
  } catch (err) {
    next(err);
  }
});

// POST /notifications/read-all
// Mark all unread notifications as read for this user
router.post('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user!.id)
      .eq('is_read', false);

    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

// PATCH /notifications/:id/read
// Mark a single notification as read
router.patch('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: notif } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .maybeSingle();

    if (!notif) {
      return next(new AppError('NOT_FOUND', 404, 'Notification not found'));
    }

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id);

    res.json({ data: { read: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
