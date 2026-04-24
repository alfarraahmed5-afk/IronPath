# IronPath — Full Technical Specification

**Version:** 5.0  
**Date:** April 2026  
**Built by:** Claude Code  
**Business Model:** B2B SaaS — sold to gyms, used by their members  
**App Name:** IronPath  
**iOS Bundle Identifier:** com.ironpath.app  
**Android Package Name:** com.ironpath.app  
**Expo Slug:** ironpath  
**Starting Version:** 1.0.0  

**Changes from v4.0:**
- Added wger-muscle-map.js (Section 9.1.1) - missing from v4; import script fails without it
- Added rateLimit.ts implementation (Section 4) - never defined in v4
- Added mobile Supabase client mobile/src/lib/supabase.ts (Section 8.9) - needed for Storage uploads
- Fixed WGER equipment map: added cable ID 10, corrected IDs 2/9/12

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [System Architecture](#3-system-architecture)
4. [API Conventions](#4-api-conventions)
5. [Database Schema](#5-database-schema)
6. [RLS Policies](#6-rls-policies)
7. [Supabase Storage Policies](#7-supabase-storage-policies)
8. [Phase 1 — Foundation & Auth](#8-phase-1--foundation--auth)
9. [Phase 2 — Workout Engine](#9-phase-2--workout-engine)
10. [Phase 3 — Progress & Analytics](#10-phase-3--progress--analytics)
11. [Phase 4 — Leaderboards & Social](#11-phase-4--leaderboards--social)
12. [Phase 5 — Gym Admin Panel (Web)](#12-phase-5--gym-admin-panel-web)
13. [Phase 6 — In-App Engagement](#13-phase-6--in-app-engagement)
14. [Phase 7 — AI Trainer (Algorithmic)](#14-phase-7--ai-trainer-algorithmic)
15. [Background Jobs](#15-background-jobs)
16. [API Endpoints](#16-api-endpoints)
17. [File Storage Structure](#17-file-storage-structure)
18. [Security](#18-security)
19. [Monetization](#19-monetization)
20. [Environment Variables](#20-environment-variables)
21. [App Configuration (app.json)](#21-app-configuration-appjson)
22. [App Store Readiness](#22-app-store-readiness)
23. [Build Order & Dependencies](#23-build-order--dependencies)

---

## 1. Product Overview

IronPath is a full-featured gym workout tracking mobile app (iOS + Android) sold as a monthly SaaS subscription to gyms. The gym is the paying customer. Their members are the end users. Each gym has its own isolated community — members track workouts, compete on leaderboards, and follow each other's progress within their gym.

### Core Value Proposition
- Members get a world-class workout tracker tied to their real gym community
- Gyms get a retention and engagement tool with a web admin dashboard
- Gym-scoped leaderboards create healthy competition between real people who train together

### Key Differentiators from Hevy
- Gym-scoped leaderboards (compete with people you actually know)
- Gym owner admin panel with member management and analytics
- Designed to be sold per gym as a branded community tool
- Future: cross-gym leaderboards between competing gyms

### Mobile App Role Behaviour
The mobile app is **identical for all roles** (member, gym_owner, super_admin). There is no admin functionality in the mobile app. Gym owners use the web admin panel (admin.ironpath.app) for management and use the mobile app exactly like any other member for their own workout tracking.

---

## 2. Tech Stack & Dependencies

### Technology Choices

| Layer | Technology | Notes |
|-------|-----------|-------|
| Mobile App | React Native + Expo (latest stable SDK at build time) | iOS + Android single codebase |
| Backend API | Node.js 18 LTS + Express.js | Node 18 required for native fetch; versioned at `/api/v1/` |
| Database | PostgreSQL via Supabase | Primary relational database |
| Auth | Supabase Auth + custom JWT claims via Auth Hook | JWT-based; gym_id and role embedded in token |
| File Storage | Supabase Storage | Photos, videos, exercise assets |
| Admin Panel | React.js + Vite | Web-only, deployed to Vercel |
| Backend Hosting | Railway (Hobby plan, always-on) | Must use Hobby plan — free tier sleeps, killing cron jobs |
| Exercise Data | WGER (one-time import via exerciseinfo endpoint) | Verified API structure — see Section 9.1 |
| Push Notifications | expo-server-sdk (backend) + Expo Push API | iOS + Android; batched sends |
| State Management | Zustand | Mobile app global state |
| Navigation | Expo Router (file-based) | Mobile app navigation |
| Charts | victory-native@^41 + @shopify/react-native-skia | Skia-based Victory Native; installed as package only |
| Styling (mobile) | NativeWind v4 (Tailwind for RN) | v4 setup required — see Section 21 |
| Styling (web) | Tailwind CSS + PostCSS + Autoprefixer | All three required for Tailwind to compile |
| Job Scheduler | node-cron | Backend background jobs |
| Email Service | Resend | Transactional emails |
| Image Processing (mobile) | expo-image-manipulator | Client-side compression before upload |
| Share Graphics | react-native-view-shot | Capture RN components as images |
| Camera Roll Save | expo-media-library | Save shareable graphics to device |
| File Upload (backend) | multer | Parse multipart/form-data |
| Input Validation | zod | ALL backend validation. Never express-validator. |
| Local Workout Persistence | expo-sqlite | Active workout draft; initialized in app root |
| Logging | pino | JSON logs in production, pretty-print in development |
| Monorepo Tooling | npm workspaces | Shared types across sub-projects |
| Migration Tooling | Supabase CLI | `supabase db push` to apply migrations |
| Timezone Handling | luxon | Timezone-aware badge and report calculations |
| TypeScript (backend) | ts-node-dev (dev), tsc (prod) | Backend runs TypeScript |

### Node.js Version Requirement
**Node.js 18 LTS minimum.** Required for native `fetch` API used in the WGER import script. Add to `backend/package.json`:
```json
"engines": {"node": ">=18.0.0"}
```
Specify Node 18 in the Railway deployment settings.

### Monorepo Structure
```
/
├── mobile/               # React Native Expo app
├── backend/              # Node.js Express API (TypeScript)
│   ├── src/
│   │   ├── index.ts
│   │   ├── lib/
│   │   │   ├── supabase.ts   # Supabase client singleton
│   │   │   └── logger.ts     # Pino logger
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── rateLimit.ts
│   │   │   ├── requireActiveUser.ts
│   │   │   └── errorHandler.ts
│   │   └── routes/
│   ├── scripts/
│   │   ├── import-wger.js
│   │   ├── wger-muscle-map.js    # see Section 9.1.1
│   │   ├── wger-equipment-map.js # see Section 9.1
│   │   ├── seed-super-admin.js
│   │   └── seed-prebuilt-routines.js
│   └── data/
│       ├── plate-denominations.js
│       ├── strength-standards.js
│       ├── volume-comparisons.js
│       ├── leaderboard-exercises.js
│       └── trainer-templates.js
├── admin/                # React.js Vite admin panel (Vercel)
├── shared/               # Shared TypeScript types
│   └── types/
│       ├── api.ts
│       ├── models.ts
│       └── index.ts      # Barrel export + constants
└── supabase/
    └── migrations/       # SQL migration files (Supabase CLI)
```

### Backend Dependencies
```bash
npm install express cors helmet express-rate-limit @supabase/supabase-js zod \
  node-cron resend jsonwebtoken dotenv multer expo-server-sdk uuid luxon pino
npm install --save-dev typescript ts-node-dev @types/express @types/node \
  @types/multer @types/jsonwebtoken @types/uuid @types/luxon
```

`backend/package.json` scripts:
```json
{
  "engines": {"node": ">=18.0.0"},
  "scripts": {
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "seed:admin": "node scripts/seed-super-admin.js",
    "seed:wger": "node scripts/import-wger.js",
    "seed:routines": "node scripts/seed-prebuilt-routines.js"
  }
}
```

### Mobile Dependencies
```bash
# Use npx expo install for all Expo-managed packages (resolves SDK-compatible versions)
npx expo install zustand expo-router expo-sqlite expo-secure-store \
  expo-image-manipulator expo-media-library expo-camera \
  react-native-view-shot @shopify/react-native-skia @supabase/supabase-js

# Pin exact versions for non-Expo packages; check compatibility with installed SDK first
npx expo install victory-native@^41
npm install nativewind@^4 tailwindcss luxon @ironpath/shared
```

### Admin Panel Dependencies
```bash
npm install react-router-dom axios recharts tailwindcss postcss autoprefixer \
  @ironpath/shared luxon
npm install --save-dev vite @vitejs/plugin-react typescript
```
**PostCSS and Autoprefixer are required.** Without them, Tailwind CSS produces no output. Create `admin/postcss.config.js`:
```javascript
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

---

## 3. System Architecture

### High-Level Architecture

```
[Mobile App (iOS/Android)]
        |
        | HTTPS /api/v1/* — JWT in Authorization: Bearer header
        v
[Node.js + Express Backend (Railway — Hobby plan)]
        |
        |---> [PostgreSQL via Supabase — service_role key]
        |---> [Supabase Storage]
        |---> [Supabase Auth — JWT validation via SUPABASE_JWT_SECRET]
        |---> [Expo Push Notifications API — batched via expo-server-sdk]
        |---> [Resend — transactional email]
        |---> [node-cron — background jobs]
        |---> [pino — structured logging]

[React Admin Panel (Vercel — admin.ironpath.app)]
        |
        | HTTPS /api/v1/admin/* — JWT in Authorization: Bearer header
        | Token stored in localStorage; managed via Axios interceptor
        v
[Same Backend — admin-scoped endpoints, role = gym_owner or super_admin]
```

### Railway Plan
**Hobby plan ($5/month credit).** Free tier sleeps on inactivity, killing all `node-cron` jobs. Hobby plan keeps the process always-on. The $5 credit covers typical low-traffic usage. Monitor usage in Railway dashboard; set a spending limit to avoid unexpected charges.

### Multi-Tenancy Model
- Every table row is scoped to a `gym_id`
- A user belongs to exactly one gym (NOT NULL FK enforced at DB level)
- `gym_id` and `role` embedded in JWT claims via Supabase Auth Hook (set at login time)
- Backend middleware reads claims directly from JWT — zero DB lookups for auth
- Backend uses `service_role` key — all queries MUST include `WHERE gym_id = req.user.id` scoped appropriately
- RLS policies act as second enforcement layer (Section 6)

### Offline Mode
Online-only for v1. Exception: active workout screen persists in-progress state to local SQLite so crashes don't lose data. All other features require connectivity.

### Auth Flow
1. Gym owner registers via admin panel → Supabase Auth user created first → DB rows in transaction → compensating delete if DB fails
2. Member registers via mobile → same procedure
3. On login: Supabase Auth Hook fires → adds `gym_id` and `role` as JWT claims
4. JWT stored in `expo-secure-store` (mobile) or `localStorage` (admin panel)
5. Backend middleware validates JWT signature, reads claims, sets `req.user = {id, gym_id, role}`
6. `requireActiveUser` middleware on all write endpoints checks `is_active` and `deleted_at` from DB

---

## 4. API Conventions

### Base URL
All endpoints prefixed `/api/v1/`. Example: `https://backend.railway.app/api/v1/workouts`.

### Middleware Execution Order (`backend/src/index.ts`)
Applied in this exact order — order matters:
```typescript
app.use(cors(corsOptions));           // 1. CORS
app.use(helmet());                    // 2. Security headers
app.use(express.json());              // 3. Parse JSON bodies
app.use(authMiddleware);              // 4. JWT validation → populates req.user
app.use(rateLimiter);                 // 5. User-based rate limiting (requires req.user from step 4)
// Routes registered after middleware
```

### Auth Middleware (`backend/src/middleware/auth.ts`)
```typescript
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export function authMiddleware(req, res, next) {
  // Skip auth for public endpoints
  const PUBLIC_PATHS = [
    'POST /api/v1/auth/register',
    'POST /api/v1/auth/login',
    'POST /api/v1/auth/forgot-password',
    'POST /api/v1/auth/reset-password',
    'POST /api/v1/gyms',
    `GET /api/v1/gyms/validate-invite`
  ];
  const requestKey = `${req.method} ${req.path.replace(/\/[a-f0-9-]{36}.*/, '')}`;
  if (PUBLIC_PATHS.some(p => req.originalUrl.includes(p.split(' ')[1]))) return next();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next(new AppError('UNAUTHORIZED', 401, 'Missing token'));

  try {
    const decoded: any = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!);
    const gymId = decoded.app_metadata?.gym_id;
    const role = decoded.app_metadata?.role ?? 'member';

    // gym_id required for all non-super_admin users
    if (!gymId && role !== 'super_admin') {
      return next(new AppError('UNAUTHORIZED', 401, 'Invalid token claims'));
    }

    req.user = { id: decoded.sub, gym_id: gymId, role };
    next();
  } catch (err) {
    return next(new AppError('UNAUTHORIZED', 401, 'Invalid or expired token'));
  }
}
```

### Rate Limiter (`backend/src/middleware/rateLimit.ts`)
```typescript
import rateLimit from "express-rate-limit";

// Default: 100 req/min per authenticated user (or IP if unauthenticated)
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, max: 100,
  keyGenerator: (req) => req.user?.id ?? req.ip,
  standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests.", status: 429 } })
});

// Auth: 5 req / 15 min / IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  keyGenerator: (req) => req.ip,
  standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).set("Retry-After", "900").json({ error: { code: "RATE_LIMITED", message: "Too many auth attempts.", status: 429 } })
});

// Invite validate: 10 req / min / IP
export const inviteLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  keyGenerator: (req) => req.ip,
  standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests.", status: 429 } })
});

// Gym registration: 3 req / hour / IP
export const gymRegistrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 3,
  keyGenerator: (req) => req.ip,
  standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many registration attempts.", status: 429 } })
});
```

Apply per-route limiters in router files:
```typescript
// gyms router:
router.post("/", gymRegistrationLimiter, gymRegistrationHandler);
router.get("/validate-invite/:code", inviteLimiter, validateInviteHandler);
// auth router:
router.post("/register", authLimiter, registerHandler);
router.post("/login", authLimiter, loginHandler);
router.post("/forgot-password", authLimiter, forgotPasswordHandler);
router.post("/reset-password", authLimiter, resetPasswordHandler);
```

### requireActiveUser Middleware (`backend/src/middleware/requireActiveUser.ts`)
Applied to ALL non-GET endpoints. Checks DB for suspension or deletion:
```typescript
import { supabase } from '../lib/supabase';

export async function requireActiveUser(req, res, next) {
  const { data, error } = await supabase
    .from('users')
    .select('is_active, deleted_at')
    .eq('id', req.user.id)
    .single();

  if (error || !data) return next(new AppError('UNAUTHORIZED', 401, 'User not found'));
  if (data.deleted_at) return next(new AppError('FORBIDDEN', 403, 'Account removed'));
  if (!data.is_active) return next(new AppError('FORBIDDEN', 403, 'Account suspended'));
  next();
}
```

### Error Handler (`backend/src/middleware/errorHandler.ts`)
```typescript
export class AppError extends Error {
  code: string;
  status: number;
  fields?: {field: string; message: string}[];

  constructor(code: string, status: number, message: string, fields?: any[]) {
    super(message);
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

// Global error handler — registered AFTER all routes
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const response: any = { error: { code, message: err.message, status } };
  if (err.fields) response.error.fields = err.fields;
  logger.error({ code, status, path: req.path, err: err.message });
  res.status(status).json(response);
}
```

### Supabase Client Singleton (`backend/src/lib/supabase.ts`)
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,   // Required for server-side usage
      persistSession: false       // Required for server-side usage
    }
  }
);
```
**Import `supabase` from this file in every route handler and script.** Never call `createClient` elsewhere.

### Logger (`backend/src/lib/logger.ts`)
```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined
});
```

### Standard Success Response
```json
{
  "data": {},
  "meta": {
    "pagination": {
      "cursor": "2026-04-01T00:00:00.000Z",
      "has_more": true,
      "limit": 20
    }
  }
}
```
- `meta.pagination` present only on paginated list endpoints
- List endpoints: `"data": {"items": [...], "total": 42}` (omit `total` for infinite-scroll feeds)
- Single resource endpoints: `"data": {<object>}`

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "status": 422,
    "fields": [
      {"field": "username", "message": "Already taken"},
      {"field": "email", "message": "Invalid email format"}
    ]
  }
}
```
`fields` array only present on `VALIDATION_ERROR` (422). All other codes omit it.

In **development** (`NODE_ENV !== 'production'`): include stack traces in error responses. In **production**: never expose stack traces.

### Error Codes
| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `UNAUTHORIZED` | 401 | Missing, invalid, or expired JWT; missing gym_id in claims |
| `FORBIDDEN` | 403 | Valid JWT but wrong role, wrong gym, suspended, or deleted account |
| `NOT_FOUND` | 404 | Resource does not exist or access denied (same response to prevent enumeration) |
| `VALIDATION_ERROR` | 422 | Zod validation failed; includes `fields` array |
| `CONFLICT` | 409 | Unique constraint violation |
| `GYM_SUSPENDED` | 403 | Subscription expired and grace period elapsed |
| `INVITE_INVALID` | 404 | Invite code not found or inactive |
| `MEDIA_LIMIT_EXCEEDED` | 422 | Workout already has maximum allowed media |
| `RATE_LIMITED` | 429 | Too many requests; response includes `Retry-After` header |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

### Rate Limiting
- `GET /api/v1/gyms/validate-invite/:code`: 10 requests/minute/IP (unauthenticated)
- `POST /api/v1/gyms` (gym registration): 3 requests/hour/IP (bot prevention)
- `POST /api/v1/auth/*`: 5 requests/15 minutes/IP
- All other authenticated endpoints: 100 requests/minute/user (`keyGenerator: req => req.user?.id ?? req.ip`)

### Pagination

**Cursor-based** (feeds, history, notifications):
- Sort: newest-first
- Query param: `?cursor=<ISO8601>&limit=20` (default 20, max 50)
- Server compares: `WHERE <timestamp_field> < :cursor ORDER BY <timestamp_field> DESC LIMIT :limit`
- Cursor field per endpoint:

| Endpoint | Cursor Field |
|----------|-------------|
| `GET /feed` | `workouts.started_at` |
| `GET /workouts/history` | `workouts.started_at` |
| `GET /users/:id/workouts` | `workouts.started_at` |
| `GET /notifications` | `notifications.created_at` |
| `GET /workouts/:id/comments` | `workout_comments.created_at` |
| `GET /workouts/:id/likes` | `workout_likes.created_at` |
| `GET /users/:id/followers` | `follows.created_at` |
| `GET /users/:id/following` | `follows.created_at` |
| `GET /analytics/measurements` | `body_measurements.measured_at` |
| `GET /analytics/reports` | `monthly_reports.created_at` |

**Offset-based** (admin panel tables):
- `?page=1&limit=25` (default 25, max 100)

### Weight & Circumference Units
- Weights: always stored and transmitted in **kg**. Mobile converts for display using `user_settings.weight_unit`. `LBS_TO_KG = 0.453592` in `shared/types/index.ts`.
- Circumferences: always stored and transmitted in **cm**. `INCH_TO_CM = 2.54` in `shared/types/index.ts`.

---

## 5. Database Schema

### Migration Tooling
```bash
npm install -g supabase
supabase link --project-ref <your-project-ref> --password <db-password>
# Create files in supabase/migrations/ then:
supabase db push
```

### Migration Order (one file per table/concern, applied in order)
```
001_gyms.sql
002_users.sql               ← BEFORE routine_folders (which references users)
003_routine_folders.sql
004_exercises.sql
005_routines.sql
006_routine_exercises.sql
007_routine_sets.sql
008_workouts.sql
009_workout_exercises.sql
010_workout_sets.sql
011_personal_records.sql
012_body_measurements.sql
013_measurement_photos.sql
014_workout_media.sql
015_follows.sql
016_workout_likes.sql
017_workout_comments.sql
018_gym_announcements.sql
019_notifications.sql
020_user_push_tokens.sql
021_streaks.sql
022_user_settings.sql
023_user_badges.sql
024_monthly_reports.sql
025_leaderboard_snapshots.sql
026_leaderboard_challenges.sql
027_challenge_results.sql
028_ai_trainer_programs.sql
029_pre_built_routines.sql
030_indexes.sql
031_triggers.sql            ← updated_at auto-update triggers
032_rls_policies.sql
033_storage_policies.sql
034_auth_hook.sql           ← Auth Hook function (AFTER users table exists)
```

---

### gyms
```sql
CREATE TABLE gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  location TEXT,
  description TEXT,
  invite_code VARCHAR(10) UNIQUE NOT NULL,
  accent_color VARCHAR(7) DEFAULT '#FF6B35',
  is_active BOOLEAN DEFAULT true,
  subscription_status VARCHAR(20) DEFAULT 'trial'
    CHECK (subscription_status IN ('trial','active','expired','cancelled')),
  subscription_tier VARCHAR(20)
    CHECK (subscription_tier IN ('starter','growth','unlimited')),
  subscription_expires_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### users
```sql
-- Created BEFORE routine_folders (routine_folders.user_id references this)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(30) UNIQUE NOT NULL
    CHECK (username ~ '^[a-zA-Z0-9_]+$' AND char_length(username) >= 3),
  full_name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  role VARCHAR(20) DEFAULT 'member'
    CHECK (role IN ('member','gym_owner','super_admin')),
  sex VARCHAR(10) CHECK (sex IN ('male','female')),
  date_of_birth DATE,
  bodyweight_kg DECIMAL(5,2) CHECK (bodyweight_kg > 0 AND bodyweight_kg < 700),
  is_profile_private BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Soft Delete Procedure:**
```sql
UPDATE users SET
  deleted_at = NOW(),
  full_name = 'Deleted User',
  email = 'deleted_' || id::text || '@ironpath.invalid',
  avatar_url = NULL,
  bio = NULL,
  is_active = false
WHERE id = :user_id;
```
After this: run a backend function that updates all `leaderboard_snapshots.rankings` JSONB entries for this user (set `display_name = 'Deleted User'`, `avatar_url = null`).

---

### routine_folders
```sql
-- Created AFTER users (references users.id)
CREATE TABLE routine_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### exercises
```sql
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id),        -- NULL = global WGER exercise
  created_by UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  image_url TEXT,
  animation_url TEXT,
  equipment VARCHAR(50)
    CHECK (equipment IN ('barbell','dumbbell','machine','cable',
      'bodyweight','resistance_band','kettlebell','other')),
  primary_muscles TEXT[] NOT NULL DEFAULT '{}',
  secondary_muscles TEXT[] NOT NULL DEFAULT '{}',
  logging_type VARCHAR(20) DEFAULT 'weight_reps'
    CHECK (logging_type IN ('weight_reps','bodyweight_reps','duration','distance')),
  is_custom BOOLEAN DEFAULT false,
  is_gym_template BOOLEAN DEFAULT false,
  wger_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate names within same gym (case-insensitive, custom exercises only)
CREATE UNIQUE INDEX idx_exercises_unique_name_per_gym
  ON exercises(gym_id, lower(name))
  WHERE gym_id IS NOT NULL;
```

**Visibility Rules:**
- `gym_id IS NULL` → global (everyone)
- `gym_id IS NOT NULL AND is_gym_template = true` → all members of that gym
- `gym_id IS NOT NULL AND is_gym_template = false` → only `created_by` user

---

### routines
```sql
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  folder_id UUID REFERENCES routine_folders(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_gym_template BOOLEAN DEFAULT false,
  source_routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### routine_exercises
```sql
CREATE TABLE routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID REFERENCES routines(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  position INTEGER NOT NULL,
  superset_group INTEGER CHECK (superset_group > 0),
  rest_seconds INTEGER DEFAULT 90,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### routine_sets
```sql
CREATE TABLE routine_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_exercise_id UUID REFERENCES routine_exercises(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  set_type VARCHAR(20) DEFAULT 'normal'
    CHECK (set_type IN ('normal','warmup','dropset','failure')),
  target_weight_kg DECIMAL(7,2) CHECK (target_weight_kg >= 0),
  target_reps INTEGER CHECK (target_reps > 0),
  target_reps_min INTEGER CHECK (target_reps_min > 0),
  target_reps_max INTEGER CHECK (target_reps_max > 0),
  target_duration_seconds INTEGER CHECK (target_duration_seconds > 0),
  target_distance_meters DECIMAL(8,2) CHECK (target_distance_meters > 0),
  UNIQUE(routine_exercise_id, position)   -- prevent duplicate positions
);
```

---

### workouts
```sql
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  -- Volume calculation: see Section 9.4
  total_volume_kg DECIMAL(12,2) DEFAULT 0 CHECK (total_volume_kg >= 0),
  total_sets INTEGER DEFAULT 0 CHECK (total_sets >= 0),
  visibility VARCHAR(20) DEFAULT 'public'
    CHECK (visibility IN ('public','followers','private')),
  is_completed BOOLEAN DEFAULT false,
  -- Celebratory counter; not recalculated on deletion; non-unique (simultaneous saves ok)
  ordinal_number INTEGER,
  -- NOT NULL: client MUST generate and send a UUID before first save attempt
  -- Prevents duplicate workouts on network retry
  idempotency_key UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, idempotency_key)
);
```

---

### workout_exercises
```sql
CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  position INTEGER NOT NULL,
  superset_group INTEGER CHECK (superset_group > 0),
  rest_seconds INTEGER DEFAULT 90,
  notes TEXT
);
```

---

### workout_sets
```sql
CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID REFERENCES workout_exercises(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  set_type VARCHAR(20) DEFAULT 'normal'
    CHECK (set_type IN ('normal','warmup','dropset','failure')),
  weight_kg DECIMAL(7,2) CHECK (weight_kg >= 0),
  reps INTEGER CHECK (reps >= 0 AND reps <= 10000),
  duration_seconds INTEGER CHECK (duration_seconds >= 0),
  distance_meters DECIMAL(8,2) CHECK (distance_meters >= 0),
  rpe DECIMAL(3,1) CHECK (rpe >= 6.0 AND rpe <= 10.0),
  is_completed BOOLEAN DEFAULT false,
  is_warmup_counted BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(workout_exercise_id, position)   -- prevent duplicate positions
);
```

---

### personal_records
```sql
CREATE TABLE personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  -- NULL for session-aggregate records (best_volume_session, longest_distance)
  workout_set_id UUID REFERENCES workout_sets(id) ON DELETE SET NULL,
  record_type VARCHAR(30) NOT NULL
    CHECK (record_type IN (
      'heaviest_weight', 'projected_1rm', 'best_volume_set',
      'best_volume_session', 'most_reps', '3rm', '5rm', '10rm',
      'longest_duration',   -- for duration-logging exercises (value = seconds)
      'longest_distance'    -- for distance-logging exercises (value = meters)
    )),
  -- Value in kg for weight records; reps for rep records; seconds for duration; meters for distance
  value DECIMAL(12,2) NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- Multiple records per type kept as history; current best = MAX(value) per user+exercise+type
);
```

---

### body_measurements
```sql
CREATE TABLE body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL,
  bodyweight_kg DECIMAL(5,2) CHECK (bodyweight_kg > 0 AND bodyweight_kg < 700),
  body_fat_percentage DECIMAL(4,1) CHECK (body_fat_percentage >= 0 AND body_fat_percentage <= 100),
  neck_cm DECIMAL(5,1) CHECK (neck_cm > 0),
  chest_cm DECIMAL(5,1) CHECK (chest_cm > 0),
  waist_cm DECIMAL(5,1) CHECK (waist_cm > 0),
  hips_cm DECIMAL(5,1) CHECK (hips_cm > 0),
  left_arm_cm DECIMAL(5,1) CHECK (left_arm_cm > 0),
  right_arm_cm DECIMAL(5,1) CHECK (right_arm_cm > 0),
  left_forearm_cm DECIMAL(5,1) CHECK (left_forearm_cm > 0),
  right_forearm_cm DECIMAL(5,1) CHECK (right_forearm_cm > 0),
  left_thigh_cm DECIMAL(5,1) CHECK (left_thigh_cm > 0),
  right_thigh_cm DECIMAL(5,1) CHECK (right_thigh_cm > 0),
  left_calf_cm DECIMAL(5,1) CHECK (left_calf_cm > 0),
  right_calf_cm DECIMAL(5,1) CHECK (right_calf_cm > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### measurement_photos
```sql
CREATE TABLE measurement_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID REFERENCES body_measurements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- relative Supabase Storage path for deletion
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### workout_media
```sql
CREATE TABLE workout_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('photo','video')),
  url TEXT NOT NULL,              -- public CDN URL (derived from storage_path)
  storage_path TEXT NOT NULL,     -- relative path in Supabase Storage bucket
                                  -- e.g. "{gym_id}/{user_id}/{workout_id}/photo_0.jpg"
                                  -- Used for moving/deleting files. URL is derived on-the-fly.
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- Limit: 2 photos + 1 video per workout; enforced at API layer
);
```

---

### follows
```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active','pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
  -- Same-gym enforcement: API verifies both users share gym_id before insert
);
```

---

### workout_likes
```sql
CREATE TABLE workout_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workout_id, user_id)
);
```

---

### workout_comments
```sql
CREATE TABLE workout_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  deleted_at TIMESTAMPTZ,  -- soft delete only; comments cannot be edited
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### gym_announcements
```sql
CREATE TABLE gym_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,  -- NULL = never expires
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'like', 'comment', 'mention', 'follow', 'follow_request',
    'follow_request_approved', 'pr', 'announcement',
    'leaderboard', 'streak_milestone', 'badge_unlocked',
    'weekly_nudge', 'monthly_report_ready'
  )),
  title VARCHAR(255) NOT NULL,
  body TEXT,
  -- data JSONB: IDs only (never full objects) to keep push payload under 3KB
  -- like/comment/mention: {"workout_id":"uuid","actor_user_id":"uuid"}
  -- follow/follow_request/follow_request_approved: {"actor_user_id":"uuid"}
  -- pr: {"exercise_id":"uuid","record_type":"heaviest_weight","value":120.0}
  -- announcement: {"announcement_id":"uuid"}
  -- leaderboard: {"category":"heaviest_lift","rank":1}
  -- streak_milestone: {"weeks":4}
  -- badge_unlocked: {"badge_key":"iron_month"}
  -- monthly_report_ready: {"report_id":"uuid","period":"2026-03-01"}
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- Deleted in batches by daily cron after 90 days
);
```

---

### user_push_tokens
```sql
CREATE TABLE user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios','android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);
```

---

### streaks
```sql
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  current_streak_weeks INTEGER DEFAULT 0,
  longest_streak_weeks INTEGER DEFAULT 0,
  -- ISO week Monday start date (UTC)
  last_workout_week DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Streak Rules:**
- Week = Monday 00:00 UTC to Sunday 23:59:59 UTC
- On workout save: compute ISO week Monday of `started_at` (UTC)
- `last_workout_week + 7 days` = same → no change (already logged this week)
- `computed_week = last_workout_week + 7 days` → streak continues: `current += 1`
- `computed_week > last_workout_week + 7 days` → broken: `current = 1`
- `last_workout_week IS NULL` → first ever: `current = 1`
- Update `longest = MAX(longest, current)`, update `last_workout_week`
- Back-logged workouts: trigger full recalculation from scratch (all workouts ordered by `started_at ASC`)
- Streak broken cron (Monday 00:05 UTC): reset `current = 0` for users where `last_workout_week < date_trunc('week', NOW() - INTERVAL '7 days')::date`

---

### user_settings
```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  weight_unit VARCHAR(5) DEFAULT 'kg' CHECK (weight_unit IN ('kg','lbs')),
  default_rest_seconds INTEGER DEFAULT 90 CHECK (default_rest_seconds > 0),
  previous_values_mode VARCHAR(20) DEFAULT 'overall'
    CHECK (previous_values_mode IN ('overall','within_routine')),
  warm_up_sets_in_stats BOOLEAN DEFAULT false,
  keep_awake_during_workout BOOLEAN DEFAULT true,
  rpe_tracking_enabled BOOLEAN DEFAULT false,
  smart_superset_scrolling BOOLEAN DEFAULT true,
  inline_timer_enabled BOOLEAN DEFAULT true,
  live_pr_notification_enabled BOOLEAN DEFAULT true,
  timer_sound_volume INTEGER DEFAULT 80 CHECK (timer_sound_volume BETWEEN 0 AND 100),
  pr_sound_volume INTEGER DEFAULT 80 CHECK (pr_sound_volume BETWEEN 0 AND 100),
  warmup_calculator_steps JSONB DEFAULT '[{"percentage":40,"reps":10},{"percentage":60,"reps":5},{"percentage":80,"reps":3},{"percentage":90,"reps":1}]',
  plate_calculator_bar_kg DECIMAL(4,1) DEFAULT 20.0,
  notif_likes BOOLEAN DEFAULT true,
  notif_comments BOOLEAN DEFAULT true,
  notif_follows BOOLEAN DEFAULT true,
  notif_prs BOOLEAN DEFAULT true,
  notif_announcements BOOLEAN DEFAULT true,
  notif_leaderboard BOOLEAN DEFAULT true,
  notif_streak_milestones BOOLEAN DEFAULT true,
  notif_weekly_nudge BOOLEAN DEFAULT true,
  timezone VARCHAR(100) DEFAULT 'UTC', -- IANA format e.g. 'Africa/Cairo'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Row auto-created with defaults on user registration
```

---

### user_badges
```sql
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  badge_key VARCHAR(50) NOT NULL CHECK (badge_key IN (
    'first_rep','ten_strong','half_century','century',
    'iron_month','iron_quarter','pr_machine','heavy_lifter',
    'consistent','early_bird','night_owl','gym_legend'
  )),
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);
```

---

### monthly_reports
```sql
CREATE TABLE monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  report_period_start DATE NOT NULL,  -- 2026-03-01 for monthly; 2025-01-01 for yearly
  report_type VARCHAR(10) NOT NULL CHECK (report_type IN ('monthly','yearly')),
  report_data JSONB NOT NULL,         -- see Section 10.5 and 10.6 for structure
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, report_period_start, report_type)
);
```

---

### leaderboard_snapshots
```sql
CREATE TABLE leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'heaviest_lift','most_volume_week','most_volume_month',
    'most_volume_alltime','most_workouts_week','most_workouts_month',
    'most_workouts_alltime','longest_streak'
  )),
  period VARCHAR(20) NOT NULL CHECK (period IN ('weekly','monthly','all_time')),
  period_start DATE,
  period_end DATE,
  -- Max 50 entries: [{"rank":1,"user_id":"uuid","display_name":"Ahmed","avatar_url":"...","value":200.5}]
  rankings JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique indexes for upsert (exercise_id can be NULL for non-lift categories)
CREATE UNIQUE INDEX idx_lb_snapshot_unique_nolift
  ON leaderboard_snapshots(gym_id, category, period, COALESCE(period_start, '1900-01-01'))
  WHERE exercise_id IS NULL;

CREATE UNIQUE INDEX idx_lb_snapshot_unique_lift
  ON leaderboard_snapshots(gym_id, category, period, COALESCE(period_start, '1900-01-01'), exercise_id)
  WHERE exercise_id IS NOT NULL;
-- Use ON CONFLICT DO UPDATE SET rankings = EXCLUDED.rankings, generated_at = NOW()
-- when upserting snapshots
```

---

### leaderboard_challenges
```sql
CREATE TABLE leaderboard_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  metric VARCHAR(50) NOT NULL CHECK (metric IN (
    'total_volume','workout_count','exercise_volume','exercise_1rm'
  )),
  -- exercise_id REQUIRED when metric IN ('exercise_volume','exercise_1rm')
  -- Enforced at API layer via zod: if metric requires it, exercise_id must be present
  exercise_id UUID REFERENCES exercises(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'upcoming'
    CHECK (status IN ('upcoming','active','completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### challenge_results
```sql
CREATE TABLE challenge_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES leaderboard_challenges(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  final_rankings JSONB NOT NULL DEFAULT '[]',  -- same format as leaderboard_snapshots.rankings
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id)  -- one result per challenge
);
```

---

### ai_trainer_programs
```sql
CREATE TABLE ai_trainer_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  goal VARCHAR(20) NOT NULL CHECK (goal IN ('strength','hypertrophy','endurance','general')),
  experience_level VARCHAR(20) NOT NULL
    CHECK (experience_level IN ('beginner','intermediate','advanced')),
  days_per_week INTEGER NOT NULL CHECK (days_per_week BETWEEN 2 AND 6),
  equipment VARCHAR(20) NOT NULL
    CHECK (equipment IN ('full_gym','dumbbells','bodyweight','home_mixed')),
  is_active BOOLEAN DEFAULT true,
  is_paused BOOLEAN DEFAULT false,
  program_template_key VARCHAR(100) NOT NULL,
  -- progression_data JSONB structure:
  -- {
  --   "total_program_sessions_completed": 0,
  --   "increment_multiplier": 1.0,
  --   "override_bias": 0,
  --   "exercises": {
  --     "<exercise_uuid>": {
  --       "current_weight_kg": 60.0,
  --       "current_reps": 5,
  --       "consecutive_failures": 0,
  --       "consecutive_successes": 0,
  --       "last_session_date": "2026-04-01",
  --       "total_sessions_logged": 0,
  --       "override_history": [
  --         {"date":"2026-04-01","prescribed_kg":60,"override_kg":65,"direction":"up"}
  --       ]
  --     }
  --   }
  -- }
  progression_data JSONB NOT NULL DEFAULT '{"total_program_sessions_completed":0,"increment_multiplier":1.0,"override_bias":0,"exercises":{}}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### pre_built_routines
```sql
CREATE TABLE pre_built_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'gym','home','dumbbells','bodyweight',
    'cardio_hiit','resistance_band','travel','suspension'
  )),
  level VARCHAR(20) NOT NULL CHECK (level IN ('beginner','intermediate','advanced')),
  goal VARCHAR(20) CHECK (goal IN ('strength','hypertrophy','endurance','weight_loss','general')),
  equipment_required TEXT[] NOT NULL DEFAULT '{}',
  days_per_week INTEGER,
  -- program_data JSONB: see structure in seed-prebuilt-routines.js comments
  program_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Indexes (030_indexes.sql)
```sql
CREATE INDEX idx_users_gym_id ON users(gym_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_exercises_gym_id ON exercises(gym_id);
CREATE INDEX idx_exercises_name_fts ON exercises USING gin(to_tsvector('english', name));
CREATE INDEX idx_routines_user_id ON routines(user_id);
CREATE INDEX idx_routines_gym_id ON routines(gym_id);
CREATE INDEX idx_routine_exercises_routine_id ON routine_exercises(routine_id);
CREATE INDEX idx_routine_sets_routine_exercise_id ON routine_sets(routine_exercise_id);
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_gym_id ON workouts(gym_id);
CREATE INDEX idx_workouts_started_at ON workouts(started_at DESC);
CREATE INDEX idx_workouts_gym_feed ON workouts(gym_id, visibility, started_at DESC);
CREATE INDEX idx_workouts_user_completed ON workouts(user_id, is_completed, started_at DESC);
CREATE INDEX idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX idx_workout_sets_workout_exercise_id ON workout_sets(workout_exercise_id);
CREATE INDEX idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);
CREATE INDEX idx_personal_records_leaderboard
  ON personal_records(gym_id, exercise_id, record_type, value DESC);
CREATE INDEX idx_body_measurements_user_id ON body_measurements(user_id, measured_at DESC);
CREATE INDEX idx_workout_media_workout_id ON workout_media(workout_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_follows_active ON follows(follower_id, following_id) WHERE status = 'active';
CREATE INDEX idx_workout_likes_workout_id ON workout_likes(workout_id);
CREATE INDEX idx_workout_comments_workout_id ON workout_comments(workout_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_monthly_reports_user ON monthly_reports(user_id, report_period_start DESC);
```

---

### updated_at Triggers (031_triggers.sql)
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER set_updated_at_gyms
  BEFORE UPDATE ON gyms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_routines
  BEFORE UPDATE ON routines FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_workouts
  BEFORE UPDATE ON workouts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_user_settings
  BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_gym_announcements
  BEFORE UPDATE ON gym_announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_leaderboard_challenges
  BEFORE UPDATE ON leaderboard_challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_ai_trainer_programs
  BEFORE UPDATE ON ai_trainer_programs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 6. RLS Policies (032_rls_policies.sql)

Enable RLS on all tables. Backend uses `service_role` (bypasses RLS). RLS is a safety net.

```sql
-- Enable RLS on all tables
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_trainer_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_built_routines ENABLE ROW LEVEL SECURITY;

-- Helper: gym_id from JWT claims
CREATE OR REPLACE FUNCTION auth_gym_id() RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'gym_id')::uuid;
$$ LANGUAGE sql STABLE;

-- ═══════════════════════════════════════
-- GYM-SCOPED TABLES (gym_id column)
-- ═══════════════════════════════════════

-- workouts: gym members can read public/followers workouts; own user can read all own workouts
CREATE POLICY "gym_workouts_read" ON workouts FOR SELECT USING (
  gym_id = auth_gym_id() AND (
    visibility = 'public'
    OR user_id = auth.uid()
    OR (visibility = 'followers' AND EXISTS(
      SELECT 1 FROM follows WHERE follower_id = auth.uid()
        AND following_id = workouts.user_id AND status = 'active'
    ))
  )
);
CREATE POLICY "gym_workouts_insert" ON workouts FOR INSERT WITH CHECK (
  user_id = auth.uid() AND gym_id = auth_gym_id()
);
CREATE POLICY "gym_workouts_update" ON workouts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "gym_workouts_delete" ON workouts FOR DELETE USING (user_id = auth.uid());

-- users: gym members can read other users in same gym (profile data)
CREATE POLICY "gym_users_read" ON users FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "own_user_update" ON users FOR UPDATE USING (id = auth.uid());

-- exercises: global (gym_id IS NULL) + same gym exercises
CREATE POLICY "exercises_read" ON exercises FOR SELECT USING (
  gym_id IS NULL OR gym_id = auth_gym_id()
);
CREATE POLICY "exercises_insert" ON exercises FOR INSERT WITH CHECK (gym_id = auth_gym_id());
CREATE POLICY "exercises_update" ON exercises FOR UPDATE USING (
  created_by = auth.uid() OR (is_gym_template = true AND EXISTS(
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'gym_owner'
  ))
);

-- Gym-scoped read for all remaining gym-scoped tables:
CREATE POLICY "gym_read_routines" ON routines FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_routine_folders" ON routine_folders FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_follows" ON follows FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_workout_likes" ON workout_likes FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_workout_comments" ON workout_comments FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_announcements" ON gym_announcements FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_leaderboard_snapshots" ON leaderboard_snapshots FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_leaderboard_challenges" ON leaderboard_challenges FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_challenge_results" ON challenge_results FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_personal_records" ON personal_records FOR SELECT USING (gym_id = auth_gym_id());

-- ═══════════════════════════════════════
-- USER-SCOPED TABLES (user_id = auth.uid())
-- ═══════════════════════════════════════
CREATE POLICY "own_user_settings" ON user_settings FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_streaks" ON streaks FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_user_badges" ON user_badges FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_monthly_reports" ON monthly_reports FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_ai_trainer" ON ai_trainer_programs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_notifications" ON notifications FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_push_tokens" ON user_push_tokens FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_body_measurements" ON body_measurements FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_measurement_photos" ON measurement_photos FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_workout_exercises" ON workout_exercises FOR SELECT USING (
  EXISTS(SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.gym_id = auth_gym_id())
);
CREATE POLICY "own_workout_sets" ON workout_sets FOR SELECT USING (
  EXISTS(SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = workout_exercise_id AND w.gym_id = auth_gym_id())
);
CREATE POLICY "own_routine_exercises" ON routine_exercises FOR SELECT USING (
  EXISTS(SELECT 1 FROM routines r WHERE r.id = routine_id AND r.gym_id = auth_gym_id())
);
CREATE POLICY "own_routine_sets" ON routine_sets FOR SELECT USING (
  EXISTS(SELECT 1 FROM routine_exercises re
    JOIN routines r ON r.id = re.routine_id
    WHERE re.id = routine_exercise_id AND r.gym_id = auth_gym_id())
);

-- pre_built_routines: readable by all authenticated users
CREATE POLICY "prebuilt_read_all" ON pre_built_routines FOR SELECT USING (auth.uid() IS NOT NULL);
```

---

## 7. Supabase Storage Policies (033_storage_policies.sql)

```sql
-- ═══════════ avatars (public read) ═══════════
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_owner_write" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ═══════════ gym-assets (public read) ═══════════
INSERT INTO storage.buckets (id, name, public) VALUES ('gym-assets', 'gym-assets', true);
CREATE POLICY "gym_assets_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'gym-assets');
CREATE POLICY "gym_assets_owner_write" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'gym-assets'
  AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'gym_id')
  AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('gym_owner','super_admin')
);

-- ═══════════ workout-media (gym members only) ═══════════
INSERT INTO storage.buckets (id, name, public) VALUES ('workout-media', 'workout-media', false);
CREATE POLICY "workout_media_gym_read" ON storage.objects FOR SELECT USING (
  bucket_id = 'workout-media'
  AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'gym_id')
);
-- Write: user can only upload to their own user folder
CREATE POLICY "workout_media_owner_write" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'workout-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
CREATE POLICY "workout_media_owner_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'workout-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- ═══════════ exercise-assets (public read, write via service_role only) ═══════════
INSERT INTO storage.buckets (id, name, public) VALUES ('exercise-assets', 'exercise-assets', true);
CREATE POLICY "exercise_assets_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'exercise-assets');
-- Write: service_role only (WGER import script). No authenticated-user write policy.

-- ═══════════ progress-photos (owner only) ═══════════
INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', false);
CREATE POLICY "progress_photos_owner_all" ON storage.objects FOR ALL USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 8. Phase 1 — Foundation & Auth

### 8.1 Auth Hook (034_auth_hook.sql — runs AFTER 002_users.sql)

```sql
-- SECURITY DEFINER required: hook runs in auth context without users table permission
-- Grant required: supabase_auth_admin must execute this function
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims JSONB;
  user_gym_id UUID;
  user_role TEXT;
BEGIN
  SELECT gym_id, role INTO user_gym_id, user_role
  FROM public.users
  WHERE id = (event->>'user_id')::uuid;

  claims := event->'claims';

  IF user_gym_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata,gym_id}', to_jsonb(user_gym_id::text));
  END IF;

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Required grant for Supabase Auth to execute the hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
```

Register in Supabase Dashboard → Authentication → Hooks → "Customize Access Token (JWT) Hook" → select `public.custom_access_token_hook`.

**JWT will then contain:**
```json
{"sub": "user-uuid", "app_metadata": {"gym_id": "gym-uuid", "role": "member"}}
```

### 8.2 Gym Owner Registration

**Correct order** (Supabase Auth cannot participate in a PostgreSQL transaction):
```
1. Create Supabase Auth user: supabase.auth.admin.createUser({email, password, email_confirm: true})
   → Capture auth_user_id
   → If fails: return error (nothing to roll back)

2. Begin PostgreSQL transaction:
   a. Generate invite_code (6-char, retry up to 5× on collision — see 8.5)
   b. INSERT INTO gyms → capture gym_id
   c. INSERT INTO users (id=auth_user_id, gym_id, role='gym_owner', ...)
   d. INSERT INTO user_settings (user_id=auth_user_id) — all defaults
   e. INSERT INTO streaks (user_id=auth_user_id, gym_id)

3. If DB transaction fails:
   → ROLLBACK
   → supabase.auth.admin.deleteUser(auth_user_id)  -- compensating delete
   → Return INTERNAL_ERROR

4. Send welcome email via Resend with invite code and app download link
```

### 8.3 Member Registration

```
1. GET /api/v1/gyms/validate-invite/:code → {gym_id, gym_name, logo_url}
2. User completes registration form
3. POST /api/v1/auth/register (body includes invite_code)
4. Backend:
   a. Re-validate invite_code (code may have changed since step 1)
   b. Create Supabase Auth user
   c. DB transaction: INSERT users, user_settings, streaks
   d. If DB fails: supabase.auth.admin.deleteUser(auth_user_id), return error
5. Return {access_token, refresh_token}
6. Client stores tokens in expo-secure-store; navigates to home feed
```

**Username rules:** 3–30 chars, `^[a-zA-Z0-9_]+$`, globally unique, immutable after registration.

### 8.4 Token Storage

- Both tokens stored in `expo-secure-store` (raw string, no `Bearer` prefix)
- If token exceeds 2048 bytes (Android limit on some devices): store only refresh token; fetch fresh access token on every app launch via `POST /api/v1/auth/refresh`
- On app launch: attempt silent access token refresh
- On refresh failure: clear both tokens, redirect to login

### 8.5 Invite Code Rules
- 6 characters, uppercase
- Excluded: O (oh), 0 (zero), I (eye), 1 (one)
- Character set: A B C D E F G H J K L M N P Q R S T U V W X Y Z 2 3 4 5 6 7 8 9
- Generation: random selection from character set; verify UNIQUE in `gyms` table; retry up to 5× on collision

### 8.6 Password Reset Deep Link

**Three required configuration steps:**

1. Supabase Dashboard → Authentication → URL Configuration:
   - Site URL: `https://ironpath.app`
   - Add redirect URL: `ironpath://reset-password`

2. `mobile/app.json`: `"scheme": "ironpath"` (already in app.json template)

3. `mobile/app/reset-password.tsx`: Handle incoming URL, extract `token` query param, call `POST /api/v1/auth/reset-password`

### 8.7 Super Admin Seed Script (`backend/scripts/seed-super-admin.js`)

```javascript
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seedSuperAdmin() {
  // Idempotency: check if already exists
  const { data: existing } = await supabase.from('users')
    .select('id').eq('email', process.env.SUPER_ADMIN_EMAIL).maybeSingle();
  if (existing) { console.log('Super admin already exists'); return; }

  // 1. Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
    email_confirm: true
  });
  if (authError) throw authError;

  // 2. Create system gym (super admin needs a gym_id — NOT NULL constraint)
  const { data: gym, error: gymError } = await supabase.from('gyms').insert({
    name: 'IronPath System',
    invite_code: 'SYSTEM',
    subscription_status: 'active',
    subscription_tier: 'unlimited'
  }).select().single();
  if (gymError) { await supabase.auth.admin.deleteUser(authUser.user.id); throw gymError; }

  // 3. Insert user, settings, streaks
  const { error: userError } = await supabase.from('users').insert({
    id: authUser.user.id, gym_id: gym.id,
    email: process.env.SUPER_ADMIN_EMAIL,
    username: 'ironpath_admin', full_name: 'IronPath Admin', role: 'super_admin'
  });
  if (userError) { await supabase.auth.admin.deleteUser(authUser.user.id); throw userError; }

  await supabase.from('user_settings').insert({ user_id: authUser.user.id });
  await supabase.from('streaks').insert({ user_id: authUser.user.id, gym_id: gym.id });
  console.log('Super admin created:', process.env.SUPER_ADMIN_EMAIL);
}
seedSuperAdmin().catch(err => { console.error(err); process.exit(1); });
```

### 8.8 Admin Panel Session Management

Admin panel login flow:
1. Login form calls `POST /api/v1/auth/login` → receives `{access_token, refresh_token}`
2. Store both in `localStorage` (browser)
3. Axios instance with interceptor:
```javascript
// admin/src/lib/api.js
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
axios.interceptors.response.use(null, async error => {
  if (error.response?.status === 401) {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) { window.location.href = '/login'; return; }
    const res = await axios.post('/api/v1/auth/refresh', {refresh_token: refresh});
    localStorage.setItem('access_token', res.data.data.access_token);
    return axios(error.config); // retry original request
  }
  if (error.response?.status === 403) {
    window.location.href = '/access-denied'; // show 403 page, redirect to dashboard
  }
  return Promise.reject(error);
});
```

---

### 8.9 Mobile Supabase Client (`mobile/src/lib/supabase.ts`)

The mobile app uses Supabase with the **anon key** only for direct Storage uploads (pre-save media, Section 9.5).
All other data operations go through the backend REST API.

```typescript
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabaseMobile = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

**Usage:** Import `supabaseMobile` only for Storage uploads in Section 9.5. After login, sync session:

```typescript
// After successful login from backend:
await supabaseMobile.auth.setSession({
  access_token: backendResponse.access_token,
  refresh_token: backendResponse.refresh_token
});
```


## 9. Phase 2 — Workout Engine

### 9.1 Exercise Library — WGER Import

Script: `backend/scripts/import-wger.js`  
Run from backend directory: `cd backend && node scripts/import-wger.js`

**Verified WGER API structure (verify before building by calling the live API):**
- Endpoint: `GET https://wger.de/api/v2/exerciseinfo/?format=json&language=2&limit=100&offset=0`
- `language=2` filters English only. If `exercise.translations.find()` returns no result for language 2, skip the exercise.
- `exercise.muscles` = array of `{id, name_en, ...}` objects → use `.id`
- `exercise.muscles_secondary` = same structure
- `exercise.equipment` = array of `{id, name, ...}` objects → use `[0]?.id`
- `exercise.images` = array of `{image, is_main, ...}` → use `.image` (URL)
- `exercise.translations` = array of `{language, name, description, ...}` where `language` is an **integer ID** (2 = English)

**Verify WGER equipment IDs before hardcoding:** Call `GET https://wger.de/api/v2/equipment/?format=json` and use the actual response. Do not use assumed IDs. The verified IDs at time of writing (confirm at build time):
```javascript
// backend/scripts/wger-equipment-map.js
// IMPORTANT: Verify against live API: GET https://wger.de/api/v2/equipment/?format=json
module.exports = {
  1:  "barbell",          // Barbell
  2:  "barbell",          // SZ-Bar (EZ curl bar)
  3:  "dumbbell",         // Dumbbell
  4:  "other",            // Gym mat
  5:  "other",            // Swiss ball
  6:  "bodyweight",       // Pull-up bar
  7:  "other",            // Bench
  8:  "other",            // Incline bench
  9:  "kettlebell",       // Kettlebell
  10: "cable",            // Cable
  11: "machine",          // Machine
  12: "bodyweight",       // Body weight (no equipment)
  13: "resistance_band",  // Resistance band
  // Any unmapped ID defaults to "other"
};
```

```javascript
// backend/scripts/import-wger.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const MUSCLE_MAP = require('./wger-muscle-map');
const EQUIPMENT_MAP = require('./wger-equipment-map');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } });

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status === 429) {
        const wait = Math.pow(2, i) * 1000;
        console.log(`Rate limited, waiting ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
      }
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error(`Failed after ${retries} retries: ${url}`);
}

