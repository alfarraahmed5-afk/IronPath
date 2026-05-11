# Photo asset manifest

Every photo bundled in the EAS build is documented here. This is the
source of truth for license tracking, founder licensing decisions, and
the per-screen "what photo lives where" map.

Per founder note (Q answer in SYNTHESIS): photos that need paid
licensing are flagged with `LICENSING_REQUIRED`; the founder handles
payments via the listed source URL.

Per Lens 6 perf budget: each photo ships at @2x (1080w AVIF) and
@3x (1620w AVIF), ~80 KB each. Total photo bundle target <= 1.6 MB.
Photos are bundled in the EAS build (NOT OTA) to avoid first-frame
color flash. A blurhash placeholder ships alongside each photo via
`mobile/src/theme/photos.ts`.

## How to extend this file

When a new photo is bundled, append a row with:

1. **File path** -- absolute repo path of the AVIF asset.
2. **Source URL** -- where the founder can re-license / re-download.
3. **License** -- one of `Unsplash License`, `Pexels License`, `CC0`,
   `Custom-Stock` (founder paid; see folder), `Founder-Owned` (raw
   founder shoot).
4. **Per-screen usage** -- the screen file path that renders it.
5. **Blurhash** -- 27-char string from
   `npx blurhash-cli <file>` baked at build time.
6. **Founder action** -- one of `READY` (no action), `REQUIRES_ATTRIBUTION`
   (Unsplash photographer credit needed in About), `LICENSING_REQUIRED`
   (paid stock; founder must purchase + replace placeholder).

Aggregate licenses are mirrored into `mobile/assets/CREDITS.md` for the
in-app About screen.

## Bundled photos

Status legend: `STAGED` = file path reserved, photo not yet committed.
`SHIPPED` = AVIF in repo + referenced from a screen.

### Hero photography (per Lens 2 P0-5 brief)

| File | Source | License | Used on | Blurhash | Action | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `mobile/assets/photos/concrete-wall@2x.avif` | https://unsplash.com/photos/photo-1617791160505-6f00504e3519 (Anchor Lee) | Unsplash License | `app/(tabs)/profile.tsx` (fallback) | TBD | REQUIRES_ATTRIBUTION | STAGED |
| `mobile/assets/photos/concrete-wall@3x.avif` | (same source) | Unsplash License | (same) | TBD | REQUIRES_ATTRIBUTION | STAGED |
| `mobile/assets/photos/chalk-hands@2x.avif` | https://unsplash.com/photos/photo-1517836357463-d25dfeac3438 (Anastase Maragos) | Unsplash License | `app/(auth)/register.tsx`, `app/(auth)/forgot-password.tsx`, `app/(tabs)/train.tsx` empty state, `app/workout/finish.tsx` | L37LfgMx00R*?wt7~qWBxujsR%t7 | REQUIRES_ATTRIBUTION | STAGED |
| `mobile/assets/photos/chalk-hands@3x.avif` | (same source) | Unsplash License | (same) | (same) | REQUIRES_ATTRIBUTION | STAGED |
| `mobile/assets/photos/login-barbell@2x.avif` | https://unsplash.com/photos/photo-1583454110551-21f2fa2afe61 (Logan Weaver) | Unsplash License | `app/(auth)/login.tsx` hero, `app/(tabs)/index.tsx` Home hero, `app/workout/celebrate.tsx` | L13Im5xu00WB?wt7~qWBxujsR%t7 | REQUIRES_ATTRIBUTION | STAGED |
| `mobile/assets/photos/login-barbell@3x.avif` | (same source) | Unsplash License | (same) | (same) | REQUIRES_ATTRIBUTION | STAGED |
| `mobile/assets/photos/morning-gym@2x.avif` | TBD (Lens 2 brief calls for "Morning gym wide shot"; founder selects via Unsplash search "empty gym morning") | Unsplash License (assumed) | `app/analytics/index.tsx` streak heatmap header, `app/(tabs)/community.tsx` Community hero band (future) | TBD | REQUIRES_ATTRIBUTION | STAGED |
| `mobile/assets/photos/morning-gym@3x.avif` | (same source) | Unsplash License (assumed) | (same) | TBD | REQUIRES_ATTRIBUTION | STAGED |
| `mobile/assets/photos/coach-portrait@2x.avif` | TBD (Lens 2 brief: "Coach-style portrait, B&W"; founder selects) | Unsplash License (assumed) | `app/(tabs)/trainer.tsx` empty state, `app/users/[id].tsx` portrait fallback | TBD | REQUIRES_ATTRIBUTION | STAGED |
| `mobile/assets/photos/coach-portrait@3x.avif` | (same source) | Unsplash License (assumed) | (same) | TBD | REQUIRES_ATTRIBUTION | STAGED |
| `mobile/assets/photos/bumper-plate@2x.avif` | TBD (Lens 2 brief: macro detail of a bumper plate; founder selects via Unsplash) | Unsplash License (assumed) | `app/exercises/index.tsx` empty state, `app/routines/index.tsx` empty state | TBD | REQUIRES_ATTRIBUTION | STAGED |
| `mobile/assets/photos/bumper-plate@3x.avif` | (same source) | Unsplash License (assumed) | (same) | TBD | REQUIRES_ATTRIBUTION | STAGED |

Total staged: 12 entries (6 photos x 2 sizes), targeting ~2.0 MB total.
Renamed `barbell-macro` -> `login-barbell` to match the per-screen brief
in lens 2 (login as primary consumer) and the C-2 implementation.

### Avatar fallbacks

No bundled photo. Avatar.tsx renders a monogram on a warm-ink
hash-shifted background per Lens 2 PALETTE. See
`mobile/src/components/Avatar.tsx`.

### Splash + icon

Tracked separately (not photos, brand assets). See
`mobile/assets/splash.png`, `mobile/assets/icon.png`,
`mobile/assets/adaptive-icon.png`. Color spec lives in `app.json`.

## Founder action items

| ID | Item | Owner | Cost estimate |
| --- | --- | --- | --- |
| F-1 | Confirm the 3 Unsplash heroes (chalk-hands, barbell-macro, concrete-wall) reuse marketing licenses (already attributed in marketing README) -- no payment, but need photographer credit string in `mobile/assets/CREDITS.md`. | Founder | $0 |
| F-2 | Pick Unsplash assets for `morning-gym` + `coach-portrait` (search: "empty gym morning", "personal trainer portrait B&W"). Capture URL + photographer name. | Founder | $0 |
| F-3 | If any future hero photo is sourced from a paid stock library (Shutterstock, iStock, Adobe Stock), purchase the license and replace the corresponding row's License column with `Custom-Stock`. Founder note: "I will handle payments." | Founder | Per-photo, ~$10-50 each |
| F-4 | Generate per-photo blurhash strings via `npx blurhash-cli <file>` and paste into the Blurhash column above + `mobile/src/theme/photos.ts`. (Lens 2 owner runs this when AVIFs land.) | Implementing agent | $0 |
| F-5 | Confirm in-app About screen renders `mobile/assets/CREDITS.md` (or its referenced strings) so Unsplash attribution + OFL font licenses are user-discoverable. (PR D acceptance gate.) | Implementing agent | $0 |

## Notes

- Founder rule: WhatsApp `+20 10 3659 6238` is the only support
  channel. Any photo manifest lookup that fails should not surface a
  contact email.
- ironpath.health is the canonical domain; do not embed
  `ironpath.app` URLs in any photo metadata.
- No em dashes anywhere in this file.
