import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { leadLimiter, leadLimiterMinute } from '../middleware/rateLimit';
import { logger } from '../lib/logger';

const router = Router();

// Public marketing site lead capture. Two stacked rate limits (5/min, 30/hour
// per IP) plus a `website` honeypot field, any non-empty value short-circuits
// to a fake-success response so bots that auto-fill every field don't realize
// they were rejected.
//
// The schema accepts BOTH the marketing-side field names (owner_email,
// member_count) and the legacy field names (email, name) so older callers
// don't break. The handler normalizes both shapes onto the database columns.
const leadSchema = z
  .object({
    // Marketing-site canonical names (preferred):
    owner_email: z.string().email().max(320).optional(),
    member_count: z.number().int().min(1).max(100_000).optional(),
    // Legacy names (back-compat):
    email: z.string().email().max(320).optional(),
    name: z.string().max(200).optional(),
    // Shared:
    gym_name: z.string().max(200).optional(),
    phone: z.string().max(50).optional(),
    message: z.string().max(2000).optional(),
    source: z.string().max(100).optional(),
    utm_source: z.string().max(100).optional(),
    utm_medium: z.string().max(100).optional(),
    utm_campaign: z.string().max(100).optional(),
    // Honeypot, if anything is in here, it's a bot.
    website: z.string().optional(),
  })
  .refine(
    (d) => Boolean(d.owner_email || d.email),
    { message: 'owner_email (or email) is required.', path: ['owner_email'] },
  );

router.post('/', leadLimiterMinute, leadLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = leadSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const data = parsed.data;

    // Honeypot: silently accept without inserting. Don't tip off bots.
    if (data.website && data.website.trim().length > 0) {
      return res.json({ data: { received: true } });
    }

    // Normalize marketing-site names onto database columns. owner_email is
    // the canonical email field; the legacy `email` is the fallback.
    const email = (data.owner_email ?? data.email)!; // refine guarantees one exists

    const { data: row, error } = await supabase
      .from('leads')
      .insert({
        email,
        name:         data.name ?? null,
        gym_name:     data.gym_name ?? null,
        phone:        data.phone ?? null,
        message:      data.message ?? null,
        source:       data.source ?? null,
        utm_source:   data.utm_source ?? null,
        utm_medium:   data.utm_medium ?? null,
        utm_campaign: data.utm_campaign ?? null,
        member_count: data.member_count ?? null,
        ip:           req.ip ?? null,
        user_agent:   req.headers['user-agent'] ?? null,
      })
      .select('id')
      .single();

    if (error) {
      // Duplicate-recent-email unique index → swallow as success (don't reveal
      // whether an address has already submitted). Other errors: log + still
      // return success-shaped response so the public site doesn't leak.
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        return res.json({ data: { received: true } });
      }
      logger.error({ err: error }, 'Lead insert failed');
      return res.json({ data: { received: true } });
    }

    res.json({ data: { received: true, id: row?.id ?? null } });
  } catch (err) {
    next(err);
  }
});

export default router;
