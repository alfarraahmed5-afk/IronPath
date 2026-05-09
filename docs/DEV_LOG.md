# IronPath Platform Dev Log

Append-only log of meaningful, cross-team deliverables. Each entry is dated
and tagged by team; teams append to the end of the file.

---

### 2026-05-09 · Team 3 deliverables

**Scaffolded `console/` workspace — operator-facing super admin app.**

- New workspace `console/` added to root `package.json` (`workspaces` + `dev:console` / `build:console` scripts).
- Vite 5 + React 18 + TypeScript, dev port **5174** (admin holds 5173), `/api` proxied to `http://localhost:3000`.
- Tailwind config mirrors admin's setup but extends theme with the cyan brand ramp (`#22D3EE`), the near-black `canvas` background (`#0A0A0B`), the named `ink-*` neutral ramp, Inter / JetBrains Mono font families, and the §3.4 radius scale. `darkMode: 'class'`; `<html class="dark">` set in `index.html`.
- TanStack Query wired in `main.tsx` (`QueryClientProvider`). `react-hook-form` + `zod` installed but unused in v1; recharts installed for Phase E.
- `console/src/lib/api.ts` — axios client with **in-flight refresh coalescing** (single `/auth/refresh` per burst of 401s) and namespaced storage keys (`ip_console_access_token`, `ip_console_refresh_token`, `ip_console_user`). A second `impersonationApi` client is exported with its own token bucket — stubbed for Phase D operator impersonation.
- `console/src/lib/session.ts` — `ALLOWED_ROLES = ['super_admin']`; `readStoredUser`, `isAuthorized`, `clearSession`, `clearSessionAndRedirect`. Gym owners/members who reach this app are bounced.
- `Layout.tsx` — sidebar with cyan-accent active state, Lucide icons (`Inbox`, `Kanban`, `Building2`, `LineChart`, `History`, `Settings`), top status bar (env badge + commit SHA mono + latency placeholder `—`), sign-out at sidebar foot.
- `App.tsx` — `BrowserRouter`, `ProtectedRoute` gated on `isAuthorized()`, routes for `/login`, `/inbox`, `/pipeline`, `/gyms`, `/analytics`, `/` → `/gyms`, `*` → `/gyms`.
- `LoginPage.tsx` — title "IronPath Console", subtitle "Operator panel", cyan submit button, role gate (`Operator access required.`).
- Placeholder pages for Gyms, Inbox, Pipeline, Analytics — each with a Lucide empty-state icon and a "Coming in Phase B/D/E" hint.
- `vercel.json` SPA rewrite, `.env.example` with `VITE_API_URL`, `VITE_ENV`, `VITE_COMMIT_SHA`, `.gitignore` mirroring root coverage. Node 20 pinned in `engines.node`.

**shadcn/ui decision:** hand-rolled Tailwind primitives for v1 — no CLI dependency yet. The console scaffold needs no Dialog/DropdownMenu/Toast in v1, so adding the shadcn CLI + components.json + the implicit `cn` utility / Radix peers would inflate the dependency surface for zero current value. Real shadcn integration is queued for Phase B alongside the Gyms data table; flagged as TODO.

**Build verification:** `npm install` at repo root succeeded (1300 packages, 8 min). `npm run build --workspace=console` produced a clean `console/dist/` (built in 7.25s, 244 kB JS / 42 kB CSS pre-gzip — fonts bundled). Note: local Node is v24; `engines.node` is pinned to `20.x` per Vite 5 compatibility — npm emits an `EBADENGINE` warning but proceeds. Vercel pipelines should run on Node 20.
