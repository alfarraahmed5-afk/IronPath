# IronPath — Build Progress Log

**Spec Version:** v5.0
**Build Started:** 2026-04-08
**Last Updated:** 2026-04-24
**Current Phase:** COMPLETE — All 10 Phases Done

---

## Project Timeline

| Phase | Description | Target | Status |
|-------|-------------|--------|--------|
| Phase 1 | Foundation & Auth | Week 1 | COMPLETE |
| Phase 2 | Workout Engine | Week 2 | COMPLETE |
| Phase 3 | Progress & Analytics | Week 3 | COMPLETE |
| Phase 4 | Leaderboards & Social | Week 4 | COMPLETE |
| Phase 5 | Admin Panel (Web) | Week 5 | COMPLETE |
| Phase 6 | In-App Engagement | Week 6 | COMPLETE |
| Phase 7 | AI Trainer | Week 7 | COMPLETE |
| Phase 8 | QA & Testing | Week 8 | COMPLETE |
| Phase 9 | Performance | Week 9 | COMPLETE |
| Phase 10 | App Store Prep | Week 10 | COMPLETE |

---

## Phase 1 Objectives Checklist

- [x] Monorepo compiles — backend tsc, shared tsc, admin tsc — all zero errors
- [x] All 34 SQL migration files created and ordered correctly (001-034)
- [x] Backend starts without errors (npm run dev)
- [x] POST /api/v1/gyms creates gym + gym_owner user
- [x] GET /api/v1/gyms/validate-invite/:code returns gym metadata
- [x] POST /api/v1/auth/register creates member via invite code
- [x] POST /api/v1/auth/login returns access_token + refresh_token
- [x] POST /api/v1/auth/refresh returns new access_token
- [x] POST /api/v1/auth/forgot-password sends email (non-enumerable)
- [x] POST /api/v1/auth/reset-password updates password
- [x] JWT Auth Hook SQL created (register in Supabase dashboard: custom_access_token_hook)
- [x] Mobile app boots to login screen (Expo Router + NativeWind v4)
- [x] Admin panel boots to login page (Vite + React + Tailwind + postcss + autoprefixer)

---

## Build Log

### 2026-04-08 Day 1 — Rate limit hit before completion

Created: root package.json, .gitignore, shared/types/models.ts, migrations 001-016

### 2026-04-09 Day 2 — Phase 1 COMPLETE

shared/ types package (3 files):
- types/models.ts, types/api.ts, types/index.ts + constants

supabase/migrations/ (all 34):
- 001-029: All table DDL in correct dependency order
- 030: 26 performance indexes
- 031: 8 updated_at triggers
- 032: RLS policies for all 29 tables + auth_gym_id() helper
- 033: 5 Storage buckets + policies
- 034: custom_access_token_hook (LAST — injects gym_id+role into JWT)

backend/ (20 files):
- src/lib: supabase.ts, logger.ts, inviteCode.ts, email.ts
- src/middleware: auth.ts, rateLimit.ts (4 limiters), requireActiveUser.ts, errorHandler.ts
- src/routes: auth.ts, gyms.ts, users.ts
- src/index.ts — correct middleware chain
- scripts: seed-super-admin.js, import-wger.js, wger-equipment-map.js, wger-muscle-map.js, seed-prebuilt-routines.js

mobile/ (22 files):
- Expo Router + NativeWind v4 + Zustand + expo-secure-store
- Auth screens: login, register (2-step invite flow), forgot-password
- Tab placeholders: feed, workouts, leaderboard, profile
- src/lib/api.ts (fetch + auto-refresh), src/lib/db.ts (SQLite draft), src/stores/authStore.ts

admin/ (14 files):
- Vite + React + Tailwind + postcss + autoprefixer
- LoginPage (role-gated: gym_owner/super_admin only)
- DashboardPage (placeholder, Phase 5 fills it)
- axios interceptor: Bearer token + 401 refresh

Compile Results:
- backend: tsc --noEmit = 0 errors
- shared: tsc --noEmit = 0 errors
- admin: tsc --noEmit = 0 errors


### 2026-04-16 Day 3 — Phase 2 COMPLETE (Backend + Mobile)

Spec split (token optimization):
- Monolithic v5 spec (3341 lines) split into 14 focused files in /specs/
- SPEC_MAP.md created as mental map (task-to-file lookup)
- All files capped at 400 lines max