async function importWger() {
  let url = 'https://wger.de/api/v2/exerciseinfo/?format=json&language=2&limit=100&offset=0';
  let imported = 0, skipped = 0;

  while (url) {
    const res = await fetchWithRetry(url);
    const json = await res.json();

    for (const exercise of json.results) {
      // Idempotency: skip if already imported
      const { data: existing } = await supabase.from('exercises')
        .select('id').eq('wger_id', exercise.id).maybeSingle();
      if (existing) { skipped++; continue; }

      // Get English translation
      const translation = exercise.translations?.find(t => t.language === 2);
      if (!translation?.name) {
        console.log(`Skipping exercise ${exercise.id}: no English translation`);
        continue;
      }

      // Download and re-upload image
      let imageUrl = null;
      const mainImage = exercise.images?.find(img => img.is_main) ?? exercise.images?.[0];
      if (mainImage?.image) {
        try {
          const imgRes = await fetchWithRetry(mainImage.image);
          // Read body as ArrayBuffer (native fetch — NOT .buffer())
          const arrayBuffer = await imgRes.arrayBuffer();
          const imgBuffer = Buffer.from(arrayBuffer);
          const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';
          const ext = {'image/jpeg':'jpg','image/png':'png','image/gif':'gif'}[contentType] ?? 'jpg';
          const storagePath = `global/${exercise.id}/image_0.${ext}`;
          await supabase.storage.from('exercise-assets').upload(storagePath, imgBuffer, {contentType, upsert: true});
          const { data: urlData } = supabase.storage.from('exercise-assets').getPublicUrl(storagePath);
          imageUrl = urlData.publicUrl;
        } catch (e) {
          console.warn(`Image upload failed for exercise ${exercise.id}:`, e.message);
        }
      }

      const primaryMuscles = (exercise.muscles ?? []).map(m => MUSCLE_MAP[m.id]).filter(Boolean);
      const secondaryMuscles = (exercise.muscles_secondary ?? []).map(m => MUSCLE_MAP[m.id]).filter(Boolean);
      const equipment = EQUIPMENT_MAP[exercise.equipment?.[0]?.id] ?? 'other';

      const { error } = await supabase.from('exercises').insert({
        gym_id: null, is_custom: false, is_gym_template: false,
        wger_id: exercise.id,
        name: translation.name,
        description: translation.description ?? '',
        equipment, primary_muscles: primaryMuscles, secondary_muscles: secondaryMuscles,
        image_url: imageUrl, logging_type: 'weight_reps'
      });
      if (error) console.warn(`Insert failed for exercise ${exercise.id}:`, error.message);
      else imported++;

      await new Promise(r => setTimeout(r, 200)); // rate limiting
    }

    url = json.next;
  }
  console.log(`Import complete. Imported: ${imported}, Skipped (existing): ${skipped}`);
}
importWger().catch(err => { console.error(err); process.exit(1); });
```

### 9.1.1 WGER Muscle Map (`backend/scripts/wger-muscle-map.js`)

**Required by `import-wger.js` and missing from v4 — the import fails without it.**

```javascript
// backend/scripts/wger-muscle-map.js
// IMPORTANT: Verify IDs against live API: GET https://wger.de/api/v2/muscle/?format=json
// These strings are stored in exercises.primary_muscles / secondary_muscles TEXT[]
module.exports = {
  1:  "biceps",       // Biceps brachii
  2:  "front_delts",  // Anterior deltoid
  3:  "chest",        // Serratus anterior (grouped under chest)
  4:  "chest",        // Pectoralis major
  5:  "triceps",      // Triceps brachii
  6:  "abs",          // Rectus abdominis
  7:  "calves",       // Gastrocnemius
  8:  "calves",       // Soleus
  9:  "glutes",       // Gluteus maximus (verify ID)
  10: "traps",        // Trapezius
  11: "lats",         // Latissimus dorsi
  12: "biceps",       // Brachialis (grouped under biceps)
  13: "abs",          // Obliquus externus abdominis
  14: "glutes",       // Gluteus maximus
  15: "quads",        // Quadriceps femoris
  16: "hamstrings",   // Biceps femoris
  // Unmapped IDs are dropped silently via .filter(Boolean) in the import script
};
```

**Muscle string vocabulary** (stored in exercises table, used in analytics grouping):

| String | Display | String | Display |
|--------|---------|--------|---------|
| `chest` | Chest | `abs` | Abs |
| `back` | Back | `quads` | Quads |
| `lats` | Lats | `hamstrings` | Hamstrings |
| `traps` | Traps | `glutes` | Glutes |
| `shoulders` | Shoulders | `calves` | Calves |
| `front_delts` | Front Delts | `biceps` | Biceps |
| `side_delts` | Side Delts | `triceps` | Triceps |
| `rear_delts` | Rear Delts | `forearms` | Forearms |

Custom exercises use these same string values.


### 9.2 Pre-Built Routines Seed Script

`backend/scripts/seed-prebuilt-routines.js` — seed at minimum one program per category (8 categories). Use realistic beginner-level programming with WGER exercise names exactly as imported. Include sets, reps, and rest appropriate to each goal. Reference established programs (Starting Strength for strength, PPL for push-pull-legs, etc.). The seed script must:
1. Check idempotency: `SELECT COUNT(*) FROM pre_built_routines` — if > 0, skip seeding
2. Insert one program per category using the `program_data` JSONB structure defined in the schema
3. Use `wger_id` values from the WGER import to identify exercises (resolve to names at display time)

### 9.3 Plate Calculator Data

```javascript
// backend/data/plate-denominations.js
module.exports = {
  barbell_plates_kg: [0.25, 0.5, 1.25, 2.5, 5, 10, 15, 20, 25],
  dumbbell_increment_kg: 2.5
  // Plate algorithm: target_per_side = (target_weight - bar_weight) / 2
  // Greedy descent from heaviest plate to lightest
  // Round dumbbell target to nearest dumbbell_increment_kg: Math.round(x/2.5)*2.5
};
```

### 9.4 Active Workout Draft (expo-sqlite)

Initialize in `mobile/src/lib/db.ts`:
```typescript
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('ironpath.db');

