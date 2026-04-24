import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';
import { logger } from '../lib/logger';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  equipment: z.enum(['barbell','dumbbell','machine','cable','bodyweight','resistance_band','kettlebell','other']).optional(),
  primary_muscles: z.array(z.string()).optional(),
  secondary_muscles: z.array(z.string()).optional(),
  logging_type: z.enum(['weight_reps','bodyweight_reps','duration','distance']).optional(),
});

// GET /exercises
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { search, equipment, muscle } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    let q1 = supabase.from('exercises')
      .select('id,name,description,equipment,primary_muscles,secondary_muscles,logging_type,image_url,is_custom,is_gym_template,gym_id,created_by,wger_id,created_at')
      .is('gym_id', null);
    if (search) q1 = q1.ilike('name', `%${search}%`);
    if (equipment) q1 = q1.eq('equipment', equipment as string);
    if (muscle) q1 = q1.contains('primary_muscles', [muscle as string]);

    let q2 = supabase.from('exercises')
      .select('id,name,description,equipment,primary_muscles,secondary_muscles,logging_type,image_url,is_custom,is_gym_template,gym_id,created_by,wger_id,created_at')
      .eq('gym_id', req.user.gym_id!)
      .or(`is_gym_template.eq.true,and(is_custom.eq.true,created_by.eq.${req.user.id})`);
    if (search) q2 = q2.ilike('name', `%${search}%`);
    if (equipment) q2 = q2.eq('equipment', equipment as string);
    if (muscle) q2 = q2.contains('primary_muscles', [muscle as string]);

    const [r1, r2] = await Promise.all([q1, q2]);
    if (r1.error) throw r1.error;
    if (r2.error) throw r2.error;

    const globalEx = (r1.data || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
    const gymEx   = (r2.data || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
    const all     = [...globalEx, ...gymEx];
    const paginated = all.slice(offset, offset + limit);

    res.json({ data: { exercises: paginated, total: all.length } });
  } catch (err) { next(err); }
});

// GET /exercises/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { data: ex, error } = await supabase.from('exercises').select('*').eq('id', req.params.id).single();
    if (error || !ex) return next(new AppError('NOT_FOUND', 404, 'Exercise not found'));

    if (ex.gym_id !== null) {
      if (ex.gym_id !== req.user.gym_id) return next(new AppError('FORBIDDEN', 403, 'Access denied'));
      if (!ex.is_gym_template && ex.created_by !== req.user.id) return next(new AppError('FORBIDDEN', 403, 'Access denied'));
    }

    const { data: prs } = await supabase.from('personal_records')
      .select('record_type,value,achieved_at,created_at')
      .eq('user_id', req.user.id).eq('exercise_id', req.params.id)
      .order('achieved_at', { ascending: false }).limit(10);

    res.json({ data: { exercise: ex, personal_records: prs || [] } });
  } catch (err) { next(err); }
});

// POST /exercises
router.post('/', requireActiveUser, upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { name, equipment, logging_type, description } = req.body;
    if (!name || !name.trim()) return next(new AppError('VALIDATION_ERROR', 422, 'Name is required', [{ field: 'name', message: 'Name is required' }]));

    let primary_muscles: string[] = [];
    let secondary_muscles: string[] = [];
    try { primary_muscles = req.body.primary_muscles ? JSON.parse(req.body.primary_muscles) : []; } catch { return next(new AppError('VALIDATION_ERROR', 422, 'primary_muscles must be a JSON array')); }
    try { secondary_muscles = req.body.secondary_muscles ? JSON.parse(req.body.secondary_muscles) : []; } catch { return next(new AppError('VALIDATION_ERROR', 422, 'secondary_muscles must be a JSON array')); }

    const is_gym_template = req.body.is_gym_template === 'true';
    if (is_gym_template && req.user.role !== 'gym_owner' && req.user.role !== 'super_admin') {
      return next(new AppError('FORBIDDEN', 403, 'Only gym owners can create gym template exercises'));
    }

    let image_url: string | null = null;
    if (req.file) {
      const storagePath = `${req.user.gym_id}/custom/${uuidv4()}.jpg`;
      const { error: upErr } = await supabase.storage.from('exercise-assets').upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
      if (upErr) logger.warn({ upErr }, 'Exercise image upload failed');
      else image_url = supabase.storage.from('exercise-assets').getPublicUrl(storagePath).data.publicUrl;
    }

    const { data: exercise, error } = await supabase.from('exercises').insert({
      gym_id: req.user.gym_id, is_custom: true, is_gym_template, created_by: req.user.id,
      name: name.trim(), description: description || null, equipment: equipment || null,
      primary_muscles, secondary_muscles, logging_type: logging_type || 'weight_reps', image_url,
    }).select().single();

    if (error) {
      if (error.code === '23505') return next(new AppError('CONFLICT', 409, 'An exercise with this name already exists in your gym'));
      throw error;
    }
    res.status(201).json({ data: exercise });
  } catch (err) { next(err); }
});

// PATCH /exercises/:id
router.patch('/:id', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }))));
    }
    const { data: ex, error } = await supabase.from('exercises').select('id,gym_id,created_by').eq('id', req.params.id).single();
    if (error || !ex) return next(new AppError('NOT_FOUND', 404, 'Exercise not found'));
    if (!ex.gym_id) return next(new AppError('FORBIDDEN', 403, 'Cannot edit global exercises'));
    if (ex.gym_id !== req.user.gym_id) return next(new AppError('FORBIDDEN', 403, 'Access denied'));
    if (ex.created_by !== req.user.id && req.user.role !== 'gym_owner' && req.user.role !== 'super_admin') {
      return next(new AppError('FORBIDDEN', 403, 'Permission denied'));
    }
    const { data: updated, error: upErr } = await supabase.from('exercises').update(parsed.data).eq('id', req.params.id).select().single();
    if (upErr) throw upErr;
    res.json({ data: updated });
  } catch (err) { next(err); }
});

// DELETE /exercises/:id
router.delete('/:id', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { data: ex, error } = await supabase.from('exercises').select('id,gym_id,created_by').eq('id', req.params.id).single();
    if (error || !ex) return next(new AppError('NOT_FOUND', 404, 'Exercise not found'));
    if (!ex.gym_id) return next(new AppError('FORBIDDEN', 403, 'Cannot delete global exercises'));
    if (ex.gym_id !== req.user.gym_id) return next(new AppError('FORBIDDEN', 403, 'Access denied'));
    if (ex.created_by !== req.user.id && req.user.role !== 'gym_owner' && req.user.role !== 'super_admin') {
      return next(new AppError('FORBIDDEN', 403, 'Permission denied'));
    }
    const { error: delErr } = await supabase.from('exercises').delete().eq('id', req.params.id);
    if (delErr) throw delErr;
    res.json({ data: { message: 'Exercise deleted' } });
  } catch (err) { next(err); }
});

export default router;
