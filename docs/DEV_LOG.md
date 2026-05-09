# Dev Log

### 2026-05-09 · Team 1 deliverables

**Files created**
- `admin/src/lib/session.ts` — shared `StoredUser`, `readStoredUser`, `isAllowedRole`, `clearSession`, `clearSessionAndRedirect`, `signOut`, plus the `ALLOWED_ROLES` constant.

**Files modified**
- `admin/src/lib/api.ts` — refactored to coalesce in-flight refresh calls via a module-level `refreshPromise`. The retried request no longer manually overwrites `Authorization`; the request interceptor picks up the new token from localStorage at send time. Both no-refresh-token and refresh-failure paths now go through `clearSessionAndRedirect('session_expired')`.
- `admin/src/App.tsx` — `ProtectedRoute` is now role-aware. Reads the user via `readStoredUser`, validates `isAllowedRole`, calls `clearSession()` on mismatch and `<Navigate>`s to `/login?reason=session_expired&next=...` (URL-encoded current path + search). Removed the duplicated `StoredUser` interface.
- `admin/src/components/Layout.tsx` — replaced emoji nav icons with Lucide (`LayoutDashboard`, `Users`, `Link2`, `Megaphone`, `Trophy`), size 18 / strokeWidth 1.75, color tied to `isActive` via `text-orange-500` / `text-gray-400`. Now uses `readStoredUser` from `session.ts`. Dropped unused `useNavigate` import. Sign-out wired to the shared `signOut` helper.
- `admin/src/pages/LoginPage.tsx` — accepts `?reason=session_expired` (renders a neutral "Your session ended. Sign in to continue." pill) and `?next=` (sanitized: must start with `/` and not `//`). Successful login navigates to the sanitized `next` or `/dashboard`. Replaced inline role allow-list with `isAllowedRole`.
- `admin/src/pages/DashboardPage.tsx` — replaced the manual CSS-bar chart with a recharts `BarChart` inside a `ResponsiveContainer` (height 240). Orange-500 bars, gridless, faint `#2A2A31` bottom axis only, no legend, custom dark-card tooltip with JetBrains Mono numbers. Empty-state branch preserved.
- `admin/package.json` — added `lucide-react@^0.468.0`.

**Verification**
- `npx tsc --noEmit` from `admin/` passes clean.
- No `JSON.parse` of localStorage outside `session.ts`.
- No emoji in `Layout.tsx` nav.

**Deviations from spec**
- Spec referenced `docs/PLATFORM_PLAN.md` and a pre-existing `docs/DEV_LOG.md`; neither existed in this worktree. Proceeded against the explicit requirements in the team brief and created `docs/DEV_LOG.md` fresh with this entry.
- Spec mentioned `npm run typecheck`; no such script exists in `admin/package.json`. Used `npx tsc --noEmit` instead (tsconfig already has `noEmit: true`).
- Pinned `lucide-react` to `^0.468.0` (current stable as of writing). Spec did not pin a version.
- `signOut` lives in `session.ts` rather than being duplicated inside `Layout.tsx` — the spec offered both options ("Or import from session.ts if you add a `signOut` helper there.") and the shared helper avoids drift.
- The session-expired pill uses a neutral `bg-gray-800/60` style (the spec offered this as an alternative to the red pill — the red is reserved for actual login errors so the two states stay visually distinct).

**Open questions for orchestrator**
- None blocking. The `lucide-react` version may want to be aligned across teams if anyone else adopts it.