export function initDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS active_workout_draft (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      workout_name TEXT NOT NULL,
      routine_id TEXT,
      started_at TEXT NOT NULL,
      elapsed_seconds INTEGER NOT NULL DEFAULT 0,
      client_upload_uuid TEXT,
      state_json TEXT NOT NULL
    )
  `);
}
export { db };
```
Call `initDB()` in `mobile/app/_layout.tsx` on first render.

**state_json structure:**
```json
{
  "exercises": [{
    "exercise_id": "uuid", "exercise_name": "Bench Press", "position": 0,
    "superset_group": null, "rest_seconds": 90, "notes": "",
    "sets": [{
      "position": 0, "set_type": "normal", "weight_kg": 100,
      "reps": 5, "duration_seconds": null, "distance_meters": null,
      "rpe": null, "is_completed": true, "completed_at": "2026-04-07T10:15:30.000Z"
    }]
  }]
}
```

**Save trigger:** On every input field change with 500ms debounce. Not only on set completion.

**On app launch:** Check for draft row → show "Resume workout?" modal if found.

**On workout save:** Client deletes draft AFTER receiving HTTP 200 (not before).

### 9.5 Pre-Save Media Upload Flow

Media is uploaded BEFORE the workout is saved, using the Supabase Storage client directly from mobile (no backend endpoint needed for this step):

