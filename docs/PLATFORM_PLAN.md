# IronPath Platform Plan — Super Admin Console + Gym Owner Panel

> **Status:** Living document. Synthesized from a 10-agent planning board (product, design, sales/GTM, customer success, backend, frontend, security, deployment, analytics, QA gotchas).
> **Owner:** Founder (Ahmed). **Created:** 2026-05-09.
> **Purpose:** Source-of-truth for the next development phase. Every PR in this plan should reference its section by anchor.

---

## 0. TL;DR

We're building two web properties on top of the existing backend to make IronPath sellable at scale:

1. **Super Admin Console** (NEW) — `console.ironpath.app` — internal tool for the founder/sales team to manage every gym, run the sales pipeline, edit subscriptions, capture leads, and impersonate gym owners for support.
2. **Gym Owner Panel** (EXISTING, enhance) — `admin.ironpath.app` — paying customer experience: enhanced with Gym Settings, Subscription view, Onboarding wizard, Coach role, member acquisition kit (QR poster, email/SMS templates), trial-expiry sequence, cancellation save flow.

The mobile app is unchanged in scope; it consumes the same backend APIs.

**The single most important activation event:** the gym owner prints the auto-generated QR poster and tapes it to the wall. Every other metric is downstream of that.

---

## 1. Vision & business context

- B2B SaaS. Gyms pay; members use the mobile app for free.
- Tiers: **Starter $49/mo (50 members)**, **Growth $99/mo (200 members)**, **Unlimited $199/mo**.
- 30-day trial, 7-day grace, manual Stripe invoicing today (target: self-serve later).
- Founder is the sales rep. Goal: sell more gyms with less friction, retain them past month 2.

**Levers we will pull (mapped to features below):**
| Lever | Where it lives |
|---|---|
| Faster, demoable sales process | Super Admin: demo gym, impersonation, pipeline kanban |
| Reduce time-to-first-value | Owner Panel: 4-step onboarding, QR poster, seed templates |
| Force expansion | Owner Panel: tier-cap soft warning at 80%, hard block at 100% |
| Reduce churn at trial end | Owner Panel: in-trial usage meter, trial-end comms, member read-only grace |
| Last-mile churn save | Owner Panel: cancellation flow with pause/discount offers |
| Founder operates on data | Super Admin: MRR waterfall, trial→paid %, cohort retention |

---

## 2. Architecture overview

```
┌───────────────────────┐    ┌────────────────────────────┐
│  ironpath.app         │    │  console.ironpath.app      │
│  (marketing — later)  │    │  (super admin, NEW)        │
│  Vite/Next, Vercel    │    │  Vite + React, Vercel      │
└───────────┬───────────┘    └─────────────┬──────────────┘
            │                              │
            │   POST /leads (public)       │   /super-admin/*  (super_admin only)
            │                              │   /admin/*  (impersonation hand-off)
            ▼                              ▼
┌─────────────────────────────────────────────────────────┐
│  Backend  api.ironpath.app  (Node 18 + Express + TS)    │
│  Railway Hobby. Same backend serves all clients.        │
└─────────────────────────────────────────────────────────┘
            ▲                              ▲
            │                              │
┌───────────┴───────────┐    ┌─────────────┴──────────────┐
│  admin.ironpath.app   │    │  Mobile app (RN + Expo)    │
│  (gym owner, EXISTS)  │    │  Members; gym_owner self-  │
│  Vite + React, Vercel │    │  test; super_admin n/a     │
└───────────────────────┘    └────────────────────────────┘
```

- **Monorepo (already npm workspaces):** root `package.json` declares `["mobile","backend","admin","shared"]`. Add `"console"` to that list. Do **not** introduce pnpm or Turborepo yet.
- **`shared/`** is the home for: zod schemas, DTO/types, role enum, formatters, the **axios client factory**.
- **No `packages/ui` yet.** Copy components between `admin/` and `console/` until the second app stabilizes.

---

## 3. Visual identity & design system

### 3.1 Two products, one DNA

- **Gym Owner Panel** keeps brand orange `#FF6B35` on dark — it's the customer-facing product.
- **Super Admin Console** swaps the accent to **electric cyan `#22D3EE`** on a near-black `#0A0A0B` shell, with a thin top status bar (env, commit SHA, request latency). Same type, same spacing, same components. Only accent + chrome differ. This signals "operator console" without forking the design system.

### 3.2 Tokens (single source of truth, both apps)

```
Neutrals
  950 #0A0A0B   900 #111114   850 #17171B   800 #1F1F24
  700 #2A2A31   600 #3A3A44   400 #8A8A95   200 #D4D4DA   50 #FAFAFB

Brand (Owner panel primary)
  orange-400 #FF8A5C   orange-500 #FF6B35   orange-600 #E55A28   tint #FF6B351A

Operator (Console primary)
  cyan-400 #67E8F9     cyan-500 #22D3EE     cyan-600 #0EA5C4

Secondary (shared)
  indigo-500 #6366F1   (links, secondary CTAs)

Semantic
  success #10B981   warn #F59E0B   error #EF4444   info #3B82F6
  Each gets a 10% tint variant for backgrounds.

Spacing (px):  2 / 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
Radius:        sm 6 · md 10 (default) · lg 14 (modals) · pill 999
Borders:       1px gray-800 default; gray-700 on hover. No double-borders.
Shadows:       none on dark surfaces — use border + bg elevation instead.
```

### 3.3 Typography

- **UI:** Inter Variable (400/500/600/700)
- **Numeric/data:** JetBrains Mono — tabular figures in tables, IDs, timestamps, money
- **Scale (rem):** 0.75 / 0.875 / 1 / 1.125 / 1.25 / 1.5 / 1.875 / 2.25
- **Line height:** 1.2 headings, 1.5 body. **Tracking:** -0.01em on 1.25rem+

### 3.4 Component library

**shadcn/ui on Tailwind, in `console/` from day one. Retrofit `admin/` opportunistically.**

- We own the source — no runtime lock-in.
- Radix a11y baked in.
- Theme via CSS variables → cyan/orange swap is a single token change.
- Mantine fights Tailwind, hand-rolled is too slow at this stage.

### 3.5 Iconography

**Lucide.** Swap all emoji nav icons (`📊👥🔗📢⚡` in `admin/src/components/Layout.tsx`). Emojis render inconsistently across OS/browsers, can't be recolored, look amateur in B2B. Keep emojis in user-generated content only.

### 3.6 Charts

**recharts** — already a dependency in `admin/package.json` but unused. Replace `DashboardPage`'s manual CSS-bar with `BarChart`. Use the same library in console for MRR/churn/usage.

