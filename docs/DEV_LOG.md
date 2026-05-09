# IronPath dev log

Append-only log of multi-team deliverables. Each team adds a dated block at the
end of its work; the orchestrator merges between teams.

### 2026-05-09 · Team 4 deliverables

**Owner Panel: Gym Settings + Subscription pages**

Files added:
- `admin/src/pages/SettingsPage.tsx` — gym profile, branding, contact, invite
  code summary, coach roster placeholder, danger zone. Three working forms
  (Profile, Contact) on react-hook-form + zod, one upload flow (Branding) that
  signs via `POST /gyms/:id/logo/upload-url`, PUTs the file to the signed URL
  with native `fetch` (api axios would attach a Bearer the signed URL rejects),
  then PATCHes `/gyms/:id`.
- `admin/src/pages/SubscriptionPage.tsx` — read-only subscription view. Tier
  badge, status pill, member usage bar (orange fill on gray-800 track,
  hidden when `member_cap === null`), trial countdown computed from
  `expires_at`, recorded MRR card, three-tier plans grid with current tier
  ringed in orange, mailto-based "Request upgrade" placeholder, invoice and
  data-export empty states.
- `admin/src/lib/forms.ts` — small helper module: re-exports `zod` and
  `zodResolver`, plus shared `extractError`, `getStoredGymId`, and two
  reusable zod fragments (`accentColorSchema`, `optionalUrl`).

Files modified:
- `admin/package.json` — added `react-hook-form`, `zod`, and
  `@hookform/resolvers` (the resolver subpath ships separately on RHF v7).

Files NOT touched (per scope):
- `admin/src/App.tsx`, `admin/src/components/Layout.tsx`,
  `admin/src/lib/api.ts` — Team 1 owns route + nav + axios refactor.
- `backend/`, `supabase/`, `console/`, `shared/` — other teams.

API contracts coded against (Team 2 produces):
- `GET    /gyms/:id`                    — initial settings load
- `PATCH  /gyms/:id`                    — profile + contact + logo_url
- `POST   /gyms/:id/logo/upload-url`    — three-step logo upload
- `GET    /gyms/:id/subscription`       — subscription page
- `GET    /admin/invites`               — invite code summary (existing)

Build: `cd admin && npm run build` succeeds (tsc + vite, 0 errors).

Voice & tone: verbs-first labels ("Save profile", "Upload new logo"), no
exclamation marks, error copy says what broke ("Logo must be 2MB or smaller.",
"Could not save profile. Try again."), success uses "Saved" / "Logo saved"
with a 2-second fade. Numbers over adjectives in member usage and trial
countdown.

States covered per plan §3.7:
- Loading → skeleton blocks (`gray-800`), no spinners.
- Empty → centered glyph, one-line headline, one-line subtext, single CTA.
- Error → inline red-tinted card, with a Retry button on top-level page loads.
- Success → fading inline confirmation.

Deviations / open questions for orchestrator:
- The team prompt referenced Lucide icons for empty states. `lucide-react` is
  not installed in `admin/`, and "you can add" wording covered RHF + zod only.
  I used a neutral typographic glyph (`•••`) so the build stays dependency-
  light. Team 1 can swap in Lucide once they add it for nav.
- `localStorage.user` set by `LoginPage` does not currently persist `gym_id`
  (only email / username / gym_name). `getStoredGymId()` returns null in that
  case and the page renders an inline error directing the user to sign back
  in. Suggest Team 1 add `gym_id` to the stored user object in their session
  refactor — both new pages depend on it.
- `GET /gyms/:id` is not in the contract list given to me but is the only
  sensible way to load the current profile for the form defaults. Coded
  against the same `{ data: <gym row> }` envelope as the PATCH response. Team
  2: please confirm shape, or expose a `GET /gyms/me` alias.
- Timezone is a free-text input with a "Phase 2 will replace this with a
  picker" hint, matching the spec's note.