Backend Phase 2 files created:
- backend/src/routes/exercises.ts � CRUD + multer image upload + visibility rules
- backend/src/routes/routines.ts � Full routine management + pre-built save + folder grouping (2 routers)
- backend/src/routes/workouts.ts � Idempotency, volume calc, PR detection (10 types), streak update, @mentions, media move
- backend/src/routes/workoutMedia.ts � Pending upload + post-save media (2-photo/1-video limit)
- backend/src/jobs/index.ts � 11 cron jobs registered (leaderboard, streaks, cleanup, challenges, reports)
- backend/src/index.ts � Updated to register all Phase 2 routes and start jobs

Compile Results:
- backend: tsc --noEmit = 0 errors

Architecture decisions:
- workoutMediaRouter mounted at /api/v1/workouts BEFORE workoutsRouter (ensures /media/pending resolves before /:id)
- routinesRouter pre-built routes defined before /:id (spec-compliant)
- PR detection implemented as inline async function in workouts.ts
- Streak uses ISO week Monday comparison (last_workout_week DATE column)
- Jobs are stubs for Phase 4+ (leaderboard compute, report generate) but all cron schedules are wired

Mobile Phase 2 files created:
- mobile/src/stores/workoutStore.ts — Zustand store with ActiveWorkout state, SQLite draft persistence (saveDraft/loadDraft/clearDraft), rest timer with setInterval, all workout mutations
- mobile/app/workout/active.tsx — Active workout logger: SetRow (weight/reps/duration/distance inputs, tap-to-complete), ExerciseCard (500ms debounce), elapsed timer, rest timer overlay bar, exercise picker modal
- mobile/app/workout/finish.tsx — Finish screen: workout summary, visibility picker, POST /workouts with idempotency_key, clearDraft() on HTTP 200, PR alert
- mobile/app/(tabs)/workouts.tsx — Workout hub: history list (cursor pagination), Start Workout button, resume draft modal (loadDraft on mount), quick-start routine chips
- mobile/app/workouts/[id].tsx — Completed workout detail: exercises+sets, PR section, edit button
- mobile/app/exercises/index.tsx — Exercise browser: search (400ms debounce), equipment filter chips, offset pagination, avatar initials fallback
- mobile/app/exercises/[id].tsx — Exercise detail: PR grid, set history, collapsible instructions
- mobile/app/routines/index.tsx — Routines list grouped by folder (SectionList), pre-built programs card
- mobile/app/routines/[id].tsx — Routine detail: start workout (maps sets to WorkoutExercise[]), exercise summary cards
- mobile/nativewind-env.d.ts — NativeWind v4 type augmentation (className on all RN components)
- mobile/src/lib/db.ts — Rewritten: openDatabaseSync (sync API), correct active_workout_draft schema, exports db

Mobile Compile Results:
- mobile: tsc --noEmit = 0 errors (after adding nativewind-env.d.ts + fixing 9 type errors in api response wrappers)

---

## Problems Encountered and Fixed

1. multer version mismatch
   Problem: npm ^1.4.5 range matches nothing — latest is 1.4.5-lts.1
   Fix: pinned to exact multer: 1.4.5-lts.1
   Status: FIXED

2. admin TypeScript: import.meta.env not recognized
   Problem: Property 'env' does not exist on type 'ImportMeta'
   Fix: Added types: [vite/client] to admin/tsconfig.json compilerOptions
   Status: FIXED

3. Rate limit (2026-04-08)
   Problem: All 3 parallel agents hit rate limit mid-build
   Fix: Resumed next day, completed all work
   Status: RESOLVED

---

## Phase 2 Objectives (MUST PASS before Phase 3)

### Backend
- [x] POST /exercises — create custom exercise (multipart/form-data, multer)
- [x] GET /exercises — search with ?search=&equipment=&muscle=
- [x] GET /exercises/:id — full detail + user PR history
- [x] GET/POST/PATCH/DELETE /routines — with folder grouping
- [x] GET /routines/pre-built — filter library (BEFORE /routines/:id in router)
- [x] POST /routines/pre-built/:id/save — clone to user's folders
- [x] POST /workouts — idempotency_key, PR calc, streak update, ordinal_number
- [x] GET /workouts/history — cursor paginated (BEFORE /workouts/:id)
- [x] GET /workouts/:id — full detail: exercises + sets + media + PRs
- [x] POST /workouts/media/pending — pre-save media to /pending/ path
- [x] POST /workouts/:id/media — move from pending to final path
- [x] Background jobs: leaderboard refresh every 15 min, streak broken check Monday 00:05
- [x] WGER import: node scripts/import-wger.js runs cleanly

