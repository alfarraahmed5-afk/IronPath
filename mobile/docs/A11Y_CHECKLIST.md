# Mobile accessibility -- manual release checklist

Owner: PR D (Polish) -- D-1 agent.
Mirror of `marketing/docs/a11y-checklist.md`, scoped to React Native + Expo.
Run before promoting a mobile build to TestFlight or Internal Distribution.

> Time budget: ~45 minutes per release. Skipping any section requires a
> written waiver in the PR description.
> Source-of-truth audit: `skills/mobile-council/lens-09-accessibility-auditor.md`.

---

## 0. Automated gate (before manual run)

Run from `mobile/`:

```
npm run audit:em-dashes    # founder rule: no U+2014 dash, no mdash entity
npm run audit:banned        # no Mindbody, Glofox, cal.com, ironpath.app
npm run audit:contrast      # WCAG 2.1 AA against design-system tokens
npm run audit:rtl           # marginLeft/Right -> marginStart/End migration
npm run audit:touch         # 44pt touch-target heuristic
npm run audit:a11y          # role+label coverage, modal isModal, off-palette hex
npm run audit:all           # all of the above sequentially
```

Every script must exit 0 before the manual checklist begins. If a script
flags a deliberate exception, document the exception in a PR comment and
add a same-line comment in the code that explains why.

### Expected pre-integration behavior

When this checklist is run before A+B+C have merged:

- **`audit:contrast`** reads `mobile/src/design-system/tokens/colors.ts`.
  When that file is the stub (re-exports from `mobile/src/theme/tokens.ts`),
  the script reads the legacy palette and reports the four documented
  failures from Lens 9: `textTertiary` (3.18:1), `textDisabled` (1.95:1),
  `border` (1.40:1), `borderSubtle` (1.28:1). These FAIL hits clear once
  A-1's crimson palette + lightened grays land.
- **`audit:em-dashes`** and **`audit:banned`** will surface legacy hits
  in `app/`, `src/`, `metro.config.js`, and `app.json`. Each is fixed
  in-flight by the screen-rebuild slices (A+B+C). Document the count
  here when running pre-integration.
- **`audit:rtl`** flags every `marginLeft`/`marginRight` in legacy code;
  these migrate as the screen-rebuild slices touch each file.
- **`audit:touch`** flags icon-only buttons under 44pt. Lens 9 lists
  the 8 specific FAIL sites. Same fix-on-touch pattern as RTL.
- **`audit:a11y`** flags every raw `<TouchableOpacity>` without role+label.
  These migrate to the design-system `Pressable` primitive (which bakes
  role+label-required) during the C slice screen rebuilds.

A hard fail on any of these in the **integration build** (after A+B+C
merge) is a release blocker. A hard fail in **pre-integration** is
expected and tracked in the "Phase 2 audit run" section at the bottom.

---

## 1. VoiceOver (iOS)

Run on a real iPhone if possible; the simulator's VoiceOver is acceptable
for spot checks but misses gesture quirks.

### Setup

- [ ] iOS device with VoiceOver enabled (`Settings -> Accessibility ->
      VoiceOver`). Use the triple-click side-button shortcut to toggle.
- [ ] Build installed via TestFlight or `eas build --profile preview`.

### Per-screen reading order

For each screen below, swipe right with VoiceOver. Verify reading order
matches the visual hierarchy and every interactive element announces a
role + label.

- [ ] **Login** (`app/(auth)/login.tsx`)
  - [ ] Wordmark IRONPATH announces with role "header".
  - [ ] Email field announces "Email address, edit text".
  - [ ] Password field announces "Password, secure text field".
  - [ ] "Forgot password?" announces with role "link".
  - [ ] "Sign In" button announces "Sign in, button".
  - [ ] During login, button announces busy state ("Sign in, busy").
  - [ ] "Join with invite code" inline link reads as one phrase.

- [ ] **Tab bar** (`app/(tabs)/_layout.tsx`)
  - [ ] Each tab announces "Tab name, tab, N of 5, selected" (or
        "not selected").
  - [ ] Selected tab is the only one marked `selected: true`.

