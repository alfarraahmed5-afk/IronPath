import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';
import { logger } from '../lib/logger';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// POST /workouts/media/pending  (registered BEFORE /workouts/:id in index.ts)
router.post('/media/pending', requireActiveUser, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    if (!req.file) return next(new AppError('VALIDATION_ERROR', 422, 'No file uploaded'));
    const { media_type, client_upload_uuid } = req.body;
    if (!media_type || !['photo','video'].includes(media_type)) return next(new AppError('VALIDATION_ERROR', 422, 'media_type must be photo or video'));
    if (!client_upload_uuid || !/^[0-9a-f-]{36}$/i.test(client_upload_uuid)) return next(new AppError('VALIDATION_ERROR', 422, 'client_upload_uuid must be a valid UUID'));

    const ext = req.file.originalname?.split('.').pop()?.toLowerCase() || (media_type === 'video' ? 'mp4' : 'jpg');
    const filename = `${media_type}_${Date.now()}.${ext}`;
    const storagePath = `${req.user.gym_id}/${req.user.id}/pending/${client_upload_uuid}/${filename}`;

    const { error: upErr } = await supabase.storage.from('workout-media').upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (upErr) throw upErr;
    const url = supabase.storage.from('workout-media').getPublicUrl(storagePath).data.publicUrl;
    res.json({ data: { storage_path: storagePath, url } });
  } catch (err) { next(err); }
});

// POST /workouts/:id/media
router.post('/:id/media', requireActiveUser, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    if (!req.file) return next(new AppError('VALIDATION_ERROR', 422, 'No file uploaded'));
    const { media_type } = req.body;
    if (!media_type || !['photo','video'].includes(media_type)) return next(new AppError('VALIDATION_ERROR', 422, 'media_type must be photo or video'));

    const { data: workout } = await supabase.from('workouts').select('id,user_id').eq('id', req.params.id).single();
    if (!workout || workout.user_id !== req.user.id) return next(new AppError('NOT_FOUND', 404, 'Workout not found'));

    const { data: existing } = await supabase.from('workout_media').select('media_type').eq('workout_id', req.params.id);
    const photos = (existing || []).filter((m: any) => m.media_type === 'photo').length;
    const videos = (existing || []).filter((m: any) => m.media_type === 'video').length;
    if (media_type === 'photo' && photos >= 2) return next(new AppError('VALIDATION_ERROR', 422, 'Maximum 2 photos per workout'));
    if (media_type === 'video' && videos >= 1) return next(new AppError('VALIDATION_ERROR', 422, 'Maximum 1 video per workout'));

    const ext = req.file.originalname?.split('.').pop()?.toLowerCase() || (media_type === 'video' ? 'mp4' : 'jpg');
    const filename = `${media_type}_${Date.now()}.${ext}`;
    const storagePath = `${req.user.gym_id}/${req.user.id}/${req.params.id}/${filename}`;

    const { error: upErr } = await supabase.storage.from('workout-media').upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (upErr) throw upErr;
    const url = supabase.storage.from('workout-media').getPublicUrl(storagePath).data.publicUrl;

    const { data: mediaRow, error: insErr } = await supabase.from('workout_media').insert({ workout_id: req.params.id, user_id: req.user.id, media_type, storage_path: storagePath, url }).select().single();
    if (insErr) throw insErr;
    res.status(201).json({ data: mediaRow });
  } catch (err) { next(err); }
});

// DELETE /workouts/:id/media/:mediaId
router.delete('/:id/media/:mediaId', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { data: workout } = await supabase.from('workouts').select('id,user_id').eq('id', req.params.id).single();
    if (!workout || workout.user_id !== req.user.id) return next(new AppError('NOT_FOUND', 404, 'Workout not found'));

    const { data: media } = await supabase.from('workout_media').select('*').eq('id', req.params.mediaId).eq('workout_id', req.params.id).single();
    if (!media) return next(new AppError('NOT_FOUND', 404, 'Media not found'));

    const { error: storErr } = await supabase.storage.from('workout-media').remove([media.storage_path]);
    if (storErr) logger.warn({ storErr, path: media.storage_path }, 'Storage delete failed, continuing with DB delete');

    await supabase.from('workout_media').delete().eq('id', req.params.mediaId);
    res.json({ data: { message: 'Media deleted' } });
  } catch (err) { next(err); }
});

export default router;