1. Client generates `client_upload_uuid` (UUID v4) before opening the finish screen
2. User selects photos/videos
3. For photos: `expo-image-manipulator` compresses to max 1920px, JPEG 80%
4. Upload directly to Supabase Storage from mobile:
   ```typescript
   const path = `${gymId}/${userId}/pending/${clientUploadUuid}/photo_0.jpg`;
   await supabaseMobile.storage.from('workout-media').upload(path, compressedFile);
   ```
5. `client_upload_uuid` + list of uploaded filenames included in `POST /workouts` body

### 9.6 Workout Save Procedure

`POST /workouts` body:
```json
{
  "idempotency_key": "uuid",           // REQUIRED — generated by client before first attempt
  "client_upload_uuid": "uuid",        // For locating pre-uploaded media files
  "media_filenames": ["photo_0.jpg"],  // Files to move from /pending/ to final path
  "name": "Push Day",
  "description": "",
  "visibility": "public",
  "started_at": "2026-04-07T10:00:00Z",
  "duration_seconds": 3600,
  "routine_id": "uuid or null",
  "exercises": [...]
}
```

**Server-side transaction:**
```
1. Check idempotency: SELECT id FROM workouts WHERE user_id = req.user.id
   AND idempotency_key = body.idempotency_key
   → If found: return existing workout (HTTP 200, no duplicate)

2. INSERT INTO workouts (is_completed = false, idempotency_key = body.idempotency_key)
   → capture workout_id

3. INSERT INTO workout_exercises (one per exercise)
4. INSERT INTO workout_sets (one per set, set is_warmup_counted from user's setting)

5. Calculate total_volume_kg:
   Per completed set meeting inclusion criteria:
     weight_reps:     weight_kg * reps
     bodyweight_reps: (user.bodyweight_kg + weight_kg) * reps
     duration:        0
     distance:        0
   Inclusion: (set_type != 'warmup') OR (set_type = 'warmup' AND is_warmup_counted = true)

6. total_sets = COUNT of completed sets WHERE set_type != 'warmup'

7. ordinal_number = COUNT(workouts WHERE user_id = req.user.id AND is_completed = true) + 1
   (Non-unique; simultaneous saves may result in same ordinal — documented acceptable behavior)

8. UPDATE workouts SET is_completed = true, finished_at, duration_seconds,
   total_volume_kg, total_sets, ordinal_number

9. COMMIT transaction

10. (After commit) Move media files in Supabase Storage:
    FROM: {gym_id}/{user_id}/pending/{client_upload_uuid}/{filename}
    TO:   {gym_id}/{user_id}/{workout_id}/{filename}
    For each file: re-upload to new path, delete old path.
    If move fails: log error, do not insert workout_media row (workout still saved).
    Return media_failed: true in response if any move fails.

11. INSERT INTO workout_media for each successfully moved file (include storage_path)

12. Run PR detection algorithm (Section 10.2) — after commit, outside transaction

13. Update streak (streak rules in Section 5)

14. Check badges (Section 13.2)

15. Return: {workout, prs_detected: [...], media_failed: false}
```