Visual language: filled area for trends (gradient fade to transparent, single accent), horizontal bars for rankings, sparklines in KPI cards. **Gridless** — only a faint bottom axis `#2A2A31`. No legends when one series. Tooltips: dark cards with mono numerics. Animation: 200ms ease-out, never on data refresh.

### 3.7 States

- **Empty:** centered Lucide icon (gray-600, 32px) + one-line headline + one-line subtext + single primary CTA. No illustrations.
- **Loading:** skeleton blocks (gray-850, subtle shimmer 1.5s). Spinners only inline in buttons.
- **Error:** inline red-tinted card with retry. Toasts only for transient failures.
- **Success:** toast 3s, top-right, success-tinted, auto-dismiss.

### 3.8 Voice & tone

Direct, operator-grade. Verbs first ("Add member," not "Click here to add"). Numbers over adjectives. No exclamation marks. No "Oops!" — say what broke and what to do. Console tone is one notch drier (Linear/Vercel-y); Owner tone is warmer but never chatty.

---

## 4. Feature catalog — Gym Owner Panel (`admin.ironpath.app`)

> Existing pages: Dashboard, Members, Invites, Announcements, Challenges. Everything below is **new** unless noted.

### 4.1 Onboarding wizard (post-signup, blocks dashboard until complete)

**4 critical steps, in order:**
1. **Brand your gym** — logo upload, gym name confirm, accent color picker.
2. **Generate invite code + download QR poster** — auto-generated PDF (A3 + A4) branded with their logo. **THIS IS THE CRITICAL STEP.**
3. **Post first announcement** — pre-filled template "Welcome to {Gym} on IronPath!"
4. **Invite one staff trainer** (optional, prompted) — gives them a coach handle from day 1.

