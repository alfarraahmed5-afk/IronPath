# IronPath Development Log

Single source of truth for development progress on the platform plan. Read this first when resuming a session. Every meaningful checkpoint gets an entry with file paths, what changed, and what's next.

- **Plan reference:** [PLATFORM_PLAN.md](PLATFORM_PLAN.md)
- **Active branch:** `claude/clever-dhawan-f1fb26` (worktree)
- **Maintained by:** primary agent inline + Haiku scribe polish pass per unit

---

## Current state

- **Phase:** A — Foundation
- **Active unit:** A1 — Frontend safety fixes
- **Last updated:** 2026-05-09

---

## Phase progress

### Phase A — Foundation (4 parallel teams in flight)
- [ ] **Team 1 — Frontend Safety + Polish**
  - api.ts in-flight refresh guard, session.ts extraction, role-aware ProtectedRoute (with clear-before-redirect),
    Layout.tsx readStoredUser + Lucide migration, DashboardPage recharts migration, LoginPage `?next=` and `?reason=`.
- [ ] **Team 2 — Backend Foundation**
  - Migrations 036–038 (gyms columns, subscription_payments, gym_onboarding_steps).
  - refreshLimiter on `/auth/refresh`. Extend `PATCH /gyms/:id`. New `/subscription`, `/onboarding/*`, `/logo/upload-url`.
  - Renumber planned migrations 035→043 across PLATFORM_PLAN.md (035_invite_options.sql already exists).
- [ ] **Team 3 — Super Admin Console Scaffold**
  - New `console/` Vite app, cyan accent, login page, Layout with Lucide nav, placeholder All Gyms page.
  - Add `console` to root `package.json` workspaces.
- [ ] **Team 4 — Owner Settings + Subscription Pages**
  - `admin/src/pages/SettingsPage.tsx`, `admin/src/pages/SubscriptionPage.tsx` components only (Team 1 wires routes).
  - react-hook-form + zod, against the contract Team 2 publishes.

### Phase B — Super Admin Console v1 (not started)
### Phase C — Onboarding & retention (not started)
### Phase D — Sales acceleration (not started)
### Phase E — Analytics (not started)
### Phase F — Polish & scale prep (not started)

---

## Activity log
*Reverse chronological — newest at top.*

### 2026-05-09 · Pivot to 4 parallel teams
- User clarified intent: 4 teams = 4 features built in parallel (each team = multi-specialist unit on its own feature),
  not 4 review teams on a single change.
- Reverted my partial unit A1 code edits (`admin/src/lib/api.ts`, `admin/src/App.tsx`) so Team 1 has a clean baseline.
- Lean review board findings (4 reps) folded into Team 1's brief as required action items:
  - **HIGH** `Layout.tsx:30` unguarded `JSON.parse` crashes shell on bad blob.
  - **MED** `api.ts` line 62 manually setting `error.config.headers.Authorization` is dead/risk; delete it.
  - **MED** `/auth/refresh` has NO rate limiter — Team 2 to add `refreshLimiter` (30/15min/IP).
  - **MED** `StoredUser` duplicated in `App.tsx`+`Layout.tsx`; extract `lib/session.ts`.
  - **MED** Role-fail bounce should clear session first (loop risk).
  - **MED** Bounce loses target URL; capture `?next=` and surface `?reason=session_expired` on LoginPage.
- Discovered `supabase/migrations/035_invite_options.sql` exists. Team 2 to renumber planned migrations to 036–043 throughout PLATFORM_PLAN.md.

### 2026-05-09 · Unit A1 implemented · Awaiting review (now superseded by Team 1)
**Files changed (2 files, +71/-24):**
- `admin/src/lib/api.ts` — extracted `performRefresh()` + `refreshAccessToken()` with module-level in-flight promise. Concurrent 401s now coalesce onto a single `/auth/refresh` call (`.finally()` clears the cache once the promise settles so the next 401 starts fresh). Also added `clearSessionAndRedirect()` helper that wipes `user` from localStorage too — previous code missed it.
- `admin/src/App.tsx` — `ProtectedRoute` now reads stored `user` from localStorage and rejects if `role` is missing or not in `['gym_owner', 'super_admin']`. Added `readStoredUser()` with try/catch on `JSON.parse`.

**Review cadence:** Lean review (4 agents — one rep per team) for this small unit. Full 16-agent deployment reserved for unit A2+ where there's more surface area.

**Next:** apply any review action items, then unit A2 (migrations 035–037).

### 2026-05-09 · Session start · Planning → development
- Synthesized 10-agent planning board into `docs/PLATFORM_PLAN.md` (17 sections, 6 phases).
- Started Phase A unit A1 = QA-gotchas-flagged frontend safety fixes:
  - `admin/src/lib/api.ts` token refresh race on concurrent 401s
  - `admin/src/App.tsx` `ProtectedRoute` lacks role check