**Client receives 200 → deletes local SQLite draft.**

### 9.7 Previous Workout Values

**Mode `overall`:**
```sql
SELECT ws.weight_kg, ws.reps, ws.duration_seconds, ws.distance_meters, ws.position
FROM workout_sets ws
JOIN workout_exercises we ON we.id = ws.workout_exercise_id
JOIN workouts w ON w.id = we.workout_id
WHERE w.user_id = :user_id AND we.exercise_id = :exercise_id
  AND w.is_completed = true AND ws.is_completed = true AND ws.set_type != 'warmup'
ORDER BY w.started_at DESC, ws.position ASC
LIMIT :set_count;
```

**Mode `within_routine`** (fall back to `overall` if no results):
```sql
-- Same as above but add: AND w.routine_id = :current_routine_id
```

`:set_count` = number of sets in current exercise. If fewer rows returned, fill remaining sets with last row's values.

### 9.8 Workout Description @Mentions

When a workout is saved, parse the `description` field for @mentions using `(?<!\w)@([a-zA-Z0-9_]{3,30})(?!\w)`. For each valid username found: look up `user_id` from `users` where `username = :mention AND gym_id = :gym_id AND deleted_at IS NULL`. If found and not the workout owner: create a `mention` notification.

### 9.9 Superset Rest Timer Behavior

Rest timer fires only after completing the last set of the LAST exercise in a superset group for one round. Transitioning between exercises within a superset does NOT trigger the rest timer.

### 9.10 Warm-Up Sets Recalculation

When `PATCH /users/me/settings` toggles `warm_up_sets_in_stats`:
1. Return 200 immediately
2. `setImmediate(() => recalculateWarmupStats(userId, newValue))` — async, after response
3. Function: update `is_warmup_counted` on all warmup-type sets, recompute `total_volume_kg` for all affected workouts in batches of 50

---

## 10. Phase 3 — Progress & Analytics

### 10.1 Statistics Dashboard

**Overview cards (all-time):**
```sql
SELECT
  COUNT(*) FILTER (WHERE is_completed = true) AS total_workouts,
  SUM(total_volume_kg) FILTER (WHERE is_completed = true) AS total_volume_kg,
  SUM(duration_seconds) FILTER (WHERE is_completed = true) AS total_duration_seconds,
  SUM(total_sets) FILTER (WHERE is_completed = true) AS total_sets
FROM workouts WHERE user_id = :id;
```

**Last 7 days body graph:** For each day (UTC), fetch exercises with `started_at::date = :day`. Extract `primary_muscles`. Render muscle highlights per day. If a day has multiple workouts → tap shows list; if exactly one → tap navigates directly to workout detail.

**Set count per muscle group:** Join `workout_sets → workout_exercises → exercises`. Unnest `primary_muscles`. Group by muscle, count completed non-warmup sets. Filters: 30 days / 3 months / 1 year / all-time. Display as bar chart (Victory Native).

**Muscle distribution:** Pie chart and colored body diagram. Toggle between views.

**Main exercises:** Top 5 by frequency (COUNT of `workout_exercises` entries across completed workouts).

### 10.2 PR Detection Algorithm

Runs server-side after workout commit. Input: `workout_id`. For each `workout_exercise`:
- `completed_sets` = `is_completed = true AND set_type IN ('normal','dropset','failure')` — warmup NEVER counts
- If `completed_sets` is empty: skip exercise silently

**For `weight_reps` or `bodyweight_reps`:**
| record_type | Candidate | workout_set_id |
|------------|-----------|----------------|
| `heaviest_weight` | MAX(weight_kg) | set with max weight |
| `projected_1rm` | MAX(weight_kg × (1 + reps/30.0)) where reps > 0 | set with highest result |
| `best_volume_set` | MAX(weight_kg × reps) | set with highest product |
| `best_volume_session` | SUM(weight_kg × reps) | **NULL** (session aggregate) |
| `most_reps` | MAX(reps) | set with most reps |
| `3rm` | MAX(weight_kg) where reps >= 3 | that set |
| `5rm` | MAX(weight_kg) where reps >= 5 | that set |
| `10rm` | MAX(weight_kg) where reps >= 10 | that set |

**For `duration`:**
| record_type | Candidate | workout_set_id |
|------------|-----------|----------------|
| `longest_duration` | MAX(duration_seconds) | set with longest duration |

**For `distance`:**
| record_type | Candidate | workout_set_id |
|------------|-----------|----------------|
| `longest_distance` | SUM(distance_meters) | **NULL** (session aggregate) |

For each record type: `existing = MAX(value) FROM personal_records WHERE user_id AND exercise_id AND record_type`. If `candidate IS NOT NULL AND (existing IS NULL OR candidate > existing)`: insert new `personal_records` row.

Return all newly inserted personal_record IDs in the workout save response.

PR with `workout_id = NULL` (source workout deleted): display as "PR value, workout deleted" — non-navigable link in analytics screen.

### 10.3 Strength Level Classification

Applies to 5 exercises, matched by **WGER ID** (not name — names may vary):
- Squat, Bench Press (Barbell), Deadlift (Conventional), Overhead Press (Barbell), Barbell Row

**These WGER IDs must be verified at import time** and stored in `backend/data/strength-standards.js`:
```javascript
module.exports = {
  exercises: {
    // Verify WGER IDs by calling GET https://wger.de/api/v2/exercise/?format=json&language=2
    // and finding these exercises. Do not assume IDs.
    110: { name: 'Squat', male: [0.75, 1.25, 1.75, 2.25], female: [0.50, 0.90, 1.30, 1.70] },
    192: { name: 'Bench Press (Barbell)', male: [0.50, 0.75, 1.25, 1.60], female: [0.30, 0.55, 0.80, 1.05] },
    241: { name: 'Deadlift (Conventional)', male: [1.00, 1.50, 2.00, 2.50], female: [0.75, 1.15, 1.55, 2.00] },
    //   name: 'Overhead Press (Barbell)', male: [0.35, 0.55, 0.80, 1.10], female: [0.20, 0.35, 0.55, 0.75]
    //   name: 'Barbell Row', male: [0.50, 0.75, 1.10, 1.40], female: [0.35, 0.55, 0.80, 1.05]
    // ratios array: [Beginner, Intermediate, Advanced, Elite] (multiply by bodyweight_kg for 1RM threshold)
  }
};
```

**Resolve WGER IDs to internal UUIDs at backend startup** (same mechanism as leaderboard exercises).

Classification: if `bodyweight_kg` is null → do not calculate → show tappable prompt "Add bodyweight to unlock strength levels" → deep-link to body measurements entry.

### 10.4 Volume Comparison Table

```javascript
// backend/data/volume-comparisons.js
module.exports = [
  {label:'a dumbbell', kg:10}, {label:'a bicycle', kg:15},
  {label:'a large dog', kg:40}, {label:'a refrigerator', kg:90},
  {label:'a panda bear', kg:120}, {label:'a grand piano', kg:450},
  {label:'a car', kg:1400}, {label:'a hippo', kg:2000},
  {label:'an elephant', kg:5000}, {label:'a school bus', kg:11000}
];
// Find largest kg <= session total_volume_kg. Show nothing if total_volume_kg < 10.
```

### 10.5 Monthly Report Generation

Cron: `0 1 1 * *` (1st of month, **01:00 UTC** — offset from midnight to avoid DB contention with leaderboard reset at 00:00).

For each active user (`deleted_at IS NULL`) with ≥1 workout in the prior calendar month: generate and insert into `monthly_reports`. No report for months with zero workouts.

Note: all date ranges use UTC. A workout at 11pm Cairo time (UTC+3) = 8pm UTC = still the previous calendar day in UTC. This is the defined behavior.

**`report_data` JSONB structure:**
```json
{
  "month_label": "March 2026",
  "total_workouts": 18,
  "total_workouts_prev_month": 12,
  "total_volume_kg": 45000.00,
  "total_volume_prev_month_kg": 38000.00,
  "total_sets": 320,
  "total_sets_prev_month": 280,
  "total_duration_seconds": 72000,
  "training_days": 18,
  "weeks_with_workout": 4,
  "streak_at_end_of_month": 6,
  "calendar_training_days": ["2026-03-01", "2026-03-03"],
  "personal_records": [
    {
      "exercise_name": "Bench Press (Barbell)",
      "record_type": "heaviest_weight",
      "value_kg": 120.0,
      "achieved_at": "2026-03-15T09:00:00Z",
      "workout_id": "uuid-or-null",
      "workout_name": "Push Day A"  // copied at report time; preserved even if workout deleted
    }
  ],
  "muscle_distribution": [{"muscle": "chest", "sets": 80, "percentage": 25.0}],
  "top_exercises": [{"exercise_name": "Bench Press (Barbell)", "times_logged": 12}]
}
```

After insert: send `monthly_report_ready` push notification.

### 10.6 Year in Review

Cron: `0 2 1 1 *` (January 1st, 02:00 UTC). Stored in `monthly_reports` with `report_type = 'yearly'` and `report_period_start = '{year}-01-01'`. Skip if user had zero workouts in the year.

---

## 11. Phase 4 — Leaderboards & Social

### 11.1 Leaderboard Categories

| Category | Period | Resets |
|----------|--------|--------|
| Heaviest Lift (38 exercises) | all_time | Never |
| Most Volume | weekly | Monday 00:00 UTC |
| Most Volume | monthly | 1st of month 00:00 UTC |
| Most Volume | all_time | Never |
| Most Workouts | weekly | Monday 00:00 UTC |
| Most Workouts | monthly | 1st of month 00:00 UTC |
| Most Workouts | all_time | Never |
| Longest Streak | all_time | Never |

### 11.2 Leaderboard Computation

Every 15 minutes: compute snapshots for all gyms. Process gyms in batches of 10 with 2-second pause between batches. Upsert using `ON CONFLICT DO UPDATE` with the partial unique indexes defined in Section 5.

Top 50 per snapshot. Requesting user's own rank: separate query appended to response even if outside top 50.

### 11.3 38 Predefined Leaderboard Exercises

```javascript
// backend/data/leaderboard-exercises.js
// [wger_id, display_name] — verify WGER IDs at import time
module.exports = [
  [110, 'Squat'],
  [192, 'Bench Press (Barbell)'],
  [241, 'Deadlift (Conventional)'],
  [79, 'Overhead Press (Barbell)'],
  [212, 'Barbell Row'],
  [31, 'Pull-Up'],
  [32, 'Chin-Up'],
  [37, 'Dip'],
  [91, 'Romanian Deadlift'],
  [44, 'Leg Press'],
  [73, 'Incline Bench Press (Barbell)'],
  [74, 'Decline Bench Press (Barbell)'],
  [24, 'Bench Press (Dumbbell)'],
  [78, 'Shoulder Press (Dumbbell)'],
  [77, 'Lateral Raise'],
  [214, 'Cable Row (Seated)'],
  [36, 'Lat Pulldown'],
  [82, 'Face Pull'],
  [2, 'Bicep Curl (Barbell)'],
  [3, 'Hammer Curl'],
  [63, 'Tricep Pushdown (Cable)'],
  [64, 'Skull Crusher'],
  [116, 'Leg Curl (Machine)'],
  [117, 'Leg Extension (Machine)'],
  [175, 'Hip Thrust (Barbell)'],
  [103, 'Bulgarian Split Squat'],
  [99, 'Lunge (Barbell)'],
  [121, 'Calf Raise (Machine)'],
  [111, 'Front Squat'],
  [240, 'Sumo Deadlift'],
  [75, 'Bench Press (Close Grip)'],
  [7, 'Preacher Curl'],
  [10, 'Incline Curl (Dumbbell)'],
  [27, 'Cable Fly'],
  [28, 'Pec Deck (Machine)'],
  [215, 'Seated Cable Row'],
  [81, 'Arnold Press'],
  [242, 'Trap Bar Deadlift']
  // NOTE: These WGER IDs MUST be verified against the live WGER API at build time.
  // If an ID does not match an imported exercise, log a warning at startup.
];
```

Resolve all WGER IDs to internal exercise UUIDs at backend startup. Log a warning for any ID not found in `exercises` table. Cache the mapping for process lifetime.

### 11.4 Challenge Rankings — Live Query

`GET /leaderboards/challenges/:id` runs a live aggregation (not from snapshots):

```javascript
// backend/src/routes/leaderboards.ts
async function getChallengeRankings(challenge) {
  const { starts_at, ends_at, metric, exercise_id } = challenge;
  let query;

  if (metric === 'total_volume') {
    query = supabase.from('workouts')
      .select('user_id, total_volume_kg')
      .eq('gym_id', gymId).eq('is_completed', true)
      .gte('started_at', starts_at).lte('started_at', ends_at);
    // Group by user_id, SUM total_volume_kg
  } else if (metric === 'workout_count') {
    // COUNT workouts per user in date range
  } else if (metric === 'exercise_volume') {
    // JOIN workout_exercises + workout_sets for exercise_id, SUM weight_kg * reps per user
  } else if (metric === 'exercise_1rm') {
    // MAX projected_1rm from personal_records WHERE exercise_id AND achieved_at in range
  }
  // Return top 50 ranked users
}
```

