# IronPath Development Log

Single source of truth for development progress on the platform plan. Read this first when resuming a session. Every meaningful checkpoint gets an entry with file paths, what changed, and what's next.

- **Plan reference:** [PLATFORM_PLAN.md](PLATFORM_PLAN.md)
- **Active branch:** `claude/clever-dhawan-f1fb26` (worktree)
- **Maintained by:** primary agent inline + Haiku scribe polish pass per unit

---

## Current state

- **Phase:** A — Foundation (merged)
- **Active unit:** Cross-team review pass next; Phase B kicks off after.
- **Last updated:** 2026-05-09

---

## Phase progress

### Phase A — Foundation (all 4 teams merged to trunk)
- [x] **Team 1 — Frontend Safety + Polish** *(commit `923b67a`)*
- [x] **Team 2 — Backend Foundation** *(commit `5d87ab7`)*
- [x] **Team 3 — Super Admin Console Scaffold** *(commit `60105e9`)*
- [x] **Team 4 — Owner Settings + Subscription Pages** *(commit `2c45fe1`)*
- [x] **Reconciliation** — routes wired, Lucide swap, PLATFORM_PLAN renumbered.

### Phase A — remaining (orchestrator follow-up)
- [ ] Build verification across admin / console / backend / shared
- [ ] Cross-team review pass on the merged trunk
- [ ] Haiku scribe polish pass on this log

### Phase B — Super Admin Console v1 (not started)
### Phase C — Onboarding & retention (not started)
### Phase D — Sales acceleration (not started)
### Phase E — Analytics (not started)
### Phase F — Polish & scale prep (not started)

---

## Activity log
*Reverse chronological — newest at top.*

### 2026-05-09 · Phase A merged (4 team branches → trunk)

**Merge order:** docs (`ee74b2a`) → Team 2 (`1cad3eb`) → Team 3 (`199a369`) → Team 1 (`b701b97`) → Team 4 (`19cedc0`).

**Conflict resolutions:**
- `docs/DEV_LOG.md` — kept HEAD across all three add/add conflicts (Teams 1, 3, 4 each created their own version because `docs/` was uncommitted in main when they forked). This unified entry replaces them.
- `package-lock.json` — kept HEAD; regenerating root lockfile via `npm install`.
- `admin/package.json` — git's ort strategy auto-merged Team 1's `lucide-react` and Team 4's `react-hook-form` + `zod` + `@hookform/resolvers` cleanly.

**Team 1 (frontend safety + polish):** new `admin/src/lib/session.ts` (`StoredUser`, `readStoredUser`, `isAllowedRole`, `clearSession`, `clearSessionAndRedirect`, `signOut`) — single source for localStorage user reads. `api.ts` refactored: module-level `refreshPromise` coalesces concurrent 401s onto one `/auth/refresh`; `.finally()` clears cache post-settle; removed dead manual `Authorization` header on retry. `App.tsx` role-aware `ProtectedRoute` w/ `useLocation`-driven `?next=` capture and `clearSession()` on stale role. `Layout.tsx` Lucide nav (`LayoutDashboard`, `Users`, `Link2`, `Megaphone`, `Trophy`). `LoginPage.tsx` honors `?reason=session_expired` (neutral pill) and sanitized `?next=`. `DashboardPage.tsx` recharts `BarChart` (h=240, orange-500, gridless, dark-card tooltip with mono numbers). Added `lucide-react@^0.468.0`.

**Team 2 (backend foundation):** migrations
- `036_subscription_extras.sql` — `mrr_cents`, `phone`, `website`, `address`, `timezone`, `units_default`, `logo_url` on `gyms`. (`logo_url` was already on gyms from 001 — `IF NOT EXISTS` makes the add a no-op.)
- `037_subscription_payments.sql` — payment ledger, FK to gyms (CASCADE) and users (no cascade), index `(gym_id, created_at DESC)`, CHECK `period_end >= period_start`.
- `038_gym_onboarding_steps.sql` — composite PK `(gym_id, step_key)`, FKs, idx on gym_id.

