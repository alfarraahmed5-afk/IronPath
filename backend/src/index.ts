import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { authMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './lib/logger';

import authRouter from './routes/auth';
import gymsRouter from './routes/gyms';
import usersRouter, { followRequestsRouter } from './routes/users';
import exercisesRouter from './routes/exercises';
import routinesRouter, { routineFoldersRouter } from './routes/routines';
import workoutsRouter from './routes/workouts';
import workoutMediaRouter from './routes/workoutMedia';
import analyticsRouter from './routes/analytics';
import leaderboardsRouter from './routes/leaderboards';
import feedRouter from './routes/feed';
import notificationsRouter from './routes/notifications';
import pushTokensRouter from './routes/pushTokens';
import adminRouter from './routes/admin';
import trainerRouter from './routes/trainer';
import duelsRouter from './routes/duels';
import superAdminRouter from './routes/superAdmin';
import { authTwoFactorRouter, superAdminTwoFactorRouter } from './routes/twoFactor';
import leadsRouter from './routes/leads';
import { startJobs, initJobs } from './jobs/index';
import { assertSchemaReady } from './lib/schemaProbes';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Trust the first hop proxy (Railway / Vercel-style edge) so req.ip resolves to the
// real client address instead of the proxy. Without this, every IP-keyed limiter
// (authLimiter, refreshLimiter, gymRegistrationLimiter, inviteLimiter, default
// rateLimiter) collapses to the proxy IP and one user can DoS everyone behind it.
app.set('trust proxy', 1);

// CORS: function-based origin so we can match the explicit allowlist plus the
// Vercel preview-deployment regex (plan §8.4). When `origin` is a function the
// `cors` middleware also automatically sets `Vary: Origin` on the response,
// which a static array does not — without it, intermediate caches can serve
// the wrong ACAO. Never `*` with credentials.
const STATIC_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const PREVIEW_ORIGIN_RE = /^https:\/\/(ironpath-admin|ironpath-console)-[\w-]+\.vercel\.app$/;

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Same-origin / curl / server-to-server have no Origin header — allow.
    if (!origin) return callback(null, true);
    if (STATIC_ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    if (PREVIEW_ORIGIN_RE.test(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(authMiddleware);
app.use(rateLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount the public 2FA verify route BEFORE the main auth router so there is no
// chance the auth router accidentally shadows it via a future catch-all.
app.use('/api/v1/auth/2fa', authTwoFactorRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/gyms', gymsRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/exercises', exercisesRouter);
app.use('/api/v1/routines', routinesRouter);
app.use('/api/v1/routine-folders', routineFoldersRouter);
app.use('/api/v1/workouts', workoutMediaRouter); // BEFORE workoutsRouter
app.use('/api/v1/workouts', workoutsRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/leaderboards', leaderboardsRouter);
app.use('/api/v1/feed', feedRouter);
app.use('/api/v1/follow-requests', followRequestsRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/push-tokens', pushTokensRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/super-admin/2fa', superAdminTwoFactorRouter);
app.use('/api/v1/super-admin', superAdminRouter);
app.use('/api/v1/leads', leadsRouter);
app.use('/api/v1/trainer', trainerRouter);
app.use('/api/v1/duels', duelsRouter);

app.use(errorHandler);

// Boot sequence: schema probes → jobs init → start. Schema check runs first
// so a backend deploy against a stale DB fails immediately instead of silently
// serving 500s. In production we hard-exit on failure (Railway surfaces it as
// a failed deploy); in dev we just warn so local hacking isn't blocked when
// the dev DB is intentionally behind.
const SCHEMA_FAIL_HARD = process.env.NODE_ENV === 'production';

assertSchemaReady({ failHard: SCHEMA_FAIL_HARD })
  .then(() => initJobs())
  .then(() => {
    startJobs();
    app.listen(PORT, () => {
      logger.info('IronPath backend running on port ' + PORT + ' [' + (process.env.NODE_ENV || 'development') + ']');
    });
  })
  .catch(err => {
    logger.error({ err }, 'Failed to initialize jobs');
    process.exit(1);
  });

export default app;
