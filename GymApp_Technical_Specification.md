# Gym Tracking App — Full Technical Specification

**Version:** 1.0  
**Date:** April 2026  
**Built by:** Claude Code  
**Business Model:** B2B SaaS — sold to gyms, used by their members

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [Phase 1 — Foundation & Auth](#5-phase-1--foundation--auth)
6. [Phase 2 — Workout Engine](#6-phase-2--workout-engine)
7. [Phase 3 — Progress & Analytics](#7-phase-3--progress--analytics)
8. [Phase 4 — Leaderboards & Social](#8-phase-4--leaderboards--social)
9. [Phase 5 — Gym Admin Panel (Web)](#9-phase-5--gym-admin-panel-web)
10. [Phase 6 — In-App Engagement](#10-phase-6--in-app-engagement)
11. [Phase 7 — AI Trainer (Algorithmic)](#11-phase-7--ai-trainer-algorithmic)
12. [API Endpoints](#12-api-endpoints)
13. [File Storage Structure](#13-file-storage-structure)
14. [Security & Privacy](#14-security--privacy)
15. [Monetization](#15-monetization)
16. [Build Order & Dependencies](#16-build-order--dependencies)

---

## 1. Product Overview

A full-featured gym workout tracking mobile app (iOS + Android) sold as a monthly SaaS subscription to gyms. The gym is the paying customer. Their members are the end users. Each gym has its own isolated community — members track workouts, compete on leaderboards, and follow each other's progress within their gym.

### Core Value Proposition
- Members get a world-class workout tracker tied to their real gym community
- Gyms get a retention and engagement tool with an admin dashboard
- Leaderboards create healthy competition between real people who train together

### Key Differentiators from Hevy
- Gym-scoped leaderboards (compete with people you actually know)
- Gym owner admin panel with member management and analytics
- Designed to be white-labeled and sold per gym
- Future: cross-gym leaderboards between competing gyms

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Mobile App | React Native (Expo SDK 51+) | iOS + Android from single codebase |
| Backend API | Node.js + Express.js | REST API server |
| Database | PostgreSQL (via Supabase) | Primary relational database |
| Auth | Supabase Auth | JWT-based authentication |
| File Storage | Supabase Storage | Photos, videos, exercise images |
| Admin Panel | React.js (Vite) | Web-only gym owner dashboard |
| Backend Hosting | Railway | Node.js API deployment |
| Exercise Data | WGER (self-hosted import) | Exercise library, muscle diagrams |
| Push Notifications | Expo Push Notifications | iOS + Android notifications |
| State Management | Zustand | Mobile app global state |
| Navigation | Expo Router (file-based) | Mobile app navigation |
| Charts | Victory Native | Progress charts and graphs |
| Styling (mobile) | NativeWind (Tailwind for RN) | Mobile UI styling |
| Styling (web) | Tailwind CSS | Admin panel styling |

### Version Control
- Single monorepo structure:
```
/
├── mobile/          # React Native Expo app
├── backend/         # Node.js Express API
├── admin/           # React.js admin panel
└── shared/          # Shared types and utilities
```

---

## 3. System Architecture

### High-Level Architecture

```
[Mobile App (iOS/Android)]
        |
        | HTTPS REST API calls
        v
[Node.js + Express Backend (Railway)]
        |
        |---> [PostgreSQL Database (Supabase)]
        |---> [Supabase Storage (files)]
        |---> [Supabase Auth (JWT)]
        |---> [Expo Push Notifications]

[React Admin Panel (Web)]
        |
        | HTTPS REST API calls (admin-scoped endpoints)
        v
[Same Backend]
```

### Multi-Tenancy Model
- Every piece of data is scoped to a `gym_id`
- A user belongs to exactly one gym (enforced at DB level)
- Gym owners see only their gym's data in the admin panel
- Leaderboards are gym-scoped by default
- Row-level security (RLS) enforced in Supabase for all tables

### Auth Flow
1. Gym owner registers via admin panel → creates gym + owner account
2. Gym gets a unique `invite_code` (6-character alphanumeric)
3. Member downloads app → enters invite code → registers → linked to gym
4. All API requests carry JWT token → backend validates + extracts `user_id` and `gym_id`

---

## 4. Database Schema

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
  subscription_status VARCHAR(50) DEFAULT 'trial',
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  role VARCHAR(20) DEFAULT 'member', -- 'member' | 'gym_owner' | 'super_admin'
  sex VARCHAR(10), -- 'male' | 'female'
  date_of_birth DATE,
  bodyweight DECIMAL(5,2),
  is_profile_private BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### exercises
```sql
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id), -- NULL = global (from WGER), NOT NULL = gym custom
  created_by UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  image_url TEXT,
  animation_url TEXT,
  equipment VARCHAR(100), -- 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'resistance_band' | 'kettlebell' | 'other'
  primary_muscles TEXT[], -- array of muscle names
  secondary_muscles TEXT[],
  logging_type VARCHAR(20) DEFAULT 'weight_reps', -- 'weight_reps' | 'bodyweight_reps' | 'duration' | 'distance'
  is_custom BOOLEAN DEFAULT false,
  wger_id INTEGER, -- reference to original WGER exercise
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### routines
```sql
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  folder_id UUID REFERENCES routine_folders(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_gym_template BOOLEAN DEFAULT false, -- gym owner created templates
  source_routine_id UUID REFERENCES routines(id), -- if copied from another
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### routine_folders
```sql
CREATE TABLE routine_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### routine_exercises
```sql
CREATE TABLE routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID REFERENCES routines(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  position INTEGER NOT NULL,
  superset_group INTEGER, -- NULL = not in superset, same number = same superset
  rest_seconds INTEGER DEFAULT 90,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### routine_sets
```sql
CREATE TABLE routine_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_exercise_id UUID REFERENCES routine_exercises(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  set_type VARCHAR(20) DEFAULT 'normal', -- 'normal' | 'warmup' | 'dropset' | 'failure'
  target_weight DECIMAL(7,2),
  target_reps INTEGER,
  target_reps_min INTEGER,
  target_reps_max INTEGER,
  target_duration_seconds INTEGER,
  target_distance_meters DECIMAL(8,2)
);
```

### workouts
```sql
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  routine_id UUID REFERENCES routines(id), -- NULL if empty workout
  name VARCHAR(255) NOT NULL,
  description TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  total_volume DECIMAL(12,2) DEFAULT 0,
  total_sets INTEGER DEFAULT 0,
  visibility VARCHAR(20) DEFAULT 'gym', -- 'public' | 'gym' | 'private'
  is_completed BOOLEAN DEFAULT false,
  ordinal_number INTEGER, -- "your 47th workout"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### workout_exercises
```sql
CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  position INTEGER NOT NULL,
  superset_group INTEGER,
  rest_seconds INTEGER DEFAULT 90,
  notes TEXT
);
```

### workout_sets
```sql
CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID REFERENCES workout_exercises(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  set_type VARCHAR(20) DEFAULT 'normal', -- 'normal' | 'warmup' | 'dropset' | 'failure'
  weight DECIMAL(7,2),
  reps INTEGER,
  duration_seconds INTEGER,
  distance_meters DECIMAL(8,2),
  rpe DECIMAL(3,1), -- 6.0 to 10.0
  is_completed BOOLEAN DEFAULT false,
  is_warmup_counted BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ
);
```

### personal_records
```sql
CREATE TABLE personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  workout_id UUID REFERENCES workouts(id) NOT NULL,
  workout_set_id UUID REFERENCES workout_sets(id) NOT NULL,
  record_type VARCHAR(30) NOT NULL, -- 'heaviest_weight' | '1rm' | 'best_volume_set' | 'best_volume_session' | 'most_reps' | '3rm' | '5rm' | '10rm'
  value DECIMAL(12,2) NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### body_measurements
```sql
CREATE TABLE body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL,
  bodyweight DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,1),
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
```

### measurement_photos
```sql
CREATE TABLE measurement_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID REFERENCES body_measurements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### workout_media
```sql
CREATE TABLE workout_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  media_type VARCHAR(10) NOT NULL, -- 'photo' | 'video'
  url TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### follows
```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES users(id) NOT NULL,
  following_id UUID REFERENCES users(id) NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- 'active' | 'pending' (for private profiles)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);
```

### workout_likes
```sql
CREATE TABLE workout_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workout_id, user_id)
);
```

### workout_comments
```sql
CREATE TABLE workout_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### gym_announcements
```sql
CREATE TABLE gym_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'like' | 'comment' | 'follow' | 'pr' | 'announcement' | 'leaderboard'
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSONB, -- extra payload (workout_id, user_id etc.)
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### user_push_tokens
```sql
CREATE TABLE user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  token TEXT NOT NULL,
  platform VARCHAR(10) NOT NULL, -- 'ios' | 'android'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);
```

### streaks
```sql
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  current_streak_weeks INTEGER DEFAULT 0,
  longest_streak_weeks INTEGER DEFAULT 0,
  last_workout_week DATE, -- ISO week start date
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### leaderboard_snapshots
```sql
CREATE TABLE leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  exercise_id UUID REFERENCES exercises(id),
  category VARCHAR(50) NOT NULL, -- 'heaviest_lift' | 'most_volume_week' | 'most_volume_month' | 'most_workouts_week' | 'most_workouts_month' | 'longest_streak'
  period VARCHAR(20) NOT NULL, -- 'all_time' | 'weekly' | 'monthly'
  period_start DATE,
  period_end DATE,
  rankings JSONB NOT NULL, -- [{user_id, value, rank, username, avatar_url}]
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ai_trainer_programs
```sql
CREATE TABLE ai_trainer_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  goal VARCHAR(50) NOT NULL, -- 'strength' | 'hypertrophy' | 'endurance' | 'general_fitness'
  experience_level VARCHAR(20) NOT NULL, -- 'beginner' | 'intermediate' | 'advanced'
  days_per_week INTEGER NOT NULL,
  equipment_available TEXT[],
  is_active BOOLEAN DEFAULT true,
  current_week INTEGER DEFAULT 1,
  progression_data JSONB, -- stores per-exercise progression state
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### pre_built_routines
```sql
CREATE TABLE pre_built_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'gym' | 'home' | 'dumbbells' | 'bodyweight' | 'cardio_hiit' | 'resistance_band' | 'travel' | 'suspension'
  level VARCHAR(20) NOT NULL, -- 'beginner' | 'intermediate' | 'advanced'
  goal VARCHAR(50), -- 'strength' | 'hypertrophy' | 'endurance' | 'weight_loss'
  equipment_required TEXT[],
  days_per_week INTEGER,
  program_data JSONB NOT NULL, -- full routine structure
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Phase 1 — Foundation & Auth

### 5.1 Gym Owner Registration (Admin Panel)
- Gym owner visits admin web panel
- Fills in: gym name, location, description, uploads logo
- Creates owner account: full name, email, password
- System generates unique 6-character `invite_code` (e.g., `GYM4X2`)
- Gym record created in DB with `subscription_status: 'trial'`
- Owner receives welcome email with invite code to share with members

### 5.2 Member Registration (Mobile App)
- Member downloads app
- Onboarding screen: "Join your gym" → enter invite code
- If invite code valid → gym name shown → "Join [Gym Name]"
- Member fills in: full name, username, email, password, sex, date of birth
- Account created and linked to gym via `gym_id`
- Redirected to home feed

### 5.3 Login
- Email + password login
- JWT token returned by Supabase Auth
- Token stored securely in device (Expo SecureStore)
- Token sent as `Authorization: Bearer <token>` header on all API calls
- Auto-refresh on token expiry

### 5.4 Password Reset
- "Forgot password" → email input → Supabase sends reset email → deep link back to app → new password screen

### 5.5 Profile Setup (Post-Registration)
- Upload avatar photo
- Add bio
- Set bodyweight (used in bodyweight exercise calculations)
- Privacy setting (public / private profile)

### 5.6 Gym Invite Code Management
- Gym owner can regenerate invite code from admin panel (old code becomes invalid)
- Invite code can also be shared via direct email invite from admin panel (sends email with code + app download link)

---

## 6. Phase 2 — Workout Engine

### 6.1 Exercise Library

#### WGER Data Import
- On first backend startup, run a one-time import script
- Fetch all exercises from WGER REST API: `https://wger.de/api/v2/exercise/`
- Import: name, description, muscles, equipment, images
- Store in `exercises` table with `is_custom: false`, `gym_id: null`
- Muscle diagram SVGs imported from WGER and stored in Supabase Storage
- After import, app is fully self-contained (no ongoing WGER dependency)

#### Exercise Search & Filter (Mobile)
- Search bar with real-time filtering by name
- Filter chips: Equipment (All / Barbell / Dumbbell / Machine / Cable / Bodyweight / Resistance Band / Kettlebell)
- Filter chips: Muscle Group (All / Chest / Back / Shoulders / Arms / Core / Legs / Glutes / Cardio)
- Each exercise card shows: name, primary muscle, equipment icon, animation/image
- Tap exercise to open detail screen: full description, instructions, muscle diagram, logging history

#### Custom Exercises
- Gym members can create custom exercises
- Fields: name, equipment, primary muscles, secondary muscles, logging type, optional image upload
- Custom exercises visible only within the creating user's gym
- Gym owner can create gym-wide custom exercises visible to all members

### 6.2 Routines

#### Routine Management
- **My Routines** screen: list of user's routines grouped by folders
- Create routine: tap + → name routine → add exercises → configure sets
- Routine folders: create folders (e.g., "Push Day", "Pull Day"), drag routines into folders
- Duplicate routine: long press → duplicate → opens as new editable routine
- Delete routine: long press → delete (with confirmation)
- Reorder exercises within routine: drag handle
- Reorder routines within folder: drag handle

#### Routine Configuration Per Exercise
- Exercise name + muscle group displayed
- Rest timer (seconds) — per exercise, overrides global default
- Notes field (supports plain text + URLs rendered as clickable links)
- Add sets: tap "+ Add Set"
- Delete sets: swipe left on set row
- Set row fields: set number, set type badge, target weight, target reps (or rep range min-max, or duration)
- Set types: Normal (default) / Warm-up (W) / Drop Set (D) / Failure (F)

#### Supersets
- Long press an exercise → "Add to Superset" → select partner exercise
- Supersets visually grouped with colored bracket in UI
- Supports 2+ exercises in one superset
- During workout, smart scrolling auto-advances to next superset exercise on set completion

#### Warm-Up Calculator
- Accessible per exercise within routine builder
- User inputs working weight → calculator generates warm-up progression
- Default protocol: 40% × 10, 60% × 5, 80% × 3, 90% × 1 (configurable)
- Auto-rounds to nearest plate/dumbbell increment (configurable: 2.5kg, 5kg)
- Injects warm-up sets into routine automatically

#### Pre-Built Routine Library
- **Explore** tab in Workout section
- 26 programs across 8 categories:
  - At Home, Travel, Dumbbells Only, Resistance Band, Cardio & HIIT, Gym, Bodyweight, Suspension Band
- Filter by: Level (Beginner / Intermediate / Advanced), Goal (Strength / Hypertrophy / Endurance / Weight Loss), Equipment
- Tap program → preview all routines in the program → "Save Program" (saves as folder) or save individual routines
- All variables editable after saving

### 6.3 Starting a Workout

#### Start Options
1. **Start from Routine** — tap routine card → "Start Workout" → loads routine template
2. **Start Empty Workout** — tap + → "Empty Workout" → blank canvas
3. **Copy Past Workout** — from workout history → "Repeat Workout" → loads as new session

#### Active Workout Screen
- Workout name at top (editable inline)
- Live stopwatch (elapsed time from workout start)
- Exercise list scrollable vertically
- Each exercise shows:
  - Exercise name + muscle badge
  - Notes (expandable, clickable links)
  - Previous performance row (last logged values for this exercise)
  - Set rows

#### Set Logging
- Set row columns: set number | set type | previous value | weight | reps | ✓ (complete)
- For duration-based: set number | set type | previous value | duration | ✓
- For bodyweight: set number | set type | previous value | (+weight) | reps | ✓
- For distance: set number | set type | previous value | distance | duration | ✓
- Tapping weight or reps opens numeric keypad
- Auto-fills with previous value (configurable: last overall or last within this routine)
- RPE column (optional, toggled in settings): appears after reps column
- Marking set complete (✓): triggers rest timer automatically

#### Rest Timer
- Full-screen overlay when rest timer active
- Shows countdown in large format
- ± 15 second adjustment buttons
- Skip button
- Sound alert when complete (configurable)
- Haptic feedback on completion

#### Inline Timer (Timed Sets)
- Per-set countdown for duration-based exercises
- Start/pause per individual set
- Auto-completes set when timer hits 0

#### Plate Calculator
- Accessible via toolbar button during workout
- Input: target weight, bar weight (configurable: 20kg / 15kg / 10kg)
- Output: plate combination per side (visualized as bar diagram)
- Auto-rounds to available plate denominations

#### Adding Exercises Mid-Workout
- Scroll to bottom → "Add Exercise" button
- Opens exercise search/filter (same as library)
- Selected exercise appended to bottom of workout

#### Superset Scrolling
- When set marked complete → if next exercise is in same superset → auto-scroll to that exercise
- Configurable in settings

### 6.4 Finishing a Workout

#### Finish Screen
- Tap "Finish Workout" button
- Editable workout name
- Editable start time and duration (for back-logging)
- Summary: total volume, total sets, exercise count
- Media upload: up to 2 photos + 1 video (tap to add from camera or gallery)
- Description/notes field (supports @username tagging → shows suggestions)
- Visibility toggle: Public (all gym members) / Followers Only / Private
- "Save Workout" button

#### Post-Save Summary Screen
- Ordinal workout number ("Your 47th workout! 🎉")
- Active streak badge ("🔥 6 weeks in a row")
- PRs from session highlighted (exercise name + new record)
- Stats: duration, exercises, sets, total volume
- Muscle diagram colored by muscles trained in session
- Fun volume comparison (e.g., "You lifted the equivalent of 2 cars today!")
- Shareable graphic: workout summary card with gym branding, background options (transparent / light / dark)

---

## 7. Phase 3 — Progress & Analytics

### 7.1 Statistics Dashboard

Accessible via Profile → Statistics tab.

#### Overview Cards
- Total workouts (all time)
- Total volume lifted (all time)
- Total time trained (all time)
- Total sets completed (all time)

#### Last 7 Days Body Graph
- Horizontal timeline of last 7 days
- Each day shows muscle groups trained (colored body silhouette or muscle icons)
- Tap a day to jump to that workout

#### Set Count Per Muscle Group
- Bar chart: sets per muscle group
- Time filter: 30 days / 3 months / 1 year / All-time
- Muscles ranked by volume

#### Muscle Distribution
- Pie chart and bar chart views (toggle)
- Colored body diagram view (muscles colored by relative volume intensity)

#### Main Exercises Overview
- Most frequently logged exercises
- Volume trend per exercise over time

### 7.2 Exercise-Level Performance

Accessible via Profile → Exercises tab.

- Searchable list of all exercises the user has logged
- Tap any exercise → exercise stats screen

#### Exercise Stats Screen
- **Heaviest weight lifted** (all time)
- **True 1RM** (best single rep at max weight)
- **Projected 1RM** (calculated via Epley formula: `weight × (1 + reps/30)`)
- **Best set volume** (weight × reps, single set)
- **Best session volume** (total volume across all sets in one workout)
- **Most reps in a single set**
- **Rep-based records**: 3RM, 5RM, 10RM (best weight at each rep count)
- **Strength Level**: Beginner / Intermediate / Advanced / Elite
  - Calculated by comparing user's 1RM against standardized tables benchmarked by sex, bodyweight, and age
  - Tables sourced from established strength standards (Symmetric Strength methodology)
- **Performance chart**: line graph of 1RM progression over time (weight on Y, date on X)
- **Full history**: chronological list of every logged set → tap any entry to open originating workout
- **Share button**: generates shareable PR graphic with gym branding

### 7.3 Body Measurements

Accessible via Profile → Measures tab.

#### Logging an Entry
- Tap "+ New Entry"
- Date picker (defaults to today)
- Input fields (all optional):
  - Bodyweight (kg), Body fat %
  - Neck, Chest, Waist, Hips (cm)
  - Left/Right Arms, Forearms, Thighs, Calves (cm)
- Add progress photos (camera or gallery, multiple per entry)
- Notes field

#### Viewing Progress
- Each measurement has its own time-series line graph
- Tap any data point → see that entry's values
- Photo gallery: chronological grid of all progress photos
- Edit/delete entries retroactively

#### Bodyweight Sync
- When logging a bodyweight exercise during workout, option to update bodyweight measurement from that value

### 7.4 Calendar View

Accessible via Profile → Calendar tab.

- Monthly calendar grid
- Workout days highlighted with gym accent color
- Tap a day → opens that day's workout(s)
- Days with multiple workouts → shows list
- "+ Back-log workout" button on any past date → opens finish workout screen with custom date
- Active streak indicator at top
- Swipe left/right to navigate months
- Zoom gestures to switch between month and week view

### 7.5 Monthly Report

Auto-generated on the 1st of each month for the previous month.

#### Report Template Sections (auto-filled from DB queries)

1. **Header**: Month name, year, gym logo
2. **Training Overview**:
   - Total workouts this month vs last month (+ % change arrow)
   - Total volume this month vs last month
   - Total sets this month vs last month
   - Total time trained
3. **Consistency**:
   - Training days count
   - Weeks with ≥1 workout
   - Active streak at end of month
   - Calendar heatmap of training days
4. **Personal Records**:
   - List of all PRs achieved this month
   - Exercise name, record type, value, date
   - Tap PR → opens originating workout
5. **Muscle Distribution**:
   - Pie chart of volume by muscle group for the month
   - Compared to previous month
6. **Top Exercises**:
   - 5 most-logged exercises this month
   - Volume trend for each
7. **Footer**: "Keep going! See you next month 💪" + share button

Report is stored and accessible from Profile → Reports history.

### 7.6 Year in Review

Generated in January for the prior year.

#### Sections
1. Total workouts, volume, training days, PRs set
2. Best month (most workouts)
3. Most-trained muscle group
4. Top 5 most-logged exercises
5. Biggest PR of the year (exercise + value)
6. Consistency: weeks trained out of 52
7. Shareable recap graphic with gym branding

---

## 8. Phase 4 — Leaderboards & Social

### 8.1 Leaderboards

#### Leaderboard Categories
1. **Heaviest Lifts** — per exercise (38 key exercises predefined)
   - Ranked by all-time 1RM or heaviest weight lifted
   - Separate leaderboard per exercise
2. **Most Volume** — total weight lifted
   - Weekly (resets every Monday at 00:00)
   - Monthly (resets 1st of month at 00:00)
   - All-time (permanent)
3. **Most Workouts**
   - Weekly (resets Monday)
   - Monthly (resets 1st)
   - All-time (permanent)
4. **Longest Streak** — consecutive weeks with ≥1 workout (all-time)

#### Leaderboard UI
- Tab navigation: Lifts / Volume / Workouts / Streak
- Sub-tabs: Weekly / Monthly / All-Time (where applicable)
- For Lifts tab: exercise picker dropdown (38 predefined exercises)
- Each row: rank badge | avatar | username | value | → tap to view profile or originating workout
- User's own row highlighted and pinned (always visible even if outside top 10)
- Top 3 highlighted with gold/silver/bronze styling
- Leaderboard data refreshed every 15 minutes (cached)
- Reset timestamp shown ("Resets in 3 days 14 hours")

#### Predefined Leaderboard Exercises (38)
Squat, Bench Press, Deadlift, Overhead Press, Barbell Row, Pull-Up, Chin-Up, Dip, Romanian Deadlift, Leg Press, Incline Bench Press, Decline Bench Press, Dumbbell Bench Press, Dumbbell Shoulder Press, Lateral Raise, Cable Row, Lat Pulldown, Face Pull, Bicep Curl, Hammer Curl, Tricep Pushdown, Skull Crusher, Leg Curl, Leg Extension, Hip Thrust, Bulgarian Split Squat, Lunges, Calf Raise, Front Squat, Sumo Deadlift, Trap Bar Deadlift, Close Grip Bench Press, Preacher Curl, Incline Dumbbell Curl, Cable Fly, Pec Deck, Seated Row, Arnold Press

### 8.2 Gym Social Feed

#### Home Feed
- Chronological list of workouts from gym members (all gym members by default, filter to following only)
- Feed card shows:
  - Avatar + username + time ago
  - Workout name
  - Description (truncated, expandable)
  - Stats bar: duration | volume | sets | PR count
  - Media: photo/video swipeable carousel (inline)
  - Like button (count) + Comment button (count)
- Pull to refresh
- Infinite scroll pagination

#### Discover Feed
- All gym members' workouts (not filtered to following)
- Same card format as Home Feed
- "Follow" button visible on cards from users you don't follow

#### Workout Detail Screen
- Full workout details: name, description, date, duration, volume
- Full exercise list with all sets and weights
- Muscle diagram for session
- Media gallery
- PR badges for any records set in this workout
- Likes list (tap to see who liked)
- Comments section (full thread)
- "Copy Workout" button → starts new workout pre-loaded with this template

#### Likes & Comments
- Like: single tap like button → instant optimistic update
- Comment: text input → supports @username mentions (autocomplete from gym members)
- Comment shows: avatar, username, text, time ago
- Delete own comment: long press
- Push notification to workout owner on like and comment

### 8.3 User Profiles

#### Profile Screen
- Avatar, full name, username, bio
- Stats row: workouts | following | followers
- Week-by-week activity graph (52-week grid, GitHub-style)
- Strength levels for key lifts (Bench, Squat, Deadlift)
- Recent workouts list (last 10, tap to open)
- Photo/video gallery (all media uploaded, linked to workouts)
- Follow / Following / Requested button
- Compare button (see 8.4)

#### Privacy
- Private profiles: shows locked icon, follow request required
- Private users: feed, workout details, and stats hidden until approved
- Gym owners are always visible to all members (for announcements)

### 8.4 Performance Comparison

Accessible via any member's profile → "Compare" button.

Side-by-side view:
- Total workouts
- Total time trained
- Total volume
- Volume distribution by muscle group (overlaid bar chart)
- Exercises in common (listed)
- Head-to-head on shared exercises (1RM comparison)

---

## 9. Phase 5 — Gym Admin Panel (Web)

React.js web application. Accessible at `[app-domain]/admin`. Gym owner logs in with owner credentials.

### 9.1 Dashboard (Home)

Overview cards:
- Total active members
- New members this month
- Total workouts logged this month
- Gym-wide volume this month
- Most active member (this week)

Charts:
- Member activity trend (line chart: workouts per day, last 30 days)
- Top 10 most active members (bar chart)
- Muscle group distribution across all members (pie chart)

### 9.2 Member Management

- Table: avatar | name | username | email | join date | last active | workouts | status
- Search and filter members
- Actions per member:
  - View profile (opens read-only member stats)
  - Send direct message (push notification + in-app inbox)
  - Suspend member (blocks login, keeps data)
  - Remove member (removes from gym, anonymizes data)
- Inactive member filter: "Members not logged in for 30+ days"
- Export member list (CSV)

### 9.3 Invite Management

- Display current invite code with copy button
- Generate new invite code (invalidates old)
- Direct email invite: enter email address → sends invite email with code + app download link
- Invite history: list of sent email invites + status (pending / joined)

### 9.4 Announcements

- Create announcement: title + content (rich text) + optional pin
- Pinned announcements appear at top of member feed
- Announcement history (edit/delete)
- Broadcast notification: send push notification to all members alongside announcement

### 9.5 Gym-Wide Routines

- Create routines from admin panel using same exercise library
- Mark routine as "Gym Template" → visible to all members in Explore tab
- Edit/delete gym templates
- Usage stats: how many members saved each template

### 9.6 Leaderboard Management

- View all leaderboard categories
- Feature/pin specific leaderboard categories in member app
- Create custom leaderboard challenges:
  - Challenge name, description, metric (volume / workouts / specific exercise)
  - Time period (custom start/end dates)
  - Visible to all members with countdown timer
  - Results auto-calculated at end date

### 9.7 Analytics

- Member retention: weekly active users trend
- Churn risk: members with declining activity
- Most popular exercises across gym
- Peak training hours (heatmap by hour of day)
- Month-over-month growth

### 9.8 Gym Settings

- Gym name, logo, location, description (editable)
- Accent color picker (used in app branding for this gym)
- Subscription status and billing (managed externally for now — manual)
- Owner account settings (name, email, password change)

---

## 10. Phase 6 — In-App Engagement

### 10.1 Streaks

- Streak = consecutive calendar weeks with ≥1 completed workout
- Calculated and updated on each workout save
- Current streak displayed on:
  - Profile screen (prominent badge)
  - Post-workout summary screen
  - Calendar tab header
- Longest streak tracked separately (all-time record)
- Streak loss: if a week passes with no workout → streak resets to 0
- Milestone notifications: "🔥 4 weeks streak! Keep it up!"

### 10.2 Achievement Badges

Badge system displayed on user profile. Badges awarded automatically on trigger:

| Badge | Trigger |
|-------|---------|
| First Rep | Complete first workout |
| Ten Strong | Complete 10 workouts |
| Century | Complete 100 workouts |
| Half Century | Complete 50 workouts |
| Iron Month | 4 weeks streak |
| Iron Quarter | 12 weeks streak |
| PR Machine | Set 10 PRs total |
| Heavy Lifter | Log 10,000 kg total volume |
| Consistent | Train 4+ days in one week |
| Early Bird | Log a workout before 7am |
| Night Owl | Log a workout after 10pm |
| Gym Legend | Rank #1 on any leaderboard |

- Badge unlocks trigger push notification + in-app celebration animation
- Badges displayed as icon grid on profile screen

### 10.3 Post-Workout Summary

- Ordinal number: computed from user's total completed workouts
- PRs detected by comparing against `personal_records` table → list displayed
- Muscle diagram: muscles activated, colored by intensity (green → yellow → red)
- Volume comparison: select random fun comparisons (car = 1500kg, elephant = 5000kg, etc.)
- Shareable graphic: generates image card with:
  - Gym logo + name
  - User's name
  - Workout stats
  - PR highlights
  - Background theme (transparent / light / dark)
  - Export as image to camera roll

### 10.4 Push Notifications

All notifications use Expo Push Notifications service.

| Trigger | Notification |
|---------|-------------|
| Rest timer complete | "Rest complete! Time to lift 💪" |
| PR achieved | "New PR! You just hit X kg on [Exercise]! 🏆" |
| Someone likes workout | "[Username] liked your workout" |
| Someone comments | "[Username] commented: [preview]" |
| New follower | "[Username] is now following you" |
| Gym announcement | "[Gym Name]: [Announcement title]" |
| Weekly nudge (no workout) | "You haven't trained this week yet — let's fix that 🔥" |
| Streak milestone | "🔥 [N] weeks in a row! You're on fire!" |
| Badge unlocked | "🏅 New badge: [Badge name]!" |
| Leaderboard moved | "You moved up to #[rank] on [Leaderboard]!" |

Notification settings: user can toggle each category on/off in app settings.

### 10.5 Home Screen Widgets (iOS & Android)

Built using Expo Widgets (react-native-widgets or equivalent).

| Widget | Size | Content |
|--------|------|---------|
| Calendar | Small | Last 7 days activity dots + streak |
| Calendar + Stats | Medium | 7-day calendar + weekly volume + workouts |
| Routine of the Day | Medium | Today's scheduled routine + "Start" tap |
| Weekly Streak | Small | Streak number + training days this week |
| Weekly Volume | Small | Volume this week + progress ring |
| Quick Start | Small | Tap → opens app to routine picker |
| Saved Routines | Medium | List of 3 saved routines, tap to start |

All widgets: tap → opens relevant screen in app.

### 10.6 Live Activity (Lock Screen / Notification Shade)

Active during workout sessions.

Displays:
- Current exercise name
- Next set: weight + reps prescribed
- Elapsed workout time
- Rest timer countdown (when active)

Actions (without opening app):
- Mark current set as complete
- Adjust rest timer (±15 seconds)
- Skip rest

iOS: uses ActivityKit / Dynamic Island
Android: uses Expo Notification with persistent notification + progress bar

---

## 11. Phase 7 — AI Trainer (Algorithmic)

Pure logic, no external API. Progressive overload engine.

### 11.1 Program Creation Flow

User answers onboarding questionnaire:
1. **Goal**: Strength / Hypertrophy / General Fitness / Endurance
2. **Experience Level**: Beginner (< 1 year) / Intermediate (1–3 years) / Advanced (3+ years)
3. **Days per week**: 2 / 3 / 4 / 5 / 6
4. **Equipment**: Full Gym / Dumbbells Only / Bodyweight Only / Home + Some Equipment

System selects program template from internal library based on these inputs:
- Beginner + Strength + 3 days → Starting Strength style (SL 5x5)
- Intermediate + Hypertrophy + 4 days → Upper/Lower split
- Advanced + Strength + 5 days → 5/3/1 style
- Etc. (full decision matrix defined in code)

### 11.2 Progressive Overload Logic

Per exercise, per session, the system applies these rules:

#### Beginner Protocol (Linear Progression)
- If user completes all prescribed reps across all sets → increase weight by:
  - Upper body: +2.5kg next session
  - Lower body: +5kg next session
- If user fails to complete reps on 1 set → keep same weight
- If user fails 2+ sessions in a row → deload (reduce weight by 10%)

#### Intermediate Protocol (Wave Loading)
- 3-week wave: Week 1 (5×5), Week 2 (4×4 +weight), Week 3 (3×3 +weight)
- Week 4: deload at 60% → restart wave with new base
- Weight increase per wave: upper +2.5kg, lower +5kg

#### Advanced Protocol (Periodization)
- Rotating intensity blocks: Accumulation (volume) → Intensification (heavy) → Realization (peak)
- Each block: 3 weeks + 1 deload week
- Auto-adjusts based on RPE if RPE tracking enabled

### 11.3 Performance Tracking

After each workout, system:
1. Reads completed sets vs prescribed sets
2. Calculates completion rate per exercise
3. Updates `progression_data` in `ai_trainer_programs` table
4. Determines next session's weights and reps
5. Updates the routine's target weights for next session

### 11.4 Trainer Dashboard (In-App)

Visible in Workout tab when AI Trainer program is active:

- Current program name + week number
- Next session: exercises, sets, prescribed weights
- Progress report:
  - Exercises trending up (green arrow)
  - Exercises stalled (yellow)
  - Exercises deloaded (red)
- Tips card: rotating evidence-based training tips
- Deload indicator: shows when deload week is coming

### 11.5 Program Adjustment

User can manually override any weight suggestion. System learns:
- If user consistently overrides upward → recalibrate progression rate up
- If user consistently overrides downward → recalibrate down

User can pause program (keeps state), resume, or reset and start new program.

---

## 12. API Endpoints

### Authentication
```
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/forgot-password
POST /auth/reset-password
```

### Gyms
```
POST   /gyms                          # Create gym (owner registration)
GET    /gyms/:id                      # Get gym details
PATCH  /gyms/:id                      # Update gym (owner only)
GET    /gyms/validate-invite/:code    # Validate invite code
POST   /gyms/:id/regenerate-invite    # New invite code (owner only)
POST   /gyms/:id/invite-email         # Send email invite (owner only)
```

### Users
```
GET    /users/me                      # Current user profile
PATCH  /users/me                      # Update profile
GET    /users/:id                     # Get user profile
GET    /users/:id/workouts            # User's public workouts
GET    /users/:id/stats               # User's public stats
POST   /users/:id/follow              # Follow user
DELETE /users/:id/follow              # Unfollow user
GET    /users/:id/followers           # Followers list
GET    /users/:id/following           # Following list
GET    /users/compare/:id             # Compare with user
```

### Exercises
```
GET    /exercises                     # List/search exercises
GET    /exercises/:id                 # Exercise details
POST   /exercises                     # Create custom exercise
PATCH  /exercises/:id                 # Update custom exercise
DELETE /exercises/:id                 # Delete custom exercise
```

### Routines
```
GET    /routines                      # User's routines
POST   /routines                      # Create routine
GET    /routines/:id                  # Get routine
PATCH  /routines/:id                  # Update routine
DELETE /routines/:id                  # Delete routine
POST   /routines/:id/duplicate        # Duplicate routine
GET    /routines/pre-built            # Pre-built library
POST   /routines/pre-built/:id/save  # Save pre-built routine
GET    /routine-folders               # User's folders
POST   /routine-folders               # Create folder
PATCH  /routine-folders/:id           # Update folder
DELETE /routine-folders/:id           # Delete folder
```

### Workouts
```
POST   /workouts                      # Start/save workout
GET    /workouts/:id                  # Get workout details
PATCH  /workouts/:id                  # Update workout
DELETE /workouts/:id                  # Delete workout
GET    /workouts/history              # User's workout history (paginated)
POST   /workouts/:id/media            # Upload media
DELETE /workouts/:id/media/:mediaId   # Delete media
```

### Feed
```
GET    /feed/home                     # Home feed (paginated)
GET    /feed/discover                 # Discover feed (paginated)
POST   /workouts/:id/like             # Like workout
DELETE /workouts/:id/like             # Unlike workout
GET    /workouts/:id/likes            # Who liked
POST   /workouts/:id/comments         # Add comment
GET    /workouts/:id/comments         # Get comments
DELETE /workouts/:id/comments/:id     # Delete comment
```

### Leaderboards
```
GET    /leaderboards/lifts            # Lift leaderboards (by exercise)
GET    /leaderboards/volume           # Volume leaderboards
GET    /leaderboards/workouts         # Workout count leaderboards
GET    /leaderboards/streak           # Streak leaderboard
```

### Analytics
```
GET    /analytics/stats               # User stats dashboard data
GET    /analytics/exercises/:id       # Exercise performance data
GET    /analytics/calendar            # Calendar workout data
GET    /analytics/measurements        # Body measurements list
POST   /analytics/measurements        # Log measurement
PATCH  /analytics/measurements/:id    # Update measurement
DELETE /analytics/measurements/:id    # Delete measurement
GET    /analytics/reports/monthly     # Monthly reports list
GET    /analytics/reports/monthly/:id # Specific monthly report
GET    /analytics/reports/yearly      # Year in review
```

### Notifications
```
GET    /notifications                 # User's notifications (paginated)
PATCH  /notifications/:id/read        # Mark as read
POST   /notifications/read-all        # Mark all as read
POST   /push-tokens                   # Register push token
DELETE /push-tokens/:token            # Remove push token
```

### AI Trainer
```
GET    /trainer/program               # Current program
POST   /trainer/program               # Create program (onboarding)
PATCH  /trainer/program               # Update/pause/resume
DELETE /trainer/program               # Reset program
GET    /trainer/next-session          # Next session prescription
POST   /trainer/feedback              # Manual weight override
GET    /trainer/progress              # Trainer progress report
```

### Admin (Gym Owner Only)
```
GET    /admin/dashboard               # Dashboard stats
GET    /admin/members                 # Member list
GET    /admin/members/:id             # Member details
PATCH  /admin/members/:id/suspend     # Suspend member
DELETE /admin/members/:id             # Remove member
POST   /admin/message/:userId         # Send message to member
GET    /admin/announcements           # Announcements list
POST   /admin/announcements           # Create announcement
PATCH  /admin/announcements/:id       # Update announcement
DELETE /admin/announcements/:id       # Delete announcement
GET    /admin/analytics               # Advanced analytics
GET    /admin/routines                # Gym template routines
POST   /admin/routines                # Create gym template
POST   /admin/leaderboards/challenges # Create custom challenge
GET    /admin/leaderboards/challenges # List challenges
```

---

## 13. File Storage Structure

Supabase Storage buckets:

```
/avatars/
  {user_id}/avatar.jpg

/gym-assets/
  {gym_id}/logo.jpg
  {gym_id}/branding/

/workout-media/
  {gym_id}/{user_id}/{workout_id}/
    photo_1.jpg
    photo_2.jpg
    video_1.mp4

/exercise-assets/
  global/{exercise_id}/
    image.jpg
    animation.gif
  custom/{gym_id}/{exercise_id}/
    image.jpg

/progress-photos/
  {user_id}/{measurement_id}/
    photo_1.jpg
    photo_2.jpg

/shared-graphics/
  {user_id}/workout-shares/
    {workout_id}_share.png
```

File size limits:
- Photos: 10MB max
- Videos: 100MB max
- Avatars: 5MB max
- Exercise images: 5MB max

---

## 14. Security & Privacy

### Authentication
- JWT tokens via Supabase Auth
- Token expiry: 1 hour access token, 7 day refresh token
- All API endpoints require valid JWT (except `/auth/*` and `/gyms/validate-invite/*`)
- Role checked per endpoint: member / gym_owner / super_admin

### Row Level Security (RLS)
- All Supabase tables have RLS enabled
- Users can only read/write data within their `gym_id`
- Users can only write their own records (own workouts, measurements, etc.)
- Gym owners can read all member data within their gym
- Public workouts readable by all members in the gym

### Data Isolation
- `gym_id` is included in every query — no cross-gym data leakage possible
- Custom exercises scoped to gym
- Leaderboards scoped to gym

### Privacy Controls
- Private profiles: only followers can see workout details and stats
- Individual workout visibility: public / followers-only / private
- Gym owner can see aggregate analytics but not private workouts

### Input Validation
- All inputs validated and sanitized server-side
- SQL injection prevention via parameterized queries (Supabase client)
- File upload validation: type checking, size limits, virus scanning (Supabase built-in)
- Rate limiting on auth endpoints (5 attempts per 15 minutes)

---

## 15. Monetization

### Pricing Model (Per Gym, Monthly Subscription)

| Tier | Members | Price |
|------|---------|-------|
| Starter | Up to 50 members | $49/month |
| Growth | Up to 200 members | $99/month |
| Unlimited | Unlimited | $199/month |

- 30-day free trial for all new gyms (no credit card required at signup)
- Trial tracked via `subscription_status: 'trial'` and `subscription_expires_at`
- After trial expiry: app continues working but gym owner sees upgrade prompt in admin panel
- Member app shows "Your gym's trial has ended" banner linking to gym owner to upgrade
- Payment processing: integrated manually at launch (invoice/bank transfer), Stripe added when volume justifies it

### Subscription Enforcement
- Backend checks `subscription_status` and `subscription_expires_at` on each request
- Expired subscriptions: read-only mode (members can view history, cannot log new workouts)
- Grace period: 7 days after expiry before read-only mode kicks in

---

## 16. Build Order & Dependencies

Claude Code should build in this exact order to ensure each phase has the dependencies it needs:

### Step 1 — Project Setup
- Initialize monorepo structure
- Set up Expo React Native project
- Set up Node.js Express backend
- Set up React.js admin panel (Vite)
- Configure Supabase project (DB + Auth + Storage)
- Configure Railway deployment
- Set up environment variables

### Step 2 — Database
- Run all schema migrations in Supabase
- Enable Row Level Security on all tables
- Write RLS policies
- Seed WGER exercise data (import script)
- Seed pre-built routine library data

### Step 3 — Phase 1: Auth & Foundation
- Backend: auth middleware, gym creation, invite validation, user registration
- Mobile: onboarding flow, gym join, login/signup screens
- Admin: gym registration, owner login

### Step 4 — Phase 2: Workout Engine
- Backend: exercises CRUD, routines CRUD, workout CRUD, sets logic
- Mobile: exercise library screen, routine builder, active workout screen, finish screen
- PR detection logic (runs on workout save)

### Step 5 — Phase 3: Analytics
- Backend: stats queries, exercise performance queries, measurement CRUD, report generation
- Mobile: statistics dashboard, exercise stats screen, body measurements, calendar view, monthly report, year in review

### Step 6 — Phase 4: Leaderboards & Social
- Backend: leaderboard calculation + caching, feed queries, likes/comments, follow system
- Mobile: leaderboard screen, home feed, discover feed, workout detail, user profiles, compare screen

### Step 7 — Phase 5: Admin Panel
- Admin web: dashboard, member management, invite management, announcements, gym-wide routines, analytics, leaderboard challenges, gym settings

### Step 8 — Phase 6: Engagement
- Backend: notification service, streak calculation, badge system
- Mobile: post-workout summary, push notifications, widgets, live activity
- Shareable graphics generation

### Step 9 — Phase 7: AI Trainer
- Backend: program generation logic, progression engine, feedback loop
- Mobile: trainer onboarding questionnaire, trainer dashboard, next session view

### Step 10 — QA & Polish
- End-to-end testing of all flows
- Performance optimization (query indexes, caching)
- UI polish and animation refinement
- App Store + Play Store submission preparation

---

*End of Technical Specification v1.0*
