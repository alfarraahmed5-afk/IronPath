import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req: any) => req.user?.id ?? req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Too many requests.', status: 429 }
  })
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).set('Retry-After', '900').json({
    error: { code: 'RATE_LIMITED', message: 'Too many auth attempts.', status: 429 }
  })
});

// Dedicated /auth/login limiter — looser than the catch-all authLimiter
// because real users with browser autofill quirks, fat-fingered passwords,
// or 2FA flow false-starts can burn through 5/15min in seconds. 10/15min
// per IP keeps brute-force protection meaningful (still ~40/hour, well
// below what credential-stuffing tools expect) without rage-quitting
// legitimate users on a bad day. Phase B.5 follow-up.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).set('Retry-After', '900').json({
    error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again in 15 minutes.', status: 429 }
  })
});

export const inviteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Too many requests.', status: 429 }
  })
});

export const gymRegistrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Too many registration attempts.', status: 429 }
  })
});

// Refresh-token endpoint limiter. Looser than authLimiter because legitimate
// users behind one NAT (office, household) can fan out across multiple
// devices/tabs and each will refresh independently. 30 / 15 min / IP keeps
// brute-force attempts on stolen tokens cheap to detect without DoS-ing real
// users.
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).set('Retry-After', '900').json({
    error: { code: 'RATE_LIMITED', message: 'Too many refresh attempts.', status: 429 }
  })
});

// Public lead capture limiter. Two stacked limits:
//   - leadLimiterMinute: 5/min/IP
//   - leadLimiter: 30/hour/IP
// Apply both as middleware in order; either can short-circuit with 429. The
// minute limiter is the burst guard; the hourly limiter caps sustained spam.
export const leadLimiterMinute = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Too many requests.', status: 429 }
  })
});

export const leadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Too many requests.', status: 429 }
  })
});

// Upload-URL minting limiter. Keyed by user.id (falling back to ip) so a
// single compromised account can't spam signed URLs. 10 / min is well above
// any realistic interactive UI flow.
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req: any) => req.user?.id ?? req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Too many upload requests.', status: 429 }
  })
});