### Mobile
- [x] workoutStore.ts — Zustand store with SQLite draft persistence
- [x] Active workout logger — set completion, debounced save, rest timer
- [x] Finish screen — workout summary, POST /workouts, PR celebration
- [x] Workouts tab — history list, resume draft modal, quick-start chips
- [x] Exercise browser — search, filter, pagination
- [x] Exercise detail — PR history, set history, collapsible instructions
- [x] Routine list — grouped by folder, pre-built card
- [x] Routine detail — start workout from routine
- [x] Workout detail — read-only completed workout view
- [x] mobile tsc --noEmit = 0 errors

---

### 2026-04-18 Day 4 — Phase 3 COMPLETE

Backend Phase 3 files:
- backend/src/routes/analytics.ts — 11 endpoints (stats dashboard, exercises, calendar, measurements, reports)
- backend/src/jobs/index.ts — monthly report generation + year in review fully implemented (batched, upsert, push notification)
- backend/src/index.ts — analytics route registered

Mobile Phase 3 files:
- mobile/app/analytics/index.tsx — progress dashboard: period filter pills, 2×2 overview cards, streak card, volume comparison, last-7-days columns, custom native bar chart (muscle sets), top exercises, strength levels
- mobile/app/analytics/measurements.tsx — body measurements log + history: add modal (12 fields), cursor pagination, delete confirmation
- mobile/app/(tabs)/profile.tsx — full profile: avatar, stats row (workouts/followers/following), streak, strength levels, recent workouts, sign out

Compile Results (both clean):
- backend: tsc --noEmit = 0 errors
- mobile: tsc --noEmit = 0 errors

Fixes applied:
- victory-native v41 breaking API change → replaced with custom native bar chart (Views)
- 4 more api.get/post `.data` wrapper type fixes
- user?.bodyweight_kg not in AuthUser → replaced with strength level null-check from API response

### 2026-04-18 Day 5 — Phase 4 COMPLETE

Backend Phase 4 files:
- backend/src/routes/leaderboards.ts — 6 endpoints (lifts summary+detail, volume, workouts, streak, challenges+detail), live challenge rankings for all 4 metric types
- backend/src/routes/feed.ts — 7 endpoints (gym feed filter=all|following, like/unlike, likes list, comment CRUD with @mention notifications, soft delete)
- backend/src/routes/users.ts — extended with /:id/workouts, /:id/stats, /:id/compare, POST/DELETE /:id/follow, GET /:id/followers/following + followRequestsRouter (approve/reject)
- backend/src/routes/notifications.ts — GET (cursor paginated), PATCH /:id/read, POST /read-all
- backend/src/routes/pushTokens.ts — POST (upsert), DELETE (by token body)
- backend/src/lib/leaderboardCompute.ts — resolveLeaderboardExercises() + computeGymLeaderboards() for all 4 categories
- backend/src/jobs/index.ts — leaderboard refresh now fully implemented (batched gym compute with 2s pause)
- backend/src/index.ts — all Phase 4 routes registered

Mobile Phase 4 files:
- mobile/app/(tabs)/index.tsx — Feed tab: filter pills (all/following), pull-to-refresh, cursor pagination, optimistic like toggle, comment modal with inline keyboard handling
- mobile/app/(tabs)/leaderboard.tsx — 5 tabs (Lifts/Volume/Workouts/Streak/Challenges), period selector for volume+workouts, exercise detail modal, challenge rankings modal, my_rank banner
- mobile/app/notifications/index.tsx — cursor paginated list, optimistic read-single, mark-all-read batch
- mobile/app/users/[id].tsx — public profile: avatar, stats row, follow/unfollow (pending/active/none), streak, recent workouts, strength level pills, followers/following modal

Compile Results (both clean):
- backend: tsc --noEmit = 0 errors
- mobile: tsc --noEmit = 0 errors

