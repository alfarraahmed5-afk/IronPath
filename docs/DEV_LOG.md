# IronPath Development Log

Single source of truth for development progress on the platform plan. Read this first when resuming a session. Every meaningful checkpoint gets an entry with file paths, what changed, and what's next.

- **Plan reference:** [PLATFORM_PLAN.md](PLATFORM_PLAN.md)
- **Active branch:** `claude/hopeful-varahamihira-a9f2cf` (worktree)
- **Maintained by:** primary agent inline + Haiku scribe polish pass per unit

---

## Current state

- **Phase:** B — Super Admin Console v1 (4 teams in flight)
- **Active unit:** B1 backend / B2 All Gyms + Gym Detail / B3 Subscription editor + Lead Inbox / B4 Manual creation + Sentry
- **Last updated:** 2026-05-09 (Phase B v1 shipped to staging — console live at iron-path-console.vercel.app)

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
- [ ] Post-upload server-side MIME validation on logo blobs (Supabase signed-URL TTL is fixed at 2h).
- [ ] De-duplicate `ONBOARDING_STEPS` between `backend/src/routes/gyms.ts` and `shared/types/index.ts` (build `@ironpath/shared` dist or use tsconfig path alias).
- [ ] Harmonize admin/console `clearSessionAndRedirect` signatures — same name, different param meaning.
- [ ] Widen admin `StoredUser.gym_id` to `string | null` to match console + DB reality.
- [ ] Swap `📌` emoji in `admin/src/pages/AnnouncementsPage.tsx` for Lucide `Pin`.
- [x] Add `last_modified_by` to `gyms` before audit_log lands in Phase B. *(migration 041)*

