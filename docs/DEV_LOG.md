# IronPath Development Log

Single source of truth for development progress on the platform plan. Read this first when resuming a session. Every meaningful checkpoint gets an entry with file paths, what changed, and what's next.

- **Plan reference:** [PLATFORM_PLAN.md](PLATFORM_PLAN.md)
- **Active branch:** `claude/clever-dhawan-f1fb26` (worktree)
- **Maintained by:** primary agent inline + Haiku scribe polish pass per unit

---

## Current state

- **Phase:** B — Super Admin Console v1 (4 teams in flight)
- **Active unit:** B1 backend / B2 All Gyms + Gym Detail / B3 Subscription editor + Lead Inbox / B4 Manual creation + Sentry
- **Last updated:** 2026-05-09

---

## Phase progress

### Phase A — Foundation (all 4 teams merged to trunk)
- [x] **Team 1 — Frontend Safety + Polish** *(commit `923b67a`)*
- [x] **Team 2 — Backend Foundation** *(commit `5d87ab7`)*
- [x] **Team 3 — Super Admin Console Scaffold** *(commit `60105e9`)*
- [x] **Team 4 — Owner Settings + Subscription Pages** *(commit `2c45fe1`)*
- [x] **Reconciliation** — routes wired, Lucide swap, PLATFORM_PLAN renumbered.

### Phase A — review pass results
- [x] Build verification: backend, shared, admin, console all typecheck clean.
- [x] Cross-team review: 4 reviewers (frontend integration, backend integration, security/RBAC, plan adherence).
- [x] Haiku scribe polish pass.
- [x] Tier 1 review fixes applied (see entry below).

