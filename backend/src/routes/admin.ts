import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';

const router = Router();

// ─── Auth / role guards ───────────────────────────────────────────────────────

router.use(requireActiveUser);
router.use((req: Request, res: Response, next: NextFunction) => {
  if (req.user!.role !== 'gym_owner' && req.user!.role !== 'super_admin') {
    return next(new AppError('FORBIDDEN', 403, 'Admin access required'));
  }
  next();
});

// ─── Validation schemas ───────────────────────────────────────────────────────

const suspendSchema = z.object({ suspended: z.boolean() });

const inviteCreateSchema = z.object({
  max_uses: z.number().int().positive().optional(),
  expires_at: z.string().optional(),
});

const announcementCreateSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  is_pinned: z.boolean().optional(),
});

const announcementUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  is_pinned: z.boolean().optional(),
});

const challengeCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  metric: z.string().min(1),
  exercise_id: z.string().optional(),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
});

const challengeUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// ─── GET /admin/stats ─────────────────────────────────────────────────────────

router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      activeMembersResult,
      newMembersResult,
      workoutsThisMonthResult,
      workoutsLast30Result,
    ] = await Promise.all([
      // Count of active members
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .eq('role', 'member'),

      // New members this month
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('role', 'member')
        .gte('created_at', firstOfMonth),

      // Workouts this month (with total_volume_kg for summing)
      supabase
        .from('workouts')
        .select('total_volume_kg')
        .eq('gym_id', gymId)
        .eq('is_completed', true)
        .gte('started_at', firstOfMonth),

      // Workouts last 30 days (for grouping by day)
      supabase
        .from('workouts')
        .select('started_at')
        .eq('gym_id', gymId)
        .eq('is_completed', true)
        .gte('started_at', thirtyDaysAgo),
    ]);

    if (activeMembersResult.error) throw new AppError('FETCH_FAILED', 500, 'Failed to fetch active members');
    if (newMembersResult.error) throw new AppError('FETCH_FAILED', 500, 'Failed to fetch new members');
    if (workoutsThisMonthResult.error) throw new AppError('FETCH_FAILED', 500, 'Failed to fetch workouts this month');
    if (workoutsLast30Result.error) throw new AppError('FETCH_FAILED', 500, 'Failed to fetch recent workouts');

    const workoutsThisMonthData = workoutsThisMonthResult.data ?? [];
    const workoutsThisMonth = workoutsThisMonthData.length;
    const volumeThisMonth = workoutsThisMonthData.reduce((s, w) => s + (w.total_volume_kg ?? 0), 0);

    // Group last-30-days workouts by day
    const dayMap = new Map<string, number>();
    for (const w of workoutsLast30Result.data ?? []) {
      const day = w.started_at.slice(0, 10);
      dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
    }
    const workoutsByDay = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return res.json({
      data: {
        active_members: activeMembersResult.count ?? 0,
        new_members_this_month: newMembersResult.count ?? 0,
        workouts_this_month: workoutsThisMonth,
        volume_this_month: volumeThisMonth,
        workouts_by_day: workoutsByDay,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /admin/members ───────────────────────────────────────────────────────

router.get('/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;
    const search = (req.query.search as string | undefined)?.trim();
    const status = req.query.status as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const pageSize = 20;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('users')
      .select('id, username, full_name, email, avatar_url, created_at, last_active_at, is_active, deleted_at', { count: 'exact' })
      .eq('gym_id', gymId)
      .eq('role', 'member')
      .range(offset, offset + pageSize - 1);

    if (search) {
      query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);
    }
    if (status === 'active') {
      query = query.eq('is_active', true).is('deleted_at', null);
    } else if (status === 'suspended') {
      query = query.eq('is_active', false).is('deleted_at', null);
    }

    // Parallel: fetch members + workout counts
    const [membersResult, workoutCountsResult] = await Promise.all([
      query,
      supabase
        .from('workouts')
        .select('user_id')
        .eq('gym_id', gymId)
        .eq('is_completed', true),
    ]);

    if (membersResult.error) throw new AppError('FETCH_FAILED', 500, 'Failed to fetch members');
    if (workoutCountsResult.error) throw new AppError('FETCH_FAILED', 500, 'Failed to fetch workout counts');

    // Group workout counts by user_id in JS
    const workoutCountMap = new Map<string, number>();
    for (const w of workoutCountsResult.data ?? []) {
      workoutCountMap.set(w.user_id, (workoutCountMap.get(w.user_id) ?? 0) + 1);
    }

    const members = (membersResult.data ?? []).map((m) => ({
      ...m,
      // Derive a status string for the frontend from the boolean flags
      status: m.deleted_at ? 'deleted' : m.is_active ? 'active' : 'suspended',
      workout_count: workoutCountMap.get(m.id) ?? 0,
    }));

    return res.json({
      data: {
        members,
        total: membersResult.count ?? 0,
        page,
        page_size: pageSize,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /admin/members/:id/suspend ────────────────────────────────────────

router.patch('/members/:id/suspend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;
    const memberId = req.params.id;

    const parsed = suspendSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400, 'Invalid request body');

    const { suspended } = parsed.data;

    // If reinstating, check for permanent deletion first
    if (!suspended) {
      const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('deleted_at')
        .eq('id', memberId)
        .eq('gym_id', gymId)
        .single();

      if (checkError) throw new AppError('NOT_FOUND', 404, 'Member not found');
      if (existing.deleted_at) {
        throw new AppError('MEMBER_DELETED', 422, 'Member has been permanently removed');
      }
    }

    const { error } = await supabase
      .from('users')
      .update({ is_active: !suspended })
      .eq('id', memberId)
      .eq('gym_id', gymId);

    if (error) throw new AppError('UPDATE_FAILED', 500, 'Failed to update member status');

    return res.json({ data: { updated: true, status: suspended ? 'suspended' : 'active' } });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /admin/members/:id ────────────────────────────────────────────────

router.delete('/members/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;
    const memberId = req.params.id;

    const { error } = await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', memberId)
      .eq('gym_id', gymId);

    if (error) throw new AppError('DELETE_FAILED', 500, 'Failed to delete member');

    return res.json({ data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /admin/invites ───────────────────────────────────────────────────────

router.get('/invites', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;

    const { data, error } = await supabase
      .from('gym_invite_codes')
      .select('id, code, created_at, expires_at, uses, max_uses')
      .eq('gym_id', gymId)
      .eq('is_active', true);

    if (error) throw new AppError('FETCH_FAILED', 500, 'Failed to fetch invites');

    return res.json({ data: { invites: data ?? [] } });
  } catch (err) {
    next(err);
  }
});

// ─── POST /admin/invites ──────────────────────────────────────────────────────

router.post('/invites', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;

    const parsed = inviteCreateSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400, 'Invalid request body');

    const body = parsed.data;
    const code = generateInviteCode();

    const { data, error } = await supabase
      .from('gym_invite_codes')
      .insert({
        gym_id: gymId,
        code,
        max_uses: body.max_uses ?? null,
        expires_at: body.expires_at ?? null,
        is_active: true,
        uses: 0,
      })
      .select()
      .single();

    if (error) throw new AppError('INSERT_FAILED', 500, 'Failed to create invite');

    return res.json({ data: { invite: data } });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /admin/invites/:id ────────────────────────────────────────────────

router.delete('/invites/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;
    const inviteId = req.params.id;

    const { error } = await supabase
      .from('gym_invite_codes')
      .update({ is_active: false })
      .eq('id', inviteId)
      .eq('gym_id', gymId);

    if (error) throw new AppError('UPDATE_FAILED', 500, 'Failed to revoke invite');

    return res.json({ data: { revoked: true } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /admin/announcements ─────────────────────────────────────────────────

router.get('/announcements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;

    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false });

      if (error) return res.json({ data: { announcements: [] } });

      return res.json({ data: { announcements: data ?? [] } });
    } catch {
      return res.json({ data: { announcements: [] } });
    }
  } catch (err) {
    next(err);
  }
});

// ─── POST /admin/announcements ────────────────────────────────────────────────

router.post('/announcements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;
    const authorId = req.user!.id;

    const parsed = announcementCreateSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400, 'Invalid request body');

    const body = parsed.data;

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        gym_id: gymId,
        author_id: authorId,
        title: body.title,
        body: body.body,
        is_pinned: body.is_pinned ?? false,
      })
      .select()
      .single();

    if (error) throw new AppError('INSERT_FAILED', 500, 'Failed to create announcement');

    return res.json({ data: { announcement: data } });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /admin/announcements/:id ──────────────────────────────────────────

router.patch('/announcements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;
    const announcementId = req.params.id;

    const parsed = announcementUpdateSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400, 'Invalid request body');

    const body = parsed.data;

    const { error } = await supabase
      .from('announcements')
      .update(body)
      .eq('id', announcementId)
      .eq('gym_id', gymId);

    if (error) throw new AppError('UPDATE_FAILED', 500, 'Failed to update announcement');

    return res.json({ data: { updated: true } });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /admin/announcements/:id ─────────────────────────────────────────

router.delete('/announcements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;
    const announcementId = req.params.id;

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementId)
      .eq('gym_id', gymId);

    if (error) throw new AppError('DELETE_FAILED', 500, 'Failed to delete announcement');

    return res.json({ data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /admin/challenges ────────────────────────────────────────────────────

router.get('/challenges', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;

    const { data, error } = await supabase
      .from('leaderboard_challenges')
      .select('*')
      .eq('gym_id', gymId)
      .order('starts_at', { ascending: false });

    if (error) throw new AppError('FETCH_FAILED', 500, 'Failed to fetch challenges');

    return res.json({ data: { challenges: data ?? [] } });
  } catch (err) {
    next(err);
  }
});

// ─── POST /admin/challenges ───────────────────────────────────────────────────

router.post('/challenges', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;

    const parsed = challengeCreateSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400, 'Invalid request body');

    const body = parsed.data;

    const { data, error } = await supabase
      .from('leaderboard_challenges')
      .insert({
        gym_id: gymId,
        title: body.title,
        description: body.description ?? null,
        metric: body.metric,
        exercise_id: body.exercise_id ?? null,
        starts_at: body.starts_at,
        ends_at: body.ends_at,
        status: 'upcoming',
      })
      .select()
      .single();

    if (error) throw new AppError('INSERT_FAILED', 500, 'Failed to create challenge');

    return res.json({ data: { challenge: data } });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /admin/challenges/:id ──────────────────────────────────────────────

router.patch('/challenges/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;
    const challengeId = req.params.id;

    // Fetch and validate ownership + status
    const { data: challenge, error: fetchError } = await supabase
      .from('leaderboard_challenges')
      .select('id, gym_id, status')
      .eq('id', challengeId)
      .maybeSingle();

    if (fetchError || !challenge) throw new AppError('NOT_FOUND', 404, 'Challenge not found');
    if (challenge.gym_id !== gymId) throw new AppError('NOT_FOUND', 404, 'Challenge not found');
    if (challenge.status !== 'upcoming') {
      throw new AppError('INVALID_STATUS', 422, 'Can only edit upcoming challenges');
    }

    const parsed = challengeUpdateSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400, 'Invalid request body');

    const body = parsed.data;

    const { error } = await supabase
      .from('leaderboard_challenges')
      .update(body)
      .eq('id', challengeId)
      .eq('gym_id', gymId);

    if (error) throw new AppError('UPDATE_FAILED', 500, 'Failed to update challenge');

    return res.json({ data: { updated: true } });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /admin/challenges/:id ─────────────────────────────────────────────

router.delete('/challenges/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gym_id!;
    const challengeId = req.params.id;

    // Fetch and validate ownership + status
    const { data: challenge, error: fetchError } = await supabase
      .from('leaderboard_challenges')
      .select('id, gym_id, status')
      .eq('id', challengeId)
      .maybeSingle();

    if (fetchError || !challenge) throw new AppError('NOT_FOUND', 404, 'Challenge not found');
    if (challenge.gym_id !== gymId) throw new AppError('NOT_FOUND', 404, 'Challenge not found');
    if (challenge.status !== 'upcoming') {
      throw new AppError('INVALID_STATUS', 422, 'Can only edit upcoming challenges');
    }

    const { error } = await supabase
      .from('leaderboard_challenges')
      .delete()
      .eq('id', challengeId)
      .eq('gym_id', gymId);

    if (error) throw new AppError('DELETE_FAILED', 500, 'Failed to delete challenge');

    return res.json({ data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
