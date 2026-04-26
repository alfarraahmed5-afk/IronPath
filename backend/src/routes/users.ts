import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';

const router = Router();

// GET /users/me
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { data: user, error } = await supabase.from('users')
      .select('id, username, full_name, avatar_url, bio, role, sex, date_of_birth, bodyweight_kg, is_profile_private, gym_id, created_at')
      .eq('id', req.user.id).single();
    if (error || !user) return next(new AppError('NOT_FOUND', 404, 'User not found'));
    res.json({ data: user });
  } catch (err) { next(err); }
});

// PATCH /users/me
router.patch('/me', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const updateSchema = z.object({
      username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, and underscores only').optional(),
      full_name: z.string().max(255).optional(),
      bio: z.string().max(500).optional(),
      avatar_url: z.string().url().nullable().optional(),
      sex: z.enum(['male', 'female']).optional(),
      date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      bodyweight_kg: z.number().positive().max(699).optional(),
      is_profile_private: z.boolean().optional(),
    });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }

    // Username uniqueness check (case-insensitive within the gym)
    if (parsed.data.username) {
      const { data: existing } = await supabase.from('users')
        .select('id').ilike('username', parsed.data.username)
        .eq('gym_id', req.user.gym_id)
        .neq('id', req.user.id)
        .maybeSingle();
      if (existing) {
        return next(new AppError('USERNAME_TAKEN', 409, 'That username is already taken.'));
      }
    }

    const { data: user, error } = await supabase.from('users').update(parsed.data).eq('id', req.user.id)
      .select('id, username, full_name, avatar_url, bio, role, sex, date_of_birth, bodyweight_kg, is_profile_private, gym_id').single();
    if (error) throw error;
    res.json({ data: user });
  } catch (err) { next(err); }
});