### Phase B carry-over backlog (Tier 2 — defer)
- [ ] Rename admin localStorage keys to `ip_owner_*` per plan §7.4 (or amend plan).
- [ ] Implement old-logo deletion on `PATCH /gyms/:id` per plan §6.6.
- [ ] Re-key `refreshLimiter` off `refresh_token` hash (or user.id) instead of IP — NAT'd-office mass-logout risk.
- [ ] Validate `logo_url` PATCH body is from `gym-assets` bucket (not arbitrary URL).
- [ ] Allow `logo_url` PATCH to set `null` (currently only `.optional()` — can't clear logo).
- [ ] CORS allowlist boot-time validation (no wildcards, both apex domains present).
- [ ] Post-upload server-side MIME validation on logo blobs (Supabase signed-URL TTL is fixed at 2h).
- [ ] De-duplicate `ONBOARDING_STEPS` between `backend/src/routes/gyms.ts` and `shared/types/index.ts` (build `@ironpath/shared` dist or use tsconfig path alias).
- [ ] Harmonize admin/console `clearSessionAndRedirect` signatures — same name, different param meaning.
- [ ] Widen admin `StoredUser.gym_id` to `string | null` to match console + DB reality.
- [ ] Swap `📌` emoji in `admin/src/pages/AnnouncementsPage.tsx` for Lucide `Pin`.
- [ ] Add `last_modified_by` to `gyms` before audit_log lands in Phase B.

### Phase B — Super Admin Console v1 (not started)
### Phase C — Onboarding & retention (not started)
### Phase D — Sales acceleration (not started)
### Phase E — Analytics (not started)
### Phase F — Polish & scale prep (not started)

---

## Activity log
*Reverse chronological — newest at top.*

### 2026-05-09 · Phase B v1.2 — GymDetailPage nested-route tabs

Splits the flat profile/owner/subscription/onboarding/audit cards into routed tabs per plan §5.5.

**New files (`console/src/pages/gyms/`):**
- `OverviewTab.tsx` — three summary cards (profile / owner / subscription). The subscription card now shows onboarding completion as a counter, not a full checklist.
- `SubscriptionTab.tsx` — dedicated deep-dive: tier+status pills, members / MRR / trial start / expires (with `daysUntil` suffix), prominent Edit subscription button. Payment-history pane is a placeholder (`subscription_payments` LIST endpoint deferred to later in Phase B).
- `AuditTab.tsx` — full paginated audit log (uses `useGymAuditQuery` + `Pagination`). Each row expands to render before/after JSON diff in side-by-side panes. IP shown right-aligned in mono.
- `OnboardingTab.tsx` — full checklist with human-readable labels (`STEP_LABELS` map) plus the canonical key in mono. Empty-state when no rows.

**`GymDetailPage.tsx` is now the shell:** back link, gym name + tier/status pills + ID + created-date header, NavLink tab strip, `<Outlet />`. The previous flat-card body and the inline `<SubscriptionEditor>` mount move into the per-tab files. Each tab calls `useGymQuery(gymId)` directly — TanStack Query's cache makes the duplicate hooks free.

**`App.tsx` routes:**
```
/gyms/:gymId          → GymDetailPage shell
  index               → Navigate to overview
  /overview           → OverviewTab
  /subscription       → SubscriptionTab
  /audit              → AuditTab
  /onboarding         → OnboardingTab
```

**Verified:** `npx tsc -p console/tsconfig.json --noEmit` clean, `npm run -w console build` clean (446 kB JS / 50 kB CSS pre-gzip — +6 kB JS for the four new tabs).

**Note for review:** `hasDiff` in `AuditTab.tsx` had to be `Boolean(...)`-wrapped because `entry.before / entry.after` are typed as `unknown` (audit JSON is opaque on the wire); without the coercion `Boolean && Object.keys(unknown)` leaks `unknown` into JSX.

**Next:** cross-team review pass on Phase B v1 + v1.1 + v1.2. 4 reviewers in worktrees per the Phase A pattern.

### 2026-05-09 · Phase B v1.1 — subscription editor modal

Inline implementation (skipped worktree-isolated agents to dodge the stall pattern that hit the last two Phase B batches).

**New files:**
- `console/src/components/Modal.tsx` — portal-mounted dialog. Backdrop click closes; ESC closes (capturing, so it can't be eaten by inputs); focus trap cycles through focusables on Tab/Shift+Tab; locks body scroll; restores focus to the trigger on unmount. Optional `initialFocusRef` for explicit first-focus (e.g. tab list); `size: 'md' | 'lg'`.
- `console/src/components/SubscriptionEditor.tsx` — three-tab editor (`Update plan` / `Mark paid` / `Extend trial`). Each tab is its own RHF + zod form so state resets cleanly when switching tabs.
  - **Update plan** — tier, status, expires_at (datetime-local, converted to ISO on submit), MRR (USD dollars input → `dollarsToCents`). Diffs against current values; sends only changed fields. Refuses no-op submits.
  - **Mark paid** — amount (USD), period_start, period_end (date inputs, YYYY-MM-DD wire format). End-≥-start refine. Note optional, max 500.
  - **Extend trial** — quick-pick chips (+7 / +14 / +30) plus numeric override 1–90. Reason required, 3–500 chars.
  - All three forms close the modal on success; mutations already invalidate `['gym', gymId]` + `['gyms']`.

**Wiring:**
- `console/src/pages/GymDetailPage.tsx` — replaced the "Edit modal lands in the next iteration" footnote with a Lucide `Pencil` button that opens `<SubscriptionEditor>`. Seeds `current` from the live `useGymQuery` payload.

**Verified:** `npx tsc -p console/tsconfig.json --noEmit` clean, `npm run -w console build` clean (440 kB JS / 50 kB CSS pre-gzip).

**Next:** convert `GymDetailPage` flat cards to nested-route tabs (Overview / Subscription / Audit / Onboarding) per plan §5.5, then run cross-team review on Phase B v1 + v1.1.

### 2026-05-09 · Phase B kickoff stalled (worktree fork-base gotcha) → recovered

First Phase B kickoff failed because `Agent({ isolation: "worktree" })` forks from local `master`, not from the currently checked-out feature branch. All four B teams' worktrees forked from `79066d9` (pre-Phase-A master) — three aborted ("console/ doesn't exist"); B4 produced admin-only Sentry + polish work against the wrong base, but salvageable.

**Recovery (durable):**
1. Stopped in-flight B1 (the only still-running one on bad baseline).
2. Merged B4's admin work as `2486520`: admin Sentry init, 📌 → Lucide `Pin` swap in `AnnouncementsPage`, `LoginPage` role-error tightened to "Admin access required.".
3. **Fast-forwarded local refs** so future worktrees see the right base:
   ```
   git update-ref refs/heads/master refs/heads/claude/clever-dhawan-f1fb26
   git update-ref refs/remotes/origin/master refs/heads/claude/clever-dhawan-f1fb26
   ```
4. Re-spawned the 4 Phase B teams against the corrected baseline. Each prompt now includes a base-check sanity instruction ("Run `git log --oneline -5` first; if you see only `79066d9`, STOP").

**Lesson (also captured in memory):** before spawning any `isolation: "worktree"` batch that depends on uncommitted-to-master work, fast-forward local master to the current branch HEAD. Otherwise the agents see a stale base and either abort or produce mismatched work.

### 2026-05-09 · Phase A review pass + Tier 1 fixes

**4 cross-team reviewers + Haiku scribe ran in parallel on the merged trunk.** All four typechecks were clean before AND after this fix pass.

**Tier 1 — applied (this commit):**
- **CRITICAL** — Added `requireActiveUser` to `GET /gyms/:id` (`backend/src/routes/gyms.ts:123`). Suspended/deleted users were able to read gym profile until token expired.
- **HIGH** — `app.set('trust proxy', 1)` in `backend/src/index.ts`. Without this, every IP-keyed limiter (refresh, auth, registration, default) collapses to the proxy IP behind Railway/Vercel — single user could DoS the team.
- **HIGH** — Removed `/audit` and `/settings` from console NAV_LINKS (`console/src/components/Layout.tsx`). Routes don't exist; they were silently bouncing operators to `/gyms`.
- **HIGH** — `Subscription.tier` widened to `Tier | null`; `tierLabel(null)` returns "No plan yet"; tier badge styles down when null. Backend may legitimately return null for trial gyms before sales picks a tier — this would have crashed the page.
- **HIGH** — Backslash now rejected in `?next=` sanitizer (`admin/src/pages/LoginPage.tsx`). Benign today via react-router; defensive against future swaps to `window.location.href`.
- **MED** — `SettingsPage` accent default + `forms.ts` example hex corrected from `#FF6A00` to brand `#FF6B35` (plan §3.2). Would have silently rebranded gyms with NULL accent on first save.
- **MED** — Added `ON DELETE SET NULL` to FKs on `subscription_payments.recorded_by` and `gym_onboarding_steps.completed_by`. Inline comments said "nullable in case the user is deleted" but FKs defaulted to `NO ACTION` and would have blocked the delete.
- **NIT** — Console nav icons now have `strokeWidth={1.75}` matching admin.
- **NIT** — Admin LoginPage button copy: "Signing in..." / "Sign In" → "Signing in" / "Sign in" (plan §3.8: no ellipsis on progress text; sentence case).
- **LOW** — `SettingsPage` timezone hint: "Phase 2" → "Phase C" (matches plan phase labels).

**Tier 2 — moved to Phase B carry-over backlog above.** Read it before Phase B kickoff.

**Plan amendment to §12.1 #15:** the "034_auth_hook must stay last" folklore is replaced by the rule "any migration mutating `public.users` or the auth hook must be sequenced after 034". Pure ALTERs on other tables (like `035_invite_options.sql`) are safe.

### 2026-05-09 · Phase A merged (4 team branches → trunk)

**Merge order:** docs (`ee74b2a`) → Team 2 (`1cad3eb`) → Team 3 (`199a369`) → Team 1 (`b701b97`) → Team 4 (`19cedc0`).

**Conflicts resolved:**
- `docs/DEV_LOG.md`: Kept HEAD across three add/add conflicts (Teams 1, 3, 4 each forked before `docs/` was committed). Unified here.
- `package-lock.json`: Kept HEAD; regenerating via `npm install`.
- `admin/package.json`: ort strategy auto-merged Team 1 (`lucide-react`) + Team 4 (`react-hook-form`, `zod`, `@hookform/resolvers`).

**Team 1 — Frontend safety + polish:**
- New `admin/src/lib/session.ts`: `StoredUser`, `readStoredUser`, `isAllowedRole`, `clearSession`, `clearSessionAndRedirect`, `signOut` (single source for localStorage user reads).
- `api.ts`: Module-level `refreshPromise` coalesces concurrent 401s onto one `/auth/refresh`; `.finally()` clears cache; removed dead `Authorization` header on retry.
- `App.tsx`: Role-aware `ProtectedRoute` with `useLocation`-driven `?next=` capture; `clearSession()` on stale role.
- `Layout.tsx`: Lucide nav icons (`LayoutDashboard`, `Users`, `Link2`, `Megaphone`, `Trophy`).
- `LoginPage.tsx`: Honors `?reason=session_expired` pill and sanitized `?next=`.
- `DashboardPage.tsx`: recharts `BarChart` (height 240, orange-500, gridless, dark-card tooltip).
- Added `lucide-react@^0.468.0`.

**Team 2 — Backend foundation:**
- Migrations: `036_subscription_extras.sql` (gym extras: mrr_cents, phone, website, address, timezone, units_default, logo_url), `037_subscription_payments.sql` (payment ledger + indices), `038_gym_onboarding_steps.sql` (gym/step composite PK).
- `rateLimit.ts`: `refreshLimiter` (30/15min IP) + `uploadLimiter` (10/min user/IP); applied to `/auth/refresh`.
- `gyms.ts`: Extracts `ACCENT_COLOR_REGEX`; new routes `/subscription`, `/onboarding`, `/:stepKey/complete`, `/logo/upload-url` (uploadLimiter, 2MB PNG/JPEG/WebP).
- `shared/types/index.ts`: Added `SUBSCRIPTION_TIERS`, `TIER_MEMBER_CAPS`, `ONBOARDING_STEPS`, `USER_ROLES`.
- Authz: `super_admin` always; `gym_owner` only when `req.user.gym_id === req.params.id`; gym_id never from body.
- Note: Backend re-declares shared constants (no `@ironpath/shared` dist build yet).

**Team 3 — Console scaffold:**
- New `console/` workspace (port 5174): `package.json`, `vite.config.ts` (/api proxy), `tsconfig*.json`, `tailwind.config.js` (cyan `#22D3EE`, canvas `#0A0A0B`, dark mode), `postcss.config.js`, `.env.example`, `vercel.json`.
- `main.tsx`: Wires `QueryClientProvider`.
- `lib/api.ts`: Mirrors admin pattern with `ip_console_*` storage and stub `impersonationApi`.
- `lib/session.ts`: Enforces `super_admin`-only.
- `Layout.tsx`: Cyan sidebar with Lucide nav (`Inbox`, `Kanban`, `Building2`, `LineChart`, `History`, `Settings`); top status bar.
- Routes: `/login`, `/inbox`, `/pipeline`, `/gyms`, `/analytics`; default `/` → `/gyms`.
- `LoginPage.tsx`: "Operator access required"; placeholder pages with Lucide empty states.
- Root `package.json`: Added `console` to workspaces + `dev:console`/`build:console` scripts.
- **shadcn/ui note:** Hand-rolled Tailwind v1; CLI deferred to Phase B.
- Build: 244 kB JS / 42 kB CSS pre-gzip.

**Team 4 — Settings + Subscription pages:**
- New `SettingsPage.tsx`: Six cards — Profile (RHF + zod, fading "Saved"), Branding (3-step upload: sign → PUT → PATCH), Contact, Invite code (copy-to-clipboard), Coach roster, Danger zone (all placeholders).
- New `SubscriptionPage.tsx`: Five cards — Current plan (tier, status, usage/unlimited, countdown), MRR, Upgrade tiers, Invoices, Data export (placeholders).
- New `lib/forms.ts`: `zodResolver`/`z` re-exports, `extractError`, `getStoredGymId`, `accentColorSchema`, `optionalUrl`.
- Added `react-hook-form`, `zod`, `@hookform/resolvers`.

**Reconciliation (orchestrator post-merge):**
- Wired `/settings` and `/subscription` routes in `admin/src/App.tsx` (Team 1 brief omitted; Team 4 mentioned).
- Added nav links: Settings (`SettingsIcon`) and Subscription (`CreditCard`) in `admin/src/components/Layout.tsx`.
- Swapped Team 4's `•••` placeholders for Lucide: `KeyRound` (invite empty), `UserPlus` (coach roster), `FileText` (invoices).
- Renumbered migrations in `PLATFORM_PLAN.md` §6.4/§11/§16: 035→036, 036→037, …, 042→043. `035_invite_options.sql` already in repo.
- Revised PLATFORM_PLAN.md §12.1 gotcha #15: Rule is "any migration mutating `public.users` or auth hook must sequence after 034", not "034 must be last". Pure ALTERs on other tables are safe.
- Verified `gym_id` in localStorage: `/auth/login` returns it; `LoginPage` stores full user object. No fix needed.

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