**Seed (don't force-create):**
- 3 starter announcement templates
- 2 starter challenge templates ("30-Day Squat Streak", "First 10 Workouts")
- Full exercise library (already present)

**Tracked in DB** (`gym_onboarding_steps` table — see §7) so we can reopen the wizard if abandoned.

### 4.2 Gym Settings page (`/settings`)

Sections, each a separate card:

- **Profile** — name, location, description, accent_color (extends existing PATCH `/gyms/:id`)
- **Branding** — logo upload (signed URL flow, ≤2MB image/*, see §7.5)
- **Contact** — phone, website, address, timezone, default units (kg/lb)
- **Invite code** — current code, QR preview, copy + download poster + email blast button
- **Coach roster** — list of staff trainers, invite by email, revoke
- **Account** — email, password reset link, owner full name
- **Danger zone** — cancellation flow entry point

### 4.3 Subscription page (`/subscription`)

- Current tier badge, member usage `47 / 50`, days into billing period
- **Self-serve upgrade** — picks tier, monthly vs annual toggle (annual = 2 months free), collects PO/billing contact, sends sales lead to console (until Stripe checkout is wired up)
- Live counter on pricing page: "You have 73 members → Growth ($99) covers you."
- Past invoices list (read-only, sourced from `subscription_payments`)
- Data export (CSV of members, workouts, leaderboard) — **counterintuitive anti-churn lever; reduces lock-in anxiety at signup**
- Cancellation flow — required reason picker → contextual save offer (pause 60d / 1 month free / downgrade tier) → final confirm

### 4.4 Trial mechanics (banner + behaviors)

- Persistent header banner: `Day 18/30 · 47 members active · 312 workouts logged` with "Convert to paid" CTA.
- Tier-cap soft warning at 80% (banner). At 100%, **block new invite generation**, show upgrade modal.
- **Trial-expiry comms timeline:**
  - Day 21: email + banner — "9 days left. Members logged 312 workouts. Here's what you'd lose."
  - Day 25: email with social proof + ROI math
  - Day 28: owner-only push notification
  - Day 30: convert prompt on every screen
  - Day 31 (expired): owner panel locked to billing screen only. **Members keep read-only access for 7 days** — don't punish them; they're the leverage.
  - Day 37: member app shows "Your gym needs to renew."
- On convert: unlock unlimited members (per tier), advanced analytics, CSV export.

### 4.5 Member acquisition kit (`/grow`)

- **QR poster PDF** — A3 + A4, branded with gym logo, generated server-side or client-side via `react-pdf`
- **Email blast template** — merge fields, "Send via your email" copy button
- **SMS template** — 160 chars with invite link
- **Instagram story template** — 1080x1920 PNG with QR overlay
- **Front-desk script** — printable card, "Hey, we just launched our app — scan this"

### 4.6 Coach / staff role (Growth tier and up)

New role `coach` (or `gym_staff`) — promoted by gym_owner. Permissions:
- Read members, create announcements, create challenges
- **Cannot** edit subscription, delete gym, edit settings, remove other staff

Backend: extend role enum, update `requireGymOwner` middleware to optionally accept `coach` for specific routes. UI: per-route role check.

### 4.7 Member analytics (existing dashboard upgrades)

- Replace CSS-bar with recharts area chart
- New "At-risk members" widget: members with no workouts in 14d
- New "Engagement" widget: % active members, workouts/active-member/week
- Member detail drawer: workout history, PRs, streaks, last active

### 4.8 Activation milestones (in-app celebrations)

- "Activated" = 10 members joined + 1 announcement + 25 workouts in first 14 days
- "Sticky" = 25 members + 50 workouts/week
- Each milestone triggers in-app confetti toast + email to owner + nudge to next step.

### 4.9 Bulk member tools

- CSV upload of email list → sends invite codes (uses existing `POST /gyms/:id/invite-email`)
- Push to all members (admin-broadcast in mobile app — uses existing notification infra)

### 4.10 In-app help (minimum viable)

- 4 sub-60-second Loom videos embedded on dashboard (Setup, Invite, Announce, Challenge)
- Contextual tooltips on first visit to each screen (dismissible, persisted per user)
- **Intercom or Crisp** chat widget with 4-hour SLA — non-negotiable for non-technical buyers
- **Skip** in v1: full knowledge base, community forum, AI chatbot

---

## 5. Feature catalog — Super Admin Console (`console.ironpath.app`)

> Audience: 1–3 internal users (founder, optional SDR/CSM later). Login is `super_admin` only. Cyan accent, near-black shell.

### 5.1 Top nav & layout

```
Inbox · Pipeline · Gyms · Subscriptions · Analytics · Audit · Broadcast · Settings
```

Top status bar (always visible): env (`prod`/`staging`), commit SHA, last API latency. Click latency to open Sentry.

### 5.2 Lead Inbox (`/inbox`)

- Single feed of new leads from public marketing form (`POST /leads`).
- Columns: timestamp, source, gym name, owner email, # members reported, biggest pain, status.
- Actions: claim, assign, mark contacted, convert to gym (auto-creates trial gym + sends magic-link email), mark dropped.
- Slack/email ping to founder on every new lead.

### 5.3 Sales Pipeline (`/pipeline`)

Kanban: **New Lead → Demo Booked → Trialing → Negotiating → Won → Lost** (+ Churned).

Per-gym record: notes timeline, call logs, next-step task with due date, lost-reason field. "Today" view filters to tasks due + trials ending this week + demos on calendar. Weekly pipeline value report (expected MRR by stage × probability).

### 5.4 All Gyms list (`/gyms`)

TanStack Table. Columns: name, tier, status, members used / cap, trial days left, MRR, last activity, owner contact.
Filters: trials expiring this week, expired/grace, by tier, by activation health (red/yellow/green).
Bulk actions: extend trial, send broadcast.
Saved views (e.g. "Hot Trials", "Renewals This Week").

### 5.5 Gym detail (`/gyms/:id`)

Nested routes: `/members`, `/subscription`, `/audit`, `/onboarding`.
- Top: gym profile, owner contact (clickable to email/call), subscription status, activation health badge.
- Sub-tabs:
  - **Members** — read view of the gym's roster
  - **Subscription** — tier, expiry, payment history, mark-paid button, extend-trial button, override price button
  - **Audit** — every super_admin action against this gym
  - **Onboarding** — checklist progress, force-complete steps
  - **Activity** — workouts/day chart, member engagement
- Right rail: notes + tasks (sales CRM view).

### 5.6 Subscription editor (modal from gym detail)

- Tier picker (Starter / Growth / Unlimited)
- Status (trial / active / expired / cancelled)
- Expiry date picker
- MRR override (for negotiated discounts)
- Mark paid: amount, period start/end, note
- Extend trial: +7 / +14 / +30 with reason
- Coupon code apply
- Founding-gym lifetime-lock-in flag
- All writes audited.

### 5.7 Manual gym creation (`/gyms/new`)

For sales calls where you onboard the customer yourself. Mirrors `POST /gyms` but:
- No rate limit (super_admin only)
- Accepts owner email; sends magic-link instead of asking for password
- Lets you pre-set tier, custom trial length, custom price

### 5.8 Demo Gym tools (`/demo`)

- One-click "Spawn Demo Gym" — creates a gym pre-seeded with 30 fake members, 90 days of workouts, leaderboard, sample routines.
- Reset Demo button to wipe state between calls.
- Tier-toggle on the demo account to flip $49 / $99 / $199 features live during the call.
- Shareable read-only demo link to leave behind.

### 5.9 Impersonation

`POST /super-admin/impersonate/:userId` issues a 15-minute scoped JWT. UI flow:
1. Super admin clicks "View as owner" on gym detail.
2. Confirms with their own password (re-auth gate).
3. New tab opens at `admin.ironpath.app/?impersonation_token=...`.
4. Owner panel renders **with persistent banner** "You are viewing ACME Gym as Sarah — Exit (14:53)".
5. **Exit** clears the impersonation token; super_admin's own session is untouched.

Constraints:
- Cannot impersonate another super_admin.
- Cannot chain impersonations.
- Every action while impersonated tagged `actor_id=super_admin_id, on_behalf_of=owner_id` in audit.
- Optional read-only mode (header `X-Impersonate-Readonly: true`).

### 5.10 Analytics dashboard (`/analytics`)

**Top 5 KPIs to ship FIRST:**
1. **MRR + waterfall** — Start + New + Expansion − Contraction − Churn = End. Click any bucket → contributing gyms.
2. **Paid customer count + trial count**
3. **Trial → Paid conversion %** (trailing 90 days)
4. **Per-gym activation health score** — green/yellow/red, sortable
5. **Logo cohort retention by signup month** — standard retention triangle

Phase 2: NRR/GRR, LTV, CAC, tier cohorts, expansion revenue waterfall.

### 5.11 Audit log (`/audit`)

Read-only view of `super_admin_audit_log` table. Filters: actor, target, action type, date range. Each row expandable to show before/after JSON diff. Immutable — no edit/delete UI.

### 5.12 Broadcast (`/broadcast`)

Send email to: all owners / tier:starter / specific gym IDs.
Compose form with subject + markdown body + optional CTA button. Preview + test-send to founder first. Audited; rate-limited (1 broadcast per hour).

### 5.13 Coupons (`/coupons`)

Code, % or $ off, expiry, max redemptions, tier restriction. Used by self-serve upgrade flow and during sales.

### 5.14 Settings (`/settings`)

- Team management (Admin / Sales / CSM / Read-only roles within super_admin tier — phase 2)
- IP allowlist editor
- 2FA setup (mandatory)
- Slack webhook for new-lead pings

---

## 6. Backend architecture

### 6.1 Router topology

| Mount | Router | Guard chain |
|---|---|---|
| `/api/v1/auth/*` | existing | public + `authLimiter` |
| `/api/v1/gyms/*` | existing (extend) | `requireActiveUser` + `requireGymOwner` |
| `/api/v1/admin/*` | existing (gym_owner-scoped) | `requireActiveUser` + `requireGymOwner` |
| `/api/v1/super-admin/*` | **NEW** | `requireActiveUser` + `requireSuperAdmin` |
| `/api/v1/leads` | **NEW** public | `leadLimiter` only |

**Cleanup:** `routes/admin.ts:11-30` currently allows both `gym_owner` and `super_admin` but then blocks super_admin without `gym_id` at line 26 — confusing dead-end. Remove super_admin from the `/admin` allowlist; route them through `/super-admin` instead.

### 6.2 New endpoints

#### Super admin (all `requireSuperAdmin`)
- `GET /super-admin/gyms` — filters: q, status, tier, created_after, mrr_min, page
- `GET /super-admin/gyms/:id` — full detail + onboarding % + last 10 audit entries
- `POST /super-admin/gyms` — manual creation
- `PATCH /super-admin/gyms/:id` — admin override on any field (audited)
- `GET /super-admin/gyms/:id/subscription`
- `PATCH /super-admin/gyms/:id/subscription` — tier/status/expires_at/mrr_cents (audited)
- `POST /super-admin/gyms/:id/subscription/mark-paid` — `{amount_cents, period_start, period_end, note}` → inserts `subscription_payments` + extends expiry (audited)
- `POST /super-admin/gyms/:id/subscription/extend-trial` — `{days, reason}` (audited)
- `POST /super-admin/impersonate/:userId` — `{password_confirm}` → 15-min JWT (audited)
- `POST /super-admin/broadcast-email` — `{subject, body, audience}` (audited, dedicated rate limit)
- `GET /super-admin/leads`, `PATCH /super-admin/leads/:id`
- `GET /super-admin/audit?actor&target&from&to&page`
- `GET /super-admin/analytics/mrr` (12-month trend)
- `GET /super-admin/analytics/churn`
- `GET /super-admin/analytics/trial-conversion`
- `POST /super-admin/demo-gym/spawn`, `POST /super-admin/demo-gym/reset`
- `GET /super-admin/coupons`, `POST /super-admin/coupons`, etc.

#### Gym owner additions
- `GET /gyms/:id/subscription` — read-only view of own subscription
- `GET /gyms/:id/onboarding` — merge canonical step list with DB rows
- `POST /gyms/:id/onboarding/:stepKey/complete` — idempotent upsert
- `POST /gyms/:id/logo/upload-url` — returns `{upload_url, public_url, path}` for signed direct upload to Supabase Storage
- `PATCH /gyms/:id` — extend to accept `phone, website, address, timezone, units_default, logo_url` (extends existing schema at `backend/src/routes/gyms.ts:116`)

#### Public
- `POST /leads` — body `{email, name?, gym_name?, message?, source?, utm_*}`. Honeypot field `website` must be empty. Rate-limited 5/min/IP, 30/hour/IP. **Add `/leads` to `PUBLIC_PATHS` in `backend/src/middleware/auth.ts:17`.**

### 6.3 New middlewares (`backend/src/middleware/roles.ts`)

```
requireGymOwner       → role ∈ (gym_owner, super_admin) AND gym_id matches param/JWT
requireSuperAdmin     → role === super_admin (no gym scoping)
requireSelfOrSuperAdmin → role === super_admin OR userId matches req.user.id
```

`requireCoach` (later, when coach role lands) — role ∈ (coach, gym_owner, super_admin).

### 6.4 New migrations

| # | File | Purpose |
|---|---|---|
| 035 | `035_subscription_extras.sql` | `ALTER TABLE gyms ADD COLUMN mrr_cents, phone, website, address, timezone, units_default, logo_url`. Add `ON DELETE` cascades for any new FKs. |
| 036 | `036_subscription_payments.sql` | New `subscription_payments` table (gym_id, amount_cents, period_start/end, note, recorded_by, created_at) |
| 037 | `037_gym_onboarding_steps.sql` | New `gym_onboarding_steps` table (composite PK gym_id + step_key, completed_at, completed_by, metadata jsonb) |
| 038 | `038_leads.sql` | New `leads` table + partial unique index on lower(email) WHERE created_at > now()-7d |
| 039 | `039_audit_log.sql` | New `super_admin_audit_log` (actor_user_id, action, target_type, target_id, before jsonb, after jsonb, ip, user_agent, created_at) — append-only; revoke UPDATE/DELETE on the table from app role |
| 040 | `040_coupons.sql` | New `coupons` + `coupon_redemptions` tables |
| 041 | `041_analytics_views.sql` | `view_gym_mrr`, `view_subscription_events`, `view_trial_conversion` |
| 042 | `042_role_coach.sql` | Add `coach` to role enum + permissions |

> **Critical:** `034_auth_hook.sql` must remain the **last** migration — the JWT custom-claims hook references `public.users` and runs on every token issue. Renumber if needed but never reorder past 034.

### 6.5 Audit log helper

`backend/src/lib/audit.ts`:
```
logAudit(req, { action, target_type, target_id, before, after })
```
Wrap every super-admin write handler. **Never block the response on audit failure** — log + continue. Index on `(actor_user_id, created_at DESC)` and `(target_type, target_id, created_at DESC)`.

### 6.6 Logo upload pattern (Supabase Storage)

Storage has no native move and no auto-cleanup. The pattern:
1. Client requests signed upload URL from `POST /gyms/:id/logo/upload-url`.
2. Client PUTs bytes directly to Supabase Storage.
3. Client calls `PATCH /gyms/:id` with the new `logo_url`.
4. Server records the **previous** `logo_url` and explicitly removes that object after successful update.

Folder structure must match the existing policy at `supabase/migrations/033_storage_policies.sql:14` — `gym_id` as first segment.

### 6.7 Impersonation token approach

The auth middleware at `backend/src/middleware/auth.ts:42` validates via `supabaseAuth.auth.getUser(token)` — which will not validate self-minted JWTs. Two options:

- **(A) Preferred:** mint impersonation token via Supabase admin API (`generateLink` → magic-link with short TTL). Existing auth flow validates it untouched. Store the `act` (actor) claim in a custom claim column on the user during the impersonation window.
- **(B) Fallback:** add a parallel verification path in auth middleware that recognizes impersonation tokens by signature (`SUPABASE_JWT_SECRET`), enforces `exp ≤ 15min`, and stamps `req.user.impersonated_by`.

Either way: **time-bound, audit issuance AND first use, deny chained impersonation, deny super_admin → super_admin.**

---

## 7. Frontend architecture

### 7.1 Folder layout

```
/
├── admin/          (gym owner, exists)
├── console/        (super admin, NEW — copy admin/ scaffolding)
├── backend/
├── mobile/
├── shared/         (zod schemas, types, role enum, axios factory, formatters)
└── supabase/
```

Add `"console"` to root `package.json` workspaces. **Do not** create `packages/ui` or `packages/api-client` yet.

### 7.2 Stack decisions (locked-in)

| Concern | Decision | Why |
|---|---|---|
| Routing | `react-router-dom` v6 | Already in use; nested routes for gym detail. Plan migration to `createBrowserRouter` later for route loaders. |
| State | React state + small `AuthContext` | No global state need yet. Adopt Zustand only when impersonation drawer / multi-step wizard demands it. |
| Data fetching | **TanStack Query (both apps)** | Eliminates ~40% of every page's loading/error/refetch boilerplate. Single `QueryClientProvider` in `main.tsx`. Start with invalidation, optimistic updates later. |
| Components | **shadcn/ui** in `console/` from day one. Retrofit `admin/` page-by-page. | Owns source, Radix a11y, easy theming, no runtime lock-in. |
| Forms | **react-hook-form + zod** | Backend already uses zod; share schemas via `shared/`. Uncontrolled model fixes focus-loss bugs. |
| Tables | **TanStack Table (headless)** for `console/` All-Gyms + Audit. Owner-side `MembersPage` stays hand-rolled until columns/sort are needed. | Sort/filter/virtualize are non-negotiable on data-heavy admin views. |
| Charts | **recharts** | Already in `admin/package.json`, currently unused. |
| HTTP | Single axios factory in `shared/` `(baseURL, storageKeyPrefix)` → both apps instantiate per-app clients. Namespaced storage: `ip_owner_*`, `ip_console_*`, `ip_console_impersonation_*`. | Prevents cross-app token collisions on same browser. |
| Build | Two Vite apps, two ports: `admin` 5173, `console` 5174. Each `vite.config.ts` proxies `/api` → `localhost:3000`. | Origin-relative dev URLs keep CORS simple. |
| Testing | **Vitest + RTL** for auth context, impersonation reducer, zod schemas. **Playwright** for 3 critical flows: owner login, super-admin impersonate→exit, subscription update. | v1 minimum; no coverage chasing. |
| Errors | **Sentry** in both apps; release tag = `VERCEL_GIT_COMMIT_SHA`. | Required for B2B SaaS reliability. |

### 7.3 Auth & impersonation flow

Owner panel:
- Login → token stored in `ip_owner_access_token` / `ip_owner_refresh_token`.
- Role gate: `ProtectedRoute` checks **role** from stored user, not just token presence (current bug at `admin/src/App.tsx:11`).

Console:
- Login → `ip_console_*` tokens. Role gate must require `super_admin`.

Impersonation (super_admin → owner panel):
1. Console: `POST /super-admin/impersonate/:userId` with password_confirm.
2. Backend returns short-lived owner-scoped token.
3. Console opens `admin.ironpath.app/?impersonation_token=...` in new tab.
4. Owner panel reads `impersonation_token` from query, stores in `ip_console_impersonation_*`, sets `X-Impersonated-By` header on every request.
5. Persistent banner renders with countdown + Exit button.
6. Exit → clears the impersonation slot only; original session untouched.

### 7.4 Token refresh hardening (mandatory)

Current `admin/src/lib/api.ts:20-36` has `_retry` guard ✅ but allows **concurrent 401s to each fire their own refresh**. Add a single in-flight refresh promise that other requests await. Pattern:

```ts
let refreshing: Promise<...> | null = null;
// 401 handler:
refreshing = refreshing ?? api.post('/auth/refresh', ...);
const result = await refreshing;
refreshing = null;
```

### 7.5 Vite env vars

- All client-bundle vars **must** be `VITE_`-prefixed.
- `VITE_API_URL` set per environment (Production / Preview / Development) per app.
- These are **not secrets** — they're inlined at build time. Never put Supabase service_role key here.
- Redeploy after changing any var; Vite bakes them in.

---

## 8. Security & RBAC

### 8.1 Threat ranking (top 5 must-do before v1 ship)

1. **Implement 2FA (TOTP) + IP allowlist for super_admin login.** One compromised credential = read/write access to all gyms.
2. **Audit log + comprehensive logging of every super_admin write** (before/after JSON, IP, user agent). Append-only.
3. **Refactor `/admin` to remove super_admin from its allowlist; route super_admin through `/super-admin/*` with hard role check at router entry.**
4. **Time-bounded impersonation JWT (≤15min) + UI banner + deny super_admin↔super_admin + deny chained impersonation.**
5. **Harden CORS: explicit allowlist, no wildcards, `SameSite=Strict` cookies, secure + httpOnly flags.**

### 8.2 Authentication hardening for super_admin

- 2FA mandatory; recovery codes encrypted in `super_admin_recovery_codes` table.
- IP allowlist; email + Slack alert on IP change.
- Session timeout 15–30 min (vs 24h for owners). Auto-logout warning at 10min.
- Separate login URL: `/api/v1/super-admin/login` (distinct metrics + alerts).
- Login alerts: email on every login (time, IP, device).
- Password policy: 12+ chars; force quarterly rotation; no reuse of last 5.

### 8.3 RBAC enforcement

- **API layer only.** Frontend role gates are UX, not security.
- Three middlewares as defined in §6.3.
- Every super-admin write must produce an audit row.
- Service-role Supabase client bypasses RLS — gym isolation lives in WHERE clauses (`backend/src/lib/supabase.ts:10`).

### 8.4 CORS

```
allowlist = [
  'https://admin.ironpath.app',
  'https://console.ironpath.app',
  'http://localhost:5173',  // dev
  'http://localhost:5174',  // dev console
]
preview pattern = /^https:\/\/(ironpath-admin|ironpath-console)-[\w-]+\.vercel\.app$/
```

Reflect matched origin into `Access-Control-Allow-Origin`. Set `Vary: Origin`. Never `*` with credentials.

### 8.5 Lead form hardening

- Honeypot field `website` (must be empty).
- Rate limit 5/min/IP, 30/hour/IP.
- Email validation (format + disposable-domain blocklist).
- CAPTCHA after 5 invalid submits.
- Partial unique index on `lower(email)` WHERE `created_at > now() - 7 days` to avoid spammy resubmissions creating dupes.

### 8.6 Secrets

- Vercel env vars: only `VITE_*` (public).
- Railway env vars: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `RESEND_API_KEY`, etc.
- Quarterly rotation for service_role; on-demand for any leak.
- Service_role NEVER reaches frontend bundle.

### 8.7 PII / GDPR

- Soft delete pattern preserved (`deleted_at` + email rename to `deleted_{id}@ironpath.invalid`).
- Data export endpoint per gym → signed S3 URL, 24h expiry.
- Audit retention 2 years; cold-storage archive after 90 days.
- Right-to-be-forgotten = anonymize (null/hash PII) but keep audit trail.

---

## 9. Deployment (Vercel)

### 9.1 Project structure

**One Vercel project per app.** Two projects: `ironpath-admin` and `ironpath-console`. Both connect to the same GitHub repo with different Root Directory settings. (Add a third `ironpath-marketing` later.)

### 9.2 Per-project settings

- Root Directory: `admin/` and `console/` respectively
- Framework Preset: Vite
- Build Command: `npm run build`
- Output: `dist`
- Node version: 20 (Vite 5+ drops Node 18). Pin via `engines.node` in each `package.json`.

### 9.3 Preview URL strategy

**Ignored Build Step** per project: `git diff HEAD^ HEAD --quiet ./` — Vercel runs from the project's Root Directory, so it skips builds when nothing in `admin/` or `console/` changed. Every PR still gets one preview URL per affected app.

### 9.4 Domains

- `admin.ironpath.app` → CNAME `cname.vercel-dns.com` (admin project)
- `console.ironpath.app` → CNAME `cname.vercel-dns.com` (console project)
- `ironpath.app` apex + `www` → marketing project (later); 301 redirect `www` → apex.
- Add CAA record allowing `letsencrypt.org` if registrar enforces CAA.

### 9.5 SPA fallback

`vercel.json` in each app:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

### 9.6 CI/CD

- GitHub integration auto-deploys: `master` → production, PRs → preview.
- Branch protection on `master` requiring: Vercel preview success + `npm run lint && npm run typecheck && npm run build` workflow + Playwright smoke against the preview URL.
- Rollback: "Promote to Production" on the prior deployment in dashboard — instant, no rebuild.

### 9.7 Cost

- Pro plan ($20/user/mo) is required for B2B SaaS; Hobby forbids commercial use.
- Two projects share the team's bandwidth (1 TB included). SPAs are static; bandwidth is the only realistic ceiling.

### 9.8 Console launch checklist

1. Create `console/` app, confirm `npm run build` outputs `dist/`.
2. Push branch; ensure repo is connected to Vercel team.
3. Create Vercel project `ironpath-console`, Root Directory `console`, framework Vite.
4. Add `VITE_API_URL` for Production / Preview / Development.
5. Add Ignored Build Step.
6. Trigger first production build from `master`; verify `*.vercel.app` URL works.
7. Add Sentry SDK with console-specific DSN.
8. Update Railway CORS allowlist: add `https://console.ironpath.app` + preview regex.
9. DNS: CNAME `console` → `cname.vercel-dns.com`.
10. Add `console.ironpath.app` in Vercel project Domains; confirm cert.
11. Smoke test: login, API call, error reporting, 404 fallback (SPA rewrite).
12. Enable branch protection.
13. Document rollback procedure; tag first prod deploy in Sentry.

---

## 10. Analytics

### 10.1 Storage

**Postgres + materialized views, refreshed hourly via cron.** No PostHog/external warehouse until past 500 gyms. Add an append-only `events` table (15 events below) + a nightly `mrr_snapshot` table (one row per gym per day) — snapshots make month-over-month math trivial and immune to backdated edits.

### 10.2 Events to instrument

| Event | Key properties |
|---|---|
| `gym_created` | gym_id, owner_id, tier, source |
| `owner_logged_in` | gym_id, owner_id, ts |
| `invite_code_shared` | gym_id, channel |
| `member_joined` | gym_id, member_id, via_invite_code |
| `first_workout_completed` | gym_id, member_id, ts |
| `workout_logged` | gym_id, member_id, exercise_count, duration |
| `announcement_created` | gym_id, owner_id |
| `challenge_created` | gym_id, type, participants |
| `challenge_joined` | gym_id, member_id, challenge_id |
| `trial_started` | gym_id, ts, ends_at |
| `trial_extended` | gym_id, days, reason |
| `subscription_started` | gym_id, tier, mrr |
| `subscription_upgraded` | gym_id, from_tier, to_tier, delta_mrr |
| `subscription_downgraded` | gym_id, from_tier, to_tier, delta_mrr |
| `subscription_cancelled` | gym_id, tier, reason, mrr_lost |

### 10.3 KPI definitions (formulas)

- **MRR** = sum of normalized monthly revenue across active paid gyms (annual / 12).
- **ARR** = MRR × 12.
- **New MRR** = MRR added by gyms paying for the first time this month.
- **Expansion MRR** = MRR delta from tier upgrades. Quirk: discrete steps of $50/$100.
- **Contraction MRR** = MRR delta from downgrades.
- **Churn MRR** = MRR lost to cancellations this month.
- **GRR** = (Start − Churn − Contraction) / Start. Caps at 100%.
- **NRR** = (Start − Churn − Contraction + Expansion) / Start.
- **Trial→Paid %** = paid_trials / completed_trials over trailing 90 days.
- **ACV** = ARR / paid customer count.
- **LTV (rough)** = ARPU / monthly logo churn rate. Report as directional with confidence band.
- **CAC** = sales+marketing spend / new paid customers (founder enters spend manually for v1).

### 10.4 Activation health score (per gym)

```
green  if ≥5 members joined AND ≥3 workouts logged in week 1
yellow if active but below thresholds
red    if owner hasn't logged in 7+ days mid-trial
```

### 10.5 Backfill

- Reconstruct `mrr_snapshot` by replaying current `subscriptions.created_at`/`cancelled_at`/`tier_changed_at`.
- Backfill activation events from existing `workouts`, `users`, `gyms` `created_at` columns.
- Manual CSV import of historical Stripe invoice dates.
- Verify: backfilled current-month MRR must match Stripe dashboard within $5.

---

## 11. Phased delivery plan

### Phase A — Foundation (1 sprint, ~1 week)
**Goal:** Owners can configure their gym + see their subscription.

- [ ] Migration 035 (gyms columns) + 036 (subscription_payments) + 037 (gym_onboarding_steps)
- [ ] Backend: extend `PATCH /gyms/:id`; new `GET /gyms/:id/subscription`, `GET/POST /gyms/:id/onboarding/*`, `POST /gyms/:id/logo/upload-url`
- [ ] Owner panel: Gym Settings page, Subscription page (read-only), refresh-token in-flight guard fix in `admin/src/lib/api.ts`, role-aware ProtectedRoute
- [ ] Migrate Dashboard CSS-bar → recharts; install Lucide; replace emoji nav
- [ ] **Ship gate:** owner can update gym, upload logo, see trial countdown.

### Phase B — Super Admin Console v1 (1.5 sprints)
**Goal:** Founder can run sales from the console.

- [ ] Add `console/` to workspaces; copy admin scaffolding
- [ ] Migration 039 (audit_log) + 038 (leads)
- [ ] New `requireSuperAdmin` middleware; new `superAdmin` router
- [ ] Backend: `GET /super-admin/gyms`, `GET /super-admin/gyms/:id`, `PATCH /super-admin/gyms/:id/subscription`, `POST .../mark-paid`, `POST .../extend-trial`
- [ ] Backend: `POST /leads` (public), `GET /super-admin/leads`
- [ ] Console pages: Login (with 2FA), All Gyms list, Gym Detail, Subscription editor modal, Lead Inbox
- [ ] CORS hardening, separate `ip_console_*` storage namespace
- [ ] Sentry in both apps
- [ ] Vercel project `ironpath-console` + DNS
- [ ] **Ship gate:** founder closes a deal end-to-end inside the console.

### Phase C — Onboarding & retention (1 sprint)
**Goal:** New trials reach activation faster; expiring trials convert.

- [ ] Owner panel: 4-step onboarding wizard (blocks dashboard until done)
- [ ] QR poster PDF generator + member acquisition kit page
- [ ] Trial banner with day count + member/workout stats
- [ ] Trial-expiry email sequence (day 21/25/28/30/31/37) via Resend + cron
- [ ] Tier-cap soft warning + hard block
- [ ] Cancellation flow with save offers
- [ ] Activation milestone celebrations
- [ ] **Ship gate:** trial→paid conversion measurable; 3 trials onboarded with new wizard.

### Phase D — Sales acceleration (1 sprint)
**Goal:** Sales velocity tooling.

- [ ] Pipeline kanban + per-gym notes/tasks
- [ ] Demo gym spawn/reset
- [ ] Impersonation (full flow + banner + audit)
- [ ] Broadcast email
- [ ] Coupons engine
- [ ] Migration 040 (coupons), 041 (analytics views)
- [ ] **Ship gate:** founder runs a complete demo using a spawned demo gym + impersonation.

### Phase E — Analytics & insight (1 sprint)
**Goal:** Founder operates on data, not vibes.

- [ ] Events table + the 15 instrumented events
- [ ] `mrr_snapshot` cron + backfill
- [ ] Console analytics dashboard: MRR waterfall, trial conversion %, activation health, cohort retention
- [ ] At-risk member widget on owner dashboard
- [ ] **Ship gate:** founder can answer "what is our MRR? what's our trial conversion this month?" in 5 seconds.

### Phase F — Polish & scale prep
- [ ] Coach role + permissions
- [ ] Bulk member CSV invite
- [ ] In-app help (Loom embeds, tooltips, Intercom widget)
- [ ] Marketing site at `ironpath.app` with pricing page + Calendly + lead form
- [ ] Stripe checkout integration (replace manual invoicing)
- [ ] 2-year audit retention policy + cold-storage archive

---

## 12. Must-knows & gotchas

### 12.1 Backend

1. **`gym_id` from JWT only, never body.** Pattern at `backend/src/routes/admin.ts:79`. Body-supplied gym_id is a critical authorization bypass.
2. **Two Supabase clients in `backend/src/lib/supabase.ts`** — `supabase` (service-role for DB), `supabaseAuth` (for `auth.getUser(token)` in middleware). Don't reuse the main client for auth or RLS state leaks.
3. **Middleware order is fixed** (`backend/src/index.ts:36-41`): CORS → Helmet → Compression → JSON → authMiddleware → rateLimiter → routes. Treat as immutable.
4. **Static routes BEFORE parameterized routes** in the same router. See `backend/src/routes/routines.ts:269` — `/routines/pre-built` declared before `/routines/:id`. Apply the same care inside `superAdminRouter` (e.g. `/super-admin/leads` before `/super-admin/gyms/:id` if they share a prefix).
5. **`POST /workouts` requires `idempotency_key`** UNIQUE(user_id, idempotency_key) per `supabase/migrations/008_workouts.sql:20`. Pattern at `backend/src/routes/workouts.ts:176-177` — check for existing row, return cached response on retry. Do not skip.
6. **`requireActiveUser`** (`backend/src/middleware/requireActiveUser.ts:5-18`) blocks `deleted_at IS NOT NULL` and `is_active = false`. Apply to every authenticated route.
7. **Soft-delete pattern:** `deleted_at = now()`, email rewritten to `deleted_{user.id}@ironpath.invalid` (preserves uniqueness so the same person can re-register). Pattern at `backend/src/routes/auth.ts:116`.
8. **Zod ONLY** — never express-validator. All routes use `z.object().safeParse()` and map errors with `.error.errors.map(...)`. Mixing validators creates inconsistent error envelopes.
9. **Rate limiters are per-route, not global.** `authLimiter` (5/15min/IP), `inviteLimiter` (10/min/IP), `gymRegistrationLimiter` (3/hour/IP), default `rateLimiter` (100/min, keyed by user.id or IP). New routes need to opt-in to the right one.
10. **Accent color regex `/^#[0-9A-Fa-f]{6}$/`** must match between `POST /gyms` (`backend/src/routes/gyms.ts:18`) and `PATCH /gyms/:id` (`backend/src/routes/gyms.ts:120`). Extract to shared constant when changed.
11. **Invite code validation runs in TWO places**: `GET /validate-invite` (`backend/src/routes/gyms.ts:32-39`) and the registration flow. Both must check `invite_expires_at` AND `invite_max_uses`. Increment `invite_uses` only after successful registration.
12. **Personal record detection is bulk + dedup** (`backend/src/routes/workouts.ts:31-135`). Fetches existing PRs, filters locally, bulk-inserts only NEW. Don't insert without dedup or you'll get duplicate PR rows.
13. **Leaderboard snapshots use partial unique indexes** (`supabase/migrations/025_leaderboard_snapshots.sql:17-23`). UNIQUE on `(gym_id, category, period, COALESCE(period_start))` WITH `WHERE exercise_id IS NULL`. ON CONFLICT DO UPDATE for upserts.
14. **Body measurements in cm; weights in kg.** All circumference columns are `_cm`-suffixed `DECIMAL(5,1)` (`supabase/migrations/012_body_measurements.sql:8-18`). Mobile converts inches/lbs at the boundary. Backend never stores imperial.
15. **`034_auth_hook.sql` MUST stay last.** The custom_access_token_hook references `public.users` and runs on every token issue. Renumber additions, never reorder past 034.
16. **Supabase Storage has no native move and no auto-cleanup.** Pattern: signed upload URL → client PUT → server records old URL and explicitly deletes after success. Folder structure must match `supabase/migrations/033_storage_policies.sql:14` (`gym_id` as first segment).
17. **`PUBLIC_PATHS` in `backend/src/middleware/auth.ts:17`** — add new public paths there OR they get blocked by auth middleware. `POST /leads` will need this entry.
18. **Service-role Supabase client bypasses RLS.** Gym isolation lives in app-layer WHERE clauses. Audit every super-admin write with before/after JSON snapshots; don't rely on DB constraints to catch cross-gym leaks.

### 12.2 Frontend

1. **Token refresh race in `admin/src/lib/api.ts:20-36`** — concurrent 401s each kick off their own `/auth/refresh`. Add a single in-flight refresh promise. **Mandatory before TanStack Query rollout.**
2. **`localStorage` for tokens is XSS-readable.** Acceptable for v1 but **namespace per app** (`ip_owner_*`, `ip_console_*`) and plan a path to httpOnly refresh cookies later.
3. **`ProtectedRoute` only checks token presence**, not role (`admin/src/App.tsx:11`). A gym_owner who lands on `console.ironpath.app` with any token will pass. **Gate on role from stored user; redirect role-mismatches.**
4. **`window.location.href = '/login'`** in the 401 handler hard-reloads and discards in-memory state. Once impersonation lands, replace with a `navigate('/login')` via an event-bus pattern so impersonation state can be cleaned up first.
5. **`BrowserRouter` + subdomains:** localStorage doesn't bleed across origins (good). Cookies set on `.ironpath.app` would (decide deliberately whether refresh tokens are per-app or shared).
6. **Vite env vars must be `VITE_`-prefixed.** Document in `console/.env.example` so nobody adds `API_URL=` and silently falls back to localhost in production.
7. **`recharts` is installed but unused** (`admin/package.json`). Migrate `DashboardPage` first; it's dead-weight bundle until then.
8. **`useNavigate` imported in `admin/src/components/Layout.tsx` but unused.** Sign-out uses `window.location` — see #4.
9. **`eslint-disable-next-line` on `MembersPage` mount effect** is hiding a real dependency-array bug. TanStack Query erases the entire class.

### 12.3 Deployment

1. **CORS preview pattern, not wildcard** — `/^https:\/\/(ironpath-admin|ironpath-console)-[\w-]+\.vercel\.app$/`. Reflect matched origin into `Access-Control-Allow-Origin`. Set `Vary: Origin`. Never `*` with credentials.
2. **Vite bakes `VITE_*` at build time.** Changing the var requires a redeploy. Set per environment per project.
3. **Node 20 on Vercel.** Pin via `engines.node` in each `package.json` — Vite 5+ drops Node 18.
4. **SPA rewrite required** — `vercel.json` rewrite `/(.*)` → `/index.html` or 404s on deep links.

### 12.4 Security

1. **Audit log is append-only.** Revoke UPDATE/DELETE on `super_admin_audit_log` from the app role.
2. **Impersonation tokens ≤15min, audit issuance AND first use, deny chained, deny super_admin↔super_admin.**
3. **Re-auth gate before impersonation** — require password confirmation in the same request, not just session.
4. **2FA is not optional for super_admin.** First login forces enrollment.

---

## 13. Anti-features (do NOT build)

- **Granular per-feature RBAC inside a gym.** Gym owners want simple, not Jira. The `gym_owner / coach / member` ladder is enough.
- **In-app live chat widget built in-house.** Use Intercom/Crisp; building it burns 6 weeks for zero conversion lift.
- **Public marketplace / community feed across gyms.** Dilutes B2B positioning, invites moderation hell, gym owners want their data walled off.
- **Multi-currency / i18n in v1.** USD only; English only. Revisit at $50k MRR.
- **Marketplace integrations (Mindbody, Glofox, etc.).** Premature; chase the gym, not the app store.
- **AI chatbot trainer in console.** Adds complexity for the wrong audience.
- **Coverage targets / Storybook in v1.** Coverage chasing is procrastination; Storybook is high-cost low-yield until two real designers + a designer-handoff process exist.

---

## 14. Best-practice checklist for every PR

Before opening a PR in this plan:

- [ ] No `gym_id` from request body — it's read from `req.user`.
- [ ] New endpoint registered in the right router with the right middleware chain.
- [ ] Static paths declared before parameterized paths in the same router.
- [ ] Zod schema for every body; errors mapped to `fields[]`.
- [ ] Migration filename incremented; nothing reordered past `034_auth_hook.sql`.
- [ ] If a super_admin write: `logAudit(...)` is called with before/after.
- [ ] Frontend role gate in addition to API gate (UX, not security).
- [ ] No `console.log`; pino logger in backend, Sentry breadcrumbs in frontend.
- [ ] Token storage namespaced per app (`ip_owner_*` vs `ip_console_*`).
- [ ] Lucide icon, not emoji, in any new UI surface.
- [ ] recharts, not CSS-bar, for any new chart.
- [ ] Empty / loading / error / success states all explicit.
- [ ] Voice & tone matches §3.8.
- [ ] Playwright smoke updated if a critical flow changed.
- [ ] Sentry release tag = commit SHA on deploy.

---

## 15. Open decisions (deferred, capture rationale when made)

- **Stripe self-serve checkout** — adopt when manual invoicing is the bottleneck (probably ~20+ paying gyms).
- **Marketing site stack** — Next.js (SEO + ISR for blog) vs Vite + static MDX. Defer until ready to invest in content.
- **Coach role permission granularity** — does coach get challenge edit? Member suspend? Decide with first design partner who asks.
- **Annual pricing exact discount** — proposed "2 months free" (~17%). Validate with first 3 deals before locking in.
- **Audit log archive destination** — S3, R2, or Supabase Storage? Decide at the 90-day retention boundary.
- **Impersonation: read-only vs full write?** — start full-write with audit; revisit if abuse appears.

---

## 16. References

### Existing files this plan touches
- `backend/src/middleware/auth.ts` — JWT validation, `PUBLIC_PATHS`
- `backend/src/middleware/requireActiveUser.ts` — deleted/suspended block
- `backend/src/middleware/rateLimit.ts` — per-route limiters
- `backend/src/routes/admin.ts` — gym_owner-scoped (refactor away super_admin allowance)
- `backend/src/routes/gyms.ts` — extend PATCH; add logo upload, onboarding, subscription read
- `backend/src/routes/auth.ts` — soft delete pattern reference
- `backend/src/lib/supabase.ts` — two-client pattern
- `admin/src/lib/api.ts` — token refresh in-flight guard fix
- `admin/src/App.tsx` — role-aware ProtectedRoute
- `admin/src/components/Layout.tsx` — Lucide migration, unused `useNavigate`
- `admin/src/pages/DashboardPage.tsx` — recharts migration
- `shared/types/index.ts` — add `ONBOARDING_STEPS`, role enum extension
- `package.json` — add `"console"` to workspaces
- `supabase/migrations/033_storage_policies.sql` — gym_id folder convention
- `supabase/migrations/034_auth_hook.sql` — must stay last

### New files this plan creates
- `console/` — full new Vite app
- `backend/src/routes/superAdmin.ts` — new router
- `backend/src/routes/leads.ts` — public lead capture
- `backend/src/middleware/roles.ts` — `requireGymOwner`, `requireSuperAdmin`, `requireSelfOrSuperAdmin`
- `backend/src/lib/audit.ts` — `logAudit` helper
- `supabase/migrations/035_subscription_extras.sql`
- `supabase/migrations/036_subscription_payments.sql`
- `supabase/migrations/037_gym_onboarding_steps.sql`
- `supabase/migrations/038_leads.sql`
- `supabase/migrations/039_audit_log.sql`
- `supabase/migrations/040_coupons.sql`
- `supabase/migrations/041_analytics_views.sql`
- `supabase/migrations/042_role_coach.sql`

---

## 17. The single most important reminder

> **The owner who tapes the QR poster to the gym wall in week 1 converts. The owner who doesn't, churns.** Every UX decision, every onboarding nudge, every email in the trial sequence is downstream of getting that physical poster on that physical wall. Optimize for it relentlessly.
