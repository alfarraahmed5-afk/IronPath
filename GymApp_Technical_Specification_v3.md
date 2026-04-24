# IronPath — Full Technical Specification

**Version:** 3.0  
**Date:** April 2026  
**Built by:** Claude Code  
**Business Model:** B2B SaaS — sold to gyms, used by their members  
**App Name:** IronPath  
**iOS Bundle Identifier:** com.ironpath.app  
**Android Package Name:** com.ironpath.app  
**Expo Slug:** ironpath  
**Starting Version:** 1.0.0  

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

---

## 2. Tech Stack & Dependencies

### Technology Choices

| Layer | Technology | Notes |
|-------|-----------|-------|
| Mobile App | React Native + Expo (latest stable SDK at build time) | iOS + Android single codebase |
| Backend API | Node.js + Express.js | REST API, versioned at `/api/v1/` |
| Database | PostgreSQL via Supabase | Primary relational database |
| Auth | Supabase Auth + custom JWT claims via Auth Hook | JWT-based; gym_id and role embedded in token |
| File Storage | Supabase Storage | Photos, videos, exercise assets |
| Admin Panel | React.js + Vite | Web-only, deployed to Vercel |
| Backend Hosting | Railway (Hobby plan, always-on) | Node.js API; must use Hobby plan to prevent sleep |
| Exercise Data | WGER (one-time import) | Exercise library; use exerciseinfo endpoint |
| Push Notifications | expo-server-sdk (backend) + Expo Push API | iOS + Android |
| State Management | Zustand | Mobile app global state |
| Navigation | Expo Router (file-based) | Mobile app navigation |
| Charts | victory-native@^41 + @shopify/react-native-skia | Progress charts; Skia-based Victory Native |
| Styling (mobile) | NativeWind v4 (Tailwind for RN) | Requires specific v4 setup — see Section 23 |
| Styling (web) | Tailwind CSS | Admin panel styling |
| Job Scheduler | node-cron | Backend background jobs |
| Email Service | Resend | Transactional emails |
| Image Processing (mobile) | expo-image-manipulator | Client-side compression before upload |
| Share Graphics | react-native-view-shot | Capture RN components as images |
| Camera Roll Save | expo-media-library | Save shareable graphics to device |
| File Upload (backend) | multer | Parse multipart/form-data |
| Input Validation | zod | All backend request validation. Only zod — no express-validator. |
| Local Workout Persistence | expo-sqlite | Active workout draft storage |
| Monorepo Tooling | npm workspaces | Shared types across sub-projects |
| Migration Tooling | Supabase CLI | `supabase db push` to apply migrations |
| Timezone Handling | luxon | Timezone-aware date calculations for badges and reports |

### Monorepo Structure
```
/
├── mobile/               # React Native Expo app
├── backend/              # Node.js Express API
├── admin/                # React.js Vite admin panel (Vercel)
├── shared/               # Shared TypeScript types
│   └── types/
│       ├── api.ts        # Request/response interfaces
│       ├── models.ts     # Shared model types
│       └── index.ts      # Barrel export + constants
└── supabase/
    └── migrations/       # SQL migration files (Supabase CLI)
```

The `shared/` package is an npm workspace package imported as `@ironpath/shared`. It must be built (`tsc`) before any sub-project builds.

### Backend Dependencies (install exactly)
```bash
npm install express cors helmet express-rate-limit @supabase/supabase-js zod \
  node-cron resend jsonwebtoken dotenv multer expo-server-sdk uuid luxon
npm install --save-dev typescript @types/express @types/node @types/multer \
  @types/jsonwebtoken @types/uuid @types/luxon
```

### Mobile Dependencies (key additions beyond Expo defaults)
```bash
npx expo install zustand expo-router expo-sqlite expo-secure-store \
  expo-image-manipulator expo-media-library expo-camera \
  react-native-view-shot @shopify/react-native-skia
npm install victory-native@^41 nativewind@^4 tailwindcss luxon @ironpath/shared
```

### Admin Panel Dependencies
```bash
npm install react-router-dom axios recharts tailwindcss @ironpath/shared luxon
npm install --save-dev vite @vitejs/plugin-react typescript
```

---

## 3. System Architecture

### High-Level Architecture

```
[Mobile App (iOS/Android)]
        |
        | HTTPS /api/v1/* — JWT in Authorization: Bearer header
        v
[Node.js + Express Backend (Railway — Hobby plan, always-on)]
        |
        |---> [PostgreSQL via Supabase — service_role for all backend operations]
        |---> [Supabase Storage]
        |---> [Supabase Auth — JWT validation via SUPABASE_JWT_SECRET]
        |---> [Expo Push Notifications API]
        |---> [Resend — email]
        |---> [node-cron — background jobs]

[React Admin Panel (Vercel — admin.ironpath.app)]
        |
        | HTTPS /api/v1/admin/* — JWT in Authorization: Bearer header
        v
[Same Backend — admin-scoped endpoints]
```

### Railway Plan Requirement
Use Railway **Hobby plan** ($5/month). The free tier sleeps inactive processes, which kills all `node-cron` jobs. Hobby plan keeps the server always-on.

### Multi-Tenancy Model
- Every table row is scoped to a `gym_id`
- A user belongs to exactly one gym (NOT NULL FK)
- `gym_id` and `role` are embedded in the JWT as custom claims (see Section 8.1)
- Backend middleware reads `gym_id` and `role` directly from JWT — no DB lookup per request
- Backend uses `service_role` key for all DB operations
- Every DB query MUST include `WHERE gym_id = req.user.gym_id` (enforced in code + backed by RLS)
- RLS policies act as a second enforcement layer (see Section 6)

### Offline Mode
IronPath is **online-only** for v1. All actions require internet connectivity. Exception: the active workout screen persists its in-progress state to a local SQLite database (`expo-sqlite`) so crashes do not lose workout data. See Section 9.3.

### Auth Flow
1. Gym owner registers via admin panel → Supabase Auth user created first → then DB rows in transaction
2. Gym gets a unique 6-character alphanumeric `invite_code`
3. Member downloads app → enters invite code → Supabase Auth user created → DB rows in transaction
4. Supabase Auth Hook fires on every login → adds `gym_id` and `role` as custom JWT claims
5. JWT is stored on device in `expo-secure-store` and sent as `Authorization: Bearer <token>` on all requests
6. Backend auth middleware validates JWT signature using `SUPABASE_JWT_SECRET`, reads claims, attaches `{user_id, gym_id, role}` to `req.user` — no DB query needed

---

## 4. API Conventions

### Base URL
All endpoints prefixed with `/api/v1/`. Example: `https://your-backend.railway.app/api/v1/workouts`.

