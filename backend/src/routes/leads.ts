import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { leadLimiter, leadLimiterMinute } from '../middleware/rateLimit';
import { logger } from '../lib/logger';

const router = Router();

// Public marketing site lead capture. Two stacked rate limits (5/min, 30/hour
// per IP) plus a `website` honeypot field — any non-empty value short-circuits
// to a fake-success response so bots that auto-fill every field don't realize
// they were rejected.
const leadSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().max(200).optional(),
  gym_name: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  message: z.string().max(2000).optional(),
  source: z.string().max(100).optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
  // Honeypot — if anything is in here, it's a bot.
  website: z.string().optional(),
});

router.post('/', leadLimiterMinute, leadLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = leadSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.errors.map(e => ({ field: String(e.path.join('.')), message: e.message }));
      return next(new AppError('VALIDATION_ERROR', 422, 'Request validation failed.', fields));
    }
    const { website, ...lead } = parsed.data;

    // Honeypot: silently accept without inserting. Don't tip off bots.
    if (website && website.trim().length > 0) {
      return res.json({ data: { received: true } });
    }

    const { error } = await supabase.from('leads').insert({
      email: lead.email,
      name: lead.name ?? null,
      gym_name: lead.gym_name ?? null,
      phone: lead.phone ?? null,
      message: lead.message ?? null,
      source: lead.source ?? null,
      utm_source: lead.utm_source ?? null,
      utm_medium: lead.utm_medium ?? null,
      utm_campaign: lead.utm_campaign ?? null,
      ip: req.ip ?? null,
      user_agent: req.headers['user-agent'] ?? null,
    });

    if (error) {
      // Duplicate-recent-email unique index → swallow as success (don't reveal
      // whether an address has already submitted). Other errors: log + still
      // return success-shaped response so the public site doesn't leak.
      const code = (error as any).code;
      if (code === '23505') {
        return res.json({ data: { received: true } });
      }
      logger.error({ err: error }, 'Lead insert failed');
    }

    res.json({ data: { received: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