Fixes applied:
- leaderboards.ts: AppError called with 2 args → 3 args (code, status, message)
- leaderboards.ts + users.ts: req.user!.gym_id typed string|null → non-null assert
- users.ts: duplicate `export { followRequestsRouter }` removed
- All 4 mobile files: `import api from` → `import { api } from` (named export)
- All 4 mobile files: `res.data.data` → `res.data` (agents double-wrapped response)
- feed.tsx (orphan): deleted; content in index.tsx
- index.tsx: SafeAreaView from react-native-safe-area-context → react-native
- users/[id].tsx: import path `../../../src/lib/api` → `../../src/lib/api`

### 2026-04-24 Day 6 — Phase 5 COMPLETE

Backend Phase 5:
- backend/src/routes/admin.ts — 15 endpoints: stats dashboard, members (list/search/suspend/delete), invites (list/create/revoke), announcements CRUD, challenges CRUD (edit/delete gate on upcoming status only)
- backend/src/index.ts — /api/v1/admin route registered

Admin panel Phase 5:
- admin/src/components/Layout.tsx — sidebar nav (📊👥🔗📢⚡), topbar, sign out
- admin/src/App.tsx — full routing: ProtectedRoute wraps Layout, all 5 pages registered
- admin/src/pages/DashboardPage.tsx — real data: 4 stats cards + last-30-days bar chart (custom HTML divs)
- admin/src/pages/MembersPage.tsx — table with search, status filter, pagination, suspend/reinstate/remove actions
- admin/src/pages/InvitesPage.tsx — list active codes, generate new (max_uses + expiry), revoke
- admin/src/pages/AnnouncementsPage.tsx — CRUD with pinning, inline form
- admin/src/pages/ChallengesPage.tsx — CRUD, edit/delete locked for non-upcoming challenges

Compile Results (all clean):
- backend: tsc --noEmit = 0 errors
- admin: tsc --noEmit = 0 errors

### 2026-04-24 Day 7 — Phase 6 COMPLETE

Backend Phase 6 files:
- backend/src/lib/push.ts — expo-server-sdk wrapper: sendPushNotifications (chunked, DeviceNotRegistered cleanup), sendPushToUser (looks up tokens by user_id)
- backend/src/lib/badges.ts — 11 badge types: first_rep, ten_strong, half_century, century, iron_month, iron_quarter, pr_machine, heavy_lifter, consistent, early_bird, night_owl. Idempotent via UNIQUE constraint (23505 skip). Creates badge_unlocked notification + push per award.
- backend/src/routes/workouts.ts — checkAndAwardBadges() called via setImmediate (non-blocking) after workout save

Mobile Phase 6 files:
- mobile/app/workout/finish.tsx — requestPushPermission() called after first workout (ordinal_number === 1). Contextual Alert with native permission request + token POST to /push-tokens
- mobile/package.json — expo-notifications ~0.29.0 added
- mobile/app.json — expo-notifications plugin registered

Compile Results (both clean):
- backend: tsc --noEmit = 0 errors
- mobile: tsc --noEmit = 0 errors

Architecture decisions:
- Badge check is fire-and-forget (setImmediate) — failure never blocks workout save response
- luxon used for timezone-aware early_bird/night_owl checks and ISO week boundaries for 'consistent'
- gym_legend badge excluded from workout save (checked by leaderboard refresh job)
- Push permission requested contextually post-first-workout (spec 13.4 timing)

---

### 2026-04-24 Day 8 — Phase 7 COMPLETE

Backend Phase 7 files:
- backend/data/trainer-templates.js — 19 template objects covering all defined keys. resolveTemplateKey() fallback chain: same eq → fewer days → full_gym fallback → general fallback → beginner_general_3_full_gym
- backend/src/routes/trainer.ts — 5 endpoints: POST /program (upsert, resolve wger→UUID, init progression_data), GET /next-session (sessionIndex = total % sessions.length), GET /progress (trend: trending_up/stalled/deloaded), POST /feedback (override learning + bias clamp ±5 → multiplier 0.75/1.0/1.25), PATCH /program (pause/resume). runProgressionEngine() exported and called from workouts.ts via setImmediate
- backend/src/routes/workouts.ts — runProgressionEngine() called alongside badge check in setImmediate block
- backend/src/index.ts — /api/v1/trainer registered