### Phase B.5 — prod-ship blockers (NEW, before any real customer touches prod)
- [x] **2FA (TOTP) for super_admin login** (plan §8.1 #1, §8.2, §12.4 #4) — *landed 2026-05-10. Migration 043 + backend twoFactor router + console enroll page + login state machine.*
- [ ] **Rotate Supabase legacy JWT secret** (anon + service_role) — service_role was leaked in client bundle for 15 days (2026-04-24 → 2026-05-09); user opted to defer rotation indefinitely (2026-05-10 reaffirmation — staging-grade, no observed traffic against the leaked URL, will rotate in a quiet ops window before first paying customer).
- [x] **Manual gym creation: orphaned-auth-user reconciliation cron** — *landed 2026-05-10 in `backend/src/jobs/index.ts` (daily 03:30 UTC). 10-min in-flight grace, 100-deletion safety cap per run.*
- [x] **Pre-deploy schema-drift check** — *landed 2026-05-10 as `backend/src/lib/schemaProbes.ts` (boot-time gate; production refuses to start if any probe fails) + `npm run -w backend check:schema` for ad-hoc verification against any environment.*
- [x] **PATCH `/super-admin/gyms/:id/subscription` error message** — *landed 2026-05-10. `lib/dbErrors.ts` helper + applied to all 5 `readErr || !x` collapse sites in `superAdmin.ts` AND the same anti-pattern in `twoFactor.ts` flagged by the security council.*

### Phase B.5 follow-ups (Tier 2 — not blockers, file alongside the others)
- [ ] **TOTP secret encryption-at-rest** — migration 043 stores `users.totp_secret` as plaintext base32. The DB is service-role-gated, but pgcrypto/Supabase Vault encryption is the right destination. Bundle with the JWT-secret rotation work.
- [ ] **Stale-challenge cleanup cron** — `super_admin_2fa_challenges` rows accumulate forever past their 5-min TTL. A nightly `DELETE WHERE expires_at < now() - interval '1 day'` keeps the table bounded.
- [ ] **Per-route 2FA-verify limiter** — `/auth/2fa/verify` currently shares `authLimiter` (5/15min/IP) with /login. A user who fat-fingers 4 codes then logs out can hit the limit. A dedicated 10/15min/IP limiter would be friendlier without weakening brute-force protection meaningfully.
- [ ] **Login-event email alerts** (plan §8.2) — email the operator on every super_admin login (time, IP, device). Pairs naturally with the audit-log entries we already write on 2fa.login.
- [ ] **IP allowlist for super_admin** (plan §8.2, §8.1 #1) — second factor against credential theft; defer until multi-operator workflow exists.
- [ ] **Shorter session timeout for super_admin** (plan §8.2: 15–30 min vs 24h owners) — the access token TTL is set by Supabase auth config, not the backend; a follow-up might mint a separate short-lived JWT chain for super_admin.

### Phase B v1 review carry-over (Tier 2)
- [ ] Manual gym creation: orphaned-auth-user reconciliation cron when `auth.admin.deleteUser` rollback fails (backend HIGH).
- [ ] Manual gym creation: derive owner `username` from email local-part + retry on 23505 (backend HIGH).
- [ ] `/leads` disposable-email-domain blocklist + CAPTCHA after N invalid (security MED, plan §8.5).
- [ ] Wildcard escape (`%`/`_`) in ilike queries beyond the bare `,()` strip — currently `sanitizeIlikeTerm` strips both, but a pure `LIKE`-pattern escape helper would be cleaner (backend MED).
- [ ] Add per-IP key to default rate limiter for super-admin writes — defense-in-depth against multi-token bypass (security MED).
- [ ] Add per-route higher rate limit for super-admin endpoints (frequent filter changes can hit 100/min default) (backend MED).
- [ ] Better error message in `superAdmin.ts:202` (`'Update failed'`) — include gymId + payload (backend LOW).
- [ ] Migrate `LoginPage` to RHF + zod for consistency with the rest of the console (frontend MED).
- [x] `formatMoneyCents(0) === '—'` falsy guard treats $0 MRR as "unknown" (frontend LOW). *(Phase B Tier 2 polish — `GymsPage.tsx`, `OverviewTab.tsx`, `SubscriptionTab.tsx`)*
- [ ] Listing endpoint for `subscription_payments` (currently a placeholder pane on `SubscriptionTab`).
- [ ] Plan §5.6: coupon code apply + founding-gym lifetime-lock-in flag — Phase D scope, but `SubscriptionEditor` should be extended when the migration lands.
- [ ] Plan §5.5: `/members` and `/activity` sub-tabs — Phase E scope (analytics + member detail).
- [x] Amend plan §3.7 ("gray-600 32px" → `ink-400`) and §6.4 migration table renumbering (041 = `gyms_last_modified_by`, coupons → 043+). *(Phase B Tier 2 polish)*

### Phase B — Super Admin Console v1 (in flight)
### Phase C — Onboarding & retention (in flight)
- [x] **C.1 — QR poster PDF generator + /grow page** *(landed 2026-05-10. Server-side `pdf-lib` poster, A4 + A3 sizes, branded with gym logo + accent. Owner downloads from new `/grow` page in admin.)*
- [ ] **C.2 — 4-step onboarding wizard** (gates dashboard until done; reuses C.1's poster generator in step 2)
- [ ] **C.3 — Trial banner** (day count + member/workout stats in admin header)
- [ ] **C.4 — Tier-cap soft warning at 80% + hard block at 100%**
- [ ] **C.5 — Trial-expiry email sequence** (Resend templates + cron, day 21/25/28/30/31/37 per plan §4.4)
- [ ] **C.6 — Cancellation save flow** (reason picker → contextual offer → confirm)
- [ ] **C.7 — Activation milestone celebrations** (per plan §4.8)
### Phase D — Sales acceleration (not started)
### Phase E — Analytics (not started)
### Phase F — Polish & scale prep (not started)

---

## Activity log
*Reverse chronological — newest at top.*

### 2026-05-10 · Admin design overhaul PR1 — substrate (5-agent council outcome)

User asked the 5-agent council (Visual designer, Motion designer, Frontend impl engineer, UX/IA strategist, Creative director) for a redesign of the admin panel after calling the current design "basic and bland." Convergent recommendations across all agents: shadcn substrate + cn() helper, framer-motion via LazyMotion, Linear-style sliding nav pill, "forged dark" surface ladder, JetBrains Mono numerics, Whoop+Linear inspiration, Dashboard / Members / Announcements as the three highest-leverage pages, /grow left structurally + elevated visually. Reconciled into a 4-PR sequence (PR1 foundation → PR2 Dashboard hero → PR3 Grow rebuild → PR4+ per-page polish). User approved PR1 scope and authorized sourcing photography from the web (PR2 work). **This commit ships PR1 — no visual revolution yet, just the substrate everything else compounds on.**

**New deps (admin only):**
- `clsx` + `tailwind-merge` (~3 kB gz combined) — required for the `cn()` helper that every shadcn-style primitive expects.
- `rollup-plugin-visualizer` (devDependency, ESM-only) — every subsequent admin build emits `dist/stats.html` (treemap + gzip + brotli sizes) for kB accountability. Required rename: `admin/vite.config.ts → admin/vite.config.mts` (ESM plugin incompatible with CJS Vite config loader).

**Substrate (shadcn-pattern, no shadcn CLI executed yet — config only):**
- `admin/components.json` — shadcn config: style 'default', baseColor 'neutral', cssVariables false, iconLibrary 'lucide', with `@/*` alias map. Future `npx shadcn add <component>` calls land into `src/components/ui/`.
- `admin/src/lib/utils.ts` — `cn(...inputs) => twMerge(clsx(inputs))`. The standard shadcn helper.
- `admin/tsconfig.json` + `admin/vite.config.mts` — added `@/*` → `src/*` path alias.

**Tailwind theme — plan §3.2 alignment:**
- New `ink-*` color scale (50/200/400/600/700/800/850/900/950) at the warmer plan §3.2 ink hexes, replacing the cool-blue Tailwind `gray-*` defaults *additively* (Tailwind defaults still resolve, so existing pages using `bg-gray-900` keep working — page migrations are PR2+ work).
- `brand` extended into 400/500/600 (was a flat string before) — matches plan §3.2 ember scale.
- `font-sans` → Inter, `font-mono` → JetBrains Mono — wired so future code can write `className="font-mono"` instead of `style={{ fontFamily: 'JetBrains Mono, monospace' }}` (the anti-pattern in `DashboardPage.tsx`'s tooltip).
- New `shimmer` keyframe + `animate-shimmer` utility.

**Surface ladder (visual designer council, north-star recommendation):**
- `admin/src/index.css` adds three component classes — `.surface-shell` (#0A0A0B, the chrome rail), `.surface-card` (#111114 + 1px ink-800 border + subtle 4% top-left radial ember), `.surface-feature` (#17171B + 6% radial ember + inset 8% orange ring). Three explicit elevations replace the flat, undifferentiated card aesthetic.
- Body `bg-gray-950 text-gray-100` swapped to `bg-ink-900 text-ink-50` — warmer base.
- `[data-numeric]` and `.font-mono` get `font-feature-settings: 'tnum', 'ss01'` + `font-variant-numeric: tabular-nums` automatically — Bloomberg-grade number rendering as a default.

**New primitives:**
- `admin/src/components/ui/Skeleton.tsx` — pure-CSS shimmer block. Closes the §3.7 "loading state" violation flagged by the motion designer (DashboardPage and GrowPage shipped with `<p>Loading…</p>` text).
- `admin/src/components/Logomark.tsx` — inline SVG monogram. Forged "I" with a horizontal orange collar block evoking a barbell collar, two "notch" details on each side. 28px default; `monochrome` prop for disabled contexts.

**Layout retrofit (visual designer council brief #2):**
- Sidebar moved to `surface-shell` (#0A0A0B) — one elevation darker than the main column (`bg-ink-900` #111114). Reads as architectural chrome, not just another card.
- Brand block in sidebar header shows the new `<Logomark />` + wordmark + `Admin` micro-tag.
- Active nav item — the previous full-pill (`bg-gray-800 text-orange-500`) replaced with a Linear-style 2px left ember bar + 8% brand-tinted background. Inactive items hover to `bg-ink-850/60`.
- Lucide icons get `transition-colors` so the orange tint resolves smoothly on hover/active flip.
- Topbar `h-16` → `h-14` (tighter), background flat `bg-ink-900` matches the column.

**Loading-state migration (this PR — Dashboard + Grow only; rest in PR2+):**
- `DashboardPage.tsx` loading branch swapped from `<p>Loading…</p>` to a layout-mirror Skeleton scaffold (header + 4 stat cards + chart panel) so the page doesn't shift on data arrival.
- `GrowPage.tsx` invite-code loading swapped from text to inline `<Skeleton className="h-5 w-32" />`.

**Bundle delta:** 743 kB → 771 kB pre-gzip (+28 kB), 217 kB → 226 kB gzipped (+9 kB). Slightly over the engineer's +5 kB target; within tolerance. `dist/stats.html` is now generated on every build for ongoing accountability.

**Verified:** `npm run -w admin build` clean. No backend or console changes in this PR.

**Phase C remains in flight separately — this is parallel design work, not part of Phase C scope.**

**Next:** PR2 — Dashboard hero overhaul. framer-motion (LazyMotion), sliding nav pill (shared `layoutId`), B&W hero photography band (sourced from Unsplash per user authorization), JetBrains Mono numeral spotlight on stats, stat-card stagger on mount, and the **live workout pulse** ("lifting now · N" with pulsing orange dot) — the creative director's "stop the scroll" element.

### 2026-05-10 · Phase C.1 — QR poster PDF + /grow page (4-agent council outcome)

User asked the 4-agent council (Product/GTM, Engineering, Customer Success/UX, Plan-adherence) to vote on Phase C approach. Tally B=2 (Product, Plan-adherence: ship QR poster first standalone) + D=2 (Engineering, UX: ship wizard first with text invite). Reconciled: both camps agree both pieces ship — disagreement is just order. Engineering's react-pdf risk concern + Plan's §17 emphasis on the QR poster as the load-bearing artifact both point to a sequenced two-PR approach: ship the QR generator first (de-risks PDF tech in isolation; ships the activation artifact this week), then build the wizard around the proven generator. **This commit ships PR1 (Phase C.1).**

**Backend — server-side PDF generation:**
- `pdf-lib` added to backend deps (small, well-maintained, MIT, no native deps).
- `backend/src/lib/posterPdf.ts` — generates A4 (210×297mm) or A3 (297×420mm) PDFs. Layout: top accent band (logo overlay if `gym.logo_url` present and reachable; otherwise solid accent-color band), centered headline `Join {gymName}` over `on IronPath` subtitle, large QR code (~55% inner width, error-correction level H to survive a future logo overlay), instruction line, manual `or enter code` fallback in mono, footer `ironpath.app`. Layout uses `w * factor` for all dimensions so A4 → A3 is a clean upscale. Hex accent color parsed with fallback to plan §3.2 brand orange `#FF6B35`. PNG/JPEG logo support via `embedPng` → fallback `embedJpg`.
- `backend/src/routes/admin.ts` — new `GET /admin/grow/poster?size=a4|a3` endpoint (gym-owner-scoped via existing `requireGymOwner`). Reads gym from JWT scope, best-effort fetches logo bytes via Node 18 fetch (warns + continues on failure so a CDN blip can't fail the download), generates PDF, streams as `application/pdf` with `Content-Disposition: attachment; filename="ironpath-poster-{slug}-{size}.pdf"`. Slug derived via `slugifyGymName` (NFKD + ASCII filter + hyphen-join, max 40 chars, fallback `gym`).
- QR encodes `https://ironpath.app/join/{INVITE_CODE}`. Forward-compatible: even before that landing page exists, phones surface the URL as an actionable link via the camera UI, and we can wire Universal Links / a real bounce page later without reprinting any posters.

**Admin frontend — `/grow` page:**
- New `admin/src/pages/GrowPage.tsx` — header + invite-code display (with copy-to-clipboard) + two prominent download buttons (A4 desk-print, A3 wall-poster). Loading spinners on the buttons during PDF generation; per-size error states reset after 2.5s. Download flow uses `api.get(..., { responseType: 'blob' })` to capture the PDF, parses `Content-Disposition` for the filename, then triggers a hidden `<a>` click + `URL.revokeObjectURL` cleanup.
- Four placeholder cards below (email blast, SMS, Instagram story, front-desk script), each marked "Coming soon" — gives plan §4.5's full kit a visible home for future PRs.
- New `/grow` route in `admin/src/App.tsx` and `Lucide QrCode` nav link in `admin/src/components/Layout.tsx` between Challenges and Settings.

**Threat-model / edge-case notes:**
- The endpoint is owner-scoped — the JWT's `gym_id` is the only source of which gym's poster gets generated; there's no `:id` param to manipulate. A super_admin hitting `/admin/grow/poster` is denied at the existing `requireGymOwner` middleware (which excludes super_admin per plan §6.1).
- Logo fetch is best-effort by design. If the URL 404s or the Storage CDN is slow, the PDF still ships with the accent-band fallback layout. Worst case is a slightly less branded poster, never a failed download.
- No new migration needed — uses existing `gyms.invite_code`, `gyms.name`, `gyms.accent_color`, `gyms.logo_url`. Pre-deploy schema-drift check still passes.
- No new client-side dep — PDF generation lives entirely server-side, so admin bundle size is unaffected by the choice (admin `index-…js` is 743 kB pre-gzip / 217 kB gzipped; was already over the 500 kB warning threshold before this PR).

**Verified:** `npm run -w backend build` clean, `npm run -w admin build` clean.

**Phase C status:** 1 of 7 items done. Next up: C.2 (onboarding wizard) — reuses this poster generator in step 2 of the 4-step flow. C.3 (trial banner) is a small follow-up that fits in the same PR if scope allows.

**Deploy notes:** no DB migration, no console change. Push triggers Railway redeploy + Vercel admin redeploy. Quick smoke test: log in as a gym owner, navigate to /grow, click Download A4 — PDF should download with your gym's logo and invite code rendered.

### 2026-05-10 · Phase B.5 #3/#4/#5 + 2FA security-review fixes (4-agent council outcome)

User asked the council to vote between (A) bundling B.5 #3+#4+#5 cleanup, (B) JWT secret rotation alone, (C) starting Phase C, or (D) Tier 2 polish. Spawned 4 expert agents in parallel (Product/GTM, Engineering, Security/RBAC, Plan-adherence). Tally A=2, B=1, C=1; Security agent flagged real concrete defects in the just-shipped 2FA code that nobody else caught. User opted to defer JWT rotation indefinitely (reaffirmation of the 2026-05-09 deferral — staging-grade, no observed traffic against the leaked URL); reconciled outcome is **A-expanded**: ship the three cleanup blockers PLUS the security-flagged 2FA fixes in one PR.

**B.5 #5 — error-message split (`superAdmin.ts:203` and 4 siblings):**
- New `backend/src/lib/dbErrors.ts` exports `isNotFoundError(e)` keyed on PostgREST's `PGRST116` ("no rows" on `.single()`).
- Applied to all 5 `readErr || !x` collapse sites in `superAdmin.ts` (lines 203, 244, 301, 441, 498 — subscription patch, mark-paid, extend-trial, gym override, lead update). Each now: `if (readErr && !isNotFoundError(readErr)) → log + 500 INTERNAL_ERROR`; `if (!x) → 404 NOT_FOUND`. The 036–042 schema-drift incident manifested as "Gym not found" because every read error collapsed into the not-found branch — that class of mask is now closed.

**Security-flagged 2FA fixes (folded into the same PR):**
- `twoFactor.ts:53-57` had the SAME anti-pattern (chErr + !challenge → identical 401 "Invalid or expired challenge"). Split: chErr → 500 + log; !challenge → 401. The user lookup `userErr || !user` at :68 still collapses both — kept intentionally because at that point we hold a valid challenge so a user-row miss is genuinely an account-state anomaly, not a missing-table error; both legitimately read as 401.
- `twoFactor.ts:113` (post-consume bookkeeping) — captured `last_active_at` and audit-log insert errors instead of silently dropping them. The challenge has already been atomically consumed at this point, so we never block the response on these failures (would otherwise burn the operator's single-use token + force a full re-login). `last_active_at` failures log at warn; audit insert failures log at error.

**B.5 #3 — orphaned-auth-user reconciliation cron:**
- New cron in `backend/src/jobs/index.ts`, daily 03:30 UTC. Builds the set of all `public.users.id`, pages through `auth.admin.listUsers` (200/page, 50-page cap), deletes any `auth.users` row older than 10 minutes that has no `public.users` peer.
- Hard-capped at 100 deletions per run — a runaway condition (e.g. accidental `public.users` truncate) surfaces as a recurring log entry rather than a single catastrophic purge.
- 10-min grace protects in-flight `superAdmin.ts` manual-create flows, which create the auth user before inserting `public.users` and roll both back if downstream fails.

**B.5 #4 — pre-deploy schema-drift check:**
- New `backend/src/lib/schemaProbes.ts` — 13 lightweight `SELECT col FROM table LIMIT 1` probes covering every column/table introduced by migrations 036–043. Each probe distinguishes "no rows" (PGRST116, OK) from "column/table missing" (anything else, fail).
- New `assertSchemaReady({ failHard })` runs the probes and, in production (`NODE_ENV=production`), `process.exit(1)` if any fail — Railway will surface the failed deploy instead of letting new code serve traffic against a stale DB. Dev mode logs warnings only so local hacking against an intentionally-behind dev DB isn't blocked.
- Wired into `backend/src/index.ts` boot sequence: `assertSchemaReady → initJobs → startJobs → app.listen`. Adds ~13 round-trips of latency to cold start (parallelized; ~50ms total on Railway).
- Also exposed as `npm run -w backend check:schema` (chains `tsc && node scripts/check-schema.js`) for ad-hoc verification against any environment via the `.env` file.

**Phase B.5 status after this commit:** 4 of 5 blockers closed. Only JWT secret rotation remains, deferred by user.

**Verified:** `npm run -w backend build` clean. No console changes in this PR.

**Deploy notes:**
- The schema-drift check probes against migration 043, which is already applied in prod (verified by user during 2FA enablement). The boot-time gate will pass on first deploy.
- The orphan reconciliation cron starts firing nightly 03:30 UTC; first run will scan whatever's in `auth.users` against `public.users`. Worth tailing logs for the first run to confirm zero unexpected deletions.

**Next:** Phase C (onboarding wizard + QR poster generator + trial-expiry email sequence + cancellation save flow) is now the recommended next move. JWT rotation is queued for a quiet ops window before first paying customer.

### 2026-05-10 · Phase B.5 #1 — TOTP 2FA for super_admin login

Closes the highest-value Phase B.5 prod-ship blocker (plan §8.1 #1, §8.2,
§12.4 #4). One compromised super_admin credential previously exposed every
gym; from this commit, super_admin login requires a TOTP code or a one-time
recovery code in addition to the password.

**Migration 043 (`043_super_admin_2fa.sql`):**
- `ALTER TABLE public.users ADD COLUMN totp_secret TEXT, totp_enabled_at TIMESTAMPTZ` — both nullable so existing rows aren't disturbed; the per-user gate fires on `totp_enabled_at IS NOT NULL`.
- `super_admin_recovery_codes` table — `(user_id, code_hash, used_at, created_at)`, UNIQUE(user_id, code_hash). Codes are sha256-hashed before insert; raw codes shown to the operator exactly once at enrollment.
- `super_admin_2fa_challenges` table — bridges password-success → TOTP-success. Holds the freshly-minted Supabase access/refresh tokens for ≤5 min, keyed by sha256(challenge_token). The raw challenge_token is the bearer the client holds; only its hash sits on disk.
- Sequencing: migration 043 mutates `public.users` so it lives after 034 per plan §12.1 #15. Auth hook only reads `gym_id` + `role`, so the two new columns don't affect token claim generation.

**Backend:**
- `lib/twoFactor.ts` — TOTP enrollment + verification (`otplib@12`), 8-char hex recovery codes (sha256-hashed), 32-byte hex challenge tokens, `safeEqualHex` constant-time compare. Server-side QR generation via `qrcode` returns a data URL so the console doesn't need a client-side QR dep.
- `routes/twoFactor.ts` — two routers in one file:
  - `authTwoFactorRouter` mounted at `/api/v1/auth/2fa` (PUBLIC_PATHS-listed) — POST `/verify` exchanges `{challenge_token, totp_code | recovery_code}` for the held Supabase session; consumes the challenge atomically (checks `consumed_at IS NULL` to defeat double-submit races); writes a `2fa.login` (or `2fa.login_recovery_code`) audit row.
  - `superAdminTwoFactorRouter` mounted at `/api/v1/super-admin/2fa` (`requireActiveUser` + `requireSuperAdmin`) — `GET /status`, `POST /enroll` (returns secret + otpauth URL + QR data URL, does NOT persist), `POST /confirm` (validates TOTP against echo'd secret, persists, regenerates 10 recovery codes, returns them once), `POST /disable` (re-auth gate via current TOTP), `POST /recovery-codes/regenerate` (re-auth gate via current TOTP).
- `routes/auth.ts` POST `/login` — when the authenticated user is `super_admin` AND `totp_enabled_at IS NOT NULL`, the response is `{requires_2fa: true, challenge_token, expires_in: 300}` instead of the session bundle. Otherwise the response gains a `totp_enabled` boolean on the user payload so the console can route to enrollment on first login.
- `middleware/auth.ts` PUBLIC_PATHS — added anchored regex for `POST /api/v1/auth/2fa/verify`.
- `index.ts` — mounts `authTwoFactorRouter` BEFORE `authRouter` so a future catch-all on the auth router can't shadow it; mounts `superAdminTwoFactorRouter` BEFORE `superAdminRouter` for the same reason.

**Console:**
- `pages/LoginPage.tsx` — rewritten as a two-step state machine: `'credentials'` → `'totp'`. The TOTP step has a "Use recovery code" toggle and "Restart sign-in" escape hatch. After verify, totp_enabled is stored on the user object and the operator routes to `/gyms`.
- `pages/EnrollTOTPPage.tsx` (new, mounted at `/2fa/setup`) — three stages: load enrollment → scan QR + enter 6-digit code → save recovery codes (gated by an explicit "I have saved" checkbox before "Continue to console"). Recovery codes are displayed in a 2-col mono grid with a one-click "copy all".
- `lib/session.ts` — `StoredUser.totp_enabled` field + `needsTotpEnrollment()` helper.
- `App.tsx` — `ProtectedRoute` redirects to `/2fa/setup` when authorized but unenrolled; new `EnrollGate` wraps `/2fa/setup` and bounces already-enrolled operators to `/gyms` so the route can't be used as a re-enrollment shortcut without re-auth.

**Threat-model notes (deferred, logged in Phase B.5 follow-ups above):** TOTP secret stored plaintext at rest (encryption bundled with JWT rotation), challenge rows accumulate past TTL (cleanup cron deferred), `/auth/2fa/verify` shares `authLimiter` with `/login` (dedicated limiter deferred), no email alerts on login (deferred).

**Existing-user rollout:** existing super_admin sessions before this code deploys have no `totp_enabled` flag in localStorage; on next page load `needsTotpEnrollment` returns true and they're forced through `/2fa/setup`. Existing accounts created via `seed:admin` start with `totp_enabled_at IS NULL` so first login returns the no-2FA branch with `totp_enabled: false`, then the same forced-enrollment flow applies. No backfill required; no breakage.

**Verified:** `npm run -w backend build` clean. `npm run -w console build` clean (456 kB JS / 51 kB CSS pre-gzip — +10 kB JS for the LoginPage state machine + EnrollTOTPPage). `otplib` initially installed at `^13` which has a different functional API; pinned to `^12` for the legacy `authenticator` singleton.

**Deploy order (must be exactly this):** migration 043 → backend redeploy (Railway picks up new login response shape + 2FA endpoints) → console redeploy. Inverting the order breaks the login SELECT (missing `totp_enabled_at` column) for ~minutes.

**Next:** four remaining Phase B.5 blockers (JWT secret rotation, orphaned-auth-user cron, pre-deploy schema-drift check, superAdmin.ts:202 error-message split) can stack into one PR.

### 2026-05-09 · Root folder cleanup (4-agent triage)

Spawned 4 parallel agents (read-only) to audit the repo root: stale docs, build artifacts, gitignore + secrets, top-level structure. Findings synthesized and approved by user.

**Deleted (fully superseded):**
- `GymApp_Technical_Specification.md` (v1)
- `GymApp_Technical_Specification_v2.md`
- `GymApp_Technical_Specification_v3.md`
- `test_out.txt` (was already gitignored, just stray on disk)
- `backend/migrations/Documents - Shortcut.lnk` (untracked Windows shortcut)
- `backend/migrations/` empty folder removed after move

**Moved (preserve content, declutter root):**
- `GymApp_Technical_Specification_v4.md` → `docs/archive/`
- `GymApp_Technical_Specification_v5.md` → `docs/archive/` *(still authoritative for mobile-app Phases 1–7)*
- `PROGRESS.md` → `docs/archive/` *(frozen at 2026-04-24 "All 10 Phases Done"; superseded by this DEV_LOG)*
- `DEPLOY_GUIDE.md` → `docs/`
- `Screenshots-claude/` → `docs/screenshots/` *(mobile UI design reference, indexed in `docs/screenshots/README.md`)*
- `backend/migrations/{challenge-enrollment,profile-features,routine-sharing}.sql` → `docs/archive/historical-migrations/` *(already applied to production manually; kept for fresh-bootstrap reference, indexed in `docs/archive/README.md`)*

**`.gitignore` hardened:** added defensive patterns to prevent future accidents — `.env.production`, `.env.staging`, `.env.development`, `.env.*.local`, `.env.backup`, `.env.bak`, `*.key`, `*.lnk`, `serviceAccount*.json`, `firebase-adminsdk-*.json`, `.aws/`, `aws-credentials*`. Closes the gap the secrets-audit agent flagged.

**Audit notes (no action taken):**
- `mobile/eas.json` contains the production Supabase URL + anon JWT in plaintext across all build profiles. The anon key is designed to be public (RLS-gated), so this is low-severity URL fingerprinting only — not a leak. Migrating to EAS secrets is a future hardening item, not a fix.
- `specs/` is gitignored (local-only, 15 phase-spec files) — left alone.
- `.idea/` is gitignored — left alone.

**Ideal root layout achieved (matches structure-auditor's recommendation):**
```
admin/  backend/  console/  mobile/  shared/
docs/        # DEV_LOG, PLATFORM_PLAN, DEPLOY_GUIDE, archive/, screenshots/
supabase/    # single source of truth for migrations
.claude/  .gitignore  package.json  package-lock.json
```

**Next:** Phase B.5 work (2FA for super_admin login is the highest-value pickup).

### 2026-05-09 · Phase B v1 shipped to staging (console + admin live)

PR #1 merged to master (`39be22d`). Walked the founder through end-to-end deploy: Vercel admin redeploy, new Vercel `iron-path-console` project, Railway CORS update, Supabase migration application. Console live at https://iron-path-console.vercel.app, admin at https://iron-path-admin.vercel.app, backend at https://backend-production-f43b.up.railway.app/api/v1.

**Surfaces stood up:**
- **Vercel admin** (`iron-path-admin`) — already existed; redeployed after fixing a `VITE_SUPABASE_ANON_KEY` env var that was actually holding the **service_role** key. The Vite bundle had been shipping it to every visitor's browser for 15 days. Anon key swapped in; service_role rotation deferred per founder call (URL never shared, no observed traffic). Logged as Phase B.5 blocker.
- **Vercel console** (`iron-path-console`) — new project, Root Directory `console`, Vite preset, env: `VITE_API_URL` → Railway, `VITE_ENV` → `production`, Sentry DSN deferred.
- **Railway backend** — `CORS_ALLOWED_ORIGINS` appended `https://iron-path-console.vercel.app`. Auto-redeployed.

**Production schema gap discovered + fixed:** the production Supabase database was missing migrations **036–042** despite the code shipping months ago. Discovery path:
1. First gym creation attempt → "Could not find the 'last_modified_at' column of 'gyms' in the schema cache" (041 missing).
2. After applying 039–042, gym creation worked but **PATCH /super-admin/gyms/:id/subscription** still failed with "Gym not found".
3. Root cause: PATCH SELECT references `mrr_cents`, which lives in 036 — also unapplied. The error handler at `superAdmin.ts:202` collapses `readErr || !before` into a single "Gym not found" branch, so a real schema error read as "no rows".
4. Applied 036–038 too. Edit-subscription flow now passes end-to-end.

**Migration 039 broken-as-shipped:** the partial unique index `WHERE created_at > NOW() - INTERVAL '7 days'` errored with `42P17 functions in index predicate must be marked IMMUTABLE`. Plan §6.4 spec'd it but the SQL never ran against real PG. **This commit replaces it** with a regular index `idx_leads_email ON leads (LOWER(email), created_at DESC)`; the time-windowed dedup intent moves to app code (Phase B.5 follow-up: dedup in `POST /leads` handler, return 200 idempotent on hit).

**Phase B.5 backlog created** (above) — five hard blockers before any paying customer touches prod: 2FA, JWT rotation, orphaned-auth-user cron, pre-deploy schema-drift check, and the misleading-error-message fix.

**Verified end-to-end:** super_admin login → /gyms list (3 gyms render with MRR / status / member counts) → click Test gym → Subscription tab → Edit subscription → Tier Starter→Growth → Save → modal closes, list reflects new tier.

**Next:** root folder cleanup (the user-requested 4-agent triage of stale `GymApp_Technical_Specification_v*.md`, `PROGRESS.md`, `test_out.txt`, `Documents - Shortcut.lnk`, etc.). Then Phase B.5 work, then Phase C.

### 2026-05-09 · 4-agent council vote + Tier 2 polish (pre-PR)

User asked for a council vote before deciding the next move from Phase B v1 ship state. Spawned **4 expert agents in parallel** (read-only, no worktrees) to vote across {SHIP, BURN-DOWN-TIER-2, START-PHASE-C}.

**Tally:**
- *Product/GTM* → **3 (Phase C)** — founder has zero customers; QR poster (§17) + onboarding wizard drive user acquisition — the demand-side work that populates the console with trial gyms.
- *Engineering* → **2 (Tier 2)** — backlog is 21 items spanning two phases; three are real liabilities (orphan reconciliation, formatMoneyCents zero-bug, plan §6.4 drift). Diff is already large; don't stack Phase C onto it.
- *Security/RBAC* → **2 (Tier 2)** — Tier 1 closed the bleeding (append-only audit, anchored PUBLIC_PATHS, function-based CORS, requireGymOwner / requireSelfOrSuperAdmin), but **2FA for super_admin (§8.1 #1) is not done** — flagged as a hard prod-ship blocker. Staging is fine; prod is not.
- *Plan adherence* → **1 (Ship)** — Phase B ship gate ("founder closes a deal end-to-end inside the console") is *literally untestable without a deploy*. §9.8 launch checklist blocked at step 3. Plan drift items (§3.7, §6.4) are bookkeeping, deferred fine.

**Reconciled outcome:** apply the cheap Tier 2 items inline (Engineering's high-leverage list intersect Plan adherence's "fine-to-amend-in-PR" list) → ship to **staging via PR**, hold prod until 2FA lands. Phase C deferred until Phase B has at least staging exposure. 2FA + manual-create orphan reconciliation graduate to a "Phase B.5 prod-ship blockers" sub-backlog.

**Tier 2 polish applied (this commit):**
- `console/src/pages/GymsPage.tsx` `formatMoneyCents` — widened signature to `number | null | undefined`, replaced `if (!c)` with `if (c == null)` so $0 MRR renders as `$0.00` instead of the unknown-marker `—`. `gyms.mrr_cents` is `NOT NULL DEFAULT 0` per migration 036, so 0 is a real value, not "unknown".
- `console/src/pages/gyms/OverviewTab.tsx` MRR field — same falsy-guard pattern (`gym.mrr_cents ? ... : '—'`); same fix. Always renders `$X.XX/mo`.
- `console/src/pages/gyms/SubscriptionTab.tsx` MRR stat — same falsy-guard pattern on both `value` and `suffix`; collapsed to unconditional formatting. Always renders `$X.XX` with `/mo` suffix.
- `docs/PLATFORM_PLAN.md` §3.7 — empty-state icon spec amended `gray-600` → `ink-400` to match the console's actual neutrals token.
- `docs/PLATFORM_PLAN.md` §6.4 — migration table reconciled with disk: 041 now `gyms_last_modified_by`, 042 now `audit_log_append_only`, coupons drift from 041 → 043, analytics_views 042 → 044, role_coach 043 → 045. Added a "Status" column tagging shipped vs planned. §16 references updated to match.
- `docs/DEV_LOG.md` Tier 2 carry-over backlog — checked off `formatMoneyCents` + plan amendment items; added 2FA at the top of the list as a prod-ship blocker.

**Verified:** `npx tsc -p console/tsconfig.json --noEmit` clean, `npm run -w console build` clean. Backend untouched.

**Next:** Haiku scribe polish on this entry, commit, push to origin, open PR `claude/hopeful-varahamihira-a9f2cf` → `master` for staging deploy.

### 2026-05-09 · Phase B v1 review pass + Tier 1 fixes

**4 cross-team reviewers** ran in parallel against `dd01fe4` (frontend integration / backend integration / security+RBAC / plan adherence). Build passes typecheck + bundles cleanly. Findings: two CRITICAL block-merge items, four HIGH fixes for this round, handful of MEDs.

**Tier 1 — applied (this commit):**

*Backend (CRITICAL/HIGH):*
- **CRITICAL** `mark-paid` expiry comparison (`backend/src/routes/superAdmin.ts:252-253`) was string-vs-date — `subscription_expires_at` carries `T23:59:59Z` so lexicographically beat `period_end` (date-only), skipping newer periods on the same day. Now compared via `new Date(...).getTime()`.
- **CRITICAL** `super_admin_audit_log` was not append-only at the DB layer — migration 040 created the table without `REVOKE UPDATE, DELETE`. New migration `042_audit_log_append_only.sql` revokes UPDATE/DELETE from `service_role`, `authenticated`, `anon`, and `PUBLIC`. Plan §8 #1 / §12.4 #1.
- **HIGH** CORS allowlist (`backend/src/index.ts`) was a static array, which `cors` middleware doesn't auto-decorate with `Vary: Origin` and didn't match the Vercel preview-deployment regex. Replaced with function-based `origin` callback that checks explicit allowlist, then `^https:\/\/(ironpath-admin|ironpath-console)-[\w-]+\.vercel\.app$`. Plan §8.4.
- **HIGH** `PUBLIC_PATHS` (`backend/src/middleware/auth.ts`) used `originalUrl.startsWith(...)` — any future `/auth/login-bypass-foo` would inherit anonymity. Reworked to anchored regex array keyed optionally by HTTP method.
- **HIGH** `requireGymOwner` and `requireSelfOrSuperAdmin` middlewares missing — plan §6.3 spec'd, only `requireSuperAdmin` existed. Added in `backend/src/middleware/roles.ts`. `requireGymOwner` is `gym_owner` only (NOT `super_admin`) and enforces `req.params.id`/`gymId` matches `req.user.gym_id`.
- **HIGH** `/admin` allowlist still admitted `super_admin` (plan §6.1, §8.1 #3). `routes/admin.ts` now uses `requireGymOwner` for everything past `/admin/me`; super_admin must use `/super-admin/*`.

*Backend (MED):*
- **MED** `randomString()` in `superAdmin.ts` used `Math.random()` for the manual-create temp password. Replaced with `crypto.randomBytes` (CSPRNG).
- **MED** PostgREST `.or(...)` injection in `/super-admin/leads`: `q` was spliced raw into a comma-delimited filter expression. New `sanitizeIlikeTerm` helper strips `,()%_` and caps at 80 chars before splice. Applied to `/super-admin/gyms` ilike on name as well.
- **LOW** `logAudit` could violate the `actor_user_id NOT NULL` constraint if ever called outside `requireSuperAdmin`. Now logs + returns instead of letting the DB raise.

*Console (HIGH):*
- **HIGH** `SubscriptionEditor` "Update plan" tab: `<option value="">— no change —</option>` + `z.enum().optional()` was rejecting empty-string submits, breaking the no-change path. Now `register('tier', { setValueAs: emptyToUndefined })` maps `""` → `undefined` at input bind time, schema stays strict.
- **HIGH** `SubscriptionEditor` was spuriously re-sending `expires_at` on every submit because `<input type="datetime-local">` is minute-precision and the seeded ISO timestamp carries seconds — the round-trip never compared equal. Switched to RHF's `dirtyFields` so only operator-touched fields ship.
- **HIGH** `Modal` ESC handler ran on the capturing phase with `stopPropagation()`, so pressing ESC while a `<select>` popup was open closed both the popup AND the modal — wiping unsaved form state. Moved to bubbling phase with no `stopPropagation`; respects `defaultPrevented`. Also guards `lastActiveRef.focus()` with `document.contains(...)`.

*Console (MED):*
- **MED** `SubscriptionTab` cast `gym.subscription_tier as Tier` without validating; legacy/unknown values would slip through and break the editor's enum guard. Now validates against canonical tier/status lists, returns `null` for unknown.
- **MED** `<SubscriptionEditor key={editorOpen ? 'open' : 'closed'}>` forces a remount on each open so RHF defaults always re-seed from the latest `useGymQuery` cache.
- **MED** Tailwind cyan scale was shifted one shade — `brand-500` mapped to `#06B6D4`, but plan §3.2 names `cyan-500 = #22D3EE` as the canonical primary. Every `bg-brand-500` button was rendering plan-cyan-600. Remapped 400/500/600 to plan hexes (`#67E8F9` / `#22D3EE` / `#0EA5C4`); `brand-300` left at `#67E8F9` so existing `text-brand-300` accents don't wash out. Migrated `LoginPage` button + `main.tsx` ErrorFallback button from `bg-brand-400 hover:bg-brand-300` to the canonical `bg-brand-500 hover:bg-brand-600` (the original was lighter-on-hover, an unintended quirk of the shifted scale).

**Tier 2 — moved to "Phase B v1 review carry-over" backlog above.**

**Verified:** `npx tsc -p backend/tsconfig.json --noEmit`, `npx tsc -p console/tsconfig.json --noEmit`, `npm run -w console build`, `npm run -w backend build` all clean.

**Plan amendments noted (deferred):** §3.7 EmptyState icon spec ("gray-600") should read `ink-400`; §6.4 migration table needs renumbering (041 = `gyms_last_modified_by`, coupons drift to 043+).

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
