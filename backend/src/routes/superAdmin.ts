import { Router, Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { generateUniqueInviteCode } from '../lib/inviteCode';
import { sendWelcomeEmail } from '../lib/email';
import { AppError } from '../middleware/errorHandler';
import { requireActiveUser } from '../middleware/requireActiveUser';
import { requireSuperAdmin } from '../middleware/roles';
import { logAudit } from '../lib/audit';
import { logger } from '../lib/logger';

const router = Router();

// Every route below requires an active super_admin. Public lead capture lives
// in routes/leads.ts. The /admin router (gym_owner-scoped) is separate.
router.use(requireActiveUser, requireSuperAdmin);

const TIER = ['starter', 'growth', 'unlimited'] as const;
const STATUS = ['trial', 'active', 'expired', 'cancelled'] as const;
const LEAD_STATUS = ['new', 'contacted', 'demo_booked', 'trialing', 'negotiating', 'won', 'lost', 'dropped'] as const;
const TIER_CAPS: Record<string, number | null> = { starter: 50, growth: 200, unlimited: null };

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_AUDIT = 50;

function clampPage(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

// PostgREST `.or(...)` is comma-delimited and parenthesized; an attacker passing
// `,()` in `q` could break out of the predicate. LIKE patterns also treat `%`
// and `_` as wildcards. Strip both before splicing user input into a filter.
function sanitizeIlikeTerm(input: string): string {
  return input.replace(/[,()%_]/g, '').slice(0, 80);
}

// ────────────────────────────────────────────────────────────────────────────
// GET /super-admin/gyms — list with filters
// ────────────────────────────────────────────────────────────────────────────
router.get('/gyms', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawQ = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const q = sanitizeIlikeTerm(rawQ);
    const status = typeof req.query.status === 'string' && (STATUS as readonly string[]).includes(req.query.status) ? req.query.status : null;
    const tier = typeof req.query.tier === 'string' && (TIER as readonly string[]).includes(req.query.tier) ? req.query.tier : null;
    const createdAfter = typeof req.query.created_after === 'string' ? req.query.created_after : null;
    const mrrMin = req.query.mrr_min !== undefined ? Number(req.query.mrr_min) : null;
    const page = clampPage(req.query.page);
    const from = (page - 1) * PAGE_SIZE_DEFAULT;
    const to = from + PAGE_SIZE_DEFAULT - 1;

    let query = supabase
      .from('gyms')
      .select('id, name, location, subscription_status, subscription_tier, subscription_expires_at, trial_started_at, mrr_cents, created_at, last_modified_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (q) query = query.ilike('name', `%${q}%`);
    if (status) query = query.eq('subscription_status', status);
    if (tier) query = query.eq('subscription_tier', tier);
    if (createdAfter) query = query.gte('created_at', createdAfter);
    if (mrrMin !== null && Number.isFinite(mrrMin)) query = query.gte('mrr_cents', mrrMin);

    const { data: gyms, count, error } = await query;
    if (error) throw error;

    // Hydrate per-gym summary: member_count, owner_email, owner_name, last_active_at.
    // Single follow-up query per gym list — fine for v1, can N+1-bust with a view later.
    const ids = (gyms ?? []).map(g => g.id);
    const counts = new Map<string, number>();
    const owners = new Map<string, { email: string | null; name: string | null }>();
    const lastActives = new Map<string, string | null>();

    if (ids.length > 0) {
      // Member counts per gym (active, non-deleted, role='member')
      const { data: memberRows } = await supabase
        .from('users')
        .select('gym_id, last_active_at')
        .in('gym_id', ids)
        .is('deleted_at', null)
        .eq('is_active', true);
      for (const r of memberRows ?? []) {
        if (!r.gym_id) continue;
        counts.set(r.gym_id, (counts.get(r.gym_id) ?? 0) + 1);
        const prev = lastActives.get(r.gym_id);
        if (r.last_active_at && (!prev || r.last_active_at > prev)) lastActives.set(r.gym_id, r.last_active_at);
      }
      // One owner per gym (gym_owner role)
      const { data: ownerRows } = await supabase
        .from('users')
        .select('gym_id, email, full_name')
        .in('gym_id', ids)
        .eq('role', 'gym_owner')
        .is('deleted_at', null);
      for (const r of ownerRows ?? []) {
        if (r.gym_id && !owners.has(r.gym_id)) owners.set(r.gym_id, { email: r.email ?? null, name: r.full_name ?? null });
      }
    }

    const enriched = (gyms ?? []).map(g => ({
      ...g,
      member_count: counts.get(g.id) ?? 0,
      member_cap: g.subscription_tier ? TIER_CAPS[g.subscription_tier] ?? null : null,
      owner_email: owners.get(g.id)?.email ?? null,
      owner_name: owners.get(g.id)?.name ?? null,
      last_active_at: lastActives.get(g.id) ?? null,
    }));

    if (q && enriched.length === 0 && (count ?? 0) === 0) {
      // Fallback: q can also match owner email. Cheap second pass — filter ids of owners whose email ilike q.
      const { data: matchedOwners } = await supabase
        .from('users')
        .select('gym_id')
        .ilike('email', `%${q}%`)
        .eq('role', 'gym_owner')
        .is('deleted_at', null)
        .limit(50);
      const ownerGymIds = (matchedOwners ?? []).map(r => r.gym_id).filter(Boolean) as string[];
      if (ownerGymIds.length > 0) {
        const { data: gymsByOwner } = await supabase
          .from('gyms')
          .select('id, name, location, subscription_status, subscription_tier, subscription_expires_at, trial_started_at, mrr_cents, created_at, last_modified_at')
          .in('id', ownerGymIds);
        return res.json({
          data: {
            gyms: (gymsByOwner ?? []).map(g => ({
              ...g,
              member_count: 0,
              member_cap: g.subscription_tier ? TIER_CAPS[g.subscription_tier] ?? null : null,
              owner_email: null,
              owner_name: null,
              last_active_at: null,
            })),
            total: gymsByOwner?.length ?? 0,
            page,
            page_size: PAGE_SIZE_DEFAULT,
          },
        });
      }
    }

    res.json({ data: { gyms: enriched, total: count ?? 0, page, page_size: PAGE_SIZE_DEFAULT } });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /super-admin/gyms/:id — detail
// ────────────────────────────────────────────────────────────────────────────
router.get('/gyms/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.params.id;
    const { data: gym, error } = await supabase.from('gyms').select('*').eq('id', gymId).single();
    if (error || !gym) return next(new AppError('NOT_FOUND', 404, 'Gym not found'));

    const [{ data: owner }, { data: memberRows }, { data: stepRows }, { data: auditRows }] = await Promise.all([
      supabase.from('users').select('id, email, full_name, last_active_at').eq('gym_id', gymId).eq('role', 'gym_owner').is('deleted_at', null).limit(1).maybeSingle(),
      supabase.from('users').select('id, last_active_at').eq('gym_id', gymId).is('deleted_at', null).eq('is_active', true),
      supabase.from('gym_onboarding_steps').select('step_key, completed_at, completed_by').eq('gym_id', gymId),
      supabase.from('super_admin_audit_log').select('id, actor_user_id, action, before, after, ip, created_at').eq('target_type', 'gym').eq('target_id', gymId).order('created_at', { ascending: false }).limit(10),
    ]);

    const memberCount = (memberRows ?? []).filter(r => r.id !== owner?.id).length;
    const lastActive = (memberRows ?? []).reduce<string | null>((acc, r) => (r.last_active_at && (!acc || r.last_active_at > acc) ? r.last_active_at : acc), null);

    res.json({
      data: {
        gym: {
          ...gym,
          member_count: memberCount,
          member_cap: gym.subscription_tier ? TIER_CAPS[gym.subscription_tier] ?? null : null,
          last_active_at: lastActive,
        },
        owner: owner ?? null,
        onboarding_steps: stepRows ?? [],
        recent_audit: auditRows ?? [],
      },
    });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// PATCH /super-admin/gyms/:id/subscription
// ────────────────────────────────────────────────────────────────────────────
const subscriptionUpdateSchema = z.object({
  tier: z.enum(TIER).optional(),
  status: z.enum(STATUS).optional(),
  expires_at: z.string().datetime().optional(),
  mrr_cents: z.number().int().nonnegative().optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'At least one field required.' });

router.patch('/gyms/:id/subscription', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.params.id;
    const parsed = subscriptionUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { data: before, error: readErr } = await supabase.from('gyms').select('subscription_tier, subscription_status, subscription_expires_at, mrr_cents').eq('id', gymId).single();
    if (readErr || !before) return next(new AppError('NOT_FOUND', 404, 'Gym not found'));

    const update: Record<string, unknown> = { last_modified_by: req.user!.id, last_modified_at: new Date().toISOString() };
    if (parsed.data.tier !== undefined) update.subscription_tier = parsed.data.tier;
    if (parsed.data.status !== undefined) update.subscription_status = parsed.data.status;
    if (parsed.data.expires_at !== undefined) update.subscription_expires_at = parsed.data.expires_at;
    if (parsed.data.mrr_cents !== undefined) update.mrr_cents = parsed.data.mrr_cents;

    const { data: after, error: updErr } = await supabase.from('gyms').update(update).eq('id', gymId).select().single();
    if (updErr || !after) throw updErr ?? new Error('Update failed');

    await logAudit(req, { action: 'subscription.update', target_type: 'gym', target_id: gymId, before, after });
    res.json({ data: { gym: after } });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /super-admin/gyms/:id/subscription/mark-paid
// ────────────────────────────────────────────────────────────────────────────
const markPaidSchema = z.object({
  amount_cents: z.number().int().nonnegative(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional(),
}).refine(d => d.period_end >= d.period_start, { message: 'period_end must be on or after period_start.', path: ['period_end'] });

router.post('/gyms/:id/subscription/mark-paid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.params.id;
    const parsed = markPaidSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { amount_cents, period_start, period_end, note } = parsed.data;

    const { data: gym, error: readErr } = await supabase.from('gyms').select('subscription_status, subscription_expires_at').eq('id', gymId).single();
    if (readErr || !gym) return next(new AppError('NOT_FOUND', 404, 'Gym not found'));

    const { data: payment, error: payErr } = await supabase.from('subscription_payments').insert({
      gym_id: gymId, amount_cents, period_start, period_end, note: note ?? null, recorded_by: req.user!.id,
    }).select().single();
    if (payErr || !payment) throw payErr ?? new Error('Payment insert failed');

    // Compare existing expiry (ISO timestamp) against the new period_end normalized
    // to end-of-day. String compare alone leaves the existing expiry winning whenever
    // it has a `T...` suffix, even when period_end covers a later date — bug spotted
    // in Phase B review.
    const periodEndExpiry = `${period_end}T23:59:59Z`;
    const newExpires =
      gym.subscription_expires_at &&
      new Date(gym.subscription_expires_at).getTime() > new Date(periodEndExpiry).getTime()
        ? gym.subscription_expires_at
        : periodEndExpiry;
    const { data: after, error: updErr } = await supabase.from('gyms').update({
      subscription_status: 'active',
      subscription_expires_at: newExpires,
      last_modified_by: req.user!.id,
      last_modified_at: new Date().toISOString(),
    }).eq('id', gymId).select().single();
    if (updErr) throw updErr;

    await logAudit(req, {
      action: 'subscription.mark_paid', target_type: 'gym', target_id: gymId,
      before: { subscription_status: gym.subscription_status, subscription_expires_at: gym.subscription_expires_at },
      after: { ...after, payment },
    });
    res.json({ data: { gym: after, payment } });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /super-admin/gyms/:id/subscription/extend-trial
// ────────────────────────────────────────────────────────────────────────────
const extendTrialSchema = z.object({
  days: z.number().int().min(1).max(90),
  reason: z.string().min(3).max(500),
});

router.post('/gyms/:id/subscription/extend-trial', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.params.id;
    const parsed = extendTrialSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { days, reason } = parsed.data;

    const { data: gym, error: readErr } = await supabase.from('gyms').select('subscription_status, subscription_expires_at, trial_started_at').eq('id', gymId).single();
    if (readErr || !gym) return next(new AppError('NOT_FOUND', 404, 'Gym not found'));

    const base = gym.subscription_expires_at && new Date(gym.subscription_expires_at) > new Date() ? new Date(gym.subscription_expires_at) : new Date();
    base.setUTCDate(base.getUTCDate() + days);
    const newExpires = base.toISOString();

    const { data: after, error: updErr } = await supabase.from('gyms').update({
      subscription_status: 'trial',
      subscription_expires_at: newExpires,
      trial_started_at: gym.trial_started_at ?? new Date().toISOString(),
      last_modified_by: req.user!.id,
      last_modified_at: new Date().toISOString(),
    }).eq('id', gymId).select().single();
    if (updErr || !after) throw updErr ?? new Error('Update failed');

    await logAudit(req, {
      action: 'subscription.extend_trial', target_type: 'gym', target_id: gymId,
      before: { subscription_status: gym.subscription_status, subscription_expires_at: gym.subscription_expires_at },
      after: { ...after, _meta: { days, reason } },
    });
    res.json({ data: { gym: after } });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /super-admin/gyms — manual gym creation
// ────────────────────────────────────────────────────────────────────────────
const manualGymSchema = z.object({
  name: z.string().min(2).max(80),
  owner_email: z.string().email(),
  tier: z.enum(TIER).default('starter'),
  trial_days: z.number().int().min(1).max(90).default(30),
  note: z.string().max(500).optional(),
});

router.post('/gyms', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = manualGymSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { name, owner_email, tier, trial_days, note } = parsed.data;

    // Generate temp password — owner resets via /auth/forgot-password.
    const tempPassword = `Tmp_${randomString(20)}`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: owner_email, password: tempPassword, email_confirm: true,
    });
    if (authError) {
      if (authError.message?.includes('already registered')) {
        return next(new AppError('CONFLICT', 409, 'Email already registered'));
      }
      throw authError;
    }
    const authUserId = authData.user.id;

    let gymId: string | null = null;
    try {
      const inviteCode = await generateUniqueInviteCode();
      const expiresAt = new Date();
      expiresAt.setUTCDate(expiresAt.getUTCDate() + trial_days);

      const { data: gym, error: gymError } = await supabase.from('gyms').insert({
        name,
        invite_code: inviteCode,
        accent_color: '#FF6B35',
        subscription_status: 'trial',
        subscription_tier: tier,
        trial_started_at: new Date().toISOString(),
        subscription_expires_at: expiresAt.toISOString(),
        last_modified_by: req.user!.id,
        last_modified_at: new Date().toISOString(),
      }).select().single();
      if (gymError || !gym) throw gymError ?? new Error('Gym insert failed');
      gymId = gym.id;

      const { error: userError } = await supabase.from('users').insert({
        id: authUserId,
        gym_id: gym.id,
        email: owner_email,
        username: `owner_${inviteCode.toLowerCase()}`,
        role: 'gym_owner',
      });
      if (userError) throw userError;

      await Promise.all([
        supabase.from('user_settings').insert({ user_id: authUserId }),
        supabase.from('streaks').insert({ user_id: authUserId, gym_id: gym.id }),
      ]);

      // Best-effort welcome — don't block on email
      sendWelcomeEmail({
        to: owner_email,
        gymName: name,
        inviteCode,
        appDownloadUrl: process.env.APP_DOWNLOAD_URL || 'https://ironpath.app/download',
      }).catch((err: unknown) => logger.warn({ err }, 'Welcome email failed'));

      await logAudit(req, {
        action: 'gym.create', target_type: 'gym', target_id: gym.id,
        after: { gym, owner_email, tier, trial_days, note: note ?? null },
      });

      res.status(201).json({ data: { gym, invite_code: inviteCode, owner_email } });
    } catch (innerErr) {
      // Roll back auth user + gym row if anything downstream failed.
      try { await supabase.auth.admin.deleteUser(authUserId); } catch { /* best-effort rollback */ }
      if (gymId) {
        try { await supabase.from('gyms').delete().eq('id', gymId); } catch { /* best-effort rollback */ }
      }
      throw innerErr;
    }
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// PATCH /super-admin/gyms/:id — admin override on any gym field
// ────────────────────────────────────────────────────────────────────────────
const gymOverrideSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  location: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  is_active: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

router.patch('/gyms/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.params.id;
    const parsed = gymOverrideSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { data: before, error: readErr } = await supabase.from('gyms').select('*').eq('id', gymId).single();
    if (readErr || !before) return next(new AppError('NOT_FOUND', 404, 'Gym not found'));

    const update: Record<string, unknown> = { ...parsed.data, last_modified_by: req.user!.id, last_modified_at: new Date().toISOString() };
    const { data: after, error: updErr } = await supabase.from('gyms').update(update).eq('id', gymId).select().single();
    if (updErr || !after) throw updErr ?? new Error('Update failed');

    await logAudit(req, { action: 'gym.update', target_type: 'gym', target_id: gymId, before, after });
    res.json({ data: { gym: after } });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /super-admin/leads — list
// ────────────────────────────────────────────────────────────────────────────
router.get('/leads', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' && (LEAD_STATUS as readonly string[]).includes(req.query.status) ? req.query.status : null;
    const rawQ = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const q = sanitizeIlikeTerm(rawQ);
    const assignedTo = typeof req.query.assigned_to === 'string' ? req.query.assigned_to : null;
    const page = clampPage(req.query.page);
    const from = (page - 1) * PAGE_SIZE_DEFAULT;
    const to = from + PAGE_SIZE_DEFAULT - 1;

    let query = supabase.from('leads').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
    if (status) query = query.eq('status', status);
    if (assignedTo) query = query.eq('assigned_to', assignedTo);
    if (q) query = query.or(`email.ilike.%${q}%,gym_name.ilike.%${q}%,name.ilike.%${q}%`);

    const { data, count, error } = await query;
    if (error) throw error;
    res.json({ data: { leads: data ?? [], total: count ?? 0, page, page_size: PAGE_SIZE_DEFAULT } });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// PATCH /super-admin/leads/:id
// ────────────────────────────────────────────────────────────────────────────
const leadUpdateSchema = z.object({
  status: z.enum(LEAD_STATUS).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'At least one field required.' });

router.patch('/leads/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leadId = req.params.id;
    const parsed = leadUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { data: before, error: readErr } = await supabase.from('leads').select('*').eq('id', leadId).single();
    if (readErr || !before) return next(new AppError('NOT_FOUND', 404, 'Lead not found'));

    const { data: after, error: updErr } = await supabase.from('leads').update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    }).eq('id', leadId).select().single();
    if (updErr || !after) throw updErr ?? new Error('Update failed');

    await logAudit(req, { action: 'lead.update', target_type: 'lead', target_id: leadId, before, after });
    res.json({ data: { lead: after } });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /super-admin/audit
// ────────────────────────────────────────────────────────────────────────────
router.get('/audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = typeof req.query.actor === 'string' ? req.query.actor : null;
    const targetType = typeof req.query.target_type === 'string' ? req.query.target_type : null;
    const targetId = typeof req.query.target_id === 'string' ? req.query.target_id : null;
    const fromTs = typeof req.query.from === 'string' ? req.query.from : null;
    const toTs = typeof req.query.to === 'string' ? req.query.to : null;
    const page = clampPage(req.query.page);
    const from = (page - 1) * PAGE_SIZE_AUDIT;
    const to = from + PAGE_SIZE_AUDIT - 1;

    let query = supabase.from('super_admin_audit_log').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
    if (actor) query = query.eq('actor_user_id', actor);
    if (targetType) query = query.eq('target_type', targetType);
    if (targetId) query = query.eq('target_id', targetId);
    if (fromTs) query = query.gte('created_at', fromTs);
    if (toTs) query = query.lte('created_at', toTs);

    const { data, count, error } = await query;
    if (error) throw error;
    res.json({ data: { entries: data ?? [], total: count ?? 0, page, page_size: PAGE_SIZE_AUDIT } });
  } catch (err) { next(err); }
});

function randomString(len: number): string {
  // CSPRNG. The temp password is overwritten on the user's first login via the
  // forgot-password flow, but it briefly sits on the auth account; predictable
  // output (Math.random) is unsafe even for that window.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export default router;