Define the complete implementation for each metric type. Response format: same as leaderboard snapshot rankings array.

### 11.5 Social Feed Query

```sql
SELECT w.id, w.user_id, w.name, w.description, w.started_at, w.duration_seconds,
       w.total_volume_kg, w.total_sets, w.visibility,
       u.username, u.avatar_url, u.full_name,
       COALESCE(lc.like_count, 0) AS like_count,
       COALESCE(cc.comment_count, 0) AS comment_count,
       CASE WHEN vl.user_id IS NOT NULL THEN true ELSE false END AS viewer_liked
FROM workouts w
JOIN users u ON u.id = w.user_id
-- Denormalized counts via LEFT JOIN (avoid correlated subqueries)
LEFT JOIN (
  SELECT workout_id, COUNT(*) AS like_count FROM workout_likes GROUP BY workout_id
) lc ON lc.workout_id = w.id
LEFT JOIN (
  SELECT workout_id, COUNT(*) AS comment_count FROM workout_comments
  WHERE deleted_at IS NULL GROUP BY workout_id
) cc ON cc.workout_id = w.id
LEFT JOIN workout_likes vl ON vl.workout_id = w.id AND vl.user_id = :viewer_id
WHERE w.gym_id = :gym_id
  AND w.is_completed = true
  AND (
    w.visibility = 'public'
    OR w.user_id = :viewer_id
    OR (w.visibility = 'followers' AND w.user_id IN (
      SELECT following_id FROM follows
      WHERE follower_id = :viewer_id AND status = 'active'
    ))
  )
  AND (:cursor IS NULL OR w.started_at < :cursor::timestamptz)
ORDER BY w.started_at DESC
LIMIT :limit;
```

**`?filter=following`:** Replace the WHERE clause's `w.visibility = 'public'` with just `w.user_id IN (SELECT following_id FROM follows WHERE follower_id = :viewer_id AND status = 'active')`.

### 11.6 @Mention Regex
```javascript
const MENTION_REGEX = /(?<!\w)@([a-zA-Z0-9_]{3,30})(?!\w)/g;
```
Prevents matching email addresses. Enforces 3-30 char username rule. Used in both comment saving and workout description saving.

### 11.7 Follow Request Flow
1. User A follows User B (private) → insert `follows` row with `status = 'pending'`
2. User A sees "Requested" button; User B gets `follow_request` notification
3. `POST /follow-requests/:id/approve` → `status = 'active'`, send `follow_request_approved` notification
4. `POST /follow-requests/:id/reject` → delete follows row, no notification

`GET /follow-requests` response:
```json
{"data": {"items": [
  {"id": "follows_uuid", "follower": {"user_id":"uuid","username":"ahmed","avatar_url":"...","full_name":"Ahmed"}, "created_at": "..."}
], "total": 3}}
```

### 11.8 Compare Response

`GET /api/v1/users/:id/compare`:
```json
{"data": {
  "user_a": {"user_id":"uuid","username":"ahmed","total_workouts":150,"total_volume_kg":450000.0,"total_duration_seconds":360000},
  "user_b": {"user_id":"uuid","username":"hassan","total_workouts":120,"total_volume_kg":380000.0,"total_duration_seconds":290000},
  "muscle_distribution": {
    "user_a": [{"muscle":"chest","sets":400,"percentage":22.0}],
    "user_b": [{"muscle":"chest","sets":350,"percentage":20.0}]
  },
  "shared_exercises": ["Bench Press (Barbell)", "Squat"],
  "head_to_head": [{"exercise_name":"Bench Press (Barbell)","user_a_projected_1rm_kg":120.0,"user_b_projected_1rm_kg":100.0}]
}}
```
Returns 403 if `user_b` is private and requester is not a follower.

---

## 12. Phase 5 — Gym Admin Panel (Web)

Deployed to Vercel. Domain: `admin.ironpath.app` (configure custom domain in Vercel project settings after registering `ironpath.app`).

### 12.1 Dashboard
Cards: total active members, new members this month, gym-wide workouts this month, gym-wide volume this month, most active member this week. Charts: workouts/day trend (30 days), top 10 members by workout count, muscle distribution across all members.

### 12.2 Member Management
Table: avatar | name | username | email | join date | last active | workout count | status. Search + filter. Actions: view stats | send notification | suspend/reinstate | remove.

**Suspend/Reinstate:** `PATCH /api/v1/admin/members/:id/suspend` body `{"suspended": true|false}`. Before reinstating: check `deleted_at IS NOT NULL` — if deleted, return 422 "Member has been permanently removed."

**Remove:** triggers soft delete procedure. Slot freed for new members.

### 12.3–12.9
Invite management, announcements CRUD, gym template routines CRUD, challenge CRUD (edit/delete only if `status = 'upcoming'`), analytics, gym settings, super admin panel — all as specified in v3 with full CRUD operations.

---

## 13. Phase 6 — In-App Engagement

### 13.1 Streaks
See Section 5 streak rules. Calculated on every workout save.

### 13.2 Achievement Badges

Checked after every workout save (triggered in save procedure step 14). Uses `luxon` for timezone conversions.

| Badge | Trigger | Implementation |
|-------|---------|---------------|
| `first_rep` | 1st workout | `ordinal_number === 1` |
| `ten_strong` | 10 workouts | `COUNT(*) FROM workouts WHERE user = :id AND is_completed >= 10` |
| `half_century` | 50 workouts | same, >= 50 |
| `century` | 100 workouts | same, >= 100 |
| `iron_month` | 4-week streak | `current_streak_weeks >= 4` |
| `iron_quarter` | 12-week streak | `current_streak_weeks >= 12` |
| `pr_machine` | 10 total PRs | `COUNT(*) FROM personal_records WHERE user = :id >= 10` |
| `heavy_lifter` | 10,000kg cumulative | `SUM(total_volume_kg) FROM workouts WHERE user = :id AND is_completed >= 10000` |
| `consistent` | 4+ workouts in one ISO week | Count workouts WHERE `date_trunc('week', started_at) = date_trunc('week', :workout_started_at)`. Check the week of the saved workout (not current week). Awards retroactively for back-logged workouts. |
| `early_bird` | Workout before 07:00 in user's timezone | `DateTime.fromISO(started_at).setZone(user_settings.timezone).hour < 7` |
| `night_owl` | Workout after 22:00 in user's timezone | `hour >= 22` |
| `gym_legend` | Rank #1 in any all-time leaderboard | Checked by leaderboard refresh job (not workout save). Award if #1 in ANY all-time category. Never revoked once awarded. |

On badge award: `INSERT INTO user_badges (UNIQUE constraint = idempotent)`. On insert: create `badge_unlocked` notification.

### 13.3 Shareable Workout Graphics

```typescript
// Render off-screen using position:absolute offscreen (NOT display:none or opacity:0)
// react-native-view-shot cannot capture invisible components
<WorkoutShareCard
  style={{position: 'absolute', top: -9999, left: -9999}}
  ref={shareCardRef}
  {...props}
/>

// Capture and save
const uri = await captureRef(shareCardRef, {format: 'png', quality: 1});
await MediaLibrary.saveToLibraryAsync(uri);
```

### 13.4 Push Notifications

Send after every notification row insert. Check `user_settings.notif_<type>` before sending — if false, skip push but still insert in-app notification row.

```typescript
import Expo from 'expo-server-sdk';
const expo = new Expo();

async function sendPushNotifications(messages: ExpoPushMessage[]) {
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    const receipts = await expo.sendPushNotificationsAsync(chunk);
    for (const receipt of receipts) {
      if (receipt.status === 'error') {
        logger.error('Push error:', receipt.details);
        if (receipt.details?.error === 'DeviceNotRegistered') {
          // Delete stale token
          await supabase.from('user_push_tokens')
            .delete().eq('token', (receipt as any).expoPushToken);
        }
      }
    }
  }
}
```

**Push payload size:** keep `data` JSONB under 3KB — IDs only, never full objects.

**Permission timing:** Request push notification permission after the user completes their FIRST workout and sees the post-workout summary screen. At this point, show contextual explanation: "Enable notifications to receive rest timer alerts and PR updates."

### 13.5 Home Screen Widgets
- iOS: use `@bacons/apple-targets` Expo config plugin to generate a Swift WidgetKit extension
- Android: `@bam.tech/react-native-android-widget`

### 13.6 Live Activity
- iOS: Dynamic Island / Lock Screen via `react-native-live-activities` (Expo config plugin approach)
- Android: persistent foreground notification via `expo-notifications` with `sticky: true`

---

## 14. Phase 7 — AI Trainer (Algorithmic)

### 14.1 Onboarding

5-screen questionnaire. Screen 5 collects initial weights for each key exercise in the selected program template. Pre-filled with sensible defaults (Squat: 60kg, Bench: 40kg, Deadlift: 80kg, OHP: 30kg, Row: 50kg for beginner full-gym). User can adjust all values.

`POST /api/v1/trainer/program` request body:
```json
{
  "goal": "strength",
  "experience_level": "beginner",
  "days_per_week": 3,
  "equipment": "full_gym",
  "initial_weights": [
    {"wger_id": 110, "weight_kg": 60.0},
    {"wger_id": 192, "weight_kg": 40.0},
    {"wger_id": 241, "weight_kg": 80.0}
  ]
}
```

Backend resolves each `wger_id` to internal UUID and populates `progression_data.exercises` with `current_weight_kg` from the submitted values.

### 14.2 Template Decision Matrix

```javascript
// backend/data/trainer-templates.js
function resolveTemplateKey(experience, goal, days, equipment) {
  const key = `${experience}_${goal}_${days}_${equipment}`;
  if (TEMPLATES[key]) return key;
  for (let d = days - 1; d >= 2; d--) {
    const k = `${experience}_${goal}_${d}_${equipment}`;
    if (TEMPLATES[k]) return k;
  }
  for (let d = days; d >= 2; d--) {
    const k = `${experience}_${goal}_${d}_full_gym`;
    if (TEMPLATES[k]) return k;
  }
  for (let d = days; d >= 2; d--) {
    const k = `${experience}_general_${d}_full_gym`;
    if (TEMPLATES[k]) return k;
  }
  return 'beginner_general_3_full_gym'; // ultimate fallback
}
```

Defined template keys (all must have corresponding template objects in the file):
`beginner_strength_3_full_gym`, `beginner_strength_3_dumbbells`, `beginner_strength_3_bodyweight`, `beginner_hypertrophy_3_full_gym`, `beginner_hypertrophy_4_full_gym`, `beginner_general_2_full_gym`, `beginner_general_3_full_gym`, `beginner_endurance_3_bodyweight`, `intermediate_strength_3_full_gym`, `intermediate_strength_4_full_gym`, `intermediate_strength_3_dumbbells`, `intermediate_hypertrophy_4_full_gym`, `intermediate_hypertrophy_5_full_gym`, `intermediate_general_3_full_gym`, `advanced_strength_4_full_gym`, `advanced_strength_5_full_gym`, `advanced_hypertrophy_5_full_gym`, `advanced_hypertrophy_6_full_gym`, `advanced_general_4_full_gym`.

### 14.3 Template Structure

Strength/hypertrophy template:
```javascript
{
  name: "StrongLifts 5x5",
  protocol: "linear", weeks_per_cycle: 1,
  deload_after_failures: 2, deload_percentage: 0.90,
  upper_body_increment_kg: 2.5, lower_body_increment_kg: 5.0,
  sessions: [{
    day_label: "Session A",
    exercises: [{
      wger_id: 110, sets: 5, reps: 5, reps_min: null, reps_max: null,
      target_duration_seconds: null, logging_type: "weight_reps", is_lower_body: true
    }]
  }]
}
```

Endurance template (different structure — uses duration):
```javascript
{
  name: "Bodyweight Cardio 3x",
  protocol: "linear", weeks_per_cycle: 1,
  deload_after_failures: 3, deload_percentage: 1.0, // no weight deload for bodyweight
  upper_body_increment_kg: 0, lower_body_increment_kg: 0,
  sessions: [{
    day_label: "Session A",
    exercises: [{
      wger_id: 215, sets: 3, reps: null, reps_min: null, reps_max: null,
      target_duration_seconds: 60, logging_type: "duration", is_lower_body: false
    }]
  }]
}
```

### 14.4 Session Matching

```javascript
const sessionIndex = progression_data.total_program_sessions_completed % template.sessions.length;
const nextSession = template.sessions[sessionIndex];
```

`GET /api/v1/trainer/next-session` response:
```json
{"data": {
  "session_label": "Session A",
  "session_number": 7,
  "exercises": [{
    "exercise_id": "internal-uuid",
    "exercise_name": "Squat",
    "sets": 5,
    "reps": 5,
    "reps_min": null,
    "reps_max": null,
    "target_duration_seconds": null,
    "prescribed_weight_kg": 100.0,
    "rest_seconds": 180,
    "notes": "",
    "is_lower_body": true
  }]
}}
```

### 14.5 Progression Engine

Runs after workout save. Only if `ai_trainer_programs.is_active = true AND is_paused = false`. Tracks how many template exercises were matched:

```javascript
let matchedExerciseCount = 0;

for (const templateExercise of currentSession.exercises) {
  const exerciseUuid = wgerToUuidMap[templateExercise.wger_id];
  if (!exerciseUuid) continue;

  const completedSets = getCompletedSetsForExercise(workout, exerciseUuid);
  if (completedSets.length === 0) continue;

  matchedExerciseCount++;
  const prescribedReps = templateExercise.reps ?? templateExercise.reps_min ?? 0;
  const allRepsHit = completedSets.every(s => s.reps >= prescribedReps);
  const completionRate = completedSets.length / templateExercise.sets;
  const state = progression_data.exercises[exerciseUuid] ?? { ... };

  if (allRepsHit && completionRate >= 1.0) {
    state.consecutive_successes += 1;
    state.consecutive_failures = 0;
    const threshold = template.protocol === 'linear' ? 1 : 3;
    if (state.consecutive_successes >= threshold) {
      const baseIncrement = templateExercise.is_lower_body
        ? template.lower_body_increment_kg
        : template.upper_body_increment_kg;
      const effectiveIncrement = baseIncrement * progression_data.increment_multiplier;
      // Correct rounding to nearest 2.5kg
      state.current_weight_kg = Math.round(
        (state.current_weight_kg + effectiveIncrement) / 2.5
      ) * 2.5;
      state.consecutive_successes = 0;
    }
  } else {
    state.consecutive_failures += 1;
    state.consecutive_successes = 0;
    if (state.consecutive_failures >= template.deload_after_failures) {
      state.current_weight_kg = Math.round(
        (state.current_weight_kg * template.deload_percentage) / 2.5
      ) * 2.5;
      state.consecutive_failures = 0;
    }
  }
  state.last_session_date = workout.started_at;
  state.total_sessions_logged += 1;
  progression_data.exercises[exerciseUuid] = state;
}

// Only increment session counter if at least one template exercise was logged
if (matchedExerciseCount > 0) {
  progression_data.total_program_sessions_completed += 1;
}
```

**Progression note for hypertrophy:** `prescribedReps = reps ?? reps_min`. For a 8–12 rep range, `prescribedReps = 8`. Progression fires when user achieves ≥8 reps on all sets. This is the defined minimum — documented behavior.

