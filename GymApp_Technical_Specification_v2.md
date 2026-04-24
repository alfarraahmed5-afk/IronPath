# Gym Tracking App — Full Technical Specification

**Version:** 2.0  
**Date:** April 2026  
**Built by:** Claude Code  
**Business Model:** B2B SaaS — sold to gyms, used by their members  
**App Name:** IronPath  
**iOS Bundle ID:** com.ironpath.app  
**Android Package:** com.ironpath.app  

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [API Conventions](#4-api-conventions)
5. [Database Schema](#5-database-schema)
6. [Phase 1 — Foundation & Auth](#6-phase-1--foundation--auth)
7. [Phase 2 — Workout Engine](#7-phase-2--workout-engine)
8. [Phase 3 — Progress & Analytics](#8-phase-3--progress--analytics)
9. [Phase 4 — Leaderboards & Social](#9-phase-4--leaderboards--social)
10. [Phase 5 — Gym Admin Panel (Web)](#10-phase-5--gym-admin-panel-web)
11. [Phase 6 — In-App Engagement](#11-phase-6--in-app-engagement)
12. [Phase 7 — AI Trainer (Algorithmic)](#12-phase-7--ai-trainer-algorithmic)
13. [Background Jobs](#13-background-jobs)
14. [API Endpoints](#14-api-endpoints)
15. [File Storage Structure](#15-file-storage-structure)
16. [Security & Privacy](#16-security--privacy)
17. [Monetization](#17-monetization)
18. [Environment Variables](#18-environment-variables)
19. [App Store Readiness](#19-app-store-readiness)
20. [Build Order & Dependencies](#20-build-order--dependencies)

---

## 1. Product Overview

IronPath is a full-featured gym workout tracking mobile app (iOS + Android) sold as a monthly SaaS subscription to gyms. The gym is the paying customer. Their members are the end users. Each gym has its own isolated community — members track workouts, compete on leaderboards, and follow each other's progress within their gym.

### Core Value Proposition
- Members get a world-class workout tracker tied to their real gym community
- Gyms get a retention and engagement tool with an admin dashboard
- Leaderboards create healthy competition between real people who train together

### Key Differentiators from Hevy
- Gym-scoped leaderboards (compete with people you actually know)
- Gym owner admin panel with member management and analytics
- Designed to be sold per gym as a branded community tool
- Future: cross-gym leaderboards between competing gyms

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Mobile App | React Native + Expo (latest stable SDK at build time) | iOS + Android from single codebase |
| Backend API | Node.js + Express.js | REST API, versioned at `/api/v1/` |
| Database | PostgreSQL via Supabase | Primary relational database |
| Auth | Supabase Auth | JWT-based authentication |
| File Storage | Supabase Storage | Photos, videos, exercise assets |
| Admin Panel | React.js + Vite | Web-only, deployed to Vercel |
| Backend Hosting | Railway | Node.js API deployment |
| Exercise Data | WGER (one-time import) | Exercise library, muscle data |
| Push Notifications | Expo Push Notifications | iOS + Android |
| State Management | Zustand | Mobile app global state |
| Navigation | Expo Router (file-based) | Mobile app navigation |
| Charts | Victory Native | Progress charts and graphs |
| Styling (mobile) | NativeWind (Tailwind for RN) | Mobile UI styling |
| Styling (web) | Tailwind CSS | Admin panel styling |
| Job Scheduler | node-cron | Background jobs on backend |
| Email Service | Resend | Transactional emails |
| Image Processing | expo-image-manipulator | Client-side compression before upload |
| Share Graphics | react-native-view-shot | Capture React Native views as images |
| Monorepo Tooling | npm workspaces | Shared types across sub-projects |

### Monorepo Structure
```
/
├── mobile/          # React Native Expo app (com.ironpath.app)
├── backend/         # Node.js Express API
├── admin/           # React.js Vite admin panel (deployed to Vercel)
└── shared/          # Shared TypeScript types consumed by all three
    └── types/
        ├── api.ts       # Request/response interfaces
        ├── models.ts    # Shared model types
        └── index.ts     # Barrel export
```

The `shared/` package is an npm workspace package. All three projects import from `@ironpath/shared`. It must be built (tsc) before any sub-project builds.

---

## 3. System Architecture

### High-Level Architecture

```
[Mobile App (iOS/Android)]
        |
        | HTTPS — /api/v1/* — JWT in Authorization header
        v
[Node.js + Express Backend (Railway)]
        |
        |---> [PostgreSQL Database (Supabase)]
        |---> [Supabase Storage (files)]
        |---> [Supabase Auth (JWT validation)]
        |---> [Expo Push Notifications service]
        |---> [Resend (email)]
        |---> [node-cron (background jobs)]

[React Admin Panel (Vercel — admin.ironpath.app)]
        |
        | HTTPS — /api/v1/admin/* — JWT in Authorization header
        v
[Same Backend — admin-scoped endpoints]
```

### Multi-Tenancy Model
- Every piece of data is scoped to a `gym_id`
- A user belongs to exactly one gym (enforced at DB level with NOT NULL foreign key)
- Gym owners see only their gym's data in the admin panel
- Leaderboards are gym-scoped
- Row-level security (RLS) enforced in Supabase for all tables
- `gym_id` is extracted from the authenticated user's JWT claims on every request — it is never trusted from the request body or query params

### Offline Mode
IronPath is **online-only** for v1. Every action (logging sets, saving workouts, viewing feed) requires an active internet connection. Exception: the **active workout screen** persists its state locally using `expo-sqlite` so that a crash or accidental app close does not lose in-progress workout data. On relaunch, if an incomplete workout is detected in local storage, the user is shown a "Resume workout?" prompt.

### Auth Flow
1. Gym owner registers via admin panel → creates gym first → then creates owner account → both in one atomic transaction
2. Gym gets a unique 6-character alphanumeric `invite_code`
3. Member downloads app → enters invite code → registers → linked to gym
4. All API requests carry JWT in `Authorization: Bearer <token>` header
5. Backend middleware validates JWT via Supabase, extracts `user_id` and `gym_id` from the user record, and attaches both to `req.user` for use in all route handlers

---

## 4. API Conventions

### Base URL
All endpoints are prefixed with `/api/v1/`.

### Authentication
All endpoints require a valid JWT except:
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/gyms/validate-invite/:code`

### Standard Success Response
```json
{
  "data": { },
  "meta": {
    "pagination": {
      "cursor": "2026-04-01T00:00:00Z",
      "has_more": true,
      "limit": 20
    }
  }
}
```
`meta.pagination` is only present on paginated list endpoints.

### Standard Error Response
```json
{
  "error": {
    "code": "WORKOUT_NOT_FOUND",
    "message": "Workout not found or access denied.",
    "status": 404
  }
}
```

### Error Codes (exhaustive list)
| Code | Status | Meaning |
|------|--------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Valid JWT but insufficient role or wrong gym |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body failed validation |
| `CONFLICT` | 409 | Unique constraint violation (e.g., username taken) |
| `GYM_SUSPENDED` | 403 | Gym subscription expired and grace period elapsed |
| `INVITE_INVALID` | 404 | Invite code not found or inactive |
| `MEDIA_LIMIT_EXCEEDED` | 422 | Workout already has max allowed media |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

### Pagination
- **Feed and history endpoints** (workout history, home feed, notifications): cursor-based. The cursor is the `created_at` or `started_at` timestamp of the last item received. Pass as `?cursor=<ISO8601>&limit=20`. Default limit: 20. Max limit: 50.
- **Admin panel list endpoints** (member list, announcement list): offset-based. Pass as `?page=1&limit=25`. Default limit: 25. Max limit: 100.

### Filtering and Search
All list endpoints that support filtering use query parameters. Standard params per endpoint type:

Exercises: `?search=<string>&equipment=<value>&muscle=<value>&limit=20&offset=0`
Feed: `?filter=all|following&cursor=<ISO8601>&limit=20`
Workout history: `?cursor=<ISO8601>&limit=20`
Admin members: `?search=<string>&status=active|suspended&page=1&limit=25`

### Rate Limiting
- Auth endpoints: 5 requests per 15 minutes per IP address
- All other authenticated endpoints: 100 requests per minute per user
- Enforced via `express-rate-limit` middleware
- Exceeded limit returns HTTP 429 with `Retry-After` header

### Weight Units
- All weights are **stored in kilograms (kg)** in the database at all times
- The API always sends and receives weights in kg
- The mobile app converts to the user's preferred unit (`kg` or `lbs`) for display only
- Leaderboard comparisons are always in kg
- 1 lbs = 0.453592 kg (conversion constant defined in `shared/types/index.ts`)

---

## 5. Database Schema

### Migration Order
Run migrations in exactly this order to avoid foreign key circular reference errors:

1. `gyms`
2. `routine_folders` (before `routines`)
3. `users`
4. `exercises`
5. `routines` (depends on `routine_folders` and `users`)
6. `routine_exercises`
7. `routine_sets`
8. `workouts`
9. `workout_exercises`
10. `workout_sets`
11. `personal_records`
12. `body_measurements`
13. `measurement_photos`
14. `workout_media`
15. `follows`
16. `workout_likes`
17. `workout_comments`
18. `gym_announcements`
19. `notifications`
20. `user_push_tokens`
21. `streaks`
22. `user_settings`
23. `leaderboard_snapshots`
24. `leaderboard_challenges`
25. `challenge_results`
26. `ai_trainer_programs`
27. `pre_built_routines`

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

### routine_folders
```sql
-- Defined BEFORE routines to avoid circular FK reference
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

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  -- Username is globally unique (simplifies future cross-gym features and @mentions)
  username VARCHAR(30) UNIQUE NOT NULL
    CHECK (username ~ '^[a-zA-Z0-9_]+$'),
  full_name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  role VARCHAR(20) DEFAULT 'member'
    CHECK (role IN ('member', 'gym_owner', 'super_admin')),
  sex VARCHAR(10)
    CHECK (sex IN ('male', 'female')),
  date_of_birth DATE,
  -- Bodyweight stored in kg always
  bodyweight_kg DECIMAL(5,2),
  is_profile_private BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  -- Soft delete fields — PII cleared on deletion, record retained
  deleted_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_gym_id ON users(gym_id);
CREATE INDEX idx_users_username ON users(username);
```

**Soft Delete Policy:** When a member is removed from a gym, `deleted_at` is set to NOW(), `full_name` is set to `'Deleted User'`, `email` is set to `deleted_<id>@ironpath.invalid`, `avatar_url` is set to NULL, `bio` is set to NULL. The user record is retained so workout history and leaderboard contributions remain intact. The user cannot log in after `deleted_at` is set (enforced in auth middleware). All references to this user in JSONB ranking arrays in `leaderboard_snapshots` are updated to display name `'Deleted User'` and null avatar.

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
  wger_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exercises_gym_id ON exercises(gym_id);
CREATE INDEX idx_exercises_name ON exercises USING gin(to_tsvector('english', name));
```

---

### routines
```sql
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  -- folder_id references routine_folders (defined before this table)
  folder_id UUID REFERENCES routine_folders(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  -- true = created by gym owner and visible to all gym members in Explore tab
  is_gym_template BOOLEAN DEFAULT false,
  source_routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routines_user_id ON routines(user_id);
CREATE INDEX idx_routines_gym_id ON routines(gym_id);
```

---

### routine_exercises
```sql
CREATE TABLE routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID REFERENCES routines(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  position INTEGER NOT NULL,
  -- superset_group: positive integer. Two exercises in the same routine
  -- with the same non-null superset_group value are treated as a superset.
  -- Numbers need not be sequential. Max one superset_group value per exercise.
  -- NULL = not in any superset.
  superset_group INTEGER CHECK (superset_group > 0),
  rest_seconds INTEGER DEFAULT 90,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routine_exercises_routine_id ON routine_exercises(routine_id);
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
  -- All weights stored in kg
  target_weight_kg DECIMAL(7,2),
  target_reps INTEGER,
  target_reps_min INTEGER,
  target_reps_max INTEGER,
  target_duration_seconds INTEGER,
  target_distance_meters DECIMAL(8,2)
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
  -- total_volume_kg: sum of (weight_kg × reps) for all completed non-warmup sets.
  -- Warmup sets included or excluded based on user's warm_up_sets_in_stats setting
  -- at the time of save. Stored value is NOT retroactively updated when setting changes
  -- (recalculation is a separate operation). Bodyweight exercises: (bodyweight_kg +
  -- added_weight_kg) × reps. Duration/distance exercises: contribute 0 to volume.
  total_volume_kg DECIMAL(12,2) DEFAULT 0,
  total_sets INTEGER DEFAULT 0,
  -- Visibility options:
  -- 'public'   = visible to all members in the gym feed
  -- 'followers' = visible only to users who follow this user
  -- 'private'  = visible only to the workout owner
  visibility VARCHAR(20) DEFAULT 'public'
    CHECK (visibility IN ('public', 'followers', 'private')),
  is_completed BOOLEAN DEFAULT false,
  -- ordinal_number: computed at save time as COUNT of user's prior completed workouts + 1.
  -- If a workout is deleted, this number is NOT recalculated for subsequent workouts.
  -- It is a celebratory counter, not a sequential ID.
  ordinal_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_gym_id ON workouts(gym_id);
CREATE INDEX idx_workouts_started_at ON workouts(started_at DESC);
CREATE INDEX idx_workouts_gym_feed ON workouts(gym_id, visibility, started_at DESC);
```

---

### workout_exercises
```sql
CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  position INTEGER NOT NULL,
  -- Same superset_group semantics as routine_exercises
  superset_group INTEGER CHECK (superset_group > 0),
  rest_seconds INTEGER DEFAULT 90,
  notes TEXT
);

CREATE INDEX idx_workout_exercises_workout_id ON workout_exercises(workout_id);
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
  -- All weights stored in kg
  weight_kg DECIMAL(7,2),
  reps INTEGER,
  duration_seconds INTEGER,
  distance_meters DECIMAL(8,2),
  rpe DECIMAL(3,1) CHECK (rpe >= 6.0 AND rpe <= 10.0),
  is_completed BOOLEAN DEFAULT false,
  -- Snapshot of user's warm_up_sets_in_stats setting at time of workout save.
  -- Used to determine whether this set contributes to total_volume_kg.
  -- If user later toggles the setting, a recalculation job updates this field
  -- and recomputes total_volume_kg for all affected workouts.
  is_warmup_counted BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_workout_sets_workout_exercise_id ON workout_sets(workout_exercise_id);
```

---

### personal_records
```sql
CREATE TABLE personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  workout_set_id UUID REFERENCES workout_sets(id) ON DELETE CASCADE NOT NULL,
  record_type VARCHAR(30) NOT NULL
    CHECK (record_type IN (
      'heaviest_weight', 'projected_1rm', 'best_volume_set',
      'best_volume_session', 'most_reps', '3rm', '5rm', '10rm'
    )),
  -- Value stored in kg for weight-based records, or count for rep-based records
  value DECIMAL(12,2) NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Only one record of each type per user per exercise is the "current best"
  -- Enforced by storing ALL historical records and querying the MAX per type
  -- No unique constraint — multiple records of the same type are kept as history
  -- The current record is always MAX(value) WHERE user_id AND exercise_id AND record_type
);

CREATE INDEX idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);
CREATE INDEX idx_personal_records_gym ON personal_records(gym_id, exercise_id);
```

---

### body_measurements
```sql
CREATE TABLE body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL,
  -- Bodyweight stored in kg always. Display unit controlled by user_settings.weight_unit
  bodyweight_kg DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,1),
  -- All circumference measurements in cm always
  neck_cm DECIMAL(5,1),
  chest_cm DECIMAL(5,1),
  waist_cm DECIMAL(5,1),
  hips_cm DECIMAL(5,1),
  left_arm_cm DECIMAL(5,1),
  right_arm_cm DECIMAL(5,1),
  left_forearm_cm DECIMAL(5,1),
  right_forearm_cm DECIMAL(5,1),
  left_thigh_cm DECIMAL(5,1),
  right_thigh_cm DECIMAL(5,1),
  left_calf_cm DECIMAL(5,1),
  right_calf_cm DECIMAL(5,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_body_measurements_user_id ON body_measurements(user_id, measured_at DESC);
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
);
-- Limit of 2 photos + 1 video per workout enforced at API layer (not DB constraint).
-- On upload: count existing photos and videos for the workout_id.
-- Reject with MEDIA_LIMIT_EXCEEDED if: photos >= 2 and media_type='photo',
-- or videos >= 1 and media_type='video'.

CREATE INDEX idx_workout_media_workout_id ON workout_media(workout_id);
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
  -- Both users must be in the same gym
  CHECK (follower_id != following_id)
);
-- Same-gym constraint enforced via RLS policy (not CHECK, since gym_id is derived from users)

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
```

**RLS Policy note:** The RLS policy on `follows` must verify that the `gym_id` of `follower_id` matches the `gym_id` of `following_id`. This is enforced in the API layer as well: when `POST /api/v1/users/:id/follow` is called, the backend verifies both users share the same `gym_id` before inserting.

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

CREATE INDEX idx_workout_likes_workout_id ON workout_likes(workout_id);
```

---

### workout_comments
```sql
CREATE TABLE workout_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  -- Comments are flat (no reply threads in v1).
  -- Content is stored as plain text. @mentions stored as plain @username text.
  -- Usernames are immutable after registration, making plain text safe for mention resolution.
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  -- Comments cannot be edited after posting. deleted_at enables soft delete.
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workout_comments_workout_id ON workout_comments(workout_id);
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
  -- NULL expires_at = no expiry. Feed filters out announcements past expires_at.
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
    'like', 'comment', 'follow', 'follow_request',
    'follow_request_approved', 'pr', 'announcement',
    'leaderboard', 'streak_milestone', 'badge_unlocked', 'weekly_nudge'
  )),
  title VARCHAR(255) NOT NULL,
  body TEXT,
  -- Structured payload. Examples:
  -- like/comment: {"workout_id": "uuid", "actor_user_id": "uuid"}
  -- follow: {"actor_user_id": "uuid"}
  -- pr: {"exercise_id": "uuid", "record_type": "heaviest_weight", "value": 120.0}
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Cleanup: a cron job deletes notifications older than 90 days (see Section 13)

CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read, created_at DESC);
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
  -- ISO week start date. Week starts on MONDAY.
  -- A streak week is any ISO calendar week (Mon–Sun) with >= 1 completed workout.
  last_workout_week DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Streak Calculation Rules:**
- Week = Monday 00:00 UTC to Sunday 23:59 UTC
- A streak increments when a completed workout is saved in a week immediately following `last_workout_week`
- If a full week passes with no workout, `current_streak_weeks` resets to 0
- `longest_streak_weeks` is updated whenever `current_streak_weeks` exceeds it
- Back-logged workouts do affect streak calculation retroactively
- Streak is recalculated whenever any workout is saved or deleted

---

### user_settings
```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  -- Weight display unit. Weights always stored in kg; this controls display only.
  weight_unit VARCHAR(5) DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
  -- Rest timer
  default_rest_seconds INTEGER DEFAULT 90,
  -- Previous workout values display mode
  previous_values_mode VARCHAR(20) DEFAULT 'overall'
    CHECK (previous_values_mode IN ('overall', 'within_routine')),
  -- Whether warm-up sets count toward statistics
  warm_up_sets_in_stats BOOLEAN DEFAULT false,
  -- Whether to keep screen awake during workout
  keep_awake_during_workout BOOLEAN DEFAULT true,
  -- RPE column shown in active workout
  rpe_tracking_enabled BOOLEAN DEFAULT false,
  -- Auto-scroll to next superset exercise on set completion
  smart_superset_scrolling BOOLEAN DEFAULT true,
  -- Inline timer for duration-based sets
  inline_timer_enabled BOOLEAN DEFAULT true,
  -- Live PR popup during workout
  live_pr_notification_enabled BOOLEAN DEFAULT true,
  -- Sound settings (volume 0–100)
  timer_sound_volume INTEGER DEFAULT 80 CHECK (timer_sound_volume BETWEEN 0 AND 100),
  pr_sound_volume INTEGER DEFAULT 80 CHECK (pr_sound_volume BETWEEN 0 AND 100),
  -- Warm-up calculator configuration (stored as JSONB)
  -- Default: [{"percentage": 40, "reps": 10}, {"percentage": 60, "reps": 5},
  --           {"percentage": 80, "reps": 3}, {"percentage": 90, "reps": 1}]
  warmup_calculator_steps JSONB DEFAULT '[
    {"percentage": 40, "reps": 10},
    {"percentage": 60, "reps": 5},
    {"percentage": 80, "reps": 3},
    {"percentage": 90, "reps": 1}
  ]',
  -- Plate calculator bar weight (kg)
  plate_calculator_bar_kg DECIMAL(4,1) DEFAULT 20.0,
  -- Notification preferences (each type can be toggled)
  notif_likes BOOLEAN DEFAULT true,
  notif_comments BOOLEAN DEFAULT true,
  notif_follows BOOLEAN DEFAULT true,
  notif_prs BOOLEAN DEFAULT true,
  notif_announcements BOOLEAN DEFAULT true,
  notif_leaderboard BOOLEAN DEFAULT true,
  notif_streak_milestones BOOLEAN DEFAULT true,
  notif_weekly_nudge BOOLEAN DEFAULT true,
  -- User timezone (IANA format, e.g. 'Africa/Cairo')
  timezone VARCHAR(100) DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

A `user_settings` row is created automatically when a user registers, with all default values.

**Warm-up Sets in Stats Recalculation:** When `warm_up_sets_in_stats` is toggled, a background job runs within 60 seconds that:
1. Fetches all completed workouts for the user
2. For each workout, recomputes `total_volume_kg` using the new setting value
3. Updates `is_warmup_counted` on all warmup-type `workout_sets` for this user
4. Updates `workouts.total_volume_kg` for all affected workouts

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
    'most_workouts_alltime', 'longest_streak', 'custom_challenge'
  )),
  period VARCHAR(20) NOT NULL CHECK (period IN ('weekly', 'monthly', 'all_time')),
  period_start DATE,
  period_end DATE,
  -- Array of ranking objects, max 50 entries, ordered by rank ascending:
  -- [{"rank": 1, "user_id": "uuid", "display_name": "Ahmed", "avatar_url": "...", "value": 200.5}]
  -- display_name and avatar_url are snapshotted at generation time.
  -- On user deletion, display_name updated to "Deleted User", avatar_url set to null.
  rankings JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Historical snapshots retained for 12 months then deleted by cron job.
-- Current live snapshot for each category is the most recent one.

CREATE INDEX idx_leaderboard_snapshots_gym ON leaderboard_snapshots(gym_id, category, generated_at DESC);
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
  -- metric: what is being measured
  metric VARCHAR(50) NOT NULL CHECK (metric IN (
    'total_volume', 'workout_count', 'exercise_volume', 'exercise_1rm'
  )),
  exercise_id UUID REFERENCES exercises(id), -- required if metric is exercise_volume or exercise_1rm
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
  -- Snapshot of final rankings when challenge ended
  -- Same format as leaderboard_snapshots.rankings
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
  experience_level VARCHAR(20) NOT NULL CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  days_per_week INTEGER NOT NULL CHECK (days_per_week BETWEEN 2 AND 6),
  equipment VARCHAR(20) NOT NULL CHECK (equipment IN ('full_gym', 'dumbbells', 'bodyweight', 'home_mixed')),
  is_active BOOLEAN DEFAULT true,
  is_paused BOOLEAN DEFAULT false,
  current_week INTEGER DEFAULT 1,
  program_template_key VARCHAR(100) NOT NULL, -- e.g. 'beginner_strength_3_full_gym'
  -- progression_data JSONB structure (fully defined):
  -- {
  --   "exercises": {
  --     "<exercise_id>": {
  --       "current_weight_kg": 100.0,
  --       "current_reps": 5,
  --       "consecutive_failures": 0,
  --       "consecutive_successes": 2,
  --       "override_history": [
  --         {"session_date": "2026-04-01", "prescribed_kg": 100, "override_kg": 102.5, "direction": "up"}
  --       ],
  --       "last_session_date": "2026-04-01",
  --       "total_sessions_logged": 12
  --     }
  --   },
  --   "override_bias": 0  -- running sum: +1 per upward override, -1 per downward override
  -- }
  progression_data JSONB NOT NULL DEFAULT '{"exercises": {}, "override_bias": 0}',
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
  -- program_data JSONB structure (fully defined):
  -- {
  --   "routines": [
  --     {
  --       "name": "Day 1 - Push",
  --       "exercises": [
  --         {
  --           "wger_id": 192,         -- maps to exercises.wger_id after import
  --           "exercise_name": "Bench Press (Barbell)",  -- fallback if wger_id not found
  --           "position": 0,
  --           "superset_group": null,
  --           "rest_seconds": 120,
  --           "notes": "Keep elbows at 45 degrees",
  --           "sets": [
  --             {
  --               "position": 0,
  --               "set_type": "warmup",
  --               "target_weight_kg": null,
  --               "target_reps": 10,
  --               "target_reps_min": null,
  --               "target_reps_max": null,
  --               "target_duration_seconds": null,
  --               "target_distance_meters": null
  --             },
  --             {
  --               "position": 1,
  --               "set_type": "normal",
  --               "target_weight_kg": null,
  --               "target_reps": null,
  --               "target_reps_min": 8,
  --               "target_reps_max": 12,
  --               "target_duration_seconds": null,
  --               "target_distance_meters": null
  --             }
  --           ]
  --         }
  --       ]
  --     }
  --   ]
  -- }
  program_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Phase 1 — Foundation & Auth

### 6.1 Gym Owner Registration (Admin Panel)

**Transaction:** Gym and owner account are created in a single atomic DB transaction. Order:
1. Generate `invite_code`: 6-character alphanumeric, uppercase, no ambiguous chars (no O, 0, I, 1). Verify uniqueness against existing codes before inserting.
2. Insert `gyms` row → capture `gym_id`
3. Create Supabase Auth user → capture `auth_user_id`
4. Insert `users` row with `gym_id`, `role = 'gym_owner'`
5. Insert `user_settings` row with defaults
6. Insert `streaks` row with defaults
7. If any step fails → roll back all steps
8. Send welcome email via Resend with invite code and app download link

**Admin panel registration form fields:**
- Gym name (required)
- Location / city (optional)
- Description (optional)
- Logo upload (optional, JPEG/PNG, max 5MB — compressed to 512×512 on client before upload)
- Owner full name (required)
- Email (required)
- Password (required, min 8 chars, must contain at least one number)

### 6.2 Member Registration (Mobile App)

1. Onboarding screen 1: "Enter your gym's invite code" → 6-char input field
2. `GET /api/v1/gyms/validate-invite/:code` → returns `{gym_id, gym_name, logo_url}` or 404
3. Onboarding screen 2: "Join [Gym Name]" + gym logo displayed
4. Onboarding screen 3: registration form — full name, username, email, password, sex, date of birth
5. `POST /api/v1/auth/register` with invite code included
6. Backend transaction: create auth user → insert users row → insert user_settings → insert streaks row
7. Redirect to home feed

**Username rules:** 3–30 characters, letters/numbers/underscores only (`^[a-zA-Z0-9_]+$`), globally unique, immutable after registration (cannot be changed).

### 6.3 Login
- Email + password
- JWT access token (1 hour expiry) returned
- JWT refresh token (7 day expiry) returned
- Access token stored in `expo-secure-store`
- Refresh token stored in `expo-secure-store`
- On every app launch, attempt silent refresh
- If refresh fails, redirect to login

### 6.4 Password Reset
1. User taps "Forgot password" → enters email
2. `POST /api/v1/auth/forgot-password` → Supabase sends reset email with deep link
3. Deep link opens IronPath app → `reset-password` screen
4. User enters new password
5. `POST /api/v1/auth/reset-password` with token from deep link

### 6.5 Invite Code Generation Rules
- 6 characters, uppercase alphanumeric
- Excluded characters: O (letter oh), 0 (zero), I (letter eye), 1 (one) — to prevent visual confusion
- Valid character set: A B C D E F G H J K L M N P Q R S T U V W X Y Z 2 3 4 5 6 7 8 9
- Regenerating a code immediately invalidates the old code (any pending members using old code will get INVITE_INVALID error)

### 6.6 Super Admin Account
- Created via a one-time seed script run at initial deployment
- Script inserts directly into `users` table with `role = 'super_admin'`
- Super admin capabilities: view all gyms, update `subscription_status` and `subscription_expires_at` for any gym, deactivate gyms
- Super admin accesses these functions via the admin panel at `/super` route (separate from gym owner dashboard)
- Super admin credentials are set via environment variables at first deployment: `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`

---

## 7. Phase 2 — Workout Engine

### 7.1 Exercise Library

#### WGER Data Import (One-Time Script)

Run once at initial backend deployment. The script is located at `backend/scripts/import-wger.js`.

Steps:
1. Fetch all exercises from WGER API in English only (language ID = 2): `GET https://wger.de/api/v2/exercise/?format=json&language=2&limit=100&offset=0`
2. Paginate: WGER returns a `next` URL when more pages exist. Continue fetching until `next` is null.
3. For each exercise, fetch its images: `GET https://wger.de/api/v2/exerciseimage/?exercise={wger_id}&format=json`
4. Download each image from the WGER CDN URL
5. Upload image to Supabase Storage at `/exercise-assets/global/{wger_id}/image_0.jpg`
6. Insert into `exercises` table with `gym_id = null`, `is_custom = false`, `wger_id = <wger_id>`, `image_url = <supabase_url>`
7. Map WGER muscle IDs to muscle name strings using the hardcoded mapping table in `backend/scripts/wger-muscle-map.js`
8. Log total imported count. If any exercise fails, log the error and continue (do not abort entire import).
9. Run script idempotently: skip exercises where `wger_id` already exists in the table.

**WGER muscle ID to name mapping:**
```javascript
// backend/scripts/wger-muscle-map.js
module.exports = {
  1: 'biceps', 2: 'anterior_deltoid', 3: 'chest',
  4: 'hamstrings', 5: 'quads', 6: 'glutes',
  7: 'gastrocnemius', 8: 'triceps', 9: 'lats',
  10: 'traps', 11: 'abs', 12: 'obliques',
  13: 'lower_back', 14: 'forearms', 15: 'rear_deltoid',
  16: 'soleus', 17: 'inner_thighs'
};
```

#### Exercise Search & Filter (Mobile)
- Full-text search by name (debounced 300ms)
- Equipment filter chips: All / Barbell / Dumbbell / Machine / Cable / Bodyweight / Resistance Band / Kettlebell / Other
- Muscle group filter chips: All / Chest / Back / Shoulders / Arms / Core / Legs / Glutes
- Results: global exercises first, then gym custom exercises, sorted alphabetically
- Each exercise card: name, primary muscle badge, equipment icon
- Tap exercise → detail screen: image/animation, description, instructions, muscle diagram, user's logging history for this exercise

#### Custom Exercises
- Any member can create custom exercises (visible only to themselves within the gym)
- Gym owner can create custom exercises with `is_gym_template = true` → visible to all gym members
- Fields: name (required), equipment, primary muscles (multi-select), secondary muscles (multi-select), logging type, image upload (optional, max 5MB, compressed to max 800px before upload)
- Custom exercises are editable and deletable by their creator (or gym owner for gym templates)

### 7.2 Routines

#### Routine Management
- **My Routines** screen: routines grouped by folders. Routines not in any folder appear in an "Ungrouped" section at the top.
- Assign/move a routine to a folder via `PATCH /api/v1/routines/:id` with `{"folder_id": "uuid"}`. Remove from folder with `{"folder_id": null}`.
- Duplicate routine: creates a full copy including all `routine_exercises` and `routine_sets`. New routine name = "[Original Name] Copy".
- Delete routine: soft delete not needed — hard delete with CASCADE is acceptable since routine data is not referenced by completed workouts (workouts store `routine_id` as a nullable reference with `ON DELETE SET NULL`).

#### Superset Logic
- Two exercises are in a superset when they share the same non-null `superset_group` integer within the same routine or workout.
- To create a superset: long press an exercise → "Add to Superset" → select partner exercise → both are assigned the same `superset_group` value (the lowest unused positive integer in the routine).
- To dissolve a superset: long press a superset exercise → "Remove from Superset" → sets `superset_group = null` for that exercise only. If this leaves the other exercise as the only one in the group, its `superset_group` is also set to null automatically.
- During active workout, rest timer behavior in supersets: the rest timer fires only after completing the last set of the LAST exercise in the superset group for one round. Transitioning between exercises within a superset group does NOT trigger the rest timer.

#### Warm-Up Calculator
- Configurable steps stored in `user_settings.warmup_calculator_steps`
- Configurable via Workout Settings screen in the app
- Plate rounding configured via `user_settings.plate_calculator_bar_kg`
- Results are rounded to the nearest 2.5kg increment for dumbbells, or the nearest available plate combination for barbells
- Generated warm-up sets are injected at position 0, 1, 2... before any existing normal sets in the routine

#### Previous Workout Values — Query Logic

**Mode: `overall`**
```sql
SELECT ws.weight_kg, ws.reps, ws.duration_seconds, ws.distance_meters
FROM workout_sets ws
JOIN workout_exercises we ON we.id = ws.workout_exercise_id
JOIN workouts w ON w.id = we.workout_id
WHERE w.user_id = :user_id
  AND we.exercise_id = :exercise_id
  AND w.is_completed = true
  AND ws.set_type != 'warmup'
ORDER BY w.started_at DESC, ws.position ASC
LIMIT :set_count;
```

**Mode: `within_routine`**
```sql
SELECT ws.weight_kg, ws.reps, ws.duration_seconds, ws.distance_meters
FROM workout_sets ws
JOIN workout_exercises we ON we.id = ws.workout_exercise_id
JOIN workouts w ON w.id = we.workout_id
WHERE w.user_id = :user_id
  AND w.routine_id = :current_routine_id
  AND we.exercise_id = :exercise_id
  AND w.is_completed = true
  AND ws.set_type != 'warmup'
ORDER BY w.started_at DESC, ws.position ASC
LIMIT :set_count;
```
If no previous values are found in `within_routine` mode, fall back to `overall` mode silently.

### 7.3 Active Workout Persistence

The active workout state is persisted locally using `expo-sqlite` throughout the session. After every set marked complete, the current state is written to a local SQLite table `active_workout_draft`. Fields stored: all workout_exercises, all workout_sets (including incomplete ones), elapsed time, started_at.

On app launch: check if an `active_workout_draft` record exists. If yes → display "Resume Workout?" modal with workout name and elapsed time. Options: Resume (continue from draft) or Discard (delete draft). If no draft exists → normal launch.

On workout save or explicit cancellation → delete `active_workout_draft` record.

### 7.4 Finishing a Workout — Save Procedure

On "Save Workout" tap, the backend executes the following in a transaction:

1. Insert `workouts` row
2. For each exercise: insert `workout_exercises` row
3. For each set: insert `workout_sets` row with `is_warmup_counted` set based on user's current `warm_up_sets_in_stats` setting
4. Calculate `total_volume_kg`:
   - For each completed set where `is_warmup_counted = true` OR `set_type != 'warmup'`:
   - `weight_reps` logging: `weight_kg × reps`
   - `bodyweight_reps` logging: `(user.bodyweight_kg + weight_kg) × reps` (weight_kg = added weight, 0 if none)
   - `duration` logging: contributes 0 to volume
   - `distance` logging: contributes 0 to volume
   - Sum all values → `total_volume_kg`
5. Calculate `total_sets`: count of completed sets where `set_type != 'warmup'` (warm-up sets never counted in set totals regardless of stats setting)
6. Compute `ordinal_number`: `SELECT COUNT(*) FROM workouts WHERE user_id = :user_id AND is_completed = true` + 1
7. Run PR detection algorithm (see Section 8.2)
8. Update streak (see streak rules in Section 5)
9. Insert media records into `workout_media` (media already uploaded to Supabase Storage before save)
10. Update `workouts.is_completed = true`, `finished_at`, `duration_seconds`
11. Delete `active_workout_draft` from local SQLite
12. Return completed workout with detected PRs list

### 7.5 Visibility Options

The three workout visibility options are:
- **Public** — visible to all gym members in the feed (regardless of follow status)
- **Followers** — visible only to users who follow the workout owner (+ the owner)
- **Private** — visible only to the workout owner

The UI labels are "Everyone at [Gym Name]", "Followers Only", and "Only Me".

---

## 8. Phase 3 — Progress & Analytics

### 8.1 Statistics Dashboard

Accessible via Profile → Statistics tab.

Overview cards (all-time):
- Total workouts
- Total volume lifted (displayed in user's preferred unit)
- Total time trained (formatted as hours and minutes)
- Total sets completed

Last 7 days body graph, set count per muscle group, muscle distribution, main exercises — same as v1 spec.

### 8.2 PR Detection Algorithm

Runs server-side immediately after workout save. Input: the completed `workout_id`.

```
For each workout_exercise in the workout:
  exercise_id = workout_exercise.exercise_id
  logging_type = exercise.logging_type
  completed_sets = [sets where is_completed = true AND set_type IN ('normal', 'dropset', 'failure')]
  
  -- Only normal, dropset, and failure sets count toward PRs. Warmup sets NEVER count.
  
  If logging_type IN ('weight_reps', 'bodyweight_reps'):
    
    Check 'heaviest_weight':
      candidate = MAX(weight_kg) across completed_sets
      existing = MAX(value) FROM personal_records WHERE user_id AND exercise_id AND record_type = 'heaviest_weight'
      If candidate > existing (or existing is null) → insert new personal_record
    
    Check 'projected_1rm' (Epley formula: weight × (1 + reps/30)):
      candidate = MAX(weight_kg × (1 + reps/30.0)) across completed_sets where reps > 0
      existing = MAX(value) FROM personal_records WHERE user_id AND exercise_id AND record_type = 'projected_1rm'
      If candidate > existing → insert new personal_record
    
    Check 'best_volume_set' (weight × reps for one set):
      candidate = MAX(weight_kg × reps) across completed_sets
      existing = MAX(value) FROM personal_records WHERE user_id AND exercise_id AND record_type = 'best_volume_set'
      If candidate > existing → insert new personal_record
    
    Check 'best_volume_session' (sum of weight × reps across all completed sets this exercise this session):
      candidate = SUM(weight_kg × reps) across completed_sets
      existing = MAX(value) FROM personal_records WHERE user_id AND exercise_id AND record_type = 'best_volume_session'
      If candidate > existing → insert new personal_record
    
    Check 'most_reps':
      candidate = MAX(reps) across completed_sets
      existing = MAX(value) FROM personal_records WHERE user_id AND exercise_id AND record_type = 'most_reps'
      If candidate > existing → insert new personal_record
    
    Check '3rm' (best weight where reps >= 3):
      candidate = MAX(weight_kg) across completed_sets WHERE reps >= 3
      existing = MAX(value) FROM personal_records WHERE user_id AND exercise_id AND record_type = '3rm'
      If candidate > existing → insert new personal_record
    
    Check '5rm' (best weight where reps >= 5):
      candidate = MAX(weight_kg) across completed_sets WHERE reps >= 5
      existing = MAX(value) FROM personal_records WHERE user_id AND exercise_id AND record_type = '5rm'
      If candidate > existing → insert new personal_record
    
    Check '10rm' (best weight where reps >= 10):
      candidate = MAX(weight_kg) across completed_sets WHERE reps >= 10
      existing = MAX(value) FROM personal_records WHERE user_id AND exercise_id AND record_type = '10rm'
      If candidate > existing → insert new personal_record
  
  If logging_type = 'duration':
    Check 'most_reps' as 'longest_duration':
      candidate = MAX(duration_seconds)
      (record_type = 'most_reps' repurposed for duration exercises = most seconds)
  
  If logging_type = 'distance':
    Check 'best_volume_session' as 'longest_distance':
      candidate = SUM(distance_meters)

Collect all newly inserted personal_record IDs → return as list with workout save response
```

Multiple PRs in one session are all recorded and displayed on the post-workout summary screen.

### 8.3 Strength Level Classification

Used for 5 key exercises only: **Squat, Bench Press (Barbell), Deadlift, Overhead Press (Barbell), Barbell Row**.

Classification is based on the user's projected 1RM (`personal_records` max of `record_type = 'projected_1rm'`), compared against the following strength standards table. Standards are expressed as a ratio to the user's `bodyweight_kg`.

| Level | Squat | Bench | Deadlift | OHP | Row |
|-------|-------|-------|----------|-----|-----|
| Beginner (male) | 0.75× BW | 0.50× BW | 1.00× BW | 0.35× BW | 0.50× BW |
| Intermediate (male) | 1.25× BW | 0.75× BW | 1.50× BW | 0.55× BW | 0.75× BW |
| Advanced (male) | 1.75× BW | 1.25× BW | 2.00× BW | 0.80× BW | 1.10× BW |
| Elite (male) | 2.25× BW | 1.60× BW | 2.50× BW | 1.10× BW | 1.40× BW |

| Level | Squat | Bench | Deadlift | OHP | Row |
|-------|-------|-------|----------|-----|-----|
| Beginner (female) | 0.50× BW | 0.30× BW | 0.75× BW | 0.20× BW | 0.35× BW |
| Intermediate (female) | 0.90× BW | 0.55× BW | 1.15× BW | 0.35× BW | 0.55× BW |
| Advanced (female) | 1.30× BW | 0.80× BW | 1.55× BW | 0.55× BW | 0.80× BW |
| Elite (female) | 1.70× BW | 1.05× BW | 2.00× BW | 0.75× BW | 1.05× BW |

**Classification rule:** If 1RM ÷ bodyweight_kg ≥ Elite threshold → Elite. Else if ≥ Advanced → Advanced. Else if ≥ Intermediate → Intermediate. Else → Beginner. If user has no `bodyweight_kg` set, classification is not shown.

These tables are hardcoded in `backend/data/strength-standards.js`.

### 8.4 Volume Comparison Table

Hardcoded in `backend/data/volume-comparisons.js`. Used on post-workout summary screen.

```javascript
module.exports = [
  { label: 'a dumbbell', kg: 10 },
  { label: 'a bicycle', kg: 15 },
  { label: 'a large dog', kg: 40 },
  { label: 'a refrigerator', kg: 90 },
  { label: 'a panda bear', kg: 120 },
  { label: 'a grand piano', kg: 450 },
  { label: 'a car', kg: 1400 },
  { label: 'a hippo', kg: 2000 },
  { label: 'an elephant', kg: 5000 },
  { label: 'a school bus', kg: 11000 },
];
// Select the item whose kg value is closest to (but not exceeding) total_volume_kg.
// If total_volume_kg < 10, show no comparison.
```

### 8.5 Monthly Report Generation

Generated by a cron job on the **1st of every month at 00:00 UTC** for the previous calendar month.

For each active user who had ≥ 1 completed workout in the previous month, the job:
1. Queries all required metrics from the DB (see template below)
2. Stores the report data as a JSON object in a `monthly_reports` table (add this table — see below)
3. Sends a push notification: "Your [Month] training report is ready 💪"

No report is generated for months where the user had zero workouts.

**`monthly_reports` table (add to schema):**
```sql
CREATE TABLE monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  report_month DATE NOT NULL, -- First day of the reported month (e.g., 2026-03-01)
  report_data JSONB NOT NULL, -- Fully computed report data (see structure below)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, report_month)
);
```

**`report_data` JSONB structure:**
```json
{
  "month_label": "March 2026",
  "total_workouts": 18,
  "total_workouts_prev": 12,
  "total_volume_kg": 45000,
  "total_volume_prev_kg": 38000,
  "total_sets": 320,
  "total_sets_prev": 280,
  "total_duration_seconds": 72000,
  "training_days": 18,
  "weeks_with_workout": 4,
  "streak_at_end_of_month": 6,
  "calendar_training_days": ["2026-03-01", "2026-03-03"],
  "personal_records": [
    {"exercise_name": "Bench Press", "record_type": "heaviest_weight", "value_kg": 120, "achieved_at": "2026-03-15", "workout_id": "uuid"}
  ],
  "muscle_distribution": [
    {"muscle": "chest", "sets": 80, "percentage": 25.0}
  ],
  "top_exercises": [
    {"exercise_name": "Bench Press", "times_logged": 12}
  ]
}
```

### 8.6 Year in Review Generation

Generated by a cron job on **January 1st at 02:00 UTC** for the previous calendar year. Same table (`monthly_reports`) with `report_month = '2025-01-01'` and a `report_type` column added:

Add `report_type VARCHAR(20) DEFAULT 'monthly' CHECK (report_type IN ('monthly', 'yearly'))` to `monthly_reports`.

Year in Review data structure:
```json
{
  "year": 2025,
  "total_workouts": 180,
  "total_volume_kg": 540000,
  "total_training_days": 180,
  "total_prs": 47,
  "best_month": "October",
  "best_month_workouts": 22,
  "most_trained_muscle": "chest",
  "top_exercises": ["Bench Press", "Squat", "Deadlift"],
  "biggest_pr": {"exercise_name": "Deadlift", "record_type": "heaviest_weight", "value_kg": 200},
  "weeks_trained_of_52": 48
}
```

---

## 9. Phase 4 — Leaderboards & Social

### 9.1 Leaderboard System

#### Categories and Periods

| Category | Period | Resets |
|----------|--------|--------|
| Heaviest Lift (per exercise, 38 exercises) | All-time | Never |
| Most Volume | Weekly | Every Monday 00:00 UTC |
| Most Volume | Monthly | Every 1st of month 00:00 UTC |
| Most Volume | All-time | Never |
| Most Workouts | Weekly | Every Monday 00:00 UTC |
| Most Workouts | Monthly | Every 1st of month 00:00 UTC |
| Most Workouts | All-time | Never |
| Longest Streak | All-time | Never |

**On reset:** Before clearing, the cron job writes the final snapshot to `leaderboard_snapshots` with `period_start` and `period_end` filled in. A fresh snapshot computation begins. Historical snapshots are retained for 12 months.

#### Leaderboard Computation

Leaderboard data is computed by a background job every **15 minutes** and written to `leaderboard_snapshots`. The API reads from this table only — no live aggregation queries.

Each snapshot contains top 50 ranked members. The client's own rank is always fetched separately (to show even if outside top 50) via `GET /api/v1/leaderboards/:category?exercise_id=:id` which includes `my_rank` and `my_value` in the response.

#### 38 Predefined Leaderboard Exercises
Squat, Bench Press (Barbell), Deadlift (Conventional), Overhead Press (Barbell), Barbell Row, Pull-Up, Chin-Up, Dip, Romanian Deadlift, Leg Press, Incline Bench Press (Barbell), Decline Bench Press (Barbell), Bench Press (Dumbbell), Shoulder Press (Dumbbell), Lateral Raise, Cable Row (Seated), Lat Pulldown, Face Pull, Bicep Curl (Barbell), Hammer Curl, Tricep Pushdown (Cable), Skull Crusher, Leg Curl (Machine), Leg Extension (Machine), Hip Thrust (Barbell), Bulgarian Split Squat, Lunge (Barbell), Calf Raise (Machine), Front Squat, Sumo Deadlift, Trap Bar Deadlift, Bench Press (Close Grip), Preacher Curl, Incline Curl (Dumbbell), Cable Fly, Pec Deck (Machine), Seated Cable Row, Arnold Press.

These exercise names must match exactly the names imported from WGER. The mapping is stored in `backend/data/leaderboard-exercises.js` as an array of WGER exercise IDs.

### 9.2 Social Feed

The Home feed shows workouts from all gym members with `visibility = 'public'`, plus workouts from users the viewer follows with `visibility = 'followers'`. Workouts with `visibility = 'private'` never appear in any feed.

**There is no separate Discover tab in v1.** The Home feed serves all gym members' public workouts. A "Following" filter toggle allows switching between "All gym members" and "Following only" views. This replaces the Discover concept, which is not meaningful in a small gym community.

### 9.3 @Mention Resolution

@mentions in comments and workout descriptions are stored as plain `@username` text. Since usernames are immutable, this is reliable. When parsing comment content for display:
1. Find all substrings matching `@[a-zA-Z0-9_]+`
2. Look up each username in the users cache
3. Render as tappable link opening that user's profile

When a comment containing an @mention is saved, the backend:
1. Parses all `@username` mentions from the comment content
2. For each valid username found: look up `user_id`
3. Create a `notification` of type `comment` for the workout owner (standard)
4. Additionally create a `notification` for each mentioned user (only if they are not the comment author and not the workout owner)

### 9.4 Follow Request Flow (Private Profiles)

1. User A taps Follow on User B's profile (User B is private)
2. `POST /api/v1/users/:id/follow` → inserts `follows` row with `status = 'pending'`
3. User A sees "Requested" button on User B's profile
4. User B receives notification of type `follow_request`
5. User B sees follow requests via `GET /api/v1/follow-requests`
6. User B approves: `POST /api/v1/follow-requests/:id/approve` → updates `status = 'active'`, creates `follow_request_approved` notification for User A
7. User B rejects: `POST /api/v1/follow-requests/:id/reject` → deletes `follows` row, no notification sent

---

## 10. Phase 5 — Gym Admin Panel (Web)

Deployed to Vercel at `admin.ironpath.app`. Separate React + Vite application.

All API calls go to the same Railway-hosted backend, using the gym owner's JWT. All `/api/v1/admin/*` endpoints are restricted to `role = 'gym_owner'` or `role = 'super_admin'`.

### 10.1 Dashboard, Member Management, Announcements, Analytics

Same as v1 spec.

### 10.2 Subscription Management (Super Admin Only)

Accessible at `/super` route in admin panel. Visible only to `role = 'super_admin'`.

Displays table of all gyms with: name, subscription_status, subscription_tier, subscription_expires_at, member count, total workouts.

Actions per gym:
- Update subscription_status (dropdown: trial / active / expired / cancelled)
- Update subscription_tier (dropdown: starter / growth / unlimited)
- Set subscription_expires_at (date picker)
- Save changes → `PATCH /api/v1/admin/gyms/:id/subscription`

### 10.3 Routine CRUD (Full)
- `GET /api/v1/admin/routines` — list gym template routines
- `POST /api/v1/admin/routines` — create gym template
- `PATCH /api/v1/admin/routines/:id` — update gym template
- `DELETE /api/v1/admin/routines/:id` — delete gym template

### 10.4 Challenge CRUD (Full)
- `GET /api/v1/admin/leaderboards/challenges` — list challenges
- `POST /api/v1/admin/leaderboards/challenges` — create challenge
- `PATCH /api/v1/admin/leaderboards/challenges/:id` — update challenge (only if status = 'upcoming')
- `DELETE /api/v1/admin/leaderboards/challenges/:id` — delete challenge (only if status = 'upcoming')

---

## 11. Phase 6 — In-App Engagement

### 11.1 Streaks

Same as v1 spec. Week starts Monday. Retroactive workouts recalculate streak.

### 11.2 Achievement Badges

Same badge table as v1 spec. Stored in a `user_badges` table:

```sql
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  badge_key VARCHAR(50) NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);
```

Badge keys: `first_rep`, `ten_strong`, `half_century`, `century`, `iron_month`, `iron_quarter`, `pr_machine`, `heavy_lifter`, `consistent`, `early_bird`, `night_owl`, `gym_legend`.

### 11.3 Shareable Graphics

Generated on-device using `react-native-view-shot`. A hidden off-screen React Native component (`WorkoutShareCard`) is rendered and captured as a PNG image. The image is saved to the device's camera roll via `expo-media-library`. It is NOT uploaded to Supabase Storage (no persistence needed for share graphics).

`WorkoutShareCard` component contains:
- Gym logo + name
- User's full name + username
- Workout name
- Date
- Key stats: duration, volume, sets
- PR badges (up to 3, then "+N more")
- Background theme selector (transparent / light / dark)

### 11.4 Push Notifications

All notification types and their triggers are defined in Section 5 (schema). The backend sends push notifications via the Expo Push Notifications API (`https://exp.host/--/api/v2/push/send`) after inserting each `notifications` row.

Before sending, check the recipient's notification preference in `user_settings.notif_<type>`. If false, skip the push notification (but still insert the in-app notification row).

### 11.5 Widgets and Live Activity

Same as v1 spec. Implementation via `react-native-widget-extension` for iOS and `@bam.tech/react-native-android-widget` for Android.

---

## 12. Phase 7 — AI Trainer (Algorithmic)

### 12.1 Program Template Decision Matrix

Input → output is a `program_template_key` string used to look up the template in `backend/data/trainer-templates.js`.

Key format: `{experience}_{goal}_{days}_{equipment}`

| Experience | Goal | Days | Equipment | Template Key |
|-----------|------|------|-----------|-------------|
| beginner | strength | 3 | full_gym | `beginner_strength_3_full_gym` |
| beginner | strength | 3 | dumbbells | `beginner_strength_3_dumbbells` |
| beginner | strength | 3 | bodyweight | `beginner_strength_3_bodyweight` |
| beginner | hypertrophy | 3 | full_gym | `beginner_hypertrophy_3_full_gym` |
| beginner | hypertrophy | 4 | full_gym | `beginner_hypertrophy_4_full_gym` |
| beginner | general | 2 | any | `beginner_general_2_bodyweight` |
| beginner | general | 3 | any | `beginner_general_3_full_gym` |
| intermediate | strength | 3 | full_gym | `intermediate_strength_3_full_gym` |
| intermediate | strength | 4 | full_gym | `intermediate_strength_4_full_gym` |
| intermediate | hypertrophy | 4 | full_gym | `intermediate_hypertrophy_4_full_gym` |
| intermediate | hypertrophy | 5 | full_gym | `intermediate_hypertrophy_5_full_gym` |
| intermediate | strength | 3 | dumbbells | `intermediate_strength_3_dumbbells` |
| advanced | strength | 4 | full_gym | `advanced_strength_4_full_gym` |
| advanced | strength | 5 | full_gym | `advanced_strength_5_full_gym` |
| advanced | hypertrophy | 5 | full_gym | `advanced_hypertrophy_5_full_gym` |
| advanced | hypertrophy | 6 | full_gym | `advanced_hypertrophy_6_full_gym` |
| any | endurance | any | any | `endurance_{days}_bodyweight` |

Fall-through rule: if an exact key has no template defined, use the closest match with same experience and goal, then round down days, then default to `full_gym` equipment.

### 12.2 Program Template Structure

Each template in `backend/data/trainer-templates.js` defines:
```javascript
{
  name: "StrongLifts 5x5",
  protocol: "linear",  // 'linear' | 'wave' | 'periodization'
  weeks_per_cycle: 1,  // for linear; 3 for wave; 4 for periodization
  deload_after_failures: 2,  // consecutive failed sessions before deload
  deload_percentage: 0.90,  // keep 90% of weight after deload
  upper_body_increment_kg: 2.5,
  lower_body_increment_kg: 5.0,
  sessions: [
    {
      day_label: "Session A",
      exercises: [
        {
          wger_id: 110,  // Squat
          sets: 5,
          reps: 5,
          is_lower_body: true
        },
        {
          wger_id: 192,  // Bench Press
          sets: 5,
          reps: 5,
          is_lower_body: false
        }
      ]
    },
    {
      day_label: "Session B",
      exercises: [...]
    }
  ]
}
```

### 12.3 Progression Engine

Runs server-side after each workout is saved, if the user has an active AI trainer program.

```
For each exercise in the completed workout that is part of the active program:
  
  Get exercise state from progression_data.exercises[exercise_id]
  
  prescribed_sets = template sets for this exercise
  completed_sets = workout sets for this exercise (normal + failure type only)
  completion_rate = completed_sets_count / prescribed_sets_count
  all_reps_hit = all completed sets achieved >= prescribed reps
  
  IF all_reps_hit AND completion_rate >= 1.0:
    consecutive_successes += 1
    consecutive_failures = 0
    IF consecutive_successes >= 1 (linear) or >= 3 (wave/periodization):
      increment weight: is_lower_body → +lower_body_increment_kg, else → +upper_body_increment_kg
      consecutive_successes = 0
  
  ELSE IF completion_rate < 1.0 OR NOT all_reps_hit:
    consecutive_failures += 1
    consecutive_successes = 0
    IF consecutive_failures >= deload_after_failures:
      current_weight_kg = ROUND(current_weight_kg * deload_percentage, 2.5)
      consecutive_failures = 0
  
  Update progression_data.exercises[exercise_id]
  Update ai_trainer_programs.updated_at
```

### 12.4 Override Learning

When a user manually overrides a prescribed weight via `POST /api/v1/trainer/feedback`:
- Record in `progression_data.exercises[exercise_id].override_history`
- Update `progression_data.override_bias`:
  - Upward override: `override_bias += 1`
  - Downward override: `override_bias -= 1`
- If `override_bias >= 3`: increase increment sizes by 25% for this user's program
- If `override_bias <= -3`: decrease increment sizes by 25%
- `override_bias` is clamped between -5 and +5

---

## 13. Background Jobs

All jobs run in the Node.js backend process using `node-cron`. All times are UTC.

| Job | Schedule (cron) | Description |
|-----|-----------------|-------------|
| Leaderboard refresh | `*/15 * * * *` | Recompute all leaderboard snapshots for all gyms |
| Weekly leaderboard reset | `0 0 * * 1` | Monday 00:00 UTC — archive weekly snapshot, start fresh |
| Monthly leaderboard reset | `0 0 1 * *` | 1st of month 00:00 UTC — archive monthly snapshot, start fresh |
| Monthly report generation | `0 0 1 * *` | 1st of month 00:00 UTC — generate reports for prior month |
| Year in Review | `0 2 1 1 *` | January 1st 02:00 UTC — generate yearly recap |
| Weekly nudge notifications | `0 9 * * 1` | Monday 09:00 UTC — notify users with no workout the prior week |
| Streak recalculation | `0 0 * * 1` | Monday 00:00 UTC — check for broken streaks |
| Notification cleanup | `0 3 * * *` | Daily 03:00 UTC — delete notifications older than 90 days |
| Leaderboard history cleanup | `0 4 1 * *` | 1st of month 04:00 UTC — delete snapshots older than 12 months |
| Challenge status update | `*/5 * * * *` | Every 5 minutes — set challenge status to 'active' or 'completed' based on time |
| Challenge result computation | `*/5 * * * *` | Every 5 minutes — compute results for newly completed challenges |
| Warmup recalculation | Triggered | Runs within 60s of a user toggling warm_up_sets_in_stats setting |

---

## 14. API Endpoints

All routes prefixed with `/api/v1/`. All require JWT except auth and invite validation routes.

### Authentication
```
POST /auth/register              # Register member (with invite_code in body)
POST /auth/login                 # Login → returns access + refresh tokens
POST /auth/logout                # Invalidate refresh token
POST /auth/refresh               # Exchange refresh token for new access token
POST /auth/forgot-password       # Send reset email
POST /auth/reset-password        # Submit new password with reset token
```

### Gyms
```
POST   /gyms                           # Create gym + owner (admin panel registration)
GET    /gyms/:id                       # Get gym details
PATCH  /gyms/:id                       # Update gym settings (owner only)
GET    /gyms/validate-invite/:code     # Validate invite code → {gym_id, gym_name, logo_url}
POST   /gyms/:id/regenerate-invite     # Generate new invite code (owner only)
POST   /gyms/:id/invite-email          # Send email invite to address (owner only)
```

### Users
```
GET    /users/me                        # Current user full profile + settings
PATCH  /users/me                        # Update profile fields
GET    /users/me/settings               # Get user settings
PATCH  /users/me/settings               # Update user settings (any fields from user_settings)
GET    /users/me/notification-settings  # Alias for settings notif_ fields
PATCH  /users/me/notification-settings  # Update notification preferences
GET    /users/:id                       # Get public profile (respects privacy)
GET    /users/:id/workouts              # Paginated workout list (respects visibility + privacy)
                                        # Query: ?cursor=<ISO8601>&limit=20
GET    /users/:id/stats                 # Returns: {total_workouts, total_volume_kg, current_streak,
                                        #   strength_levels: [{exercise_name, level, 1rm_kg}],
                                        #   recent_workouts: [{id, name, started_at, total_volume_kg}] (5 max)}
                                        # Returns 403 if profile is private and requester is not a follower
POST   /users/:id/follow                # Follow or request to follow
DELETE /users/:id/follow                # Unfollow or cancel follow request
GET    /users/:id/followers             # Paginated followers list
GET    /users/:id/following             # Paginated following list
GET    /users/:id/compare               # Side-by-side comparison data
GET    /follow-requests                 # List incoming follow requests (pending follows where following_id = me)
POST   /follow-requests/:id/approve     # Approve a follow request
POST   /follow-requests/:id/reject      # Reject and delete a follow request
```

### Exercises
```
GET    /exercises                       # Search/filter exercises
                                        # Query: ?search=<str>&equipment=<val>&muscle=<val>&limit=20&offset=0
GET    /exercises/:id                   # Exercise detail
POST   /exercises                       # Create custom exercise
PATCH  /exercises/:id                   # Update custom exercise (creator or gym_owner only)
DELETE /exercises/:id                   # Delete custom exercise (creator or gym_owner only)
```

### Routines
```
GET    /routines                        # User's routines (with exercises and sets)
POST   /routines                        # Create routine
GET    /routines/:id                    # Get routine with full exercise/set detail
PATCH  /routines/:id                    # Update routine (name, description, folder_id, exercises, sets)
DELETE /routines/:id                    # Delete routine (hard delete)
POST   /routines/:id/duplicate          # Duplicate routine → returns new routine
POST   /routines/:id/save-as-routine    # N/A here (see workouts)
GET    /routines/pre-built              # Pre-built library
                                        # Query: ?category=<val>&level=<val>&goal=<val>
POST   /routines/pre-built/:id/save     # Save pre-built program as folder + routines for user
GET    /routine-folders                 # User's folders
POST   /routine-folders                 # Create folder
PATCH  /routine-folders/:id             # Update folder name or position
DELETE /routine-folders/:id             # Delete folder (routines inside → folder_id set to null)
```

### Workouts
```
POST   /workouts                        # Save completed workout (full payload)
GET    /workouts/history                # Paginated workout history
                                        # Query: ?cursor=<ISO8601>&limit=20
GET    /workouts/:id                    # Full workout detail (exercises, sets, media, PRs)
PATCH  /workouts/:id                    # Update name, description, visibility, started_at, duration
DELETE /workouts/:id                    # Delete workout (hard delete, updates ordinals not recalculated)
POST   /workouts/:id/copy               # Create new empty workout pre-loaded from this workout's template
POST   /workouts/:id/save-as-routine    # Save workout structure as a new routine
POST   /workouts/:id/media              # Upload media (enforces 2 photo + 1 video limit)
                                        # Body: multipart/form-data with file + media_type
DELETE /workouts/:id/media/:mediaId     # Delete specific media
```

### Feed
```
GET    /feed                            # Home feed (gym members' workouts)
                                        # Query: ?filter=all|following&cursor=<ISO8601>&limit=20
POST   /workouts/:id/like               # Like workout (idempotent)
DELETE /workouts/:id/like               # Unlike workout
GET    /workouts/:id/likes              # Who liked (paginated)
POST   /workouts/:workoutId/comments    # Add comment
GET    /workouts/:workoutId/comments    # Get comments (paginated)
DELETE /workouts/:workoutId/comments/:commentId  # Soft delete own comment
```

### Leaderboards
```
GET    /leaderboards/lifts              # Lift leaderboard for specific exercise
                                        # Query: ?exercise_id=<uuid>&period=all_time
                                        # Returns: {rankings: [...], my_rank, my_value, generated_at}
GET    /leaderboards/volume             # Volume leaderboard
                                        # Query: ?period=weekly|monthly|all_time
GET    /leaderboards/workouts           # Workout count leaderboard
                                        # Query: ?period=weekly|monthly|all_time
GET    /leaderboards/streak             # Streak leaderboard (all-time)
GET    /leaderboards/challenges         # Active and upcoming challenges for this gym
GET    /leaderboards/challenges/:id     # Challenge detail + current rankings
```

### Analytics
```
GET    /analytics/stats                 # Full stats dashboard data for current user
GET    /analytics/exercises             # List exercises user has logged (with PR summary)
GET    /analytics/exercises/:id         # Full performance data for one exercise
GET    /analytics/calendar              # Workout calendar data
                                        # Query: ?year=2026&month=4
GET    /analytics/measurements          # Body measurements list (paginated)
POST   /analytics/measurements          # Log new measurement
PATCH  /analytics/measurements/:id      # Update measurement
DELETE /analytics/measurements/:id      # Delete measurement
GET    /analytics/reports               # List all monthly + yearly reports for user
GET    /analytics/reports/:id           # Get specific report data
```

### Notifications
```
GET    /notifications                   # Paginated notifications list
                                        # Query: ?cursor=<ISO8601>&limit=20
PATCH  /notifications/:id/read          # Mark single notification as read
POST   /notifications/read-all          # Mark all as read
POST   /push-tokens                     # Register device push token
DELETE /push-tokens/:token              # Remove push token (on logout)
```

### AI Trainer
```
GET    /trainer/program                 # Current active program + status
POST   /trainer/program                 # Create program (onboarding payload)
PATCH  /trainer/program                 # Pause, resume, or update program
DELETE /trainer/program                 # Reset program (deletes and allows re-onboarding)
GET    /trainer/next-session            # Next prescribed session with exercises + weights
POST   /trainer/feedback                # Manual weight override for specific exercise
GET    /trainer/progress                # Progress report (trending up/stalled/deloaded per exercise)
```

### Admin (gym_owner or super_admin only)
```
GET    /admin/dashboard                 # Dashboard metrics
GET    /admin/members                   # Member list
                                        # Query: ?search=<str>&status=active|suspended&page=1&limit=25
GET    /admin/members/:id               # Member detail + activity stats
PATCH  /admin/members/:id/suspend       # Suspend member (sets is_active=false)
DELETE /admin/members/:id               # Remove member (soft delete with PII clearing)
POST   /admin/message/:userId           # Send direct push notification to member
GET    /admin/announcements             # List announcements
POST   /admin/announcements             # Create announcement
PATCH  /admin/announcements/:id         # Update announcement
DELETE /admin/announcements/:id         # Delete announcement
GET    /admin/analytics                 # Gym-wide analytics
GET    /admin/routines                  # Gym template routines
POST   /admin/routines                  # Create gym template routine
PATCH  /admin/routines/:id              # Update gym template routine
DELETE /admin/routines/:id              # Delete gym template routine
GET    /admin/leaderboards/challenges   # List all challenges
POST   /admin/leaderboards/challenges   # Create challenge
PATCH  /admin/leaderboards/challenges/:id   # Update challenge (upcoming only)
DELETE /admin/leaderboards/challenges/:id   # Delete challenge (upcoming only)
GET    /admin/settings                  # Gym settings
PATCH  /admin/settings                  # Update gym settings (name, logo, accent_color, etc.)
```

### Super Admin only
```
GET    /admin/gyms                      # List all gyms (super_admin only)
PATCH  /admin/gyms/:id/subscription     # Update gym subscription status/tier/expiry
```

---

## 15. File Storage Structure

Supabase Storage buckets and policies:

```
Bucket: avatars (public read)
  {user_id}/avatar.jpg
  -- Max 5MB raw. Client compresses to max 512×512px JPEG 85% quality before upload.

Bucket: gym-assets (public read)
  {gym_id}/logo.jpg
  -- Max 5MB raw. Client compresses to max 512×512px before upload.

Bucket: workout-media (authenticated read — only gym members)
  {gym_id}/{user_id}/{workout_id}/photo_0.jpg
  {gym_id}/{user_id}/{workout_id}/photo_1.jpg
  {gym_id}/{user_id}/{workout_id}/video_0.mp4
  -- Photos: max 10MB raw. Client resizes to max 1920px longest side, JPEG 80% before upload.
  -- Videos: max 30MB. Client must compress video to 30MB before upload (display warning if too large).
  -- Limit enforced at API layer: 2 photos + 1 video per workout.

Bucket: exercise-assets (public read)
  global/{wger_id}/image_0.jpg          -- Imported from WGER
  custom/{gym_id}/{exercise_id}/image_0.jpg   -- Gym custom exercises

Bucket: progress-photos (private — owner only)
  {user_id}/{measurement_id}/photo_0.jpg
  {user_id}/{measurement_id}/photo_1.jpg
  -- Max 10MB raw. Client compresses to max 1920px, JPEG 80% before upload.
```

**Storage upgrade trigger:** Monitor Supabase Storage usage via dashboard. When total usage reaches 800MB (out of 1GB free tier), upgrade to Supabase Pro ($25/month includes 100GB storage).

---

## 16. Security & Privacy

### Authentication
- JWT access token: 1 hour expiry
- JWT refresh token: 7 day expiry
- Tokens stored in `expo-secure-store` (iOS Keychain / Android Keystore)
- Auth middleware: validate JWT → fetch user row → attach `{user_id, gym_id, role}` to `req.user`
- Suspended users (`is_active = false`) receive 403 FORBIDDEN on any request
- Deleted users (`deleted_at IS NOT NULL`) receive 401 UNAUTHORIZED on any request
- Expired subscriptions (grace period elapsed): members receive 403 GYM_SUSPENDED

### Row Level Security
All Supabase tables have RLS enabled. Backend uses the `service_role` key for all DB operations (bypasses RLS). RLS policies are a secondary safety net. The primary enforcement is backend middleware.

### Data Isolation
- Every query in the backend includes `WHERE gym_id = req.user.gym_id`
- `gym_id` is never read from the request — only from `req.user` (derived from validated JWT)
- Cross-gym data access is impossible by construction

### Input Validation
- All request bodies validated with `express-validator` or `zod` before reaching route handlers
- File uploads: MIME type verified server-side (not just extension), size checked before processing
- Rate limiting via `express-rate-limit`: 5 req/15min on auth, 100 req/min per user elsewhere

### Privacy Controls
- Private profile: `GET /users/:id` returns only `{id, username, is_profile_private: true}` to non-followers
- `GET /users/:id/workouts` returns 403 for private profiles if requester is not a follower
- `visibility = 'private'` workouts never returned in any feed query, only to the owner
- Gym owner analytics: aggregate only — gym owner cannot view individual `private` workouts

---

## 17. Monetization

### Pricing
| Tier | Member Limit | Price |
|------|-------------|-------|
| Starter | Up to 50 members | $49/month |
| Growth | Up to 200 members | $99/month |
| Unlimited | No limit | $199/month |

- 30-day free trial, no credit card required
- After trial: gym continues working. Gym owner sees upgrade banner in admin panel.
- Grace period: 7 days after `subscription_expires_at` before members are blocked from logging workouts
- During grace period: members see a non-blocking banner "Your gym's subscription has expired. Contact your gym owner."
- After grace period: `GET /api/v1/*` returns 403 GYM_SUSPENDED for all member actions except viewing their own history
- Payment collected manually (bank transfer or payment link) → super admin updates subscription via admin panel

### Member Limit Enforcement
- On `POST /api/v1/auth/register`: backend checks current active member count for the gym against tier limit
- If limit exceeded: return 422 with message "This gym has reached its member limit. Contact your gym owner."
- Suspended members do not count toward the limit (only `is_active = true AND deleted_at IS NULL`)

---

## 18. Environment Variables

Create `.env` at `backend/.env` and `.env.local` at `admin/.env.local` and `mobile/.env.local`.

```bash
# backend/.env

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (direct connection for migrations)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Server
PORT=3000
NODE_ENV=development  # 'development' | 'production'

# JWT (same secret used by Supabase)
JWT_SECRET=your-supabase-jwt-secret

# Email (Resend)
RESEND_API_KEY=re_your_resend_key
RESEND_FROM_EMAIL=noreply@ironpath.app

# Super Admin (used only in seed script)
SUPER_ADMIN_EMAIL=admin@ironpath.app
SUPER_ADMIN_PASSWORD=your-strong-password

# App
APP_NAME=IronPath
ADMIN_PANEL_URL=https://admin.ironpath.app
APP_DOWNLOAD_URL=https://ironpath.app/download
```

```bash
# admin/.env.local
VITE_API_URL=https://your-backend.railway.app/api/v1
VITE_APP_NAME=IronPath
```

```bash
# mobile/.env.local (via Expo)
EXPO_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
EXPO_PUBLIC_APP_NAME=IronPath
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 19. App Store Readiness

Required before submission to Apple App Store and Google Play Store.

### App Identity
- **App Name:** IronPath
- **iOS Bundle Identifier:** com.ironpath.app
- **Android Package Name:** com.ironpath.app
- **Expo Slug:** ironpath

### Required Assets
| Asset | Size | Format | Notes |
|-------|------|--------|-------|
| App Icon | 1024×1024px | PNG, no alpha | iOS App Store |
| App Icon | 512×512px | PNG | Google Play |
| Adaptive Icon (foreground) | 1024×1024px | PNG | Android adaptive icon |
| Splash Screen | 1284×2778px | PNG | iPhone 14 Pro Max |
| Feature Graphic | 1024×500px | PNG/JPG | Google Play store listing |
| Screenshots (iPhone 6.7") | 1290×2796px | PNG | Min 3, max 10 |
| Screenshots (iPhone 5.5") | 1242×2208px | PNG | Min 3, required for older devices |
| Screenshots (iPad 12.9") | 2048×2732px | PNG | Required if iPad supported |
| Screenshots (Android phone) | 1080×1920px | PNG | Min 2, max 8 |

### App Store Metadata (prepare before submission)
- **App description** (up to 4000 chars for App Store, 4000 for Play Store)
- **Short description** (80 chars, Play Store only)
- **Keywords** (100 chars, App Store only): `gym,workout,fitness,tracker,strength,training,barbell,lifting`
- **Privacy Policy URL:** https://ironpath.app/privacy (must be live before submission)
- **Support URL:** https://ironpath.app/support
- **Category:** Health & Fitness
- **Age Rating:** 4+ (no objectionable content)
- **Content Advisory:** No violence, no adult content

### iOS-Specific Requirements
- **Apple Developer Account:** $99/year — create at developer.apple.com
- **App Review Notes:** Include a test gym invite code and test member credentials for Apple reviewers
- **NSCameraUsageDescription:** "IronPath uses your camera to take workout progress photos."
- **NSPhotoLibraryUsageDescription:** "IronPath saves workout graphics to your photo library."
- **NSPhotoLibraryAddUsageDescription:** "IronPath saves shareable workout cards to your photos."

### Android-Specific Requirements
- **Google Play Developer Account:** $25 one-time — create at play.google.com/console
- **Target API Level:** 34+ (required as of 2024)
- **Data Safety form:** complete the Play Console data safety questionnaire before submission

---

## 20. Build Order & Dependencies

Claude Code builds in this exact sequence. Each step must be fully complete and functional before starting the next.

### Step 1 — Repository & Project Setup
1. Initialize git repository
2. Set up npm workspaces monorepo (`/package.json` with workspaces: `["mobile", "backend", "admin", "shared"]`)
3. Create `shared/` package with TypeScript types for all models and API request/response shapes
4. Initialize `backend/` Node.js + Express project: `npm init`, install dependencies (`express`, `cors`, `helmet`, `express-rate-limit`, `@supabase/supabase-js`, `zod`, `node-cron`, `resend`, `jsonwebtoken`, `dotenv`)
5. Initialize `mobile/` Expo project: `npx create-expo-app mobile --template blank-typescript`
6. Initialize `admin/` React + Vite project: `npm create vite@latest admin -- --template react-ts`
7. Create `.env` files from environment variables section
8. Configure Railway project for `backend/`
9. Configure Vercel project for `admin/`

### Step 2 — Database Setup
1. Create Supabase project
2. Run all schema migrations in the exact order defined in Section 5
3. Add all indexes
4. Enable RLS on all tables
5. Write and apply RLS policies
6. Run WGER import script (`backend/scripts/import-wger.js`)
7. Seed pre-built routine library data (`backend/scripts/seed-prebuilt-routines.js`)
8. Run super admin seed script (`backend/scripts/seed-super-admin.js`)
9. Verify: query `SELECT COUNT(*) FROM exercises` should return > 100

### Step 3 — Phase 1: Auth & Foundation
1. Backend: auth middleware, JWT validation, user context injection
2. Backend: gym registration endpoint, invite validation, member registration
3. Backend: login, logout, token refresh, forgot/reset password
4. Backend: user settings auto-creation on register
5. Mobile: onboarding screens (invite code entry, gym preview, registration form)
6. Mobile: login screen, forgot password screen
7. Admin: gym registration form, owner login screen, basic layout/nav shell
8. Verify: gym owner can register, member can join with invite code, both can log in

### Step 4 — Phase 2: Workout Engine
1. Backend: exercise CRUD endpoints
2. Backend: routine and folder CRUD endpoints
3. Backend: workout save endpoint with full save procedure (Section 7.4)
4. Backend: PR detection algorithm (Section 8.2)
5. Backend: streak update logic (Section 5, streaks table rules)
6. Mobile: exercise library screen with search and filter
7. Mobile: exercise detail screen
8. Mobile: routine builder screen (exercises, sets, supersets, notes)
9. Mobile: routine folders screen
10. Mobile: active workout screen (set logging, rest timer, plate calculator, inline timer)
11. Mobile: finish workout screen (name, visibility, media upload, description)
12. Mobile: post-workout summary screen (ordinal, PRs, volume comparison, share graphic)
13. Mobile: local SQLite draft persistence (Section 7.3)
14. Verify: full workout flow from start to summary screen works end-to-end

### Step 5 — Phase 3: Analytics
1. Backend: statistics dashboard query endpoint
2. Backend: exercise performance data endpoint (all PR types + history)
3. Backend: strength level classification (Section 8.3 tables)
4. Backend: body measurements CRUD
5. Backend: calendar endpoint
6. Backend: monthly report data structure + generation logic (triggered manually for testing)
7. Backend: year in review generation logic
8. Mobile: statistics dashboard screen
9. Mobile: exercise list + exercise detail/performance screen
10. Mobile: body measurements screen + progress photos
11. Mobile: calendar view
12. Mobile: monthly report screen (template rendering from JSON)
13. Mobile: year in review screen
14. Verify: after logging 5+ workouts, all analytics screens show correct data

### Step 6 — Phase 4: Leaderboards & Social
1. Backend: leaderboard snapshot computation queries (all categories)
2. Backend: leaderboard read endpoints
3. Backend: home feed query (respects visibility + follow status)
4. Backend: like and comment endpoints
5. Backend: follow system (including follow requests for private profiles)
6. Backend: @mention parsing and notification creation
7. Mobile: leaderboard screen (all tabs and periods)
8. Mobile: home feed screen
9. Mobile: workout detail screen (full exercise list, media, likes, comments)
10. Mobile: user profile screen
11. Mobile: performance comparison screen
12. Mobile: follow request management screen
13. Verify: leaderboards show correct rankings, feed shows correct workouts per visibility

### Step 7 — Phase 5: Admin Panel
1. Admin: dashboard screen with metrics charts
2. Admin: member management table (search, filter, suspend, remove)
3. Admin: invite management (display code, regenerate, email invite)
4. Admin: announcements CRUD
5. Admin: gym-wide routine management
6. Admin: leaderboard challenge CRUD
7. Admin: analytics screen
8. Admin: gym settings screen
9. Admin: super admin gym subscription management (`/super` route)
10. Verify: gym owner can manage members and create announcements visible in app

### Step 8 — Phase 6: Engagement
1. Backend: badge detection logic (check triggers on workout save)
2. Backend: push notification sending function (used by all notification triggers)
3. Backend: all background cron jobs (Section 13)
4. Mobile: push notification registration flow
5. Mobile: notifications screen (list, mark read)
6. Mobile: badge display on profile screen
7. Mobile: home screen widgets (iOS and Android)
8. Mobile: live activity lock screen widget
9. Verify: rest timer fires notification, badge unlocks after first workout, weekly report generates

### Step 9 — Phase 7: AI Trainer
1. Backend: trainer template data file (`backend/data/trainer-templates.js`)
2. Backend: program creation endpoint (decision matrix + template selection)
3. Backend: progression engine (runs on workout save if program active)
4. Backend: next session prescription endpoint
5. Backend: override feedback endpoint + learning logic
6. Backend: trainer progress report endpoint
7. Mobile: trainer onboarding questionnaire screen
8. Mobile: trainer dashboard screen
9. Mobile: next session view (prescribes weights + reps)
10. Verify: beginner program generates correct sessions, weights increment after successful sets

### Step 10 — QA, Performance & Submission Prep
1. Add missing DB indexes if any slow queries identified
2. Load test leaderboard computation with 200+ member dataset
3. Verify all RLS policies prevent cross-gym data access
4. Verify subscription enforcement (trial expiry, grace period, read-only mode)
5. Complete app store asset creation (icons, screenshots, splash screens)
6. Publish privacy policy at ironpath.app/privacy
7. Write App Store description and metadata
8. Submit to Apple TestFlight for internal testing
9. Submit to Google Play internal testing track
10. Fix any App Store review rejection issues
11. Submit for public release

---

*End of Technical Specification v2.0*
*All 75 gaps from v1 review have been addressed.*