- [ ] **Home / Feed** (`app/(tabs)/index.tsx` -- if Q1=B then `app/(tabs)/index.tsx` is Home)
  - [ ] Each WorkoutCard announces a combined label: "Push Day by
        @anastase, posted 2 hours ago, 45 minutes, 3,200 kg, 12 sets,
        8 likes, 2 comments. Double tap to open."
  - [ ] Like + comment expose as `accessibilityActions` (rotor "Actions
        available").
  - [ ] Filter pills "All / Following" announce role "tab" + selected state.

- [ ] **Train** (`app/(tabs)/train.tsx` if Q1=B; else `workouts.tsx`)
  - [ ] Calendar day cells announce "Wednesday May 10, 2026, workout
        logged" or "Wednesday May 10, 2026, no workout".

- [ ] **Progress** (`app/(tabs)/progress.tsx`)
  - [ ] Streak heatmap announces a summary first ("30 day heatmap, 21
        active days") then each cell as a separate focusable element.
  - [ ] Streak ring: role "progress bar", value "21 day streak, 75
        percent of weekly goal".
  - [ ] Charts wrap in role "image" with synthesized alt-text.

- [ ] **Community** (`app/(tabs)/community.tsx` if Q1=B)
  - [ ] Sub-tabs announce role "tab" + selected state.
  - [ ] Leaderboard rank rows: combined label "Rank 1, Anastase, 8,400 kg".

- [ ] **Me / Profile** (`app/(tabs)/me.tsx` or `profile.tsx`)
  - [ ] Avatar announces username (or `accessibilityElementsHidden` when
        adjacent to the username Text).
  - [ ] Section headers announce role "header".
  - [ ] Showcase chips: "Bench press, 140 kilograms, heaviest weight".

- [ ] **Active workout** (`app/workout/active.tsx`)
  - [ ] Header reads "Push Day, 45 minutes 12 seconds elapsed".
  - [ ] Set-complete button: role "checkbox", state "checked / unchecked",
        label "Set 1 normal 100 kilograms 8 reps".
  - [ ] Long-press affordance announced via `accessibilityActions`.
  - [ ] Weight + reps inputs: explicit labels ("Weight in kilograms for
        set 1").
  - [ ] Rest timer: live region announces start, 10s remaining, done.

- [ ] **Workout finish + celebrate**
  - [ ] Auto-dismiss disabled when VoiceOver is on (verify by waiting
        > 6s; screen does NOT redirect).
  - [ ] Trophy/halo decorative: `accessibilityElementsHidden`.
  - [ ] Done button is the focus-on-mount target.
  - [ ] PR list reads each PR sequentially.

### Modal + sheet focus trap

- [ ] Open a Sheet (e.g. comment modal). Focus lands on the title.
- [ ] Swipe right. Focus stays inside the sheet (does not escape to the
      backdrop content).
- [ ] Use the rotor "Actions" -> "Dismiss". Sheet closes.
- [ ] Focus returns to the trigger element on the previous screen.

---

## 2. TalkBack (Android)

Run on a real Pixel if possible.

### Setup

- [ ] Android device, TalkBack enabled (`Settings -> Accessibility ->
      TalkBack`). Activate via the Volume Up + Volume Down shortcut.
- [ ] Build installed via Internal Distribution or `eas build --profile
      preview`.

### Per-screen checks

Replicate the VoiceOver per-screen checklist above on Android. Specific
TalkBack-only items:

- [ ] **Tab bar:** "Feed, tab, 1 of 5, selected" reads correctly. (Stock
      Expo Tabs handles this; custom-tab-bar substitution must replicate.)
- [ ] **Live regions:** rest timer announces via `accessibilityLiveRegion`
      (Android) at start, 10s remaining, done. Verify no spam at every
      second tick.
- [ ] **Toast:** PR-success toast announces via "alert" role + assertive
      live region.
- [ ] **Modal:** hardware back button dismisses (`onRequestClose`); focus
      returns to trigger.
- [ ] **Predictive back:** in active-workout, swipe-back gesture intercepts
      with the Save & Exit confirm sheet.
- [ ] **Custom actions:** WorkoutCard's like / comment / share custom
      actions appear in TalkBack's long-press menu.

---

## 3. Dynamic Type / Font scaling

Test at OS-level font scales.

### iOS Dynamic Type categories

- [ ] **Default:** baseline. No layout regressions.
- [ ] **AX1 (1.4x):** `display*` and `numericLarge` cap at 1.4x
      (verified via `getMaxFontScaleForVariant`). Title sizes scale to
      1.4x. Body / label / caption / overline scale freely.
- [ ] **AX3 (1.8x):** body + label hit their cap (1.8x). Display sizes
      stay capped at 1.4x. Active-workout SetRow wraps to two lines
      (`useLargeFontLayout()` returns true at 1.4x).
- [ ] **AX5 (~3.1x):** caption + overline still scale (uncapped). No
      catastrophic clipping. Tab bar drops labels and renders icon-only.

### Android font scales

- [ ] **1.0x default**
- [ ] **1.3x large**
- [ ] **1.5x larger**
- [ ] **2.0x largest** (accessibility setting)

For each scale, on each tab:
- [ ] No text clips at the right edge or under the bottom safe area.
- [ ] No two interactive elements collide; hit-targets remain >= 44pt.
- [ ] Numeric columns (set list) stay aligned.
- [ ] Pricing / stat numbers don't break out of their card frame.

---

## 4. Reduce Motion

Test BOTH the OS preference and the in-app override (when shipped).

### OS preference

- [ ] **iOS:** `Settings -> Accessibility -> Motion -> Reduce Motion: On`.
      Open the app. Verify:
  - [ ] Pressable scale-on-press collapses to opacity blink (no transform).
  - [ ] Sheet slide-up replaced by opacity crossfade.
  - [ ] Page transitions are opacity-only crossfades (no slide).
  - [ ] NumberRoll digits update statically.
  - [ ] Hero photo Ken Burns disabled.
  - [ ] Streak heatmap fills in instantly (no diagonal sweep).
  - [ ] PR celebrate panels crossfade in place (no slide / scale).
  - [ ] Ember seam pulse paused at center; no breathing loop.
  - [ ] Live-pulse strip replaced by static dot at leading edge.
  - [ ] Tab bar focused-dot scale-in replaced by opacity fade.

- [ ] **Android:** `Settings -> Accessibility -> Remove animations: On`.
      Repeat the same set of visual checks.

### In-app override (P1)

- [ ] Settings -> Accessibility -> Reduce motion: ON / OFF / System.
      Override mirrors the OS-level result.

---

## 5. Reduce Transparency (iOS only)

- [ ] `Settings -> Accessibility -> Display & Text Size -> Reduce
      Transparency: On`. Verify:
  - [ ] BlurView surfaces (PR celebrate backdrop, photo-hero scrim,
        comment modal backdrop) replaced by solid `surface3`.
  - [ ] Glass-card variants replaced by solid `surface2`.
  - [ ] Sheet backdrop opacity raised from 0.6 to 0.95.
  - [ ] Toast type backgrounds use solid fills (not 15% alpha).

Android does NOT expose a system flag; the in-app preference toggle
mirrors the iOS setting.

---

## 6. High contrast

- [ ] **iOS:** `Settings -> Accessibility -> Display & Text Size ->
      Increase Contrast: On`.
- [ ] **Android:** `Settings -> Accessibility -> High contrast text: On`.

For both:
- [ ] Card borders visible (`borderHighContrast: #5C5C66`).
- [ ] Surfaces collapse to a single bg with high-contrast borders drawing
      the card edges.
- [ ] `textTertiary` / `textDisabled` swap to lighter forks.
- [ ] All glass surfaces collapse to solid.
- [ ] Disabled-state opacity raised from 0.4 to 0.6.

---

## 7. RTL Arabic mirror

Pre-flight: lang switch isn't shipped in v1.0; flip via dev menu or
manually call `I18nManager.forceRTL(true)` + reload.

- [ ] Layout mirrors: avatar + username order flips on every list row.
- [ ] Chevron icons (back arrow, forward chevron) flip via
      `transform: [{scaleX: I18nManager.isRTL ? -1 : 1}]`.
- [ ] Non-directional icons (heart, comment, settings cog, logo) do NOT
      flip.
- [ ] Charts:
  - [ ] **Line charts (volume, bodyweight, projected-1RM)**: stay LTR
        (time always reads left to right, even in Arabic).
  - [ ] **Bar charts + heatmaps for non-temporal data**: mirror.
  - [ ] **Streak heatmap (temporal)**: do NOT mirror.
- [ ] Numbers stay LTR (per Unicode bidi). Verify on weight / reps inputs,
      leaderboard rank `#1`, calendar day numbers.
- [ ] Arabic typography readable: IBM Plex Sans Arabic loaded; no
      tofu / box glyphs.
- [ ] Forms: no `marginLeft` / `marginRight` regressions (all migrated
      to `marginStart` / `marginEnd`).
- [ ] Status bar tint and edge-to-edge insets correct in RTL.

---

## 8. Touch targets

- [ ] On a real phone (or DevTools at 360x800), tap every icon-only
      button. Effective hit area must be >= 44pt iOS / 48dp Android.
- [ ] Specific Lens 9 hit-target FAIL sites validated (post-fix):
  - [ ] Calendar nav buttons (`Calendar.tsx:146-152`).
  - [ ] Forgot-password link (`(auth)/login.tsx:75-81`).
  - [ ] Modal close buttons (`(tabs)/index.tsx:202-204`,
        `(tabs)/leaderboard.tsx:212-214`).
  - [ ] Like + comment icons (`(tabs)/index.tsx:325-359`).
  - [ ] Filter pills (`(tabs)/index.tsx:467-480`).
  - [ ] Settings cog (`(tabs)/profile.tsx:192-198`).
  - [ ] Inline Add/Edit/Pin buttons (`(tabs)/profile.tsx`).
  - [ ] Discard / Finish ghost buttons in active workout.
  - [ ] Weight / reps inputs (`active.tsx:120-143`).
  - [ ] Clear-search X (`active.tsx:386-389`).

---

## 9. Color & contrast spot-check

- [ ] Run `npm run audit:contrast`. Zero FAIL hits.
- [ ] Hero `<h1>` (display1) on dark: ratio >= 3:1 (display gate).
- [ ] Body text (Barlow_400Regular) on dark: ratio >= 4.5:1.
- [ ] Brand crimson `#C8102E` only used at >= 18pt regular or >= 14pt
      bold. Body-sized brand text uses `brand-400 #FF4566` (5.93:1).
- [ ] Focus rings: `brand-350 #FF6680` (7.03:1).
- [ ] Border tokens visible at non-text 3:1 minimum (post-fix).

---

## 10. Reduced data / slow network

- [ ] Throttle to "Slow 3G" via Charles Proxy or RN dev menu.
- [ ] Cold start to interactive within 2.5s on a Pixel 4a (perf budget).
- [ ] Skeletons render where images are pending (no jank from layout
      shift).
- [ ] No request retries spam the screen reader.

---

## 11. Sign-off

- [ ] All boxes checked or waived (waivers in PR description).
- [ ] `npm run audit:all` exits 0.
- [ ] EAS preview build installed + side-loaded by founder for final
      device-tier validation.
- [ ] Dev console clean of accessibility warnings.

Signed: ____________________   Date: __________

---

## Phase 2 audit run (post-integration)

This section is filled in AFTER A+B+C have merged. D-1 returns post-
integration to run the actual audits against the rebuilt codebase.

### Pre-integration baseline (run 2026-05-10)

| Script | Hits | Notes |
|---|---|---|
| `audit:em-dashes` | TBD | legacy hits in `app/`, `src/`, `metro.config.js` |
| `audit:banned` | TBD | `ironpath.app` in `settings/help.tsx` + `app.json` |
| `audit:contrast` | TBD | 4 FAIL: textTertiary, textDisabled, border, borderSubtle |
| `audit:rtl` | TBD | marginLeft/Right migration pending |
| `audit:touch` | TBD | 8 sites flagged in Lens 9 |
| `audit:a11y` | TBD | most TouchableOpacity callsites missing role+label |

### Integration baseline (run after A+B+C merge)

| Script | Hits | Notes |
|---|---|---|
| `audit:em-dashes` | _____ | _____ |
| `audit:banned` | _____ | _____ |
| `audit:contrast` | _____ | _____ |
| `audit:rtl` | _____ | _____ |
| `audit:touch` | _____ | _____ |
| `audit:a11y` | _____ | _____ |

### VoiceOver run

- [ ] Critical-path screens (login, home, train, progress, active workout,
      celebrate) all read meaningfully.
- [ ] Modal focus trap + return verified.
- [ ] PR celebrate auto-dismiss disabled when VO active.

### TalkBack run

- [ ] Same as VoiceOver, on Pixel.
- [ ] Live regions verified (rest timer, toast).
- [ ] Custom actions appear in long-press menu.

### Dynamic Type run

- [ ] AX1 / AX3 / AX5 on iOS verified (no clipping, layout reflows).
- [ ] 1.0x / 1.3x / 1.5x / 2.0x on Android verified.

### Reduce Motion run

- [ ] iOS Reduce Motion: every animation has a static fallback.
- [ ] Android Remove animations: same.
- [ ] In-app override (if shipped): mirrors OS.

### RTL Arabic run

- [ ] `I18nManager.forceRTL(true)` + reload.
- [ ] Layout mirror correct on every screen.
- [ ] Chevrons flip; logos do not.
- [ ] Charts: line charts LTR, heatmap LTR (temporal), bar charts mirror.
- [ ] Arabic typography legible.

### Founder sign-off

- [ ] Founder side-loads preview build.
- [ ] Founder signs off on this checklist.

Signed: ____________________   Date: __________
