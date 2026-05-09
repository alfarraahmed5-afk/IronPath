# docs/archive/

Historical artifacts kept for reference but no longer canonical. Don't act on anything in here without checking that it hasn't been superseded by `docs/PLATFORM_PLAN.md` or `docs/DEV_LOG.md`.

## Contents

### Mobile-app technical specifications (pre-platform work)

| File | What | Status |
|---|---|---|
| `GymApp_Technical_Specification_v4.md` | Direct predecessor of v5; minor diff value | Superseded by v5 |
| `GymApp_Technical_Specification_v5.md` | Authoritative spec for mobile-app Phases 1–7 | Superseded by `docs/PLATFORM_PLAN.md` for platform/console work; still useful for mobile-app feature questions |

The v1, v2, and v3 versions were deleted outright (fully superseded, no unique content).

### Project progress log (pre-platform work)

| File | What | Status |
|---|---|---|
| `PROGRESS.md` | Phase-by-phase build log for mobile app Phases 1–10 | Frozen at "All 10 Phases Done" 2026-04-24. Live development log is now `docs/DEV_LOG.md`. |

### Historical migrations (applied manually, not in supabase/migrations/)

`historical-migrations/` holds three SQL files that were applied to production via the Supabase SQL editor before we standardized on the `supabase/migrations/NNN_*.sql` numbered convention. **These are already applied to production** — do not re-run them. Kept here so the history is discoverable.

| File | Purpose |
|---|---|
| `challenge-enrollment.sql` | `leaderboard_challenges` columns: `enrolled_user_ids`, `created_by_user_id`, `exercise_id` + GIN index on enrolled_user_ids |
| `profile-features.sql` | Profile-related columns (see file) |
| `routine-sharing.sql` | Routine-sharing columns (see file) |

If you ever need to bootstrap a fresh Supabase project with the same schema, paste these into the SQL editor in alphabetical order, then apply `supabase/migrations/001_*.sql` through whatever the latest is.