### 14.6 Progress Report

`GET /api/v1/trainer/progress` response:
```json
{"data": {"exercises": [
  {
    "exercise_id": "uuid",
    "exercise_name": "Squat",
    "trend": "trending_up",   // "trending_up" | "stalled" | "deloaded"
    "current_weight_kg": 100.0,
    "sessions_logged": 12,
    "consecutive_failures": 0,
    "consecutive_successes": 2,
    "last_session_date": "2026-04-07"
  }
]}}
```
Trend: `trending_up` if `consecutive_successes > 0`; `deloaded` if a deload occurred in the last 2 sessions; `stalled` otherwise.

### 14.7 Override Learning

`POST /api/v1/trainer/feedback` body: `{"exercise_id": "uuid", "override_kg": 65.0, "prescribed_kg": 60.0}`

```javascript
const direction = override_kg > prescribed_kg ? 'up' : 'down';
state.override_history.push({date: new Date().toISOString(), prescribed_kg, override_kg, direction});
progression_data.override_bias += (direction === 'up' ? 1 : -1);
progression_data.override_bias = Math.max(-5, Math.min(5, progression_data.override_bias));
if (progression_data.override_bias >= 3) progression_data.increment_multiplier = 1.25;
else if (progression_data.override_bias <= -3) progression_data.increment_multiplier = 0.75;
else progression_data.increment_multiplier = 1.0;
```

---

## 15. Background Jobs

`backend/src/jobs/index.ts` — started when server starts. All times UTC. Railway Hobby plan keeps process always-on.

| Job | Cron | Description |
|-----|------|-------------|
| Leaderboard refresh | `*/15 * * * *` | Compute snapshots for all gyms; process in batches of 10; 2s pause between batches |
| Weekly leaderboard reset | `0 0 * * 1` | Mon 00:00 — archive weekly snapshots, start fresh |
| Monthly leaderboard reset | `0 0 1 * *` | 1st 00:00 — archive monthly snapshots, start fresh |
| Monthly report generation | `0 1 1 * *` | 1st **01:00** — generate prior month reports (offset from midnight) |
| Year in Review | `0 2 1 1 *` | Jan 1st 02:00 — generate yearly recap |
| Weekly nudge notifications | `0 9 * * 1` | Mon 09:00 — notify users with no workout last week |
| Streak broken check | `5 0 * * 1` | Mon **00:05** — reset streaks (offset 5min from reset jobs) |
| Notification cleanup | `0 3 * * *` | Daily 03:00 — batched delete of notifications > 90 days |
| Leaderboard snapshot cleanup | `0 4 1 * *` | 1st 04:00 — delete snapshots > 12 months |
| Challenge update + results | `*/5 * * * *` | Every 5min — update challenge statuses AND compute results in one job (avoids race condition between two separate jobs) |
| Pending media cleanup | `0 5 * * *` | Daily 05:00 — delete Supabase Storage files in `/pending/` older than 24h |

**Warmup recalculation:** Not a cron job. `setImmediate(() => recalculateWarmupStats(userId, newValue))` called after settings PATCH response is sent.

**Notification cleanup (batched):**
```sql
-- Loop until no rows affected
DELETE FROM notifications
WHERE id IN (
  SELECT id FROM notifications
  WHERE created_at < NOW() - INTERVAL '90 days'
  LIMIT 1000
);
```

---

## 16. API Endpoints

All routes prefixed `/api/v1/`. JWT required unless noted. Route order matters in Express — static paths BEFORE parameterized paths in the same router.

### Express Router Ordering Rules
In every router file, define routes in this order:
1. Static paths (e.g., `/workouts/history`, `/routines/pre-built`) — BEFORE
2. Parameterized paths (e.g., `/workouts/:id`, `/routines/:id`)

Same rule applies to `/users/me/*` routes — define ALL `/users/me/*` routes before `/users/:id`.

### Auth (no JWT)
```
POST /auth/register              # {invite_code, email, password, username, full_name, sex, date_of_birth}
POST /auth/login                 # {email, password} → {access_token, refresh_token}
POST /auth/logout                # JWT. Invalidates refresh token.
POST /auth/refresh               # {refresh_token} → {access_token}
POST /auth/forgot-password       # {email}
POST /auth/reset-password        # {token, new_password}
```

### Gyms
```
POST   /gyms                          # No JWT. Rate: 3/hour/IP. {name, location?, description?, email, password, logo?}
GET    /gyms/:id                      # JWT. Gym details.
PATCH  /gyms/:id                      # JWT. gym_owner only.
GET    /gyms/validate-invite/:code    # No JWT. Rate: 10/min/IP. Returns {gym_id, gym_name, logo_url}
POST   /gyms/:id/regenerate-invite    # JWT. gym_owner only. Returns {invite_code}
POST   /gyms/:id/invite-email         # JWT. gym_owner only. {email}
```

### Users (note: /users/me/* before /users/:id)
```
GET    /users/me                      # Profile fields only (id, username, full_name, avatar_url, bio,
                                      # role, sex, date_of_birth, bodyweight_kg, is_profile_private, gym_id)
PATCH  /users/me                      # Update profile fields
GET    /users/me/settings             # Returns full user_settings row (all 20+ fields)
PATCH  /users/me/settings             # Update any settings fields; triggers warmup recalculation if needed
GET    /users/:id                     # Public profile. If private+not following: {id, username, is_profile_private: true}
GET    /users/:id/workouts            # Paginated. Cursor: started_at. Respects visibility+privacy.
GET    /users/:id/stats               # {total_workouts, total_volume_kg, current_streak_weeks,
                                      #  strength_levels: [{exercise_name, level, projected_1rm_kg}],
                                      #  recent_workouts: [{id, name, started_at, total_volume_kg}] (5 max)}
                                      # 403 if private+not following
GET    /users/:id/compare             # Section 11.8 response
POST   /users/:id/follow              # Follow or request to follow
DELETE /users/:id/follow              # Unfollow or cancel pending
GET    /users/:id/followers           # Paginated. Cursor: follows.created_at.
GET    /users/:id/following           # Paginated. Cursor: follows.created_at.
GET    /follow-requests               # Incoming pending requests. Section 11.7 response.
POST   /follow-requests/:id/approve   # Update status='active', send notification
POST   /follow-requests/:id/reject    # Delete follows row
```

### Exercises
```
GET    /exercises                     # ?search=<str>&equipment=<val>&muscle=<val>&limit=20&offset=0
GET    /exercises/:id                 # Full detail + user's logging history
POST   /exercises                     # multipart/form-data: {name, equipment, primary_muscles,
                                      # secondary_muscles, logging_type, is_gym_template, image?}
PATCH  /exercises/:id                 # Creator or gym_owner only
DELETE /exercises/:id                 # Creator or gym_owner only
```

### Routines (pre-built BEFORE :id)
```
GET    /routines                      # User's routine metadata only (id, name, description,
                                      # folder_id, exercise_count, created_at). No sets.
                                      # Grouped by folder in response.
POST   /routines                      # Create routine
GET    /routines/pre-built            # DEFINED BEFORE /routines/:id
                                      # ?category=<val>&level=<val>&goal=<val>
POST   /routines/pre-built/:id/save   # Save pre-built as folder + routines for current user
GET    /routines/:id                  # Full detail: exercises + sets
PATCH  /routines/:id                  # {name?, description?, folder_id?, exercises?}
                                      # If exercises present: replaces ALL exercises+sets atomically
DELETE /routines/:id                  # Hard delete
POST   /routines/:id/duplicate        # Full copy. Returns new routine.
GET    /routine-folders               # User's folders ordered by position
POST   /routine-folders               # {name}
PATCH  /routine-folders/:id           # {name?, position?}
DELETE /routine-folders/:id           # Routines inside get folder_id=null
```

**`PATCH /routines/:id` body when exercises present:**
```json
{
  "name": "optional",
  "description": "optional",
  "folder_id": "uuid or null",
  "exercises": [
    {
      "id": "existing routine_exercise uuid or null for new",
      "exercise_id": "uuid",
      "position": 0,
      "superset_group": null,
      "rest_seconds": 90,
      "notes": "",
      "sets": [
        {"id": "existing set uuid or null", "position": 0, "set_type": "normal",
         "target_weight_kg": null, "target_reps": 5, "target_reps_min": null, "target_reps_max": null,
         "target_duration_seconds": null, "target_distance_meters": null}
      ]
    }
  ]
}
```
If `exercises` is present: delete all existing `routine_exercises` and `routine_sets` for this routine, re-insert from body (atomically).

### Workouts (history BEFORE :id)
```
POST   /workouts                      # Save workout. Body: Section 9.6. idempotency_key REQUIRED.
GET    /workouts/history              # DEFINED BEFORE /workouts/:id.
                                      # Cursor: started_at. Returns headline data only (no sets).
GET    /workouts/:id                  # Full detail: exercises, sets, media, prs
PATCH  /workouts/:id                  # {name?, description?, visibility?, started_at?, duration_seconds?}
DELETE /workouts/:id                  # Hard delete. PRs get workout_id SET NULL.
POST   /workouts/:id/copy             # Returns new workout: is_completed=false, all sets incomplete,
                                      # started_at=NOW(), idempotency_key=null (client sets new one).
                                      # Client loads as new active workout.
POST   /workouts/:id/save-as-routine  # Creates new routine from workout structure.
POST   /workouts/media/pending        # PRE-SAVE: upload to /pending/ path.
                                      # Body: multipart/form-data {file, media_type, client_upload_uuid}
                                      # Returns {storage_path, url}. Client calls this BEFORE saving workout.
POST   /workouts/:id/media            # POST-SAVE: add media to existing saved workout.
                                      # Enforces 2 photo + 1 video limit.
DELETE /workouts/:id/media/:mediaId   # Deletes DB row AND file from Supabase Storage (using storage_path).
                                      # If Storage delete fails: log error, still delete DB row.
```

### Feed
```
GET    /feed                          # Cursor: started_at. ?filter=all|following
POST   /workouts/:workoutId/like      # Idempotent
DELETE /workouts/:workoutId/like
GET    /workouts/:workoutId/likes     # Cursor: created_at
POST   /workouts/:workoutId/comments  # {content}
GET    /workouts/:workoutId/comments  # Cursor: created_at. Excludes soft-deleted.
DELETE /workouts/:workoutId/comments/:commentId  # Soft delete own comment only
```

### Leaderboards
```
GET    /leaderboards/lifts            # ?exercise_id=<uuid>&period=all_time
                                      # If exercise_id omitted: return summary of all 38 exercises
                                      # with top user per exercise.
                                      # If provided: {rankings:[...50], my_rank, my_value, generated_at}
GET    /leaderboards/volume           # ?period=weekly|monthly|all_time
GET    /leaderboards/workouts         # ?period=weekly|monthly|all_time
GET    /leaderboards/streak           # All-time only
GET    /leaderboards/challenges       # Active + upcoming for this gym
GET    /leaderboards/challenges/:id   # Detail + live rankings (Section 11.4 query)
```

### Analytics
```
GET    /analytics/stats               # Full stats dashboard data
GET    /analytics/exercises           # Exercises user has logged with PR summary
GET    /analytics/exercises/:id       # Full performance: all PR types, history, strength level
GET    /analytics/calendar            # ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD (max 366 days)
                                      # Returns {dates: ["2026-01-03", ...]}
GET    /analytics/measurements        # Paginated. Cursor: measured_at.
GET    /analytics/measurements/:id    # Single measurement with photos
POST   /analytics/measurements        # Log measurement
PATCH  /analytics/measurements/:id    # Update
DELETE /analytics/measurements/:id    # Hard delete
GET    /analytics/reports             # List. Cursor: created_at.
GET    /analytics/reports/:id         # Full report_data
```

### Notifications
```
GET    /notifications                 # Cursor: created_at.
PATCH  /notifications/:id/read
POST   /notifications/read-all
POST   /push-tokens                   # {token, platform}
DELETE /push-tokens                   # Body: {token} — NOT path param (security)
```

### AI Trainer
```
GET    /trainer/program               # Current program. 404 if none.
POST   /trainer/program               # Section 14.1 body
PATCH  /trainer/program               # {is_paused: true|false}
DELETE /trainer/program               # Delete row; allows fresh start
GET    /trainer/next-session          # Section 14.4 response
POST   /trainer/feedback              # {exercise_id, override_kg, prescribed_kg}
GET    /trainer/progress              # Section 14.6 response
```

### Admin (gym_owner or super_admin)
```
GET    /admin/dashboard
GET    /admin/members                 # ?search=<str>&status=active|suspended&page=1&limit=25
GET    /admin/members/:id
PATCH  /admin/members/:id/suspend     # {suspended: true|false}. Check deleted_at before reinstate.
DELETE /admin/members/:id             # Soft delete + PII clearing
POST   /admin/message/:userId         # {title, body} — push notification to single member
GET    /admin/announcements           # ?page=1&limit=25
POST   /admin/announcements           # {title, content, is_pinned, expires_at?}
PATCH  /admin/announcements/:id
DELETE /admin/announcements/:id
GET    /admin/analytics
GET    /admin/routines                # Gym template routines. ?page=1&limit=25
POST   /admin/routines
PATCH  /admin/routines/:id
DELETE /admin/routines/:id
GET    /admin/leaderboards/challenges # ?page=1&limit=25
POST   /admin/leaderboards/challenges # exercise_id required if metric needs it (zod validates)
PATCH  /admin/leaderboards/challenges/:id  # Only if status='upcoming'
DELETE /admin/leaderboards/challenges/:id  # Only if status='upcoming'
GET    /admin/settings
PATCH  /admin/settings
```

### Super Admin (role = super_admin only)
```
GET    /admin/gyms                    # All gyms. ?page=1&limit=25
PATCH  /admin/gyms/:id/subscription   # {subscription_status, subscription_tier, subscription_expires_at}
```

---

## 17. File Storage Structure

```
Bucket: avatars (public)
  {user_id}/avatar.jpg
  Max 5MB raw; client compresses to 512×512px JPEG 85%

Bucket: gym-assets (public)
  {gym_id}/logo.jpg
  Max 5MB raw; client compresses to 512×512px JPEG 85%

Bucket: workout-media (authenticated gym members)
  {gym_id}/{user_id}/pending/{client_upload_uuid}/photo_0.jpg   ← pre-save staging
  {gym_id}/{user_id}/pending/{client_upload_uuid}/video_0.mp4
  {gym_id}/{user_id}/{workout_id}/photo_0.jpg                   ← final after save
  {gym_id}/{user_id}/{workout_id}/photo_1.jpg
  {gym_id}/{user_id}/{workout_id}/video_0.mp4
  Photos: max 10MB raw; client compresses to 1920px JPEG 80%
  Videos: max 30MB; client warns if exceeded before upload
  Limit: 2 photos + 1 video per workout (API layer enforcement)
  Pending files deleted after 24h by daily cron

Bucket: exercise-assets (public)
  global/{wger_id}/image_0.{jpg|png|gif}  ← extension from Content-Type header
  custom/{gym_id}/{exercise_id}/image_0.jpg

Bucket: progress-photos (owner only)
  {user_id}/{measurement_id}/photo_0.jpg
  Max 10MB raw; client compresses to 1920px JPEG 80%
```

**Storage `storage_path` values** stored in `workout_media.storage_path` and `measurement_photos.storage_path` are the **relative bucket path** (e.g., `gym-uuid/user-uuid/workout-uuid/photo_0.jpg`). Public URL derived via `supabase.storage.from('workout-media').getPublicUrl(storage_path)`.

**Supabase Storage "move"** (no native API): download file → re-upload to new path → delete old path. If any step fails: log error, skip `workout_media` row insertion, return `media_failed: true`. Pending cleanup cron deletes orphaned files.

