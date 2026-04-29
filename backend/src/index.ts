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
import { startJobs, initJobs } from './jobs/index';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

const corsOptions = {
  origin: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(o => o.trim()),
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
app.use('/api/v1/trainer', trainerRouter);
app.use('/api/v1/duels', duelsRouter);

app.use(errorHandler);

initJobs().then(() => {
  startJobs();
  app.listen(PORT, () => {
    logger.info('IronPath backend running on port ' + PORT + ' [' + (process.env.NODE_ENV || 'development') + ']');
  });
}).catch(err => {
  logger.error({ err }, 'Failed to initialize jobs');
  process.exit(1);
});

export default app;