`backend/src/middleware/rateLimit.ts` — `refreshLimiter` (30/15min IP-keyed, `Retry-After: 900`) + `uploadLimiter` (10/min, user.id || ip). `auth.ts` applies refreshLimiter to `POST /refresh`. `gyms.ts` extracts `ACCENT_COLOR_REGEX`; extends `PATCH /:id` schema; new `GET /:id/subscription`, `GET /:id/onboarding`, `POST /:id/onboarding/:stepKey/complete` (idempotent UPSERT), `POST /:id/logo/upload-url` (uploadLimiter, 2MB, png/jpeg/webp). `shared/types/index.ts` adds `SUBSCRIPTION_TIERS`, `TIER_MEMBER_CAPS`, `ONBOARDING_STEPS`, `USER_ROLES`. Authz model uniform: super_admin always; gym_owner only when `req.user.gym_id === req.params.id`; gym_id never from body. Backend re-declares shared constants inline because `@ironpath/shared` has no `dist/` build (TODO).

**Team 3 (console scaffold):** new `console/` workspace at port 5174 — `package.json` (Node 20 pinned), `vite.config.ts` (/api proxy), `tsconfig*.json`, `tailwind.config.js` (cyan brand `#22D3EE`, `canvas` `#0A0A0B`, `ink-*` neutrals, Inter + JetBrains Mono, `darkMode: 'class'`), `postcss.config.js`, `index.html`, `.env.example`, `.gitignore`, `vercel.json`. `main.tsx` wires `QueryClientProvider`. `lib/api.ts` mirrors admin pattern with `ip_console_*` namespaced storage and stub `impersonationApi` for Phase D. `lib/session.ts` enforces `super_admin`-only. `Layout.tsx` cyan-active sidebar with Lucide nav (`Inbox`, `Kanban`, `Building2`, `LineChart`, `History`, `Settings`) and top status bar. Routes `/login`, `/inbox`, `/pipeline`, `/gyms`, `/analytics`, `/` → `/gyms`. Operator `LoginPage.tsx` ("Operator access required"). Placeholder pages with Lucide empty states. Root `package.json` adds `console` to workspaces + `dev:console`/`build:console` scripts. **shadcn/ui decision:** hand-rolled Tailwind primitives for v1; CLI integration deferred to Phase B alongside the Gyms data table. `npm run build --workspace=console` produces clean dist (244 kB JS / 42 kB CSS pre-gzip).

**Team 4 (Settings + Subscription pages):** new `SettingsPage.tsx` — six cards: Profile (RHF + zod, fading "Saved"), Branding (3-step upload: sign → PUT signed URL via fetch → PATCH `logo_url`), Contact (phone/website/address/timezone/units), Invite code (loads from `GET /admin/invites`, copy-to-clipboard), Coach roster + Danger zone placeholders. New `SubscriptionPage.tsx` — five cards: Current plan (tier badge, status pill, member usage bar or "Unlimited", trial countdown), MRR (mono `$XX.XX/mo`), Upgrade (three tiers, current ringed in orange, mailto:sales placeholder), Invoices empty, Data export placeholder. New `lib/forms.ts` — `zodResolver`/`z` re-exports, `extractError`, `getStoredGymId`, `accentColorSchema`, `optionalUrl`. Added `react-hook-form`, `zod`, `@hookform/resolvers`.

**Reconciliation (orchestrator inline after merge):**
- Wired `/settings` and `/subscription` routes in `admin/src/App.tsx` — Team 1's brief omitted this (my drafting error; Team 4's brief mentioned it, Team 1's didn't).
- Added Settings (`SettingsIcon`) and Subscription (`CreditCard`) nav links to `admin/src/components/Layout.tsx`.
- Swapped Team 4's three `•••` placeholders for Lucide icons: `KeyRound` (no-invite empty state in SettingsPage), `UserPlus` (coach roster placeholder), `FileText` (no-invoices empty state in SubscriptionPage). Team 4 couldn't install lucide-react (out of scope); Team 1 did, so the swap was trivial post-merge.
- Renumbered planned migrations across `PLATFORM_PLAN.md` §6.4 / §11 / §16: 035→036, 036→037, …, 042→043. `035_invite_options.sql` already lives in the repo.
- Revised gotcha #15 in §12.1: rule is **not** "034 must be last" — it's "any migration mutating `public.users` or the auth hook must be sequenced after 034". Pure ALTER on other tables is fine.
- `gym_id-in-localStorage` worry from Team 4 was a false alarm: `/auth/login` returns `gym_id` in the user object (`backend/src/routes/auth.ts:123`), and `LoginPage` already stores the whole user via `JSON.stringify(user)`. No fix needed.

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