// POST /users/me/avatar — upload base64-encoded image to Supabase Storage
router.post('/me/avatar', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const schema = z.object({
      image_base64: z.string().min(10),
      mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('VALIDATION_ERROR', 422, 'Validation failed'));

    const ext = parsed.data.mime_type === 'image/png' ? 'png' : parsed.data.mime_type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${req.user.id}/avatar_${Date.now()}.${ext}`;
    const buffer = Buffer.from(parsed.data.image_base64, 'base64');

    const { error: upErr } = await supabase.storage.from('avatars')
      .upload(path, buffer, { contentType: parsed.data.mime_type, upsert: true });
    if (upErr) throw upErr;

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatar_url = urlData.publicUrl;

    const { data: user, error } = await supabase.from('users').update({ avatar_url }).eq('id', req.user.id)
      .select('id, username, full_name, avatar_url, bio, role, gym_id').single();
    if (error) throw error;
    res.json({ data: { user, avatar_url } });
  } catch (err) { next(err); }
});

// GET /users/me/settings
router.get('/me/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', req.user.id).single();
    if (error || !data) return next(new AppError('NOT_FOUND', 404, 'Settings not found'));
    res.json({ data });
  } catch (err) { next(err); }
});

// PATCH /users/me/settings
router.patch('/me/settings', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const settingsSchema = z.object({
      weight_unit: z.enum(['kg', 'lbs']).optional(),
      default_rest_seconds: z.number().int().positive().optional(),
      previous_values_mode: z.enum(['overall', 'within_routine']).optional(),
      warm_up_sets_in_stats: z.boolean().optional(),
      keep_awake_during_workout: z.boolean().optional(),
      rpe_tracking_enabled: z.boolean().optional(),
      smart_superset_scrolling: z.boolean().optional(),
      inline_timer_enabled: z.boolean().optional(),
      live_pr_notification_enabled: z.boolean().optional(),
      timer_sound_volume: z.number().int().min(0).max(100).optional(),
      pr_sound_volume: z.number().int().min(0).max(100).optional(),
      warmup_calculator_steps: z.array(z.object({ percentage: z.number(), reps: z.number().int() })).optional(),
      plate_calculator_bar_kg: z.number().positive().optional(),
      notif_likes: z.boolean().optional(),
      notif_comments: z.boolean().optional(),
      notif_follows: z.boolean().optional(),
      notif_prs: z.boolean().optional(),
      notif_announcements: z.boolean().optional(),
      notif_leaderboard: z.boolean().optional(),
      notif_streak_milestones: z.boolean().optional(),
      notif_weekly_nudge: z.boolean().optional(),
      timezone: z.string().max(100).optional(),
    });
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { data, error } = await supabase.from('user_settings').update(parsed.data).eq('user_id', req.user.id).select('*').single();
    if (error) throw error;
    if (parsed.data.warm_up_sets_in_stats !== undefined) {
      setImmediate(async () => {
        // placeholder for future warmup recalculation logic
      });
    }
    res.json({ data });
  } catch (err) { next(err); }
});

// GET /users/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    const { data: user, error } = await supabase.from('users')
      .select('id, username, full_name, avatar_url, bio, role, is_profile_private, gym_id, created_at')
      .eq('id', req.params.id).eq('gym_id', req.user.gym_id!).single();
    if (error || !user) return next(new AppError('NOT_FOUND', 404, 'User not found'));
    if (user.is_profile_private && user.id !== req.user.id) {
      const { data: follow } = await supabase.from('follows')
        .select('id').eq('follower_id', req.user.id).eq('following_id', user.id).eq('status', 'active').maybeSingle();
      if (!follow) return res.json({ data: { id: user.id, username: user.username, is_profile_private: true } });
    }
    res.json({ data: user });
  } catch (err) { next(err); }
});

// GET /users/:id/workouts
router.get('/:id/workouts', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = req.params.id;
    const viewerId = req.user!.id;
    const gymId = req.user!.gym_id;

    const { data: target } = await supabase.from('users').select('id, is_profile_private, gym_id').eq('id', targetId).eq('gym_id', gymId).maybeSingle();
    if (!target) return next(new AppError('NOT_FOUND', 404, 'User not found'));

    if (target.is_profile_private && targetId !== viewerId) {
      const { data: follow } = await supabase.from('follows').select('id').eq('follower_id', viewerId).eq('following_id', targetId).eq('status', 'active').maybeSingle();
      if (!follow) return next(new AppError('FORBIDDEN', 403, 'This profile is private'));
    }

    let visibilityFilter: string[] = ['public'];
    if (targetId === viewerId) {
      visibilityFilter = ['public', 'followers', 'private'];
    } else {
      const { data: follow } = await supabase.from('follows').select('id').eq('follower_id', viewerId).eq('following_id', targetId).eq('status', 'active').maybeSingle();
      if (follow) visibilityFilter = ['public', 'followers'];
    }

    const cursor = req.query.cursor as string | undefined;
    let q = supabase.from('workouts')
      .select('id, name, started_at, duration_seconds, total_volume_kg, total_sets, visibility')
      .eq('user_id', targetId).eq('is_completed', true).in('visibility', visibilityFilter)
      .order('started_at', { ascending: false }).limit(20);
    if (cursor) q = q.lt('started_at', cursor);
    const { data: workouts } = await q;
    const next_cursor = (workouts ?? []).length === 20 ? workouts![19].started_at : null;
    res.json({ data: { workouts: workouts ?? [], next_cursor } });
  } catch (err) { next(err); }
});

// GET /users/:id/stats
router.get('/:id/stats', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = req.params.id;
    const viewerId = req.user!.id;
    const gymId = req.user!.gym_id;

    const { data: target } = await supabase.from('users').select('id, is_profile_private, gym_id').eq('id', targetId).eq('gym_id', gymId).maybeSingle();
    if (!target) return next(new AppError('NOT_FOUND', 404, 'User not found'));

    if (target.is_profile_private && targetId !== viewerId) {
      const { data: follow } = await supabase.from('follows').select('id').eq('follower_id', viewerId).eq('following_id', targetId).eq('status', 'active').maybeSingle();
      if (!follow) return next(new AppError('FORBIDDEN', 403, 'This profile is private'));
    }

    const [workoutsRes, streakRes, prsRes, recentRes, targetUserRes] = await Promise.all([
      supabase.from('workouts').select('total_volume_kg').eq('user_id', targetId).eq('is_completed', true),
      supabase.from('streaks').select('current_streak_weeks').eq('user_id', targetId).maybeSingle(),
      supabase.from('personal_records').select('exercise_id, record_type, value, exercises!inner(name, wger_id)').eq('user_id', targetId).eq('record_type', 'projected_1rm'),
      supabase.from('workouts').select('id, name, started_at, total_volume_kg').eq('user_id', targetId).eq('is_completed', true).order('started_at', { ascending: false }).limit(5),
      supabase.from('users').select('bodyweight_kg, sex').eq('id', targetId).maybeSingle(),
    ]);

    const total_workouts = (workoutsRes.data ?? []).length;
    const total_volume_kg = (workoutsRes.data ?? []).reduce((s, w) => s + (w.total_volume_kg ?? 0), 0);
    const current_streak_weeks = streakRes.data?.current_streak_weeks ?? 0;

    // Strength level classification
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const strengthStandards = require('../../data/strength-standards.js');
    const wgerIds = Object.keys(strengthStandards.exercises).map(Number);
    const { data: stdExercises } = await supabase.from('exercises').select('id, wger_id, name').in('wger_id', wgerIds).is('gym_id', null);
    const wgerToId = new Map((stdExercises ?? []).map((e: { wger_id: number; id: string; name: string }) => [e.wger_id, e.id]));
    const prMap = new Map((prsRes.data ?? []).map(pr => [pr.exercise_id, pr.value]));
    const bodyweight = targetUserRes.data?.bodyweight_kg;
    const sex = (targetUserRes.data?.sex as 'male' | 'female') ?? 'male';
    const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Elite'];
    const strength_levels = Object.entries(strengthStandards.exercises).map(([wgerId, std]: [string, any]) => {
      const exId = wgerToId.get(Number(wgerId));
      const projected_1rm_kg = exId ? (prMap.get(exId as string) ?? null) : null;
      let level: string | null = null;
      if (projected_1rm_kg !== null && bodyweight) {
        const ratios: number[] = std[sex] ?? std.male;
        const ratio = projected_1rm_kg / bodyweight;
        const idx = ratios.findIndex(r => ratio < r);
        level = idx === -1 ? 'Elite' : LEVELS[idx];
      }
      return { exercise_name: std.name, projected_1rm_kg, level };
    });

    res.json({ data: { total_workouts, total_volume_kg, current_streak_weeks, strength_levels, recent_workouts: recentRes.data ?? [] } });
  } catch (err) { next(err); }
});

// GET /users/:id/compare
router.get('/:id/compare', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = req.params.id;
    const viewerId = req.user!.id;
    const gymId = req.user!.gym_id;

    // Verify target exists in same gym
    const { data: target } = await supabase.from('users').select('id, is_profile_private, gym_id, username, full_name, avatar_url').eq('id', targetId).eq('gym_id', gymId).maybeSingle();
    if (!target) return next(new AppError('NOT_FOUND', 404, 'User not found'));

    // Privacy check
    if (target.is_profile_private && targetId !== viewerId) {
      const { data: follow } = await supabase.from('follows').select('id').eq('follower_id', viewerId).eq('following_id', targetId).eq('status', 'active').maybeSingle();
      if (!follow) return next(new AppError('FORBIDDEN', 403, 'This profile is private'));
    }

    // Fetch viewer user info
    const { data: viewer } = await supabase.from('users').select('id, username, full_name, avatar_url, bodyweight_kg, sex').eq('id', viewerId).maybeSingle();

    // Fetch workouts for both users in parallel
    const [viewerWorkoutsRes, targetWorkoutsRes] = await Promise.all([
      supabase.from('workouts').select('id, total_volume_kg, duration_seconds').eq('user_id', viewerId).eq('is_completed', true),
      supabase.from('workouts').select('id, total_volume_kg, duration_seconds').eq('user_id', targetId).eq('is_completed', true),
    ]);

    const viewerWorkouts = viewerWorkoutsRes.data ?? [];
    const targetWorkouts = targetWorkoutsRes.data ?? [];

    const summarize = (rows: { total_volume_kg: number | null; duration_seconds: number | null }[]) => ({
      total_workouts: rows.length,
      total_volume_kg: rows.reduce((s, w) => s + (w.total_volume_kg ?? 0), 0),
      total_duration_seconds: rows.reduce((s, w) => s + (w.duration_seconds ?? 0), 0),
    });

    const viewerSummary = summarize(viewerWorkouts);
    const targetSummary = summarize(targetWorkouts);

    const viewerWorkoutIds = viewerWorkouts.map(w => w.id);
    const targetWorkoutIds = targetWorkouts.map(w => w.id);

    // Muscle distribution: get workout_exercises with primary_muscles
    const [viewerExercisesRes, targetExercisesRes] = await Promise.all([
      viewerWorkoutIds.length > 0
        ? supabase.from('workout_exercises').select('primary_muscles, sets_count').in('workout_id', viewerWorkoutIds)
        : Promise.resolve({ data: [] }),
      targetWorkoutIds.length > 0
        ? supabase.from('workout_exercises').select('primary_muscles, sets_count').in('workout_id', targetWorkoutIds)
        : Promise.resolve({ data: [] }),
    ]);

    const buildMuscleDistribution = (rows: { primary_muscles: string[] | null; sets_count: number | null }[]) => {
      const dist: Record<string, number> = {};
      for (const row of rows) {
        for (const muscle of row.primary_muscles ?? []) {
          dist[muscle] = (dist[muscle] ?? 0) + (row.sets_count ?? 1);
        }
      }
      return dist;
    };

    const viewerMuscles = buildMuscleDistribution(viewerExercisesRes.data ?? []);
    const targetMuscles = buildMuscleDistribution(targetExercisesRes.data ?? []);

    // Shared exercises and head-to-head PRs
    const [viewerPRsRes, targetPRsRes] = await Promise.all([
      supabase.from('personal_records').select('exercise_id, value, exercises!inner(name)').eq('user_id', viewerId).eq('record_type', 'projected_1rm'),
      supabase.from('personal_records').select('exercise_id, value, exercises!inner(name)').eq('user_id', targetId).eq('record_type', 'projected_1rm'),
    ]);

    const viewerPRMap = new Map((viewerPRsRes.data ?? []).map(pr => [pr.exercise_id, { value: pr.value, name: (pr.exercises as any)?.name ?? '' }]));
    const targetPRMap = new Map((targetPRsRes.data ?? []).map(pr => [pr.exercise_id, { value: pr.value, name: (pr.exercises as any)?.name ?? '' }]));

    const sharedExerciseIds = [...viewerPRMap.keys()].filter(id => targetPRMap.has(id));
    const head_to_head = sharedExerciseIds.map(exId => ({
      exercise_name: viewerPRMap.get(exId)!.name,
      viewer_projected_1rm_kg: viewerPRMap.get(exId)!.value,
      target_projected_1rm_kg: targetPRMap.get(exId)!.value,
    }));

    res.json({
      data: {
        viewer: { id: viewer?.id, username: viewer?.username, full_name: viewer?.full_name, avatar_url: viewer?.avatar_url, ...viewerSummary, muscle_distribution: viewerMuscles },
        target: { id: target.id, username: target.username, full_name: target.full_name, avatar_url: target.avatar_url, ...targetSummary, muscle_distribution: targetMuscles },
        head_to_head,
      },
    });
  } catch (err) { next(err); }
});

// POST /users/:id/follow
router.post('/:id/follow', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user!.id) return next(new AppError('BAD_REQUEST', 400, 'Cannot follow yourself'));
    const { data: target } = await supabase.from('users').select('id, is_profile_private, gym_id').eq('id', targetId).eq('gym_id', req.user!.gym_id).maybeSingle();
    if (!target) return next(new AppError('NOT_FOUND', 404, 'User not found'));

    const { data: existing } = await supabase.from('follows').select('id, status').eq('follower_id', req.user!.id).eq('following_id', targetId).maybeSingle();
    if (existing) return res.json({ data: { status: existing.status } });

    const status = target.is_profile_private ? 'pending' : 'active';
    await supabase.from('follows').insert({ follower_id: req.user!.id, following_id: targetId, gym_id: req.user!.gym_id, status });

    const { data: actor } = await supabase.from('users').select('username').eq('id', req.user!.id).maybeSingle();
    const notifType = status === 'pending' ? 'follow_request' : 'follow';
    const title = status === 'pending'
      ? `${actor?.username ?? 'Someone'} wants to follow you`
      : `${actor?.username ?? 'Someone'} started following you`;

    const { data: settings } = await supabase.from('user_settings').select('notif_follows').eq('user_id', targetId).maybeSingle();
    if (settings?.notif_follows !== false) {
      await supabase.from('notifications').insert({ user_id: targetId, gym_id: req.user!.gym_id, type: notifType, title, data: { actor_user_id: req.user!.id } });
    }
    res.json({ data: { status } });
  } catch (err) { next(err); }
});

// DELETE /users/:id/follow
router.delete('/:id/follow', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await supabase.from('follows').delete().eq('follower_id', req.user!.id).eq('following_id', req.params.id);
    res.json({ data: { unfollowed: true } });
  } catch (err) { next(err); }
});

// GET /users/:id/followers
router.get('/:id/followers', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    let q = supabase.from('follows').select('id, created_at, follower_id').eq('following_id', req.params.id).eq('status', 'active').order('created_at', { ascending: false }).limit(20);
    if (cursor) q = q.lt('created_at', cursor);
    const { data: rows } = await q;
    const ids = (rows ?? []).map(r => r.follower_id);
    const { data: users } = await supabase.from('users').select('id, username, full_name, avatar_url').in('id', ids);
    const uMap = new Map((users ?? []).map(u => [u.id, u]));
    const followers = (rows ?? []).map(r => ({ ...uMap.get(r.follower_id), followed_at: r.created_at }));
    res.json({ data: { followers, next_cursor: followers.length === 20 ? rows![19].created_at : null } });
  } catch (err) { next(err); }
});

// GET /users/:id/following
router.get('/:id/following', requireActiveUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    let q = supabase.from('follows').select('id, created_at, following_id').eq('follower_id', req.params.id).eq('status', 'active').order('created_at', { ascending: false }).limit(20);
    if (cursor) q = q.lt('created_at', cursor);
    const { data: rows } = await q;
    const ids = (rows ?? []).map(r => r.following_id);
    const { data: users } = await supabase.from('users').select('id, username, full_name, avatar_url').in('id', ids);
    const uMap = new Map((users ?? []).map(u => [u.id, u]));
    const following = (rows ?? []).map(r => ({ ...uMap.get(r.following_id), followed_at: r.created_at }));
    res.json({ data: { following, next_cursor: following.length === 20 ? rows![19].created_at : null } });
  } catch (err) { next(err); }
});

export default router;

export const followRequestsRouter = Router();
followRequestsRouter.use(requireActiveUser);

// GET /follow-requests
followRequestsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { data } = await supabase.from('follows').select('id, created_at, follower_id').eq('following_id', userId).eq('status', 'pending').order('created_at', { ascending: false });
    const ids = (data ?? []).map(r => r.follower_id);
    const { data: users } = await supabase.from('users').select('id, username, full_name, avatar_url').in('id', ids);
    const uMap = new Map((users ?? []).map(u => [u.id, u]));
    const items = (data ?? []).map(f => ({ id: f.id, follower: { user_id: f.follower_id, ...uMap.get(f.follower_id) }, created_at: f.created_at }));
    res.json({ data: { items, total: items.length } });
  } catch (err) { next(err); }
});

// POST /follow-requests/:id/approve
followRequestsRouter.post('/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { data: follow } = await supabase.from('follows').select('*').eq('id', req.params.id).eq('following_id', userId).eq('status', 'pending').maybeSingle();
    if (!follow) return next(new AppError('NOT_FOUND', 404, 'Follow request not found'));
    await supabase.from('follows').update({ status: 'active' }).eq('id', req.params.id);
    const { data: actor } = await supabase.from('users').select('username').eq('id', userId).maybeSingle();
    await supabase.from('notifications').insert({ user_id: follow.follower_id, gym_id: req.user!.gym_id, type: 'follow_request_approved', title: `${actor?.username ?? 'Someone'} approved your follow request`, data: { actor_user_id: userId } });
    res.json({ data: { approved: true } });
  } catch (err) { next(err); }
});

// POST /follow-requests/:id/reject
followRequestsRouter.post('/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: follow } = await supabase.from('follows').select('id, following_id').eq('id', req.params.id).eq('following_id', req.user!.id).maybeSingle();
    if (!follow) return next(new AppError('NOT_FOUND', 404, 'Follow request not found'));
    await supabase.from('follows').delete().eq('id', req.params.id);
    res.json({ data: { rejected: true } });
  } catch (err) { next(err); }
});

