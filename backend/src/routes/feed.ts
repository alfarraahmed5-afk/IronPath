import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';

const router = Router();
router.use(requireActiveUser);

// GET /feed
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const gymId = req.user!.gym_id;
    const filter = (req.query.filter as string) === 'following' ? 'following' : 'all';
    const cursor = req.query.cursor as string | undefined;
    const LIMIT = 20;

    // Step 1: Get IDs of users this viewer follows
    const { data: followRows } = await supabase.from('follows')
      .select('following_id').eq('follower_id', userId).eq('status', 'active');
    const followingIds = (followRows ?? []).map(f => f.following_id);

    // Step 2: Fetch workouts
    let query = supabase.from('workouts')
      .select('id, user_id, name, description, started_at, duration_seconds, total_volume_kg, total_sets, visibility, routine_id')
      .eq('gym_id', gymId).eq('is_completed', true)
      .order('started_at', { ascending: false })
      .limit(LIMIT + 10); // over-fetch for visibility filtering in JS

    if (cursor) query = query.lt('started_at', cursor);

    if (filter === 'following') {
      if (followingIds.length === 0) {
        return res.json({ data: { workouts: [], next_cursor: null } });
      }
      query = query.in('user_id', followingIds);
    }

    const { data: rawWorkouts, error: wErr } = await query;
    if (wErr) throw wErr;

    // Step 3: Apply visibility filter in JS for 'all' feed
    const workouts = (rawWorkouts ?? []).filter(w =>
      w.visibility === 'public' ||
      w.user_id === userId ||
      (w.visibility === 'followers' && followingIds.includes(w.user_id))
    ).slice(0, LIMIT);

    if (workouts.length === 0) {
      return res.json({ data: { workouts: [], next_cursor: null } });
    }

    const workoutIds = workouts.map(w => w.id);
    const userIds = [...new Set(workouts.map(w => w.user_id))];

    // Steps 4-8: Parallel enrichment
    const [usersRes, likesRes, commentsRes, viewerLikesRes, mediaRes] = await Promise.all([
      supabase.from('users').select('id, username, full_name, avatar_url').in('id', userIds),
      supabase.from('workout_likes').select('workout_id').in('workout_id', workoutIds),
      supabase.from('workout_comments').select('workout_id').in('workout_id', workoutIds).is('deleted_at', null),
      supabase.from('workout_likes').select('workout_id').in('workout_id', workoutIds).eq('user_id', userId),
      supabase.from('workout_media').select('workout_id, url, media_type, position').in('workout_id', workoutIds).order('position'),
    ]);

    const userMap = new Map((usersRes.data ?? []).map(u => [u.id, u]));
    const likeCountMap = new Map<string, number>();
    for (const l of likesRes.data ?? []) likeCountMap.set(l.workout_id, (likeCountMap.get(l.workout_id) ?? 0) + 1);
    const commentCountMap = new Map<string, number>();
    for (const c of commentsRes.data ?? []) commentCountMap.set(c.workout_id, (commentCountMap.get(c.workout_id) ?? 0) + 1);
    const viewerLikedSet = new Set((viewerLikesRes.data ?? []).map(l => l.workout_id));
    const mediaMap = new Map<string, typeof mediaRes.data>();
    for (const m of mediaRes.data ?? []) {
      if (!mediaMap.has(m.workout_id)) mediaMap.set(m.workout_id, []);
      mediaMap.get(m.workout_id)!.push(m);
    }

    const feedItems = workouts.map(w => {
      const u = userMap.get(w.user_id);
      return {
        id: w.id,
        user_id: w.user_id,
        name: w.name,
        description: w.description,
        started_at: w.started_at,
        duration_seconds: w.duration_seconds,
        total_volume_kg: w.total_volume_kg,
        total_sets: w.total_sets,
        visibility: w.visibility,
        user: { username: u?.username ?? '', avatar_url: u?.avatar_url ?? null, full_name: u?.full_name ?? null },
        like_count: likeCountMap.get(w.id) ?? 0,
        comment_count: commentCountMap.get(w.id) ?? 0,
        viewer_liked: viewerLikedSet.has(w.id),
        media: mediaMap.get(w.id) ?? [],
      };
    });
    const next_cursor = workouts.length === LIMIT ? workouts[LIMIT - 1].started_at : null;
    res.json({ data: { workouts: feedItems, next_cursor } });
  } catch (err) { next(err); }
});

// POST /feed/workouts/:workoutId/like
router.post('/workouts/:workoutId/like', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const gymId = req.user!.gym_id;
    const { workoutId } = req.params;

    // Verify workout exists in same gym
    const { data: workout } = await supabase.from('workouts').select('id, user_id, gym_id').eq('id', workoutId).eq('gym_id', gymId).maybeSingle();
    if (!workout) return next(new AppError('NOT_FOUND', 404, 'Workout not found'));

    await supabase.from('workout_likes').upsert(
      { workout_id: workoutId, user_id: userId, gym_id: gymId },
      { onConflict: 'workout_id,user_id', ignoreDuplicates: true }
    );

    // Notify workout owner (skip if own workout)
    if (workout.user_id !== userId) {
      const { data: settings } = await supabase.from('user_settings').select('notif_likes').eq('user_id', workout.user_id).maybeSingle();
      if (settings?.notif_likes !== false) {
        const { data: actor } = await supabase.from('users').select('username').eq('id', userId).maybeSingle();
        await supabase.from('notifications').insert({
          user_id: workout.user_id, gym_id: gymId, type: 'like',
          title: `${actor?.username ?? 'Someone'} liked your workout`,
          data: { workout_id: workoutId, actor_user_id: userId },
        });
      }
    }
    res.json({ data: { liked: true } });
  } catch (err) { next(err); }
});