**Upgrade trigger:** When Supabase Storage nears 800MB, upgrade to Supabase Pro ($25/month, 100GB).

---

## 18. Security

### Database
- Backend uses `service_role` for all runtime DB operations
- Every query includes `WHERE gym_id = req.user.gym_id` (or `user_id = req.user.id` for user-scoped tables)
- RLS policies (Section 6) are a second enforcement layer
- `gym_id` never read from request body — always from `req.user` (validated JWT)

### Middleware Chain
Auth → requireActiveUser (write endpoints only) → route handler. Suspended users (`is_active = false`) get 403. Deleted users (`deleted_at IS NOT NULL`) get 403.

### Subscription Enforcement
Check `gyms.subscription_status` and `subscription_expires_at` via `req.user.gym_id` on every request:
- `trial` or `active`: pass
- Expired but within 7-day grace period: pass, member app shows banner
- Expired past grace period: all write operations return 403 `GYM_SUSPENDED`; reads allowed

### Input Validation
All request bodies validated with `zod` schemas before business logic. `VALIDATION_ERROR` response includes field-level errors. File uploads: MIME type verified server-side (magic bytes, not just extension).

### CORS
```typescript
const corsOptions = {
  origin: process.env.CORS_ALLOWED_ORIGINS.split(','),
  credentials: true
};
```
Production: `https://admin.ironpath.app`. Development: `http://localhost:5173,http://localhost:3000`.

---

## 19. Monetization

| Tier | Member Limit | Price |
|------|-------------|-------|
| Starter | Up to 50 | $49/month |
| Growth | Up to 200 | $99/month |
| Unlimited | No limit | $199/month |

30-day trial. Grace period 7 days. Manual payment collection (bank transfer). Super admin updates subscription via admin panel `/super` route.

**Member limit** counts all non-deleted members regardless of `is_active`:
```sql
SELECT COUNT(*) FROM users WHERE gym_id = :gid AND deleted_at IS NULL
```
Suspended members count. Only deleted members (`deleted_at IS NOT NULL`) do not count.

---

## 20. Environment Variables

**`backend/.env`**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret  # From: Supabase → Project Settings → API → JWT Secret
SUPABASE_DB_PASSWORD=your-db-password         # For: supabase link --password
PORT=3000
NODE_ENV=development
CORS_ALLOWED_ORIGINS=https://admin.ironpath.app  # Dev: http://localhost:5173,http://localhost:3000
RESEND_API_KEY=re_your_key
RESEND_FROM_EMAIL=noreply@ironpath.app
SUPER_ADMIN_EMAIL=admin@ironpath.app
SUPER_ADMIN_PASSWORD=change-this-strong-password
ADMIN_PANEL_URL=https://admin.ironpath.app
APP_DOWNLOAD_URL=https://ironpath.app/download
```

**`DATABASE_URL` is NOT needed at runtime.** The backend uses `@supabase/supabase-js` exclusively. `DATABASE_URL` (raw PostgreSQL connection string) is only used locally by the Supabase CLI for `supabase db push`. It is not an environment variable needed on Railway.

**`admin/.env.local`**
```bash
VITE_API_URL=https://your-backend.railway.app/api/v1
VITE_APP_NAME=IronPath
```

**`mobile/.env.local`**
```bash
EXPO_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
# Local dev on simulator: http://localhost:3000/api/v1
# Local dev on physical device: http://192.168.x.x:3000/api/v1 (dev machine IP)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 21. App Configuration (app.json)

```json
{
  "expo": {
    "name": "IronPath",
    "slug": "ironpath",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "ironpath",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FF6B35"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.ironpath.app",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "IronPath uses your camera to take workout photos and videos.",
        "NSPhotoLibraryUsageDescription": "IronPath accesses your photo library when uploading workout media.",
        "NSPhotoLibraryAddUsageDescription": "IronPath saves shareable workout graphics to your photo library.",
        "NSMicrophoneUsageDescription": "IronPath uses the microphone when recording workout videos."
      }
    },
    "android": {
      "package": "com.ironpath.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FF6B35"
      },
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-sqlite",
      [
        "expo-camera",
        {"cameraPermission": "Allow IronPath to access your camera for workout photos and videos."}
      ],
      [
        "expo-media-library",
        {
          "photosPermission": "Allow IronPath to save workout graphics to your photos.",
          "savePhotosPermission": "Allow IronPath to save shareable workout cards to your photos.",
          "isAccessMediaLocationEnabled": false
        }
      ]
      // NOTE: @shopify/react-native-skia is NOT listed here — it is a package dependency only,
      // not an Expo config plugin. Adding it to plugins causes build failures.
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

**Versioning:** Increment `version` (1.0.0 → 1.1.0) for user-visible releases. Increment `buildNumber`/`versionCode` for every TestFlight/Play Store submission.

### TypeScript Configs

**`mobile/tsconfig.json`:**
```json
{"extends": "expo/tsconfig.base", "compilerOptions": {"strict": true}}
```

**`backend/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2020", "module": "commonjs", "outDir": "./dist",
    "rootDir": "./src", "strict": true, "esModuleInterop": true,
    "resolveJsonModule": true, "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

**`shared/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2020", "module": "commonjs", "outDir": "./dist",
    "declaration": true, "strict": true, "esModuleInterop": true
  },
  "include": ["types/**/*"]
}
```

### NativeWind v4 Setup (mobile)

1. `mobile/tailwind.config.js`:
```javascript
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: { extend: {} }, plugins: []
};
```
2. `mobile/global.css`: `@tailwind base; @tailwind components; @tailwind utilities;`
3. `mobile/babel.config.js`:
```javascript
module.exports = api => {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', {jsxImportSource: 'nativewind'}]],
    plugins: ['nativewind/babel']
  };
};
```
4. `mobile/app/_layout.tsx`: `import '../global.css'; import { initDB } from '../src/lib/db';` — call `initDB()` here.

---

## 22. App Store Readiness

### Domain Registration (prerequisite for submission)
1. Register `ironpath.app` domain
2. Configure DNS: `admin.ironpath.app` → Vercel (custom domain in Vercel project settings)
3. Publish privacy policy at `https://ironpath.app/privacy` before submission
4. Publish support page at `https://ironpath.app/support`

### Required Assets
| Asset | Dimensions | Format |
|-------|-----------|--------|
| App Icon | 1024×1024px | PNG, no alpha |
| Android Adaptive Icon (foreground) | 1024×1024px | PNG with alpha |
| Splash Screen | 1284×2778px | PNG |
| Feature Graphic (Google Play) | 1024×500px | PNG/JPG |
| iPhone 6.7" Screenshots | 1290×2796px | PNG (min 3) |
| iPhone 5.5" Screenshots | 1242×2208px | PNG (min 3) |
| Android Phone Screenshots | 1080×1920px | PNG (min 2) |

`"supportsTablet": false` — iPad screenshots NOT required.

### Metadata
- Keywords (App Store, 100 chars): `gym,workout,tracker,strength,training,lifting,fitness,barbell`
- Short description (Google Play, 80 chars): "Track workouts and compete with your gym"
- Category: Health & Fitness. Age rating: 4+.

### iOS Requirements
- Apple Developer Account: $99/year
- App Review Notes: include test gym invite code + test member email/password

### Android Requirements
- Google Play Developer Account: $25 one-time
- Target API Level: 34+. Complete Data Safety questionnaire.

---

## 23. Build Order & Dependencies

Each step fully complete before the next begins.

### Step 1 — Repository & Project Setup
1. Register `ironpath.app` domain; configure DNS for `admin.ironpath.app` → Vercel
2. Create Supabase project; note project ref and DB password
3. `git init` at repo root
4. Root `package.json`: `{"workspaces": ["mobile","backend","admin","shared"]}`
5. Create `shared/` package with all TypeScript types and constants (`LBS_TO_KG`, `INCH_TO_CM`)
6. Build shared package: `cd shared && npm install && npm run build`
7. `backend/`: `npm init -y`, install all backend dependencies (Section 2). Create `src/` structure, `tsconfig.json`, `.env` from Section 20
8. `mobile/`: `npx create-expo-app mobile --template blank-typescript`. Install mobile deps (Section 2). Apply NativeWind v4 setup (Section 21). Set up `app.json` from Section 21.
9. `admin/`: `npm create vite@latest admin -- --template react-ts`. Install admin deps including `postcss autoprefixer`. Create `postcss.config.js`, `tailwind.config.js`.
10. Configure Railway Hobby plan for backend
11. Configure Vercel for admin panel; add `admin.ironpath.app` custom domain

### Step 2 — Database Setup
1. `npm install -g supabase`
2. `supabase link --project-ref <ref> --password <db-password>`
3. Create all 34 migration files in `supabase/migrations/` (numbered 001–034 as specified in Section 5)
4. **Important:** `034_auth_hook.sql` is the LAST migration; it references `public.users` which must exist first
5. `supabase db push` — applies all migrations in order
6. Verify: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'` → expect 29
7. Register Auth Hook in Supabase Dashboard → Authentication → Hooks → select `custom_access_token_hook`
8. Verify WGER IDs first: call `GET https://wger.de/api/v2/equipment/?format=json` and `GET https://wger.de/api/v2/muscle/?format=json`, update wger-equipment-map.js and wger-muscle-map.js if IDs differ. Then `cd backend && node scripts/import-wger.js` — expect > 100 exercises
9. `node scripts/seed-prebuilt-routines.js` — idempotent
10. `node scripts/seed-super-admin.js` — idempotent; creates system gym + super admin user
11. Verify: `SELECT COUNT(*) FROM exercises WHERE gym_id IS NULL` → > 100

### Step 3 — Phase 1: Auth & Foundation
1. Backend: `lib/supabase.ts` (singleton), `lib/logger.ts` (pino), `middleware/auth.ts`, `middleware/requireActiveUser.ts`, `middleware/errorHandler.ts`
2. Backend: `middleware/rateLimit.ts` — configure per-endpoint rate limits
3. Backend: `index.ts` — apply middleware in correct order (Section 4)
4. Backend: gym registration, member registration, login/logout/refresh, password reset
5. Mobile: `lib/db.ts` (expo-sqlite init), `lib/supabase.ts` (mobile Supabase client with anon key)
6. Mobile: onboarding screens (invite code → gym preview → registration → home)
7. Mobile: login, forgot password + deep link handling (Section 8.6)
8. Mobile: token storage in expo-secure-store with 2048-byte handling
9. Admin: login form with Axios interceptor (Section 8.8), basic nav shell
10. **Verify:** gym owner registers → member joins with invite code → both log in → JWT contains gym_id and role → Auth Hook fires correctly

### Step 4 — Phase 2: Workout Engine
1. Backend: exercise CRUD (visibility rules from schema enforced)
2. Backend: routine and folder CRUD (ENSURE `/routines/pre-built` defined BEFORE `/routines/:id` in router)
3. Backend: `POST /workouts/media/pending` endpoint (multer, Supabase Storage upload)
4. Backend: workout save procedure (Section 9.6, idempotency_key NOT NULL enforced by zod)
5. Backend: PR detection algorithm (Section 10.2, new `longest_duration`/`longest_distance` types)
6. Backend: streak update (Section 5 rules)
7. Backend: warmup recalculation via setImmediate
8. Backend: workout description @mention parsing
9. Mobile: expo-sqlite draft persistence (Section 9.4, save on field change with debounce)
10. Mobile: exercise library (search, filter, detail screen)
11. Mobile: routine builder (exercises, sets, superset, warm-up calculator using user_settings)
12. Mobile: active workout screen (set logging, rest timer, plate calculator, inline timer, superset scroll)
13. Mobile: finish workout screen (name, visibility, description, pre-save Supabase Storage upload, idempotency key generation)
14. Mobile: post-workout summary (ordinal, PRs, volume comparison, `react-native-view-shot` share card with `position: absolute, top: -9999, left: -9999`)
15. **Verify:** full workout end-to-end; idempotency (retry = same workout); draft survives crash; PRs detected correctly

### Step 5 — Phase 3: Analytics
1. Backend: stats dashboard, exercise performance (8 PR types + new duration/distance types), strength levels (WGER ID matching), body measurements CRUD, calendar, report generation
2. Mobile: all analytics screens; strength level prompt when bodyweight_kg is null; report screens with deleted-workout link handling
3. **Verify:** after 5+ workouts, all analytics correct; strength levels display for eligible exercises; deleted workout shows "Workout deleted" in PR history

### Step 6 — Phase 4: Leaderboards & Social
1. Backend: leaderboard snapshot computation (batched, partial unique index upsert, Section 11.3 full list with all 38 exercises, WGER ID → UUID mapping at startup)
2. Backend: feed query with LEFT JOINs for counts (not correlated subqueries, Section 11.5)
3. Backend: likes, comments, follows, follow requests, compare, challenge live query
4. Backend: @mention parsing in comments AND workout descriptions
5. Mobile: all social/leaderboard screens; follow request management; workout detail with "Workout deleted" for orphaned PR links
6. **Verify:** feed respects visibility; leaderboards upsert (not accumulate); @mentions notify correct users

### Step 7 — Phase 5: Admin Panel
1. Admin: all screens with CRUD operations; suspend/reinstate toggle with deleted_at check; all 403 responses redirect to access-denied page
2. **Verify:** gym owner can manage members; suspension blocks member write access; reinstate restores access

### Step 8 — Phase 6: Engagement
1. Backend: all 12 badges (Section 13.2, `consistent` uses workout's started_at week, `early_bird`/`night_owl` use luxon timezone); `gym_legend` in leaderboard refresh job
2. Backend: push notifications via expo-server-sdk (batched, DeviceNotRegistered cleanup)
3. Backend: all background cron jobs (Section 15, correct timing offsets)
4. Mobile: push notification permission request AFTER first workout completion (post-workout summary screen)
5. Mobile: notifications screen, badge display on profile, home screen widgets, live activity
6. **Verify:** badges awarded correctly; push notifications delivered; permission dialog shown at right time

### Step 9 — Phase 7: AI Trainer
1. Backend: all trainer templates (19 keys, including endurance with duration structure)
2. Backend: WGER ID → UUID mapping (shared with leaderboard mapping); startup warning for missing IDs
3. Backend: program creation with initial weights; session matching with `total_program_sessions_completed` check; progression engine only increments counter when `matchedExerciseCount > 0`; override learning
4. Mobile: 5-screen onboarding with initial weight entry; trainer dashboard; next session view
5. **Verify:** beginner strength 3-day generates correct sessions; weight increments after 5×5; counter only advances for trainer workouts; non-trainer workouts don't advance session

### Step 10 — QA, Performance & App Store Prep
1. EXPLAIN ANALYZE on feed, leaderboard, and history queries; verify LEFT JOINs are faster than correlated subqueries
2. Verify `idx_lb_snapshot_unique_nolift` and `idx_lb_snapshot_unique_lift` partial indexes work with ON CONFLICT
3. Verify idempotency: retry workout save → same response, no duplicate
4. Verify RLS: two-gym test — gym A member cannot read gym B data
5. Verify subscription grace period and write block
6. Verify Auth Hook fires on login and JWT contains gym_id and role
7. Test password reset deep link on physical iOS and Android devices
8. Verify WGER equipment IDs are correct (check imported exercise equipment tags)
9. Create all app store assets; write descriptions
10. Submit to TestFlight and Google Play internal testing
11. Submit for public release

---

*End of Technical Specification v5.0*
*Adds wger-muscle-map.js, rateLimit.ts, mobile Supabase client, and corrected WGER equipment map.*
*No cross-references to previous versions. All content is self-contained.*