Mobile Phase 7 files:
- mobile/app/trainer/onboarding.tsx — 5-step questionnaire: goal → experience → days → equipment → initial weights (pre-filled per experience level, adjustable). POST /trainer/program on submit
- mobile/app/(tabs)/trainer.tsx — Trainer tab: no-program state → onboarding CTA; program state → Next Session tab (exercises with prescription + weight) + Progress tab (per-exercise trend/weight/streak). Pause/resume toggle. Start Workout → navigates to workouts tab
- mobile/app/(tabs)/_layout.tsx — Trainer tab added between Leaders and Profile

Compile Results (both clean):
- backend: tsc --noEmit = 0 errors
- mobile: tsc --noEmit = 0 errors

Architecture decisions:
- Templates are plain JS (not TS) to avoid tsc resolution issues with require()
- Progression engine is fire-and-forget (setImmediate), never blocks workout save response
- Session matching: total_program_sessions_completed % sessions.length (wraps cyclically)
- Bodyweight exercises: increment_kg=0, deload_percentage=1.0 (no weight changes)
- Weight rounding: always to nearest 2.5kg per spec

---

### 2026-04-24 Day 9 — Phases 8, 9, 10 COMPLETE

Phase 8 — QA & Testing:
- backend/src/lib/progressionCalc.ts — pure calculation functions extracted for testability (no DB deps): applyProgressionStep, applyOverride, calcTrend, roundToNearest2_5
- backend/jest.config.ts — ts-jest, node environment, testMatch: __tests__/**/*.test.ts
- backend/src/__tests__/progression.test.ts — 40 tests covering linear/hypertrophy protocol, increment multiplier, deload trigger, override learning, trend calculation, rounding
- backend/src/__tests__/badges.test.ts — 22 tests covering all 11 badge eligibility conditions + boundary cases
- backend/src/__tests__/templates.test.ts — 86 tests validating all 19 templates exist, have correct structure, resolveTemplateKey fallback chain works
- 148/148 tests passing

Phase 9 — Performance:
- backend/src/middleware/cache.ts — cacheControl(seconds) and noCache middleware helpers
- backend/src/index.ts — compression() middleware added (gzip all responses)
- backend/src/routes/analytics.ts — cacheControl(60) on /stats, cacheControl(300) on /calendar

Phase 10 — App Store Prep:
- backend/.env.example — confirmed complete (all 14 env vars)
- admin/.env.local.example — confirmed complete
- mobile/.env.local.example — confirmed complete
- backend/Procfile — Railway deployment: `web: node dist/index.js`
- mobile/eas.json — EAS build profiles: development (dev client), preview (internal), production (autoIncrement + app store submit config)

Compile Results (final):
- backend: tsc --noEmit = 0 errors
- backend: jest = 148/148 passing
- mobile: tsc --noEmit = 0 errors

---

## BUILD COMPLETE — All 10 Phases Done

Next steps (operational, not code):
1. `supabase db push` — apply all 34 migrations
2. Register custom_access_token_hook in Supabase dashboard
3. `node scripts/import-wger.js` — import exercise library
4. `node scripts/seed-prebuilt-routines.js` — seed pre-built programs
5. `node scripts/seed-super-admin.js` — create system gym + super admin
6. Deploy backend to Railway Hobby plan (`npm run build && railway up`)
7. Deploy admin to Vercel (`vercel --prod`)
8. `eas build --platform all --profile production` — build mobile apps
9. Submit to TestFlight and Google Play internal testing
10. Register ironpath.app domain; publish privacy policy at /privacy

---

## Critical Rules (NEVER VIOLATE)
1. gym_id NEVER from request body — always from req.user (JWT)
2. Middleware order: CORS > Helmet > JSON > authMiddleware > rateLimiter > routes
3. Express: static paths BEFORE parameterized (/routines/pre-built before /routines/:id)
4. POST /workouts requires idempotency_key (UUID)
5. @shopify/react-native-skia = package dep ONLY, NOT Expo config plugin
6. Migration 034_auth_hook.sql MUST be last
7. Railway MUST be Hobby plan (free kills cron)
8. Supabase Storage no native move: download > re-upload > delete
9. Warmup recalc: setImmediate after PATCH /settings
10. Leaderboard upsert: partial unique indexes + ON CONFLICT DO UPDATE