// DELETE /feed/workouts/:workoutId/like
router.delete('/workouts/:workoutId/like', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    await supabase.from('workout_likes').delete().eq('workout_id', req.params.workoutId).eq('user_id', userId);
    res.json({ data: { liked: false } });
  } catch (err) { next(err); }
});

// GET /feed/workouts/:workoutId/likes
router.get('/workouts/:workoutId/likes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    let q = supabase.from('workout_likes')
      .select('id, created_at, user_id')
      .eq('workout_id', req.params.workoutId)
      .order('created_at', { ascending: false }).limit(20);
    if (cursor) q = q.lt('created_at', cursor);
    const { data: likes } = await q;
    const likerIds = (likes ?? []).map(l => l.user_id);
    const { data: likerUsers } = await supabase.from('users').select('id, username, avatar_url, full_name').in('id', likerIds);
    const likerMap = new Map((likerUsers ?? []).map(u => [u.id, u]));
    const items = (likes ?? []).map(l => ({ ...l, user: likerMap.get(l.user_id) ?? null }));
    const next_cursor = items.length === 20 ? items[19].created_at : null;
    res.json({ data: { likes: items, next_cursor } });
  } catch (err) { next(err); }
});

// POST /feed/workouts/:workoutId/comments
router.post('/workouts/:workoutId/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const gymId = req.user!.gym_id;
    const { workoutId } = req.params;

    const commentSchema = z.object({ content: z.string().min(1).max(1000) });
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }

    const { data: workout } = await supabase.from('workouts').select('id, user_id, gym_id').eq('id', workoutId).eq('gym_id', gymId).maybeSingle();
    if (!workout) return next(new AppError('NOT_FOUND', 404, 'Workout not found'));

    const { data: insertedComment } = await supabase.from('workout_comments').insert({
      workout_id: workoutId, user_id: userId, gym_id: gymId, content: parsed.data.content,
    }).select().single();

    // Hydrate with the commenter's user info so the client can render
    // immediately without an extra round-trip (this previously caused a WSOD
    // because `comment.user` was undefined in the response).
    const { data: commenterUser } = await supabase.from('users')
      .select('id, username, avatar_url').eq('id', userId).maybeSingle();
    const comment = insertedComment ? { ...insertedComment, user: commenterUser ?? null } : insertedComment;

    // @mentions
    const MENTION_REGEX = /(?<!\w)@([a-zA-Z0-9_]{3,30})(?!\w)/g;
    const mentions = [...parsed.data.content.matchAll(MENTION_REGEX)].map(m => m[1]);
    for (const username of mentions) {
      const { data: mentioned } = await supabase.from('users').select('id').eq('username', username).eq('gym_id', gymId).is('deleted_at', null).maybeSingle();
      if (mentioned && mentioned.id !== userId) {
        await supabase.from('notifications').insert({
          user_id: mentioned.id, gym_id: gymId, type: 'mention',
          title: 'You were mentioned in a comment',
          data: { workout_id: workoutId, actor_user_id: userId },
        });
      }
    }

    // Notify workout owner of comment (if not own)
    if (workout.user_id !== userId) {
      const { data: settings } = await supabase.from('user_settings').select('notif_comments').eq('user_id', workout.user_id).maybeSingle();
      if (settings?.notif_comments !== false) {
        const { data: actor } = await supabase.from('users').select('username').eq('id', userId).maybeSingle();
        await supabase.from('notifications').insert({
          user_id: workout.user_id, gym_id: gymId, type: 'comment',
          title: `${actor?.username ?? 'Someone'} commented on your workout`,
          data: { workout_id: workoutId, actor_user_id: userId },
        });
      }
    }

    res.status(201).json({ data: { comment } });
  } catch (err) { next(err); }
});

// GET /feed/workouts/:workoutId/comments
router.get('/workouts/:workoutId/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    let q = supabase.from('workout_comments')
      .select('id, content, created_at, user_id')
      .eq('workout_id', req.params.workoutId).is('deleted_at', null)
      .order('created_at', { ascending: true }).limit(20);
    if (cursor) q = q.gt('created_at', cursor);
    const { data: comments } = await q;
    const commenterIds = [...new Set((comments ?? []).map(c => c.user_id))];
    const { data: commenters } = await supabase.from('users').select('id, username, avatar_url').in('id', commenterIds);
    const cMap = new Map((commenters ?? []).map(u => [u.id, u]));
    const items = (comments ?? []).map(c => ({ ...c, user: cMap.get(c.user_id) ?? null }));
    res.json({ data: { comments: items, next_cursor: items.length === 20 ? items[19].created_at : null } });
  } catch (err) { next(err); }
});

// DELETE /feed/workouts/:workoutId/comments/:commentId
router.delete('/workouts/:workoutId/comments/:commentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { data: comment } = await supabase.from('workout_comments')
      .select('id, user_id')
      .eq('id', req.params.commentId)
      .eq('workout_id', req.params.workoutId)
      .maybeSingle();
    if (!comment) return next(new AppError('NOT_FOUND', 404, 'Comment not found'));
    if (comment.user_id !== userId) return next(new AppError('FORBIDDEN', 403, 'Cannot delete another user\'s comment'));
    await supabase.from('workout_comments').update({ deleted_at: new Date().toISOString() }).eq('id', req.params.commentId);
    res.json({ data: { deleted: true } });
  } catch (err) { next(err); }
});

export default router;
