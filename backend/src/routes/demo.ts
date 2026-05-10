import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { randomBytes } from 'crypto';
import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';

const router = Router();

// Phase C / γ4 — Public no-auth demo deep-link.
//
// POST /api/v1/demo/spawn provisions an ephemeral demo session and returns
// a redirect URL into the operator console with the token in the query
// string. The console reads the token client-side and renders a
// dismissible "you're in a demo" banner. The DB row carries IP / UA /
// referrer for forensics and is GC'd by a daily cron in jobs/index.ts.
//
// v1 explicit caveat: the backend does NOT yet accept demo_token as a
// session token. The console UI lights up the banner but operational
// reads/writes are not authenticated as the demo gym. Full auth shim is
// a follow-up — see DEV_LOG. Today the spawn endpoint exists so the
// marketing /demo deep-link works and we capture conversion funnel data.

const CONSOLE_BASE_URL = process.env.CONSOLE_URL || 'https://console.ironpath.health';
const DEMO_TTL_HOURS = 24;

// Public endpoint; rate-limited 5/min/IP per spec (matches leadLimiterMinute
// burst guard pattern in middleware/rateLimit.ts).
const demoSpawnLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Too many demo requests.', status: 429 }
  }),
});

router.post('/spawn', demoSpawnLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Pick a "demo gym" from the pool. Convention: any gym whose name
    //    starts with 'Demo Gym' is fair game. If none exist, the demo is
    //    misconfigured — return 503 so we surface it instead of crashing.
    //    We pick the most recently created one to allow easy seeding rotation.
    const { data: gymRow, error: gymErr } = await supabase
      .from('gyms')
      .select('id, name')
      .ilike('name', 'Demo Gym%')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (gymErr) {
      logger.error({ err: gymErr }, 'demo/spawn: gym lookup failed');
      return next(new AppError('DB_ERROR', 500, 'Demo lookup failed.'));
    }
    if (!gymRow) {
      // Surface a clean 503 — operator needs to seed a "Demo Gym".
      return next(new AppError(
        'DEMO_UNAVAILABLE',
        503,
        'Demo is temporarily unavailable. Please try again shortly.'
      ));
    }

    // 2. Mint a 64-char URL-safe token. randomBytes(48).toString('base64url')
    //    yields 64 chars (48 bytes -> 64 chars in base64). Matches the
    //    `token VARCHAR(64) UNIQUE` column.
    const token = randomBytes(48).toString('base64url');

    // 3. Insert the session row. TTL 24h. Ip/UA/referrer for forensics.
    const expiresAt = new Date(Date.now() + DEMO_TTL_HOURS * 60 * 60 * 1000).toISOString();
    const { error: insertErr } = await supabase.from('demo_sessions').insert({
      token,
      gym_id: gymRow.id,
      ip: req.ip ?? null,
      user_agent: req.headers['user-agent'] ?? null,
      referrer: (req.headers.referer ?? req.headers.referrer ?? null) as string | null,
      expires_at: expiresAt,
    });

    if (insertErr) {
      logger.error({ err: insertErr }, 'demo/spawn: session insert failed');
      return next(new AppError('DB_ERROR', 500, 'Demo provisioning failed.'));
    }

    const redirectUrl = `${CONSOLE_BASE_URL}/?demo_token=${encodeURIComponent(token)}`;

    return res.json({
      data: {
        token,
        redirect_url: redirectUrl,
        expires_at: expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