### Authentication
All endpoints require a valid JWT in the `Authorization: Bearer <token>` header except:
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/gyms/validate-invite/:code`

### Middleware Execution Order (in `app.js`)
Must be applied in this exact order:
1. `cors(corsOptions)` — configured with `CORS_ALLOWED_ORIGINS`
2. `helmet()` — security headers
3. `express.json()` — parse JSON bodies
4. `authMiddleware` — validate JWT, populate `req.user = {user_id, gym_id, role}` from JWT claims
5. `rateLimiter` — uses `keyGenerator: (req) => req.user?.id ?? req.ip` (user-based after auth)
6. Route handlers

Auth middleware must run before rate limiter so user-based rate limiting works.

### Standard Success Response
```json
{
  "data": { },
  "meta": {
    "pagination": {
      "cursor": "2026-04-01T00:00:00.000Z",
      "has_more": true,
      "limit": 20
    }
  }
}
```
`meta.pagination` is present only on paginated list endpoints.

For list endpoints, `data` wraps items and total:
```json
{
  "data": {
    "items": [ ],
    "total": 42
  }
}
```
For single-resource endpoints, `data` is the object directly. `total` may be omitted for infinite-scroll feed endpoints.

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
`fields` array is only present on `VALIDATION_ERROR` (422) responses. All other error types omit `fields`.

### Error Codes
| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Valid JWT but insufficient role or wrong gym |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body failed zod validation |
| `CONFLICT` | 409 | Unique constraint violation |
| `GYM_SUSPENDED` | 403 | Subscription expired, grace period elapsed |
| `INVITE_INVALID` | 404 | Invite code not found or inactive |
| `MEDIA_LIMIT_EXCEEDED` | 422 | Max media per workout already reached |
| `RATE_LIMITED` | 429 | Too many requests; includes `Retry-After` header |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

### Rate Limiting
- `GET /api/v1/gyms/validate-invite/:code`: 10 requests per minute per IP address (unauthenticated)
- Auth endpoints (`/auth/*`): 5 requests per 15 minutes per IP address
- All other authenticated endpoints: 100 requests per minute per user (`req.user.id`)
- Enforced via `express-rate-limit`

### Pagination

**Cursor-based** (feeds, history, notifications — infinite scroll):
- Sort: newest-first (`ORDER BY started_at DESC` or `ORDER BY created_at DESC`)
- Query param: `?cursor=<ISO8601 timestamp>&limit=20`
- Cursor is the `started_at` or `created_at` of the **last item in the current page**
- Server query: `WHERE started_at < :cursor ORDER BY started_at DESC LIMIT :limit`
- Default limit: 20. Max limit: 50.

**Offset-based** (admin panel tables — paged navigation):
- Query params: `?page=1&limit=25`
- Default limit: 25. Max limit: 100.

### Weight Units
- All weights stored in **kilograms (kg)** in the database and API at all times
- The mobile app converts to the user's preferred unit for display only
- `1 lbs = 0.453592 kg` — constant defined in `shared/types/index.ts` as `LBS_TO_KG`
- Leaderboard comparisons are always in kg

### Circumference Units
- All circumference measurements stored and transmitted in **centimeters (cm)** at all times
- Frontend converts to inches for display if user's locale requires it
- `1 inch = 2.54 cm` — constant in `shared/types/index.ts` as `INCH_TO_CM`

---

## 5. Database Schema

### Migration Tooling
Use Supabase CLI for all migrations:
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref <your-project-ref>

# Create migration files in supabase/migrations/
# Each file named: YYYYMMDDHHMMSS_description.sql

# Apply migrations
supabase db push
```

### Migration Order
Create one SQL file per table, named with sequential timestamps so Supabase CLI applies them in order:

```
001_gyms.sql
002_users.sql
003_routine_folders.sql    ← AFTER users (references users)
004_exercises.sql
005_routines.sql           ← AFTER routine_folders AND users
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
031_rls_policies.sql
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
    CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
  subscription_tier VARCHAR(20)
    CHECK (subscription_tier IN ('starter', 'growth', 'unlimited')),
  subscription_expires_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### users
```sql
-- Defined BEFORE routine_folders (which references this table)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  -- Globally unique; immutable after registration; letters/numbers/underscores only
  username VARCHAR(30) UNIQUE NOT NULL
    CHECK (username ~ '^[a-zA-Z0-9_]+$' AND char_length(username) >= 3),
  full_name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  role VARCHAR(20) DEFAULT 'member'
    CHECK (role IN ('member', 'gym_owner', 'super_admin')),
  sex VARCHAR(10)
    CHECK (sex IN ('male', 'female')),
  date_of_birth DATE,
  -- Bodyweight stored in kg always; must be positive
  bodyweight_kg DECIMAL(5,2) CHECK (bodyweight_kg > 0 AND bodyweight_kg < 700),
  is_profile_private BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  -- Soft delete: on removal, PII fields cleared, deleted_at set, record retained
  deleted_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Soft Delete Procedure:** When a member is removed from a gym, execute atomically:
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
Then: update all `leaderboard_snapshots.rankings` JSONB entries for this user — set `display_name = 'Deleted User'`, `avatar_url = null` — using a backend function that iterates and patches affected snapshots.

---

### routine_folders
```sql
-- Defined AFTER users (references users.id)
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
  -- NULL gym_id = global WGER exercise. NOT NULL = gym-specific custom exercise.
  gym_id UUID REFERENCES gyms(id),
  created_by UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  image_url TEXT,
  animation_url TEXT,
  equipment VARCHAR(50)
    CHECK (equipment IN (
      'barbell', 'dumbbell', 'machine', 'cable',
      'bodyweight', 'resistance_band', 'kettlebell', 'other'
    )),
  primary_muscles TEXT[] NOT NULL DEFAULT '{}',
  secondary_muscles TEXT[] NOT NULL DEFAULT '{}',
  logging_type VARCHAR(20) DEFAULT 'weight_reps'
    CHECK (logging_type IN ('weight_reps', 'bodyweight_reps', 'duration', 'distance')),
  is_custom BOOLEAN DEFAULT false,
  -- is_gym_template: true = gym owner created, visible to ALL gym members
  -- false (default for custom) = visible only to creating member
  is_gym_template BOOLEAN DEFAULT false,
  wger_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Prevent duplicate names within the same gym (case-insensitive)
CREATE UNIQUE INDEX idx_exercises_unique_name_per_gym
  ON exercises(gym_id, lower(name))
  WHERE gym_id IS NOT NULL;
```

**Custom Exercise Visibility Rules:**
- `gym_id IS NULL` → global WGER exercise, visible to everyone
- `gym_id IS NOT NULL AND is_gym_template = true` → visible to all members of that gym
- `gym_id IS NOT NULL AND is_gym_template = false` → visible only to `created_by` user

---

### routines
```sql
-- Defined AFTER routine_folders AND users
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  folder_id UUID REFERENCES routine_folders(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  -- true = gym owner template; visible to all gym members in Explore tab
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
  -- superset_group: positive integer. Exercises with same non-null value in the
  -- same routine are a superset. NULL = not in any superset.
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
    CHECK (set_type IN ('normal', 'warmup', 'dropset', 'failure')),
  target_weight_kg DECIMAL(7,2) CHECK (target_weight_kg >= 0),
  target_reps INTEGER CHECK (target_reps > 0),
  target_reps_min INTEGER CHECK (target_reps_min > 0),
  target_reps_max INTEGER CHECK (target_reps_max > 0),
  target_duration_seconds INTEGER CHECK (target_duration_seconds > 0),
  target_distance_meters DECIMAL(8,2) CHECK (target_distance_meters > 0)
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
  -- total_volume_kg calculation: see Section 9.4
  total_volume_kg DECIMAL(12,2) DEFAULT 0 CHECK (total_volume_kg >= 0),
  total_sets INTEGER DEFAULT 0 CHECK (total_sets >= 0),
  -- Visibility:
  -- 'public'    = all gym members see this in feed
  -- 'followers' = only followers + owner see this in feed
  -- 'private'   = owner only
  visibility VARCHAR(20) DEFAULT 'public'
    CHECK (visibility IN ('public', 'followers', 'private')),
  is_completed BOOLEAN DEFAULT false,
  -- ordinal_number: COUNT(prior completed workouts) + 1, set at save time.
  -- Celebratory counter only. Not recalculated if workouts are deleted.
  ordinal_number INTEGER,
  -- idempotency_key: generated by client before first save attempt.
  -- Prevents duplicate workouts on network retry.
  idempotency_key UUID,
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
    CHECK (set_type IN ('normal', 'warmup', 'dropset', 'failure')),
  weight_kg DECIMAL(7,2) CHECK (weight_kg >= 0),
  reps INTEGER CHECK (reps >= 0 AND reps <= 10000),
  duration_seconds INTEGER CHECK (duration_seconds >= 0),
  distance_meters DECIMAL(8,2) CHECK (distance_meters >= 0),
  rpe DECIMAL(3,1) CHECK (rpe >= 6.0 AND rpe <= 10.0),
  is_completed BOOLEAN DEFAULT false,
  -- Snapshot of warm_up_sets_in_stats setting at workout save time.
  -- Only relevant for warmup-type sets. Non-warmup sets always contribute to volume.
  is_warmup_counted BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ
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
  -- workout_id: set to NULL if the source workout is later deleted (SET NULL)
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  -- workout_set_id: NULL for session-level records (best_volume_session).
  -- SET NULL if the source set is later deleted.
  workout_set_id UUID REFERENCES workout_sets(id) ON DELETE SET NULL,
  record_type VARCHAR(30) NOT NULL
    CHECK (record_type IN (
      'heaviest_weight', 'projected_1rm', 'best_volume_set',
      'best_volume_session', 'most_reps', '3rm', '5rm', '10rm'
    )),
  -- Value: kg for weight-based records; count for rep-based records
  value DECIMAL(12,2) NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- Multiple records of the same type are kept as history.
  -- The current best = MAX(value) WHERE user_id AND exercise_id AND record_type.
  -- workout_set_id is NULL for best_volume_session (session-aggregate, no single set).
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
  -- All circumference measurements in cm
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
  media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('photo', 'video')),
  url TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- Limit: 2 photos + 1 video per workout. Enforced at API layer.
  -- On POST /workouts/:id/media: count existing photos/videos for workout_id.
  -- Reject with MEDIA_LIMIT_EXCEEDED if photos >= 2 (for photo) or videos >= 1 (for video).
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
    CHECK (status IN ('active', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
  -- Same-gym enforcement: backend verifies follower.gym_id = following.gym_id before insert.
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
  -- Flat comments only (no reply threads in v1).
  -- @mentions stored as plain @username text. Usernames are immutable.
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  -- Soft delete: set deleted_at instead of hard delete
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- Comments cannot be edited after posting; only soft-deleted.
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
  -- NULL = never expires. Feed filters out announcements past expires_at.
  expires_at TIMESTAMPTZ,
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
    'leaderboard', 'streak_milestone', 'badge_unlocked', 'weekly_nudge',
    'monthly_report_ready'
  )),
  title VARCHAR(255) NOT NULL,
  body TEXT,
  -- data JSONB: include only IDs (not full objects) to keep payload under 3KB
  -- like/comment/mention: {"workout_id": "uuid", "actor_user_id": "uuid"}
  -- follow/follow_request/follow_request_approved: {"actor_user_id": "uuid"}
  -- pr: {"exercise_id": "uuid", "record_type": "heaviest_weight", "value_kg": 120.0}
  -- announcement: {"announcement_id": "uuid"}
  -- leaderboard: {"category": "heaviest_lift", "rank": 1}
  -- streak_milestone: {"weeks": 4}
  -- badge_unlocked: {"badge_key": "iron_month"}
  -- monthly_report_ready: {"report_id": "uuid", "month": "2026-03-01"}
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- Cron job deletes notifications older than 90 days (see Section 15)
);
```

---

### user_push_tokens
```sql
CREATE TABLE user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
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
  -- ISO week start date (Monday). Week = Monday 00:00 UTC to Sunday 23:59:59 UTC.
  last_workout_week DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Streak Calculation Rules:**
- A "streak week" is any ISO calendar week (Mon–Sun UTC) with ≥ 1 completed workout
- On each workout save: compute the ISO week start (Monday) of `started_at` in UTC
- If that week = `last_workout_week + 7 days` → `current_streak_weeks += 1`
- If that week = `last_workout_week` → no change (already counted this week)
- If that week > `last_workout_week + 7 days` → streak broken: `current_streak_weeks = 1`
- If `last_workout_week IS NULL` → first workout: `current_streak_weeks = 1`
- Update `longest_streak_weeks = MAX(longest_streak_weeks, current_streak_weeks)`
- Update `last_workout_week` to the computed week start
- Back-logged workouts trigger a full streak recalculation from scratch (scan all workouts ordered by `started_at ASC`)
- The Monday 00:05 UTC cron job checks for broken streaks (users whose `last_workout_week` is more than 14 days ago) and resets `current_streak_weeks = 0`

---

### user_settings
```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  weight_unit VARCHAR(5) DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
  default_rest_seconds INTEGER DEFAULT 90 CHECK (default_rest_seconds > 0),
  previous_values_mode VARCHAR(20) DEFAULT 'overall'
    CHECK (previous_values_mode IN ('overall', 'within_routine')),
  warm_up_sets_in_stats BOOLEAN DEFAULT false,
  keep_awake_during_workout BOOLEAN DEFAULT true,
  rpe_tracking_enabled BOOLEAN DEFAULT false,
  smart_superset_scrolling BOOLEAN DEFAULT true,
  inline_timer_enabled BOOLEAN DEFAULT true,
  live_pr_notification_enabled BOOLEAN DEFAULT true,
  timer_sound_volume INTEGER DEFAULT 80 CHECK (timer_sound_volume BETWEEN 0 AND 100),
  pr_sound_volume INTEGER DEFAULT 80 CHECK (pr_sound_volume BETWEEN 0 AND 100),
  -- Warm-up calculator steps. Stored on one line to prevent migration issues.
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
  -- IANA timezone string e.g. 'Africa/Cairo', 'UTC'. Used for badge time checks.
  timezone VARCHAR(100) DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Row auto-created on user registration with all defaults.
```

---

### user_badges
```sql
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  badge_key VARCHAR(50) NOT NULL CHECK (badge_key IN (
    'first_rep', 'ten_strong', 'half_century', 'century',
    'iron_month', 'iron_quarter', 'pr_machine', 'heavy_lifter',
    'consistent', 'early_bird', 'night_owl', 'gym_legend'
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
  -- First day of the reported period. For monthly: 2026-03-01. For yearly: 2025-01-01.
  report_period_start DATE NOT NULL,
  report_type VARCHAR(10) NOT NULL CHECK (report_type IN ('monthly', 'yearly')),
  -- Fully computed report data JSON (see Section 10.5)
  report_data JSONB NOT NULL,
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
    'heaviest_lift', 'most_volume_week', 'most_volume_month',
    'most_volume_alltime', 'most_workouts_week', 'most_workouts_month',
    'most_workouts_alltime', 'longest_streak'
  )),
  period VARCHAR(20) NOT NULL CHECK (period IN ('weekly', 'monthly', 'all_time')),
  period_start DATE,
  period_end DATE,
  -- Max 50 entries, ordered by rank ASC:
  -- [{"rank":1,"user_id":"uuid","display_name":"Ahmed","avatar_url":"...","value":200.5}]
  -- Snapshotted at generation time. On user deletion, update display_name + avatar_url.
  rankings JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW()
  -- Retained 12 months then deleted by cron job
);
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
    'total_volume', 'workout_count', 'exercise_volume', 'exercise_1rm'
  )),
  -- exercise_id required when metric IN ('exercise_volume', 'exercise_1rm').
  -- Enforced at API layer with zod: if metric requires exercise, exercise_id must be present.
  exercise_id UUID REFERENCES exercises(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
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
  -- Final rankings when challenge ended. Same format as leaderboard_snapshots.rankings.
  final_rankings JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### ai_trainer_programs
```sql
CREATE TABLE ai_trainer_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  goal VARCHAR(20) NOT NULL CHECK (goal IN ('strength', 'hypertrophy', 'endurance', 'general')),
  experience_level VARCHAR(20) NOT NULL
    CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  days_per_week INTEGER NOT NULL CHECK (days_per_week BETWEEN 2 AND 6),
  equipment VARCHAR(20) NOT NULL
    CHECK (equipment IN ('full_gym', 'dumbbells', 'bodyweight', 'home_mixed')),
  is_active BOOLEAN DEFAULT true,
  is_paused BOOLEAN DEFAULT false,
  program_template_key VARCHAR(100) NOT NULL,
  -- progression_data JSONB — fully defined structure:
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
    'gym', 'home', 'dumbbells', 'bodyweight',
    'cardio_hiit', 'resistance_band', 'travel', 'suspension'
  )),
  level VARCHAR(20) NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  goal VARCHAR(20) CHECK (goal IN ('strength', 'hypertrophy', 'endurance', 'weight_loss', 'general')),
  equipment_required TEXT[] NOT NULL DEFAULT '{}',
  days_per_week INTEGER,
  -- program_data JSONB structure:
  -- {
  --   "routines": [{
  --     "name": "Day 1 - Push",
  --     "exercises": [{
  --       "wger_id": 192,
  --       "exercise_name": "Bench Press (Barbell)",
  --       "position": 0,
  --       "superset_group": null,
  --       "rest_seconds": 120,
  --       "notes": "Keep elbows at 45 degrees",
  --       "sets": [{
  --         "position": 0,
  --         "set_type": "warmup",
  --         "target_weight_kg": null,
  --         "target_reps": 10,
  --         "target_reps_min": null,
  --         "target_reps_max": null,
  --         "target_duration_seconds": null,
  --         "target_distance_meters": null
  --       }]
  --     }]
  --   }]
  -- }
  program_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Indexes (030_indexes.sql)
```sql
-- users
CREATE INDEX idx_users_gym_id ON users(gym_id);
CREATE INDEX idx_users_username ON users(username);

-- exercises
CREATE INDEX idx_exercises_gym_id ON exercises(gym_id);
CREATE INDEX idx_exercises_name_fts ON exercises USING gin(to_tsvector('english', name));

-- routines
CREATE INDEX idx_routines_user_id ON routines(user_id);
CREATE INDEX idx_routines_gym_id ON routines(gym_id);

-- routine_exercises
CREATE INDEX idx_routine_exercises_routine_id ON routine_exercises(routine_id);

-- routine_sets
CREATE INDEX idx_routine_sets_routine_exercise_id ON routine_sets(routine_exercise_id);

-- workouts
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_gym_id ON workouts(gym_id);
CREATE INDEX idx_workouts_started_at ON workouts(started_at DESC);
CREATE INDEX idx_workouts_gym_feed ON workouts(gym_id, visibility, started_at DESC);
CREATE INDEX idx_workouts_user_completed ON workouts(user_id, is_completed, started_at DESC);

-- workout_exercises
CREATE INDEX idx_workout_exercises_workout_id ON workout_exercises(workout_id);

-- workout_sets
CREATE INDEX idx_workout_sets_workout_exercise_id ON workout_sets(workout_exercise_id);

-- personal_records
CREATE INDEX idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);
CREATE INDEX idx_personal_records_gym ON personal_records(gym_id, exercise_id);

-- body_measurements
CREATE INDEX idx_body_measurements_user_id ON body_measurements(user_id, measured_at DESC);

-- workout_media
CREATE INDEX idx_workout_media_workout_id ON workout_media(workout_id);

-- follows
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_follows_active ON follows(follower_id, following_id) WHERE status = 'active';

-- workout_likes
CREATE INDEX idx_workout_likes_workout_id ON workout_likes(workout_id);

-- workout_comments
CREATE INDEX idx_workout_comments_workout_id ON workout_comments(workout_id);

-- notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read, created_at DESC);

-- streaks
-- Already has UNIQUE on user_id which creates an index

-- leaderboard_snapshots — includes period for efficient period-filtered queries
CREATE INDEX idx_leaderboard_snapshots_gym
  ON leaderboard_snapshots(gym_id, category, period, generated_at DESC);

-- monthly_reports
CREATE INDEX idx_monthly_reports_user ON monthly_reports(user_id, report_period_start DESC);
```

---

## 6. RLS Policies

Enable RLS on all tables. The backend uses `service_role` (bypasses RLS). RLS is a second enforcement layer for additional safety.

JWT claims contain `gym_id` (set via Supabase Auth Hook — see Section 8.1). RLS policies read from the JWT.

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

-- Helper function: get gym_id from JWT claims
CREATE OR REPLACE FUNCTION auth_gym_id() RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'gym_id')::uuid;
$$ LANGUAGE sql STABLE;

-- Helper function: get role from JWT claims
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$ LANGUAGE sql STABLE;

-- Gym-scoped read policies (representative examples; apply same pattern to all tables)
CREATE POLICY "gym_scoped_workouts" ON workouts
  FOR ALL USING (gym_id = auth_gym_id());

CREATE POLICY "gym_scoped_users" ON users
  FOR SELECT USING (gym_id = auth_gym_id());

CREATE POLICY "own_data_write" ON workouts
  FOR INSERT WITH CHECK (user_id = auth.uid() AND gym_id = auth_gym_id());

CREATE POLICY "own_data_update" ON workouts
  FOR UPDATE USING (user_id = auth.uid());

-- Global exercises (gym_id IS NULL) are readable by everyone
CREATE POLICY "global_exercises_read" ON exercises
  FOR SELECT USING (gym_id IS NULL OR gym_id = auth_gym_id());

-- pre_built_routines: readable by all authenticated users
CREATE POLICY "prebuilt_read_all" ON pre_built_routines
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Apply gym_id scoped read policy to every other table following the same pattern above
-- (routine_folders, routines, routine_exercises, routine_sets, workout_exercises,
--  workout_sets, personal_records, body_measurements, measurement_photos, workout_media,
--  follows, workout_likes, workout_comments, gym_announcements, notifications,
--  user_push_tokens, streaks, user_settings, user_badges, monthly_reports,
--  leaderboard_snapshots, leaderboard_challenges, challenge_results, ai_trainer_programs)
```

---

## 7. Supabase Storage Policies

Five buckets with the following policies:

**avatars** — public read
```
Policy: Allow public read access to all files in this bucket.
Allow authenticated users to upload/replace their own avatar:
  Path must start with auth.uid()::text
```

**gym-assets** — public read
```
Policy: Allow public read access.
Allow gym_owner role to upload to paths starting with their gym_id.
```

**workout-media** — authenticated gym members only
```
Policy: Allow read if auth.uid() is not null AND
  the first path segment (gym_id) matches the user's gym_id from JWT claims.
Allow write if the second path segment (user_id) matches auth.uid()
  AND path is in /pending/ subdirectory OR workout_id belongs to auth.uid().
```

**exercise-assets** — public read
```
Policy: Allow public read access.
Allow write only via service_role (WGER import script and gym admin exercise uploads).
```

**progress-photos** — owner only
```
Policy: Allow read/write only if the first path segment (user_id) = auth.uid()::text.
```

---

## 8. Phase 1 — Foundation & Auth

### 8.1 JWT Custom Claims via Supabase Auth Hook

Supabase Auth Hook is a PostgreSQL function that runs on every token generation and adds custom claims. Create this function in Supabase:

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
  claims JSONB;
  user_gym_id UUID;
  user_role TEXT;
BEGIN
  -- Fetch gym_id and role from users table
  SELECT gym_id, role INTO user_gym_id, user_role
  FROM public.users
  WHERE id = (event->>'user_id')::uuid;

  -- Add custom claims to app_metadata
  claims := event->'claims';
  claims := jsonb_set(claims, '{app_metadata,gym_id}', to_jsonb(user_gym_id::text));
  claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$ LANGUAGE plpgsql STABLE;
```

Register this function in Supabase Dashboard → Authentication → Hooks → "Customize Access Token (JWT) Hook".

**Effect:** Every JWT issued by Supabase will contain:
```json
{
  "sub": "user-uuid",
  "app_metadata": {
    "gym_id": "gym-uuid",
    "role": "member"
  }
}
```

**Backend auth middleware** reads these claims directly:
```javascript
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({error: {code: 'UNAUTHORIZED', status: 401}});

  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    req.user = {
      id: decoded.sub,
      gym_id: decoded.app_metadata?.gym_id,
      role: decoded.app_metadata?.role ?? 'member'
    };
    // Check if user is deleted or suspended (rare — cached in JWT is stale risk)
    // For deleted/suspended: handled by checking is_active on sensitive operations
    next();
  } catch (err) {
    return res.status(401).json({error: {code: 'UNAUTHORIZED', status: 401}});
  }
}
```

**Tradeoff:** JWT claims are set at login time. If a user's role or gym_id changes (e.g., they are suspended), the change takes effect after their current access token expires (1 hour). For suspension: additionally check `is_active` from DB on any write operation.

### 8.2 Gym Owner Registration (Admin Panel)

**Correct atomic procedure** (avoids transaction rollback impossibility with Supabase Auth):

```
Step 1: Create Supabase Auth user via supabase.auth.admin.createUser({email, password})
        → Capture auth_user_id
        → If this fails: return error. Nothing to roll back.

Step 2: Begin PostgreSQL transaction:
  a. Generate invite_code (6-char, see 8.5). Verify uniqueness. Retry up to 5 times if collision.
  b. INSERT INTO gyms (...) VALUES (...) RETURNING id → capture gym_id
  c. INSERT INTO users (id, gym_id, role, ...) VALUES (auth_user_id, gym_id, 'gym_owner', ...)
  d. INSERT INTO user_settings (user_id) VALUES (auth_user_id)  -- all defaults
  e. INSERT INTO streaks (user_id, gym_id) VALUES (auth_user_id, gym_id)

Step 3: If PostgreSQL transaction fails:
  → ROLLBACK transaction
  → Call supabase.auth.admin.deleteUser(auth_user_id) to clean up the Auth entry
  → Return INTERNAL_ERROR to client

Step 4: Auth Hook fires automatically on first login → JWT gets gym_id and role claims

Step 5: Send welcome email via Resend with invite code and app download link
```

**Admin registration form fields:**
- Gym name (required, max 255 chars)
- Location / city (optional)
- Description (optional)
- Logo upload (optional, JPEG/PNG, max 5MB; compressed client-side to 512×512px before upload)
- Owner full name (required)
- Email (required, valid email format)
- Password (required, min 8 chars, min 1 number, min 1 letter)

### 8.3 Member Registration (Mobile App)

Same atomic procedure as 8.2 but member-initiated:

```
Step 1: User enters invite code
Step 2: GET /api/v1/gyms/validate-invite/:code → {gym_id, gym_name, logo_url}
Step 3: User fills registration form (full_name, username, email, password, sex, date_of_birth)
Step 4: POST /api/v1/auth/register (body includes invite_code)
Step 5 (backend):
  a. Re-validate invite_code (prevent race where code changes between steps 2 and 4)
  b. Create Supabase Auth user
  c. Begin transaction: insert users, user_settings, streaks rows
  d. If transaction fails: delete Supabase Auth user, return error
Step 6: Return JWT tokens. Client stores in expo-secure-store.
Step 7: Mobile redirects to home feed.
```

**Username rules:** 3–30 characters. Letters, numbers, underscores only (`^[a-zA-Z0-9_]+$`). Globally unique (enforced by UNIQUE constraint). Immutable after registration.

### 8.4 Login & Token Storage

- JWT access token: 1 hour expiry
- JWT refresh token: 7 day expiry
- **Both stored in `expo-secure-store`** without the `Bearer` prefix (just the raw token string)
- If either token exceeds 2048 bytes (Android limit on some devices): store only the refresh token; derive a fresh access token on every app launch via the refresh endpoint
- On every app launch: attempt silent refresh of access token
- If refresh fails (refresh token expired or revoked): clear storage, redirect to login screen

### 8.5 Invite Code Rules
- 6 characters, uppercase
- Excluded (visually ambiguous): O, 0, I, 1
- Valid character set: A B C D E F G H J K L M N P Q R S T U V W X Y Z 2 3 4 5 6 7 8 9
- Regeneration: new code replaces old immediately. Members in the middle of joining with the old code get INVITE_INVALID and must ask for the new code.

### 8.6 Password Reset Deep Link Configuration

Three steps required for password reset flow:

**Step 1 — Supabase Dashboard:**
- Project Settings → Authentication → URL Configuration
- Site URL: `https://ironpath.app`
- Redirect URLs: add `ironpath://reset-password`

**Step 2 — `app.json`:**
```json
{
  "expo": {
    "scheme": "ironpath"
  }
}
```

**Step 3 — Expo Router:**
Create `mobile/app/reset-password.tsx`. This screen receives the Supabase reset token via URL params (`?token=xxx&type=recovery`) and calls `POST /api/v1/auth/reset-password`.

### 8.7 Super Admin Account Creation (Seed Script)

`backend/scripts/seed-super-admin.js`:
```javascript
// Must create Supabase Auth user FIRST, then DB row
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seedSuperAdmin() {
  // 1. Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
    email_confirm: true
  });
  if (authError) throw authError;

  // 2. Super admin has no gym — insert with a special system gym or null gym_id
  // Since gym_id is NOT NULL, create a system gym first:
  const { data: gym } = await supabase.from('gyms').insert({
    name: 'IronPath System',
    invite_code: 'SYSTEM',
    subscription_status: 'active',
    subscription_tier: 'unlimited'
  }).select().single();

  // 3. Insert user row
  await supabase.from('users').insert({
    id: authUser.user.id,
    gym_id: gym.id,
    email: process.env.SUPER_ADMIN_EMAIL,
    username: 'ironpath_admin',
    full_name: 'IronPath Admin',
    role: 'super_admin'
  });

  // 4. Insert user_settings and streaks
  await supabase.from('user_settings').insert({ user_id: authUser.user.id });
  await supabase.from('streaks').insert({ user_id: authUser.user.id, gym_id: gym.id });

  console.log('Super admin created:', process.env.SUPER_ADMIN_EMAIL);
}
seedSuperAdmin().catch(console.error);
```

---

## 9. Phase 2 — Workout Engine

### 9.1 Exercise Library — WGER Import

Script location: `backend/scripts/import-wger.js`

Use the `exerciseinfo` endpoint which returns full exercise data (muscles, images, equipment) in a single call — avoiding the need for 3 separate API calls per exercise.

```javascript
const BASE_URL = 'https://wger.de/api/v2/exerciseinfo/';
let url = `${BASE_URL}?format=json&language=2&limit=100&offset=0`;

while (url) {
  const response = await fetch(url);
  const json = await response.json();

  for (const exercise of json.results) {
    // Map muscles
    const primaryMuscles = exercise.muscles.map(m => MUSCLE_MAP[m.id]).filter(Boolean);
    const secondaryMuscles = exercise.muscles_secondary.map(m => MUSCLE_MAP[m.id]).filter(Boolean);

    // Download and upload image
    let imageUrl = null;
    if (exercise.images.length > 0) {
      const imgResponse = await fetch(exercise.images[0].image);
      const imgBuffer = await imgResponse.buffer();
      // Detect extension from Content-Type header
      const contentType = imgResponse.headers.get('content-type');
      const ext = {
        'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif'
      }[contentType] ?? 'jpg';
      const storagePath = `global/${exercise.id}/image_0.${ext}`;
      await supabase.storage.from('exercise-assets').upload(storagePath, imgBuffer, {
        contentType, upsert: true
      });
      const { data: urlData } = supabase.storage.from('exercise-assets').getPublicUrl(storagePath);
      imageUrl = urlData.publicUrl;
    }

    // Idempotent: skip if wger_id already exists
    const { data: existing } = await supabase.from('exercises')
      .select('id').eq('wger_id', exercise.id).single();
    if (existing) continue;

    await supabase.from('exercises').insert({
      gym_id: null,
      is_custom: false,
      wger_id: exercise.id,
      name: exercise.translations.find(t => t.language === 2)?.name ?? exercise.name,
      description: exercise.translations.find(t => t.language === 2)?.description ?? '',
      equipment: EQUIPMENT_MAP[exercise.equipment[0]?.id] ?? 'other',
      primary_muscles: primaryMuscles,
      secondary_muscles: secondaryMuscles,
      image_url: imageUrl,
      logging_type: 'weight_reps'
    });
  }

  url = json.next; // null when last page reached
}
```

**WGER Muscle ID Map** (`backend/scripts/wger-muscle-map.js`):
```javascript
module.exports = {
  1:'biceps', 2:'anterior_deltoid', 3:'chest', 4:'hamstrings',
  5:'quads', 6:'glutes', 7:'gastrocnemius', 8:'triceps', 9:'lats',
  10:'traps', 11:'abs', 12:'obliques', 13:'lower_back', 14:'forearms',
  15:'rear_deltoid', 16:'soleus', 17:'inner_thighs'
};
```

**WGER Equipment ID Map** (`backend/scripts/wger-equipment-map.js`):
```javascript
module.exports = {
  1:'barbell', 2:'machine', 3:'dumbbell', 4:'cable',
  5:'bodyweight', 6:'resistance_band', 7:'kettlebell', 8:'other'
};
```

### 9.2 Plate Calculator Data

`backend/data/plate-denominations.js`:
```javascript
module.exports = {
  barbell_plates_kg: [0.25, 0.5, 1.25, 2.5, 5, 10, 15, 20, 25],
  dumbbell_increment_kg: 2.5,
  // Algorithm: target_per_side = (target_weight - bar_weight) / 2
  // Greedy descent through barbell_plates_kg from heaviest to lightest
  // Round dumbbell weights to nearest dumbbell_increment_kg
};
```

### 9.3 Active Workout Draft Persistence (expo-sqlite)

Local SQLite table created on first app launch:

```sql
CREATE TABLE IF NOT EXISTS active_workout_draft (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- only one draft at a time
  workout_name TEXT NOT NULL,
  routine_id TEXT,                          -- UUID or null
  started_at TEXT NOT NULL,                 -- ISO8601 string
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  client_upload_uuid TEXT,                  -- UUID for pre-save media uploads
  state_json TEXT NOT NULL                  -- serialized workout state (see below)
);
```

**`state_json` structure:**
```json
{
  "exercises": [
    {
      "exercise_id": "uuid",
      "exercise_name": "Bench Press",
      "position": 0,
      "superset_group": null,
      "rest_seconds": 90,
      "notes": "",
      "sets": [
        {
          "position": 0,
          "set_type": "normal",
          "weight_kg": 100,
          "reps": 5,
          "duration_seconds": null,
          "distance_meters": null,
          "rpe": null,
          "is_completed": true,
          "completed_at": "2026-04-07T10:15:30.000Z"
        }
      ]
    }
  ]
}
```

**Draft save trigger:** Save to SQLite on every **input field change** with a 500ms debounce — not only on set completion. This ensures data entered but not yet marked complete is preserved on crash.

**On app launch:** Check for existing draft row. If found → "Resume workout?" modal. Options: Resume (load draft) or Discard (DELETE from `active_workout_draft`).

**On workout save (client):** After receiving HTTP 200 from server → then DELETE from `active_workout_draft`.

### 9.4 Workout Save Procedure

**Pre-save media upload flow:**
1. Client generates `client_upload_uuid` (UUID v4) before opening the finish screen
2. User selects photos/videos
3. Client compresses each photo (max 1920px, JPEG 80%) using `expo-image-manipulator`
4. Client uploads each file to Supabase Storage at:
   `workout-media/{gym_id}/{user_id}/pending/{client_upload_uuid}/photo_0.jpg`
5. Client includes `client_upload_uuid` and list of filenames in the workout save payload

**Server-side save procedure** (atomic DB transaction):
```
Input: workout payload including client_upload_uuid, idempotency_key

1. Check idempotency: SELECT id FROM workouts WHERE user_id = :user_id AND
   idempotency_key = :idempotency_key
   If found: return existing workout (HTTP 200) — no duplicate created

2. INSERT INTO workouts (idempotency_key, ..., is_completed = false) RETURNING id → workout_id

3. For each exercise in payload:
   INSERT INTO workout_exercises → workout_exercise_id

4. For each set in each exercise:
   INSERT INTO workout_sets with is_warmup_counted set based on user's current
   warm_up_sets_in_stats setting

5. Calculate total_volume_kg:
   SUM over all completed sets where:
     (set_type != 'warmup') OR (set_type = 'warmup' AND is_warmup_counted = true)
   Formula per set:
     weight_reps: weight_kg * reps
     bodyweight_reps: (user.bodyweight_kg + weight_kg) * reps
       (weight_kg = added weight; if null, use 0)
     duration: 0
     distance: 0
   Round to 2 decimal places.

6. Calculate total_sets:
   COUNT of completed sets where set_type != 'warmup'
   (warmup sets never count toward set totals regardless of settings)

7. Compute ordinal_number:
   SELECT COUNT(*) FROM workouts WHERE user_id = :user_id AND is_completed = true
   ordinal_number = count + 1  (this is the workout being completed)

8. UPDATE workouts SET is_completed = true, finished_at = NOW(),
   duration_seconds = :duration, total_volume_kg = :calculated,
   total_sets = :calculated, ordinal_number = :calculated

9. Move pre-uploaded media from pending path to final path in Supabase Storage:
   FROM: workout-media/{gym_id}/{user_id}/pending/{client_upload_uuid}/photo_0.jpg
   TO:   workout-media/{gym_id}/{user_id}/{workout_id}/photo_0.jpg
   INSERT INTO workout_media for each moved file

10. Run PR detection (see Section 10.2) — returns list of new PR records

11. Update streak (see streak rules in Section 5)

12. COMMIT transaction

13. Return: {workout, prs_detected: [...]}
```

**Client receives 200 → THEN deletes local SQLite draft.**

If the client never receives the response (network drop), it retries with the same `idempotency_key`. Step 1 catches the duplicate and returns the existing workout.

### 9.5 Previous Workout Values — Query Logic

**Mode `overall`** (get last logged values for this exercise, any workout):
```sql
SELECT ws.weight_kg, ws.reps, ws.duration_seconds, ws.distance_meters, ws.position
FROM workout_sets ws
JOIN workout_exercises we ON we.id = ws.workout_exercise_id
JOIN workouts w ON w.id = we.workout_id
WHERE w.user_id = :user_id
  AND we.exercise_id = :exercise_id
  AND w.is_completed = true
  AND ws.is_completed = true
  AND ws.set_type != 'warmup'
ORDER BY w.started_at DESC, ws.position ASC
LIMIT :set_count;
```

**Mode `within_routine`** (last values from this specific routine):
```sql
SELECT ws.weight_kg, ws.reps, ws.duration_seconds, ws.distance_meters, ws.position
FROM workout_sets ws
JOIN workout_exercises we ON we.id = ws.workout_exercise_id
JOIN workouts w ON w.id = we.workout_id
WHERE w.user_id = :user_id
  AND w.routine_id = :current_routine_id
  AND we.exercise_id = :exercise_id
  AND w.is_completed = true
  AND ws.is_completed = true
  AND ws.set_type != 'warmup'
ORDER BY w.started_at DESC, ws.position ASC
LIMIT :set_count;
```

`:set_count` = number of sets in the current exercise (from the active workout draft). If fewer rows are returned than sets exist, fill remaining sets with the last returned row's values. If zero rows returned in `within_routine` mode, silently fall back to `overall` mode. If still zero, leave set fields empty.

### 9.6 Superset Rest Timer Behavior

During active workout: rest timer fires only after completing the last set of the LAST exercise in a superset group for one round. Transitioning between exercises within a superset does NOT trigger the rest timer. The timer fires exactly once per round of the superset.

### 9.7 Warm-Up Sets Recalculation

When user toggles `warm_up_sets_in_stats` in settings:
1. `PATCH /api/v1/users/me/settings` returns 200 immediately
2. Server calls `setImmediate(() => recalculateWarmupStats(userId, newValue))` — runs asynchronously after response sent
3. `recalculateWarmupStats`:
   - Fetch all completed workouts for user
   - For each workout: update `is_warmup_counted` on all warmup sets based on `newValue`
   - Recompute `total_volume_kg` for each workout using updated sets
   - Batch update workouts in groups of 50

---

## 10. Phase 3 — Progress & Analytics

### 10.1 Statistics Dashboard

Accessible via Profile → Statistics tab.

**Overview cards (all-time):**
- Total workouts: `SELECT COUNT(*) FROM workouts WHERE user_id = :id AND is_completed = true`
- Total volume: `SELECT SUM(total_volume_kg) FROM workouts WHERE user_id = :id AND is_completed = true`
- Total time: `SELECT SUM(duration_seconds) FROM workouts WHERE user_id = :id AND is_completed = true`
- Total sets: `SELECT SUM(total_sets) FROM workouts WHERE user_id = :id AND is_completed = true`
Display volume in user's preferred unit. Display time as "Xh Ym".

**Last 7 days body graph:**
- For each of the past 7 calendar days: fetch exercises logged on that day → extract their `primary_muscles`
- Render a small body silhouette per day with trained muscles highlighted
- Tap a day → navigate to that day's workout

**Set count per muscle group:**
- Time filters: 30 days / 3 months / 1 year / all-time
- Query: join `workout_sets` → `workout_exercises` → `exercises` → unnest `primary_muscles`
- Group by muscle name, sum completed non-warmup sets
- Display as bar chart (Victory Native)

**Muscle distribution:**
- Pie chart and bar chart views (toggle between them)
- Colored body diagram: map muscle names to body regions; color intensity by relative volume

**Main exercises overview:**
- `SELECT we.exercise_id, e.name, COUNT(*) as times_logged FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id JOIN exercises e ON e.id = we.exercise_id WHERE w.user_id = :id AND w.is_completed = true GROUP BY we.exercise_id, e.name ORDER BY times_logged DESC LIMIT 5`

### 10.2 PR Detection Algorithm

Runs server-side immediately after workout transaction commits. Input: `workout_id`.

For each `workout_exercise` in the workout:
- Fetch `exercise.logging_type`
- `completed_sets` = sets where `is_completed = true AND set_type IN ('normal', 'dropset', 'failure')` — warmup sets NEVER contribute to PRs

**For `weight_reps` or `bodyweight_reps` logging:**

| Record Type | Candidate | workout_set_id |
|-------------|-----------|----------------|
| `heaviest_weight` | `MAX(weight_kg)` | set with max weight |
| `projected_1rm` | `MAX(weight_kg * (1 + reps/30.0))` where `reps > 0` | set with highest formula result |
| `best_volume_set` | `MAX(weight_kg * reps)` | set with highest product |
| `best_volume_session` | `SUM(weight_kg * reps)` all completed_sets | `NULL` (session-aggregate) |
| `most_reps` | `MAX(reps)` | set with most reps |
| `3rm` | `MAX(weight_kg)` where `reps >= 3` | set with max weight at ≥3 reps |
| `5rm` | `MAX(weight_kg)` where `reps >= 5` | set with max weight at ≥5 reps |
| `10rm` | `MAX(weight_kg)` where `reps >= 10` | set with max weight at ≥10 reps |

For each record type:
```
existing = SELECT MAX(value) FROM personal_records
  WHERE user_id = :uid AND exercise_id = :eid AND record_type = :type
If candidate IS NOT NULL AND (existing IS NULL OR candidate > existing):
  INSERT INTO personal_records (user_id, gym_id, exercise_id, workout_id,
    workout_set_id, record_type, value, achieved_at)
  VALUES (:uid, :gid, :eid, :workout_id, :set_id_or_null, :type, :candidate, NOW())
```

**For `duration` logging:** check `most_reps` using `MAX(duration_seconds)` as the value; `workout_set_id` = the set with longest duration.

**For `distance` logging:** check `best_volume_session` using `SUM(distance_meters)` as the value; `workout_set_id = NULL`.

If `completed_sets` is empty for an exercise: skip all PR checks for that exercise silently.

Return all newly inserted `personal_record` IDs in the workout save response.

### 10.3 Strength Level Classification

Applies to these 5 exercises only, matched by name after WGER import:
**Squat, Bench Press (Barbell), Deadlift (Conventional), Overhead Press (Barbell), Barbell Row**

Classification uses `projected_1rm` from `personal_records` compared against user's `bodyweight_kg`. If `bodyweight_kg` is null: do not calculate — show a tappable prompt "Add bodyweight to unlock strength levels" that deep-links to body measurements entry screen.

**Standards table (ratio = 1RM ÷ bodyweight_kg):**

| Level | Squat M | Bench M | Deadlift M | OHP M | Row M |
|-------|---------|---------|------------|-------|-------|
| Beginner | 0.75 | 0.50 | 1.00 | 0.35 | 0.50 |
| Intermediate | 1.25 | 0.75 | 1.50 | 0.55 | 0.75 |
| Advanced | 1.75 | 1.25 | 2.00 | 0.80 | 1.10 |
| Elite | 2.25 | 1.60 | 2.50 | 1.10 | 1.40 |

| Level | Squat F | Bench F | Deadlift F | OHP F | Row F |
|-------|---------|---------|------------|-------|-------|
| Beginner | 0.50 | 0.30 | 0.75 | 0.20 | 0.35 |
| Intermediate | 0.90 | 0.55 | 1.15 | 0.35 | 0.55 |
| Advanced | 1.30 | 0.80 | 1.55 | 0.55 | 0.80 |
| Elite | 1.70 | 1.05 | 2.00 | 0.75 | 1.05 |

Hardcoded in `backend/data/strength-standards.js`. Classification rule: if `1rm_kg / bodyweight_kg >= Elite` → Elite; else if `>= Advanced` → Advanced; else if `>= Intermediate` → Intermediate; else → Beginner.

### 10.4 Volume Comparison Table

Hardcoded in `backend/data/volume-comparisons.js`:
```javascript
module.exports = [
  {label:'a dumbbell', kg:10},
  {label:'a bicycle', kg:15},
  {label:'a large dog', kg:40},
  {label:'a refrigerator', kg:90},
  {label:'a panda bear', kg:120},
  {label:'a grand piano', kg:450},
  {label:'a car', kg:1400},
  {label:'a hippo', kg:2000},
  {label:'an elephant', kg:5000},
  {label:'a school bus', kg:11000}
];
// Algorithm: find the item with the largest kg that is <= session's total_volume_kg.
// If total_volume_kg < 10: show no comparison.
```

### 10.5 Monthly Report Generation

Cron fires `0 0 1 * *` (1st of month, 00:00 UTC). Generates a report for the previous calendar month for every active user with ≥ 1 workout in that month.

If a user had zero workouts in the prior month: no report generated. The reports list skips that month.

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
      "workout_id": "uuid-or-null-if-deleted",
      "workout_name": "Push Day A"
    }
  ],
  "muscle_distribution": [
    {"muscle": "chest", "sets": 80, "percentage": 25.0}
  ],
  "top_exercises": [
    {"exercise_name": "Bench Press (Barbell)", "times_logged": 12}
  ]
}
```

Note: `workout_name` is copied into the report at generation time so the link remains meaningful even if the workout is later deleted. If `workout_id` is null (workout was deleted before report ran), show "Workout deleted" as the link text.

After inserting the report row: send push notification of type `monthly_report_ready`.

### 10.6 Year in Review

Cron fires `0 2 1 1 *` (January 1st, 02:00 UTC). Generates for the prior calendar year. Stored in `monthly_reports` with `report_type = 'yearly'` and `report_period_start = '{year}-01-01'`.

Year in Review `report_data` structure:
```json
{
  "year": 2025,
  "total_workouts": 180,
  "total_volume_kg": 540000.0,
  "total_training_days": 180,
  "total_prs_set": 47,
  "best_month": "October",
  "best_month_workouts": 22,
  "most_trained_muscle": "chest",
  "top_exercises": ["Bench Press (Barbell)", "Squat", "Deadlift (Conventional)"],
  "biggest_pr": {
    "exercise_name": "Deadlift (Conventional)",
    "record_type": "heaviest_weight",
    "value_kg": 200.0,
    "workout_name": "Heavy Pull Day"
  },
  "weeks_trained_of_52": 48
}
```

---

## 11. Phase 4 — Leaderboards & Social

### 11.1 Leaderboard Categories and Reset Schedule

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

**On reset:** The cron job first archives the current snapshot (writes `period_start` and `period_end` to the existing row), then triggers a fresh computation. Historical snapshots retained 12 months.

### 11.2 Leaderboard Computation

Runs every 15 minutes via cron. Processes gyms in batches of 10 with a 2-second pause between batches to avoid DB overload. Writes results to `leaderboard_snapshots` (upsert by `gym_id + category + period + period_start`, or insert new row).

The API reads from `leaderboard_snapshots` only — no live aggregation at request time.

Top 50 members per snapshot. The requesting user's own rank is computed separately and appended to the response even if outside top 50.

### 11.3 38 Predefined Leaderboard Exercises

These names must match exactly what was imported from WGER. Stored as WGER IDs in `backend/data/leaderboard-exercises.js`:
```javascript
// [wger_id, display_name]
module.exports = [
  [110, 'Squat'], [192, 'Bench Press (Barbell)'], [241, 'Deadlift (Conventional)'],
  // ... all 38
];
```
On app startup, the backend resolves these WGER IDs to internal exercise UUIDs via `SELECT id FROM exercises WHERE wger_id = :wger_id` and caches the mapping for the process lifetime.

### 11.4 Social Feed Query

The home feed combines `public` workouts from all gym members and `followers` workouts from users the viewer follows:

```sql
SELECT w.*, u.username, u.avatar_url, u.full_name,
  (SELECT COUNT(*) FROM workout_likes wl WHERE wl.workout_id = w.id) AS like_count,
  (SELECT COUNT(*) FROM workout_comments wc WHERE wc.workout_id = w.id AND wc.deleted_at IS NULL) AS comment_count,
  EXISTS(SELECT 1 FROM workout_likes wl2 WHERE wl2.workout_id = w.id AND wl2.user_id = :viewer_id) AS viewer_liked
FROM workouts w
JOIN users u ON u.id = w.user_id
WHERE w.gym_id = :gym_id
  AND w.is_completed = true
  AND (
    w.visibility = 'public'
    OR (
      w.visibility = 'followers'
      AND w.user_id IN (
        SELECT following_id FROM follows
        WHERE follower_id = :viewer_id AND status = 'active'
      )
    )
    OR w.user_id = :viewer_id
  )
  AND (:cursor IS NULL OR w.started_at < :cursor::timestamptz)
ORDER BY w.started_at DESC
LIMIT :limit;
```

**Filter toggle:** `?filter=all` (default) shows all gym members' public workouts. `?filter=following` adds the condition `w.user_id IN (SELECT following_id FROM follows WHERE follower_id = :viewer_id AND status = 'active') OR w.user_id = :viewer_id` — excluding non-followed users' workouts.

### 11.5 @Mention Parsing

When a comment is saved, the backend parses mentions using:
```javascript
const MENTION_REGEX = /(?<!\w)@([a-zA-Z0-9_]{3,30})(?!\w)/g;
```
This prevents matching emails (`user@example.com`) and enforces the 3-30 char username rule.

For each match:
1. Look up `user_id` from `users` where `username = :mention AND gym_id = :gym_id AND deleted_at IS NULL`
2. If found and not the comment author: create a `mention` notification for that user
3. The comment owner receives a `comment` notification (standard)

### 11.6 Follow Request Flow (Private Profiles)

1. User A follows User B (who is private) → `POST /users/:id/follow` → inserts `follows` with `status = 'pending'`
2. User A sees "Requested" button on User B's profile
3. User B gets a `follow_request` notification
4. User B approves: `POST /follow-requests/:id/approve` → `status = 'active'`, sends `follow_request_approved` notification to User A
5. User B rejects: `POST /follow-requests/:id/reject` → deletes the `follows` row, no notification

### 11.7 User Profile Compare Response

`GET /api/v1/users/:id/compare` returns:
```json
{
  "data": {
    "user_a": {
      "user_id": "uuid", "username": "ahmed",
      "total_workouts": 150, "total_volume_kg": 450000.0,
      "total_duration_seconds": 360000
    },
    "user_b": {
      "user_id": "uuid", "username": "hassan",
      "total_workouts": 120, "total_volume_kg": 380000.0,
      "total_duration_seconds": 290000
    },
    "muscle_distribution": {
      "user_a": [{"muscle": "chest", "sets": 400, "percentage": 22.0}],
      "user_b": [{"muscle": "chest", "sets": 350, "percentage": 20.0}]
    },
    "shared_exercises": ["Bench Press (Barbell)", "Squat"],
    "head_to_head": [
      {
        "exercise_name": "Bench Press (Barbell)",
        "user_a_projected_1rm_kg": 120.0,
        "user_b_projected_1rm_kg": 100.0
      }
    ]
  }
}
```
Returns 403 if the target user (`user_b`) has a private profile and the requester is not a follower.

---

## 12. Phase 5 — Gym Admin Panel (Web)

Deployed to Vercel at `admin.ironpath.app`. Separate React + Vite application.

All `/api/v1/admin/*` endpoints: `role = 'gym_owner'` OR `role = 'super_admin'`.
Super admin-only endpoints (`/api/v1/admin/gyms`): `role = 'super_admin'` only.

### 12.1 Dashboard
Metrics cards: total active members, new members this month, total workouts this month, gym-wide volume this month, most active member this week.

Charts: member activity trend (workouts/day last 30 days), top 10 most active members (bar), muscle distribution across all members (pie).

### 12.2 Member Management
Table: avatar | full name | username | email | join date | last active | workout count | status (active/suspended)
Search: by name or username. Filter: by status.
Actions per row: View stats (read-only) | Send notification | Suspend/Reinstate | Remove.

**Suspend/Reinstate:** `PATCH /api/v1/admin/members/:id/suspend` with body `{"suspended": true|false}`. Sets `is_active = !suspended`. A reinstated member can log in again immediately.

**Remove:** `DELETE /api/v1/admin/members/:id` triggers the soft delete procedure (Section 5, users table). Counts toward historical data; frees the member slot for a new user.

### 12.3 Invite Management
Display current invite code with copy button. "Regenerate" button. Email invite: text field + "Send" button.

### 12.4 Announcements (CRUD)
Create/edit/delete announcements. Toggle pin. Set optional expiry date. Sending an announcement also fires a push notification to all gym members (batched, type = `announcement`).

### 12.5 Gym Template Routines (Full CRUD)
Create, view, edit, delete gym-wide routine templates visible in all members' Explore tab.

### 12.6 Leaderboard Challenges (Full CRUD)
Create/edit/delete challenges. Edit and delete only allowed when `status = 'upcoming'`. The 5-minute cron sets status to `active` or `completed` automatically.

### 12.7 Analytics
Member retention (weekly active users trend), churn risk (members inactive 30+ days), most popular exercises, peak training hours heatmap.

### 12.8 Gym Settings
Edit gym name, logo, location, description, accent color. Owner account password change.

### 12.9 Super Admin Dashboard (`/super` route — super_admin only)
Table of all gyms: name | status | tier | expiry | member count | workout count.
Per-gym actions: update `subscription_status`, `subscription_tier`, `subscription_expires_at`.
Endpoint: `PATCH /api/v1/admin/gyms/:id/subscription`.

---

## 13. Phase 6 — In-App Engagement

### 13.1 Streaks
See streak calculation rules in Section 5 (streaks table).

### 13.2 Achievement Badges

Badge check runs after every workout save. Uses `luxon` for timezone-aware time comparisons.

| Badge Key | Trigger | Check Logic |
|-----------|---------|-------------|
| `first_rep` | Complete 1st workout | `ordinal_number = 1` |
| `ten_strong` | Complete 10 workouts | `COUNT(*) workouts WHERE user = :id >= 10` |
| `half_century` | Complete 50 workouts | `COUNT(*) >= 50` |
| `century` | Complete 100 workouts | `COUNT(*) >= 100` |
| `iron_month` | 4-week streak | `current_streak_weeks >= 4` |
| `iron_quarter` | 12-week streak | `current_streak_weeks >= 12` |
| `pr_machine` | 10 total PRs set | `COUNT(*) FROM personal_records WHERE user = :id >= 10` |
| `heavy_lifter` | 10,000kg cumulative volume | `SUM(total_volume_kg) FROM workouts WHERE user = :id >= 10000` |
| `consistent` | Train 4+ days in one calendar week (Mon–Sun UTC) | Check current ISO week's workout count |
| `early_bird` | Workout started before 07:00 in user's timezone | Convert `started_at` to user's `timezone` using luxon; check hour < 7 |
| `night_owl` | Workout started after 22:00 in user's timezone | Convert to user timezone; check hour >= 22 |
| `gym_legend` | Rank #1 in any all-time leaderboard category | Checked by leaderboard refresh job (not workout save) |

`gym_legend` check: after each leaderboard refresh, for any gym where the #1 ranked user changed, check if the new #1 already has the badge. If not, award it. Once awarded, `gym_legend` is never revoked even if the user drops from #1.

For all badges: check if `user_badges` already has the row (UNIQUE constraint ensures idempotency). Only insert if not present. On insert: create a `badge_unlocked` notification.

### 13.3 Shareable Workout Graphics

Generated on-device using `react-native-view-shot`. A `WorkoutShareCard` component is rendered off-screen and captured as PNG:

```jsx
// Component renders (off-screen, opacity 0):
<WorkoutShareCard
  gymName={gym.name}
  gymLogo={gym.logo_url}
  userName={user.full_name}
  username={user.username}
  workoutName={workout.name}
  date={workout.started_at}
  stats={{duration: workout.duration_seconds, volume: workout.total_volume_kg, sets: workout.total_sets}}
  prs={prs.slice(0, 3)}
  extraPrs={Math.max(0, prs.length - 3)}
  theme={'light' | 'dark' | 'transparent'}
/>
```

After capture: save to camera roll via `expo-media-library` (requires permission granted at first use).

**Graphics are NOT uploaded to Supabase Storage** — device-only.

### 13.4 Push Notifications

Backend uses `expo-server-sdk` for sending push notifications. Check recipient's notification preference in `user_settings.notif_<type>` before sending. If false: skip push but still insert in-app notification row.

Send notifications in batches using expo-server-sdk:
```javascript
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

async function sendPushNotifications(messages) {
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    const receipts = await expo.sendPushNotificationsAsync(chunk);
    for (const receipt of receipts) {
      if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
        // Delete the invalid token from user_push_tokens
        await supabase.from('user_push_tokens').delete().eq('token', receipt.details.expoPushToken);
      }
    }
  }
}
```

**Payload size rule:** Keep `data` field under 3KB. Include only IDs, not full objects. Log a warning server-side if constructed payload exceeds 3KB.

### 13.5 Home Screen Widgets

iOS: implement via Expo Config Plugin that generates a Swift WidgetKit extension. Use `@bacons/apple-targets` Expo plugin as the foundation for native widget support.

Android: use `@bam.tech/react-native-android-widget`.

Widgets:
- Calendar (small): last 7 days activity dots + streak count
- Routine of the Day (medium): today's scheduled routine + "Start" tap-to-open
- Weekly Streak (small): streak number + days trained this week
- Weekly Volume (small): volume this week with a progress ring
- Quick Start (small): tap → opens app to routine picker

### 13.6 Live Activity (Active Workout Lock Screen)

iOS: Dynamic Island / Lock Screen using `react-native-live-activities` (Expo config plugin approach).
Android: Persistent foreground notification with custom layout using `expo-notifications` with `sticky: true`.

Displays: current exercise name, next set (weight + reps), elapsed time, rest timer countdown.
Actions: mark set complete, ±15 seconds on rest timer, skip rest.

---

## 14. Phase 7 — AI Trainer (Algorithmic)

### 14.1 Trainer Onboarding Flow

After user taps "Start AI Trainer":
1. Screen 1: Goal selection (Strength / Hypertrophy / Endurance / General Fitness)
2. Screen 2: Experience level (Beginner < 1yr / Intermediate 1–3yr / Advanced 3yr+)
3. Screen 3: Days per week available (2 / 3 / 4 / 5 / 6)
4. Screen 4: Equipment (Full Gym / Dumbbells Only / Bodyweight Only / Home + Some Equipment)
5. Screen 5: **Starting weights** — for each main exercise in the selected program, user enters their current working weight. Pre-filled with reasonable defaults:
   - Full gym beginner: Squat 60kg, Bench 40kg, Deadlift 80kg, OHP 30kg, Row 50kg
   - Dumbbells: Dumbbell Press 10kg (per hand), etc.
   - Bodyweight: no weight input needed
   User can adjust all values. These become `current_weight_kg` in `progression_data`.

`POST /api/v1/trainer/program` with all onboarding answers → creates `ai_trainer_programs` row with initial `progression_data` pre-populated from Step 5 inputs.

### 14.2 Program Template Decision Matrix

Key format: `{experience}_{goal}_{days}_{equipment}`

```javascript
// backend/data/trainer-templates.js
// Explicit fall-through function — deterministic, no ambiguity:

function resolveTemplateKey(experience, goal, days, equipment) {
  const key = `${experience}_${goal}_${days}_${equipment}`;
  if (TEMPLATES[key]) return key;

  // Fall-through 1: try same experience+goal, nearest lower days
  for (let d = days - 1; d >= 2; d--) {
    const k = `${experience}_${goal}_${d}_${equipment}`;
    if (TEMPLATES[k]) return k;
  }

  // Fall-through 2: try full_gym equipment
  for (let d = days; d >= 2; d--) {
    const k = `${experience}_${goal}_${d}_full_gym`;
    if (TEMPLATES[k]) return k;
  }

  // Fall-through 3: try 'general' goal
  for (let d = days; d >= 2; d--) {
    const k = `${experience}_general_${d}_full_gym`;
    if (TEMPLATES[k]) return k;
  }

  // Ultimate fallback
  return 'beginner_general_3_full_gym';
}
```

**Defined template keys (all implemented in trainer-templates.js):**

| Key | Program Name |
|-----|-------------|
| `beginner_strength_3_full_gym` | StrongLifts 5×5 |
| `beginner_strength_3_dumbbells` | Dumbbell StrongLifts |
| `beginner_strength_3_bodyweight` | Bodyweight Strength |
| `beginner_hypertrophy_3_full_gym` | PPL Beginner |
| `beginner_hypertrophy_4_full_gym` | Upper/Lower Beginner |
| `beginner_general_2_full_gym` | 2-Day Full Body |
| `beginner_general_3_full_gym` | 3-Day Full Body |
| `beginner_endurance_3_bodyweight` | Bodyweight Cardio 3x |
| `intermediate_strength_3_full_gym` | 5/3/1 3-Day |
| `intermediate_strength_4_full_gym` | 5/3/1 4-Day |
| `intermediate_strength_3_dumbbells` | Dumbbell Strength Inter. |
| `intermediate_hypertrophy_4_full_gym` | Upper/Lower Intermediate |
| `intermediate_hypertrophy_5_full_gym` | PPL Intermediate |
| `intermediate_general_3_full_gym` | GZCLP 3-Day |
| `advanced_strength_4_full_gym` | nSuns 4-Day |
| `advanced_strength_5_full_gym` | nSuns 5-Day |
| `advanced_hypertrophy_5_full_gym` | PPL Advanced |
| `advanced_hypertrophy_6_full_gym` | PPL 6-Day Advanced |
| `advanced_general_4_full_gym` | GZCLP Advanced |

### 14.3 Program Template Structure

```javascript
// Each template in backend/data/trainer-templates.js:
{
  name: "StrongLifts 5x5",
  protocol: "linear",           // 'linear' | 'wave' | 'periodization'
  weeks_per_cycle: 1,
  deload_after_failures: 2,
  deload_percentage: 0.90,      // multiply current weight by this on deload
  upper_body_increment_kg: 2.5,
  lower_body_increment_kg: 5.0,
  sessions: [
    {
      day_label: "Session A",
      exercises: [
        {
          wger_id: 110,          // Squat
          sets: 5,
          reps: 5,               // for strength/general; or reps_min/reps_max for hypertrophy
          reps_min: null,
          reps_max: null,
          is_lower_body: true,
          logging_type: "weight_reps"
        }
      ]
    },
    {
      day_label: "Session B",
      exercises: [ /* ... */ ]
    }
  ]
}
```

**Endurance template structure** (different from strength — uses duration):
```javascript
{
  name: "Bodyweight Cardio 3x",
  protocol: "linear",
  sessions: [
    {
      day_label: "Session A",
      exercises: [
        {
          wger_id: 215,           // Jumping Jacks or similar
          sets: 3,
          reps: null,
          target_duration_seconds: 60,
          logging_type: "duration",
          is_lower_body: false
        }
      ]
    }
  ]
}
```

### 14.4 Session Matching Logic

When calling `GET /api/v1/trainer/next-session`:

```javascript
const totalCompleted = program.progression_data.total_program_sessions_completed;
const sessionCount = template.sessions.length;
const sessionIndex = totalCompleted % sessionCount;
const nextSession = template.sessions[sessionIndex];
```

For each exercise in `nextSession`: look up internal UUID via `exercises.wger_id`. Get `current_weight_kg` from `progression_data.exercises[exercise_uuid]`.

### 14.5 Progression Engine

Runs after each workout save if `user.ai_trainer_program.is_active = true AND is_paused = false`.

The engine checks if the completed workout's exercises match any exercises in the current session template:

```javascript
function runProgressionEngine(workout, program, template) {
  const sessionIndex = program.progression_data.total_program_sessions_completed % template.sessions.length;
  const currentSession = template.sessions[sessionIndex];

  for (const templateExercise of currentSession.exercises) {
    const exerciseUuid = wgerToUuidMap[templateExercise.wger_id];
    const completedSets = getCompletedSetsForExercise(workout, exerciseUuid);
      // sets where is_completed=true AND set_type IN ('normal','failure')

    if (completedSets.length === 0) continue; // exercise not logged in this workout

    const prescribedReps = templateExercise.reps ?? templateExercise.reps_min;
    const allRepsHit = completedSets.every(s => s.reps >= prescribedReps);
    const completionRate = completedSets.length / templateExercise.sets;

    const state = program.progression_data.exercises[exerciseUuid] || {
      current_weight_kg: 0, current_reps: prescribedReps,
      consecutive_failures: 0, consecutive_successes: 0,
      override_history: [], last_session_date: null, total_sessions_logged: 0
    };

    if (allRepsHit && completionRate >= 1.0) {
      state.consecutive_successes += 1;
      state.consecutive_failures = 0;
      const threshold = template.protocol === 'linear' ? 1 : 3;
      if (state.consecutive_successes >= threshold) {
        const baseIncrement = templateExercise.is_lower_body
          ? template.lower_body_increment_kg
          : template.upper_body_increment_kg;
        const effectiveIncrement = baseIncrement * program.progression_data.increment_multiplier;
        // Round to nearest 2.5kg: Math.round(x / 2.5) * 2.5
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
    program.progression_data.exercises[exerciseUuid] = state;
  }

  program.progression_data.total_program_sessions_completed += 1;

  // Save updated progression_data
  await supabase.from('ai_trainer_programs')
    .update({progression_data: program.progression_data, updated_at: new Date()})
    .eq('id', program.id);
}
```

### 14.6 Override Learning

When user overrides a prescribed weight via `POST /api/v1/trainer/feedback`:
```javascript
const state = progression_data.exercises[exercise_uuid];
const direction = override_kg > prescribed_kg ? 'up' : 'down';
state.override_history.push({date, prescribed_kg, override_kg, direction});

// Update override_bias
progression_data.override_bias += (direction === 'up' ? 1 : -1);
progression_data.override_bias = Math.max(-5, Math.min(5, progression_data.override_bias));

// Adjust increment_multiplier based on bias
if (progression_data.override_bias >= 3) {
  progression_data.increment_multiplier = 1.25;
} else if (progression_data.override_bias <= -3) {
  progression_data.increment_multiplier = 0.75;
} else {
  progression_data.increment_multiplier = 1.0;
}
```

---

## 15. Background Jobs

All jobs use `node-cron` on the Railway backend (Hobby plan — always-on). All times UTC. Jobs are defined in `backend/jobs/index.js` and started when the server starts.

| Job | Cron | Description |
|-----|------|-------------|
| Leaderboard refresh | `*/15 * * * *` | Recompute snapshots for all gyms in batches of 10 |
| Weekly leaderboard reset | `0 0 * * 1` | Mon 00:00 — archive weekly snapshots, fresh computation |
| Monthly leaderboard reset | `0 0 1 * *` | 1st 00:00 — archive monthly, fresh computation |
| Monthly report generation | `0 0 1 * *` | 1st 00:00 — generate prior month reports for all active users |
| Year in Review | `0 2 1 1 *` | Jan 1st 02:00 — generate yearly recap |
| Weekly nudge notifications | `0 9 * * 1` | Mon 09:00 — notify users with no workout the prior week |
| Streak broken check | `5 0 * * 1` | Mon 00:05 — reset streaks for users inactive > 14 days (offset from reset jobs to avoid collision) |
| Notification cleanup | `0 3 * * *` | Daily 03:00 — delete notifications > 90 days |
| Leaderboard snapshot cleanup | `0 4 1 * *` | 1st 04:00 — delete snapshots > 12 months |
| Challenge status update | `*/5 * * * *` | Every 5 min — set challenge status based on starts_at/ends_at |
| Challenge result computation | `*/5 * * * *` | Every 5 min — compute results for newly completed challenges |
| Pending media cleanup | `0 5 * * *` | Daily 05:00 — delete Supabase Storage files in `/pending/` older than 24h |

**Warmup recalculation** is NOT a cron job. It runs as `setImmediate(() => recalculateWarmupStats(userId, newValue))` called immediately after the settings PATCH response is sent.

---

## 16. API Endpoints

All routes prefixed `/api/v1/`. JWT required except noted.

### Auth
```
POST /auth/register              # No JWT. Body: {invite_code, email, password, username, full_name, sex, date_of_birth}
POST /auth/login                 # No JWT. Body: {email, password}. Returns: {access_token, refresh_token}
POST /auth/logout                # JWT. Invalidates refresh token in Supabase.
POST /auth/refresh               # No JWT. Body: {refresh_token}. Returns: {access_token}
POST /auth/forgot-password       # No JWT. Body: {email}
POST /auth/reset-password        # No JWT. Body: {token, new_password}
```

### Gyms
```
POST   /gyms                           # No JWT. Create gym + owner (admin panel registration)
GET    /gyms/:id                       # JWT. Get gym details
PATCH  /gyms/:id                       # JWT. gym_owner only. Update gym settings
GET    /gyms/validate-invite/:code     # No JWT. Rate limited 10/min/IP.
                                       # Returns {gym_id, gym_name, logo_url}
POST   /gyms/:id/regenerate-invite     # JWT. gym_owner only. Returns {invite_code}
POST   /gyms/:id/invite-email          # JWT. gym_owner only. Body: {email}. Sends invite email.
```

### Users
```
GET    /users/me                       # Full profile + settings for current user
PATCH  /users/me                       # Update profile fields (full_name, bio, avatar_url, etc.)
GET    /users/me/settings              # Returns all user_settings fields
PATCH  /users/me/settings              # Update any user_settings fields (zod validates each field)
GET    /users/:id                      # Public profile. If private and not following: returns {id, username, is_profile_private: true} only.
GET    /users/:id/workouts             # Paginated. Respects visibility. 403 if private+not following.
                                       # ?cursor=<ISO8601>&limit=20
GET    /users/:id/stats                # {total_workouts, total_volume_kg, current_streak_weeks,
                                       #  strength_levels: [{exercise_name, level, projected_1rm_kg}],
                                       #  recent_workouts: [{id, name, started_at, total_volume_kg}] (5 max)}
                                       # 403 if private+not following.
GET    /users/:id/compare              # Side-by-side comparison. See Section 11.7.
POST   /users/:id/follow               # Follow or request to follow (private → pending)
DELETE /users/:id/follow               # Unfollow or cancel pending request
GET    /users/:id/followers            # ?cursor=<ISO8601>&limit=20
GET    /users/:id/following            # ?cursor=<ISO8601>&limit=20
GET    /follow-requests                # Incoming pending follow requests for current user
POST   /follow-requests/:id/approve    # Approve. Updates status to 'active'.
POST   /follow-requests/:id/reject     # Reject. Deletes the follows row.
```

### Exercises
```
GET    /exercises                      # ?search=<str>&equipment=<val>&muscle=<val>&limit=20&offset=0
                                       # Returns global exercises + gym custom exercises + user's own custom
GET    /exercises/:id                  # Full detail including user's logging history for this exercise
POST   /exercises                      # Create custom exercise. Body: {name, equipment, primary_muscles,
                                       #   secondary_muscles, logging_type, is_gym_template, image (file)}
PATCH  /exercises/:id                  # Update. Creator or gym_owner only.
DELETE /exercises/:id                  # Delete. Creator or gym_owner only.
```

### Routines
```
GET    /routines                       # User's own routines with full exercise+set detail, grouped by folder
POST   /routines                       # Create routine
GET    /routines/pre-built             # MUST be defined BEFORE /routines/:id in Express router
                                       # ?category=<val>&level=<val>&goal=<val>
POST   /routines/pre-built/:id/save    # Save pre-built program as folder + routines for current user
GET    /routines/:id                   # Full routine with exercises and sets
PATCH  /routines/:id                   # Update name, description, folder_id (null to remove from folder), exercises, sets
DELETE /routines/:id                   # Hard delete with CASCADE
POST   /routines/:id/duplicate         # Creates full copy. Returns new routine.
GET    /routine-folders                # User's folders ordered by position
POST   /routine-folders                # Create folder. Body: {name}
PATCH  /routine-folders/:id            # Update name or position
DELETE /routine-folders/:id            # Delete folder; routines inside get folder_id = null
```

### Workouts
```
POST   /workouts                       # Save completed workout (full payload with idempotency_key)
GET    /workouts/history               # ?cursor=<ISO8601>&limit=20. Returns user's completed workouts.
GET    /workouts/:id                   # Full detail: exercises, sets, media, prs
PATCH  /workouts/:id                   # Update name, description, visibility, started_at, duration_seconds
DELETE /workouts/:id                   # Hard delete (PRs get workout_id SET NULL via FK)
POST   /workouts/:id/copy              # Create new empty workout pre-loaded from this workout's structure
POST   /workouts/:id/save-as-routine   # Save workout structure as new routine
POST   /workouts/:id/media             # Upload media file (multipart/form-data: file + media_type field)
                                       # Enforces 2 photo + 1 video limit.
DELETE /workouts/:id/media/:mediaId    # Delete specific media item
```

### Feed
```
GET    /feed                           # ?filter=all|following&cursor=<ISO8601>&limit=20
POST   /workouts/:workoutId/like       # Like (idempotent)
DELETE /workouts/:workoutId/like       # Unlike
GET    /workouts/:workoutId/likes      # Who liked. ?cursor=<ISO8601>&limit=20
POST   /workouts/:workoutId/comments   # Add comment. Body: {content}
GET    /workouts/:workoutId/comments   # ?cursor=<ISO8601>&limit=20. Excludes soft-deleted.
DELETE /workouts/:workoutId/comments/:commentId  # Soft delete own comment only
```

### Leaderboards
```
GET    /leaderboards/lifts             # ?exercise_id=<uuid>&period=all_time
                                       # Returns {rankings: [...50], my_rank, my_value, generated_at}
GET    /leaderboards/volume            # ?period=weekly|monthly|all_time
GET    /leaderboards/workouts          # ?period=weekly|monthly|all_time
GET    /leaderboards/streak            # All-time only
GET    /leaderboards/challenges        # Active + upcoming challenges for this gym
GET    /leaderboards/challenges/:id    # Challenge detail + current rankings (live query, not snapshot)
```

### Analytics
```
GET    /analytics/stats                # Full stats dashboard data for current user
GET    /analytics/exercises            # Exercises current user has logged with PR summary
GET    /analytics/exercises/:id        # Full performance data: all PR types, history, strength level
GET    /analytics/calendar             # ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD (max 366 days)
                                       # Returns {dates: ["2026-01-03", ...]}
GET    /analytics/measurements         # Paginated body measurements. ?cursor=<ISO8601>&limit=20
POST   /analytics/measurements         # Log new measurement. Body: all body_measurements fields
PATCH  /analytics/measurements/:id     # Update measurement
DELETE /analytics/measurements/:id     # Hard delete measurement
GET    /analytics/reports              # List of user's monthly + yearly reports. ?cursor=<ISO8601>&limit=20
GET    /analytics/reports/:id          # Full report_data for a specific report
```

### Notifications
```
GET    /notifications                  # ?cursor=<ISO8601>&limit=20
PATCH  /notifications/:id/read         # Mark single as read
POST   /notifications/read-all         # Mark all as read
POST   /push-tokens                    # Register device push token. Body: {token, platform}
DELETE /push-tokens/:token             # Remove push token on logout
```

### AI Trainer
```
GET    /trainer/program                # Current program + paused/active status. 404 if no program.
POST   /trainer/program                # Create program from onboarding answers + initial weights
PATCH  /trainer/program                # Body: {is_paused: true|false} to pause/resume
DELETE /trainer/program                # Reset program (delete row; user can start fresh)
GET    /trainer/next-session           # Prescribed exercises + weights for next session
POST   /trainer/feedback               # Manual weight override. Body: {exercise_id, override_kg}
GET    /trainer/progress               # Per-exercise trend: trending_up | stalled | deloaded
```

### Admin (gym_owner or super_admin)
```
GET    /admin/dashboard                # Dashboard metrics
GET    /admin/members                  # ?search=<str>&status=active|suspended&page=1&limit=25
GET    /admin/members/:id              # Member detail + activity stats
PATCH  /admin/members/:id/suspend      # Body: {suspended: true|false}. Suspend or reinstate.
DELETE /admin/members/:id              # Soft delete with PII clearing
POST   /admin/message/:userId          # Send direct push notification. Body: {title, body}
GET    /admin/announcements            # ?page=1&limit=25
POST   /admin/announcements            # Body: {title, content, is_pinned, expires_at}
PATCH  /admin/announcements/:id        # Update
DELETE /admin/announcements/:id        # Delete
GET    /admin/analytics                # Gym-wide analytics
GET    /admin/routines                 # Gym template routines. ?page=1&limit=25
POST   /admin/routines                 # Create gym template routine
PATCH  /admin/routines/:id             # Update gym template routine
DELETE /admin/routines/:id             # Delete gym template routine
GET    /admin/leaderboards/challenges  # ?page=1&limit=25
POST   /admin/leaderboards/challenges  # Create challenge. exercise_id required if metric needs it.
PATCH  /admin/leaderboards/challenges/:id  # Only if status='upcoming'
DELETE /admin/leaderboards/challenges/:id  # Only if status='upcoming'
GET    /admin/settings                 # Gym settings
PATCH  /admin/settings                 # Update gym settings
```

### Super Admin only (role = super_admin)
```
GET    /admin/gyms                     # All gyms. ?page=1&limit=25
PATCH  /admin/gyms/:id/subscription    # {subscription_status, subscription_tier, subscription_expires_at}
```

---

## 17. File Storage Structure

```
Bucket: avatars (public read)
  {user_id}/avatar.jpg
  Client compresses to max 512×512px, JPEG 85%, before upload.
  Max raw file: 5MB.

Bucket: gym-assets (public read)
  {gym_id}/logo.jpg
  Client compresses to max 512×512px, JPEG 85%, before upload.
  Max raw file: 5MB.

Bucket: workout-media (authenticated gym members only)
  {gym_id}/{user_id}/pending/{client_upload_uuid}/photo_0.jpg  ← pre-save staging
  {gym_id}/{user_id}/pending/{client_upload_uuid}/video_0.mp4
  {gym_id}/{user_id}/{workout_id}/photo_0.jpg                  ← final location after save
  {gym_id}/{user_id}/{workout_id}/photo_1.jpg
  {gym_id}/{user_id}/{workout_id}/video_0.mp4
  Client resizes photos to max 1920px longest side, JPEG 80%.
  Videos: max 30MB (client must warn if video exceeds this before upload attempt).
  Limit: 2 photos + 1 video per workout (enforced at API layer).
  Daily cron deletes /pending/ files older than 24 hours.

Bucket: exercise-assets (public read)
  global/{wger_id}/image_0.{jpg|png|gif}   ← extension from Content-Type
  custom/{gym_id}/{exercise_id}/image_0.jpg

Bucket: progress-photos (owner only — read/write by owner user_id only)
  {user_id}/{measurement_id}/photo_0.jpg
  {user_id}/{measurement_id}/photo_1.jpg
  Client resizes to max 1920px, JPEG 80%.
```

**Storage upgrade trigger:** When Supabase Storage reaches 800MB, upgrade to Supabase Pro ($25/month, 100GB).

---

## 18. Security

### Database Security
- Backend uses `service_role` key for all DB operations
- Every query includes `WHERE gym_id = req.user.gym_id` (extracted from JWT, not from request)
- RLS policies (Section 6) act as second enforcement layer
- `gym_id` is never read from request body, query params, or path params for access control — always from `req.user` which comes from the validated JWT

### Suspended and Deleted Users
- Suspended (`is_active = false`): auth middleware allows login but write endpoints check `is_active` and return 403
- Deleted (`deleted_at IS NOT NULL`): backend treats as non-existent. JWT becomes invalid after 1 hour (access token expiry). Refresh token invalidated via `supabase.auth.admin.deleteUser` called as part of the soft delete procedure.

### Subscription Enforcement
- On every request: middleware checks `gym.subscription_status` and `subscription_expires_at` via `req.user.gym_id`
- Trial: allowed normally
- Active: allowed
- Within grace period (7 days after expiry): allowed but member app shows non-blocking banner "Your gym's subscription has expired"
- After grace period: all write operations return 403 GYM_SUSPENDED. Read operations (workout history, profile) still allowed.

### Input Validation
- All request bodies validated with `zod` schemas
- zod validation runs before any business logic
- VALIDATION_ERROR response includes field-level details (see API Conventions)
- File uploads: MIME type verified server-side via file magic bytes (not just Content-Type header)

### CORS Configuration
```javascript
const cors = require('cors');
const corsOptions = {
  origin: process.env.CORS_ALLOWED_ORIGINS.split(','),
  credentials: true
};
app.use(cors(corsOptions));
```
CORS_ALLOWED_ORIGINS in production: `https://admin.ironpath.app`
In development: `http://localhost:5173,http://localhost:3000`

---

## 19. Monetization

### Pricing
| Tier | Member Limit | Price |
|------|-------------|-------|
| Starter | Up to 50 members | $49/month |
| Growth | Up to 200 members | $99/month |
| Unlimited | No limit | $199/month |

- 30-day free trial, no credit card required
- Grace period: 7 days after `subscription_expires_at` before members are blocked from writing

### Member Limit Enforcement
Member limit counts all non-deleted members regardless of `is_active` status:
```sql
SELECT COUNT(*) FROM users
WHERE gym_id = :gym_id AND deleted_at IS NULL
```
Suspended members count toward the limit. Only deleted members do not.

On `POST /auth/register`: if count >= tier limit → 422 with message "This gym has reached its member limit. Contact your gym owner to upgrade."

### Subscription Update Process
Super admin updates via admin panel `/super` route → `PATCH /api/v1/admin/gyms/:id/subscription`. Payment collected manually (bank transfer). No payment processor in v1.

---

## 20. Environment Variables

**`backend/.env`**
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT — MUST match exactly: Supabase Dashboard → Project Settings → API → JWT Secret
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Server
PORT=3000
NODE_ENV=development   # 'development' | 'production'

# CORS — comma-separated list of allowed origins
CORS_ALLOWED_ORIGINS=https://admin.ironpath.app

# Email (Resend)
RESEND_API_KEY=re_your_resend_key
RESEND_FROM_EMAIL=noreply@ironpath.app

# Super Admin (used only in seed script, not at runtime)
SUPER_ADMIN_EMAIL=admin@ironpath.app
SUPER_ADMIN_PASSWORD=change-this-strong-password

# App URLs
ADMIN_PANEL_URL=https://admin.ironpath.app
APP_DOWNLOAD_URL=https://ironpath.app/download
```

**`admin/.env.local`**
```bash
VITE_API_URL=https://your-backend.railway.app/api/v1
VITE_APP_NAME=IronPath
```

**`mobile/.env.local`** (Expo uses EXPO_PUBLIC_ prefix for client-accessible vars)
```bash
# Production Railway URL
EXPO_PUBLIC_API_URL=https://your-backend.railway.app/api/v1

# For local dev on simulator: http://localhost:3000/api/v1
# For local dev on physical device: http://192.168.x.x:3000/api/v1
# Replace 192.168.x.x with your development machine's local network IP

EXPO_PUBLIC_APP_NAME=IronPath
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Note on `DATABASE_URL`:** This is NOT needed at runtime. The backend uses `@supabase/supabase-js` for all DB access, which uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. `DATABASE_URL` (raw PostgreSQL connection string) is only used by Supabase CLI for migration commands run from your local machine:
```bash
supabase db push  # uses DATABASE_URL from your local environment, not server
```

---

## 21. App Configuration (app.json)

`mobile/app.json` — complete starting template:
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
        "NSCameraUsageDescription": "IronPath uses your camera to take workout progress photos and videos.",
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
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-sqlite",
      [
        "expo-media-library",
        {
          "photosPermission": "Allow IronPath to save workout graphics to your photos.",
          "savePhotosPermission": "Allow IronPath to save shareable workout cards to your photos.",
          "isAccessMediaLocationEnabled": false
        }
      ],
      "@shopify/react-native-skia"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

**NativeWind v4 Setup** (run after `npm install nativewind@^4 tailwindcss`):
1. Create `mobile/tailwind.config.js`:
```javascript
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: { extend: {} },
  plugins: []
};
```
2. Create `mobile/global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
3. Update `mobile/babel.config.js`:
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', {jsxImportSource: 'nativewind'}]],
    plugins: ['nativewind/babel']
  };
};
```
4. Import `global.css` in `mobile/app/_layout.tsx`: `import '../global.css';`

**Versioning Strategy:**
- Increment `version` (semantic: 1.0.0 → 1.1.0 → 2.0.0) for user-visible releases
- Increment `ios.buildNumber` and `android.versionCode` for every TestFlight / Play Store submission (even for the same `version`)
- `versionCode` must always be an integer and always increase monotonically

---

## 22. App Store Readiness

### Required Assets
| Asset | Dimensions | Format | Purpose |
|-------|-----------|--------|---------|
| App Icon | 1024×1024px | PNG, no alpha | iOS App Store + base icon |
| Adaptive Icon (foreground) | 1024×1024px | PNG with alpha | Android adaptive icon |
| Splash Screen | 1284×2778px | PNG | Base splash (Expo scales) |
| Feature Graphic | 1024×500px | PNG or JPG | Google Play store listing header |
| iPhone 6.7" Screenshots | 1290×2796px | PNG | Min 3, max 10 |
| iPhone 5.5" Screenshots | 1242×2208px | PNG | Required for older device support |
| Android Phone Screenshots | 1080×1920px | PNG | Min 2, max 8 |

### Required Metadata (prepare before submission)
- **App description** (up to 4000 chars)
- **Short description** (80 chars, Google Play only)
- **Keywords** (100 chars, App Store only): `gym,workout,tracker,strength,training,lifting,fitness,barbell`
- **Privacy Policy URL:** `https://ironpath.app/privacy` — must be live before submission
- **Support URL:** `https://ironpath.app/support`
- **Category:** Health & Fitness
- **Age Rating:** 4+ (no objectionable content)

### iOS-Specific Requirements
- Apple Developer Account: $99/year at developer.apple.com
- App Review Notes: include a test gym invite code + test member email/password for Apple reviewers
- All `infoPlist` strings listed in `app.json` (Section 21) must be present

### Android-Specific Requirements
- Google Play Developer Account: $25 one-time at play.google.com/console
- Target API Level: 34+ (required from 2024 onwards)
- Complete Data Safety questionnaire in Play Console

---

## 23. Build Order & Dependencies

Each step must be fully working before the next begins.

### Step 1 — Repository & Project Setup
1. `git init` in project root
2. Create root `package.json` with `"workspaces": ["mobile", "backend", "admin", "shared"]`
3. Create `shared/` package — `package.json` with `"name": "@ironpath/shared"`. Write TypeScript types for all models and API shapes. Export conversion constants `LBS_TO_KG = 0.453592` and `INCH_TO_CM = 2.54`. Run `tsc` to build.
4. `backend/`: `npm init -y`, install all backend dependencies from Section 2
5. `mobile/`: `npx create-expo-app mobile --template blank-typescript`, then install mobile deps from Section 2. Apply NativeWind v4 setup (Section 21).
6. `admin/`: `npm create vite@latest admin -- --template react-ts`, install admin deps from Section 2
7. Create all `.env` files from Section 20
8. Create `mobile/app.json` from Section 21 template
9. Create Supabase project, configure Auth Hook (Section 8.1)
10. Configure Railway project for `backend/` — set to Hobby plan
11. Configure Vercel project for `admin/`

### Step 2 — Database Setup
1. Install Supabase CLI: `npm install -g supabase`
2. `supabase link --project-ref <ref>`
3. Create migration files in `supabase/migrations/` in numbered order (Section 5)
4. `supabase db push` — applies all migrations
5. Verify: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'` should return 29
6. Run WGER import: `node backend/scripts/import-wger.js`
7. Verify: `SELECT COUNT(*) FROM exercises WHERE gym_id IS NULL` should return > 100
8. Seed pre-built routines: `node backend/scripts/seed-prebuilt-routines.js`
9. Run super admin seed: `node backend/scripts/seed-super-admin.js`

### Step 3 — Phase 1: Auth & Foundation
1. Backend: auth middleware (JWT validation, reads gym_id+role from JWT claims)
2. Backend: CORS, helmet, rate limiting middleware in correct order (Section 3)
3. Backend: gym registration endpoint (Section 8.2 procedure)
4. Backend: member registration endpoint (Section 8.3 procedure)
5. Backend: login, logout, refresh, forgot-password, reset-password endpoints
6. Backend: user settings auto-creation on register
7. Mobile: onboarding screens (invite code → gym preview → registration form → home feed)
8. Mobile: login screen, forgot password + deep link handling (Section 8.6)
9. Mobile: token storage in expo-secure-store with 2048-byte handling
10. Admin: gym registration form, owner login, basic nav shell
11. **Verify:** gym owner can register, member can join with invite code, both can log in, JWT contains gym_id and role claims

### Step 4 — Phase 2: Workout Engine
1. Backend: exercise CRUD endpoints (global exercises visible to all; custom visibility rules from schema)
2. Backend: routine and folder CRUD endpoints (ensure `/routines/pre-built` defined BEFORE `/routines/:id`)
3. Backend: workout save endpoint (full save procedure Section 9.4 including idempotency)
4. Backend: pre-save media upload support (multer, Supabase Storage pending path)
5. Backend: PR detection algorithm (Section 10.2)
6. Backend: streak update logic (Section 5 streaks table rules)
7. Backend: warmup recalculation via setImmediate (Section 9.7)
8. Mobile: active workout draft persistence in expo-sqlite (schema from Section 9.3, save on field change with debounce)
9. Mobile: exercise library screen (search, filter, detail)
10. Mobile: routine builder screen (exercises, sets, superset, warm-up calculator)
11. Mobile: routine folders screen
12. Mobile: active workout screen (set logging, rest timer, plate calculator, inline timer, superset scroll)
13. Mobile: finish workout screen (name, visibility, description, pre-save media upload, idempotency key)
14. Mobile: post-workout summary screen (ordinal, PRs, volume comparison, shareable graphic via react-native-view-shot)
15. **Verify:** complete workout logged end-to-end, PRs detected, streak increments, SQLite draft survives app close mid-workout

### Step 5 — Phase 3: Analytics
1. Backend: statistics dashboard query endpoint (all cards, charts data)
2. Backend: exercise performance data endpoint (all 8 PR types, full history)
3. Backend: strength level classification (tables from Section 10.3)
4. Backend: body measurements CRUD
5. Backend: calendar endpoint (date-range based, Section 16)
6. Backend: monthly report generation function (Section 10.5) — trigger manually for testing
7. Backend: year in review generation function (Section 10.6)
8. Mobile: statistics dashboard screen
9. Mobile: exercise list + exercise performance screen (all PR types, strength level or prompt to add bodyweight)
10. Mobile: body measurements screen + progress photo gallery
11. Mobile: calendar view (date range API, zoom views)
12. Mobile: monthly report screen (renders from report_data JSON)
13. Mobile: year in review screen
14. **Verify:** after 5+ workouts logged with different exercises, all analytics screens show correct data

### Step 6 — Phase 4: Leaderboards & Social
1. Backend: leaderboard snapshot computation queries (all categories, batched by gym)
2. Backend: leaderboard API endpoints (snapshot read + my_rank)
3. Backend: home feed query (Section 11.4 exact SQL)
4. Backend: like and comment endpoints (soft delete for comments)
5. Backend: follow system including follow requests (Section 11.6)
6. Backend: @mention parsing with correct regex (Section 11.5)
7. Backend: compare endpoint (Section 11.7 response shape)
8. Mobile: leaderboard screen (all tabs, periods, my rank pinned)
9. Mobile: home feed screen with filter toggle
10. Mobile: workout detail screen (full sets, media, likes, comments)
11. Mobile: user profile screen (badges, strength levels, activity graph)
12. Mobile: performance compare screen
13. Mobile: follow request management screen
14. **Verify:** leaderboards refresh and show correct rankings, feed respects visibility settings, @mentions create notifications

### Step 7 — Phase 5: Admin Panel
1. Admin: login screen (gym owner JWT)
2. Admin: dashboard screen with metrics and charts
3. Admin: member management table (suspend/reinstate toggle, remove with soft delete)
4. Admin: invite management (display, regenerate, email invite via Resend)
5. Admin: announcements CRUD
6. Admin: gym template routine management (CRUD, Section 12.5)
7. Admin: leaderboard challenge CRUD (Section 12.6)
8. Admin: analytics screen
9. Admin: gym settings screen
10. Admin: super admin `/super` route (subscription management)
11. **Verify:** gym owner can suspend a member (member loses write access), create announcement (visible in app), view dashboard metrics

### Step 8 — Phase 6: Engagement
1. Backend: badge detection (Section 13.2) — all 12 badges, triggered on workout save
2. Backend: `gym_legend` badge check in leaderboard refresh job
3. Backend: push notification sending via expo-server-sdk (Section 13.4, batched, with DeviceNotRegistered cleanup)
4. Backend: all background cron jobs (Section 15, with correct timing offsets)
5. Backend: pending media cleanup cron job
6. Mobile: push notification registration flow (request permission → POST /push-tokens)
7. Mobile: notifications screen (list, mark read, mark all read)
8. Mobile: badge display on profile screen
9. Mobile: home screen widgets (iOS via @bacons/apple-targets config plugin; Android via @bam.tech/react-native-android-widget)
10. Mobile: live activity / lock screen widget during workout
11. **Verify:** rest timer sends notification, first workout awards first_rep badge, monthly report generates on cron trigger, push tokens cleaned up on logout

### Step 9 — Phase 7: AI Trainer
1. Backend: trainer template data (`backend/data/trainer-templates.js`) with all 19 templates including endurance variants
2. Backend: WGER ID → exercise UUID mapping cached on startup
3. Backend: program creation endpoint with onboarding payload + initial weights
4. Backend: session-matching logic (`total_program_sessions_completed % session_count`, Section 14.4)
5. Backend: progression engine integrated into workout save (Section 14.5, correct rounding `Math.round(x/2.5)*2.5`)
6. Backend: next-session prescription endpoint
7. Backend: override feedback endpoint + learning logic (Section 14.6)
8. Backend: trainer progress report endpoint
9. Mobile: trainer onboarding questionnaire (5 screens including initial weights)
10. Mobile: trainer dashboard screen (current week, next session preview, exercise trends)
11. Mobile: next session view (prescribed weight + reps per exercise)
12. **Verify:** beginner 3-day strength program generates correct sessions, weights increment after successful 5×5 completion

### Step 10 — QA, Performance & App Store Prep
1. Verify all DB indexes are in place; run EXPLAIN ANALYZE on feed, leaderboard, and history queries
2. Load test leaderboard computation with 200-member simulated dataset
3. Verify RLS policies block cross-gym data access using a test with two gyms
4. Verify subscription enforcement: trial expiry → grace period banner → write block after grace
5. Verify idempotency: simulate network drop during workout save → confirm no duplicate on retry
6. Test password reset deep link end-to-end on both iOS and Android physical devices
7. Verify @mention notification: comment with @username → mentioned user receives notification
8. Create all required app store assets (icons, screenshots, splash — Section 22)
9. Publish `https://ironpath.app/privacy` (static page) before submission
10. Write App Store description and keywords
11. Submit to Apple TestFlight (internal testing)
12. Submit to Google Play internal testing track
13. Fix any rejection issues
14. Submit for public release

---

*End of Technical Specification v3.0*
*Resolves all 80 gaps identified in v2 review. All content is self-contained — no references to prior versions.*
