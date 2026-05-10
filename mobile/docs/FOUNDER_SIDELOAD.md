# Founder side-load brief

This is the acceptance checklist the founder runs after side-loading
the IronPath preview build. It mirrors the SYNTHESIS Acceptance Gate
section verbatim and adds install + per-screen "what to look for"
notes.

Support: WhatsApp `+20 10 3659 6238`.
Domain: ironpath.health.

## Step 1: install

### Pixel 8 (Android)

1. The build agent ran `./mobile/scripts/build-preview.sh android`
   (or `pwsh -File mobile/scripts/build-preview.ps1 -Platform android`).
2. Founder receives the EAS internal-distribution install link via
   WhatsApp.
3. On the Pixel 8, open the link in Chrome -> tap "Install" -> tap
   "Install anyway" if Play Protect warns.
4. Open the app from the home screen. The first launch may show a
   one-time consent for Notifications + Camera + Photo library.

Alternative for direct ADB side-load:

```bash
adb install -r path/to/IronPath-preview.apk
adb shell monkey -p com.ironpath.app -c android.intent.category.LAUNCHER 1
```

### iPhone 15 Pro (iOS)

1. The build agent ran `./mobile/scripts/build-preview.sh ios`
   (or `pwsh -File mobile/scripts/build-preview.ps1 -Platform ios`).
2. The build is uploaded to TestFlight Internal Testing automatically
   when the EAS submit credentials are populated; until then the
   founder receives an EAS install link.
3. EAS install link path: open in Safari on the iPhone -> tap
   "Install" -> trust the developer profile via
   Settings -> General -> VPN & Device Management.
4. TestFlight path (once Apple credentials are populated, see action
   item AI-1 below): the founder accepts the TestFlight invite from
   ahmed.alfarra@... and installs from TestFlight.

## Step 2: acceptance checklist

15 items, mirrored from `skills/mobile-council/SYNTHESIS.md` Acceptance
Gate section. Each is a hard pass/fail for production submit.

For each item: tick `[x]` if PASS, leave `[ ]` if blocking, and write
a one-line note in the "Phase 2 execution log" at the bottom.

### 1. Cold start

- [ ] Cold start under 2 seconds, no font-flash splash.
- **What to look for:** force-quit the app, wait 10 seconds, tap the
  IronPath icon. The splash should hold steady for under 2 seconds and
  then transition into Feed (or Login if signed out). No stutter, no
  flash of system fonts before Mona Sans loads.
- **Budget:** Pixel 8 <= 1800 ms, iPhone 15 Pro <= 1500 ms.

### 2. Login -> Home cinematic feel

- [ ] Login -> Home (or Feed) feels cinematic, not stock RN.
- **What to look for:** the login screen renders the concrete-wall
  Anastase-Maragos hero with the ember bottom-up multiply at 8%; the
  page transition out uses the Vercel ease (`[0.32, 0.72, 0, 1]`) at
  240 ms entry / 180 ms exit, NOT the iOS stock slide.

### 3. Workout finish -> celebrate emotional peak

- [ ] Workout finish -> celebrate sequence is the emotional peak.
- **What to look for:** finish a workout (log a few sets, tap Finish);
  the finish screen reviews the session over a barbell-macro hero,
  the Done button taps into the celebrate hero, NumberRoll on stats,
  Skia particle puff under any new PR badge unlock.

### 4. PR badge "I want to share" effect

- [ ] PR badge unlock has the "I want to share this" effect.
- **What to look for:** if a new PR fires, a stamped badge animates
  in with the Skia particle layer, the "% over previous best" pill
  shows below, the "top X% in your gym" social proof renders, and
  the Share button generates a 1080x1920 share-card preview.

### 5. Streak heatmap

- [ ] Streak heatmap renders correctly, animates on first focus.
- **What to look for:** Progress tab (or Profile -> My Stats if Q1
  was Option A); 7 rows x 12 cols Skia heatmap, 5-step crimson
  intensity ramp, fills on first focus via stagger. Tap a day -> sheet
  with that day's session.

### 6. Monthly recap (test data)

- [ ] Monthly recap card opens (test data injected).
- **What to look for:** Progress tab -> "March recap" card visible;
  tap -> 6-panel Spotify-Wrapped-style pager with crossfade between
  panels.

### 7. Tab pill slide

- [ ] Tab switch has the pill-slide micro-motion.
- **What to look for:** every tab switch slides the active-pill
  underneath the tab icon via `springRail`. Icon stroke transitions
  1.75 -> 2.25, label tracking shifts normal -> tight.

### 8. Pull-to-refresh universal

- [ ] Pull-to-refresh works on every list.
- **What to look for:** Feed, Workouts, Leaderboard sub-tabs,
  Notifications, Profile, Workout detail, Analytics. The spinner is
  brand-crimson ember (NOT default iOS gray).

### 9. Haptic depth + no spam

- [ ] Pressable + Button have the right haptic depth, no haptic-spam.
- **What to look for:** scroll the Feed quickly -- NO haptic should
  fire while scrolling past Pressables. Tap a card -- ONE haptic on
  press. The Lens 8 fix (haptic on `onPress`, not `onPressIn`) is in.

### 10. AR locale mirror + typography

- [ ] AR locale: layout mirrors, Arabic typography is readable.
- **What to look for:** Settings -> Language -> Arabic; the entire
  app flips RTL, IBM Plex Sans Arabic loads, chevrons mirror, line
  charts stay LTR (time always reads left-to-right per Lens 9).

### 11. Reduce motion

- [ ] Reduce motion (toggled in Settings): animations collapse to
      crossfades, no jank.
- **What to look for:** iOS Settings -> Accessibility -> Motion -> Reduce
  Motion ON; Android Settings -> Accessibility -> Remove Animations ON.
  Re-open IronPath. NumberRoll becomes static labels, Ken Burns
  disabled on hero photos, heatmap fills instantly, recap panels
  crossfade not slide.

### 12. VoiceOver

- [ ] VoiceOver: every screen reads meaningfully.
- **What to look for:** iOS Settings -> Accessibility -> VoiceOver ON;
  swipe through every screen. Every interactive element announces
  role + label + state. Modal sheets are announced as modal. Toasts
  are announced as live regions.

### 13. Predictive back + active workout intercept

- [ ] Predictive back: active-workout exit confirms; other screens
      preview the destination correctly.
- **What to look for:** Android 14+ predictive back gesture (slow
  edge-swipe) shows the destination peeling in. Active workout
  intercepts with a "Save & Exit" sheet rather than auto-popping.

### 14. Foreground service

- [ ] App backgrounded during active workout: rest timer keeps
      counting (foreground service).
- **What to look for:** start a workout, hit Start Rest, background
  the app for 90 seconds. Rest timer should keep counting and fire
  the haptic at 0. A persistent notification labeled "Active workout"
  is visible.

### 15. Brand hygiene

- [ ] No ironpath.app references anywhere; no Cal.com references; no
      em dashes (grep for U+2014 in mobile/); no Mindbody/Glofox.
- [ ] Brand color crimson everywhere except documented flame
      exception (`#FF7A3D` warm orange on streak flame icon +
      iron_streak_*w/m/y badges).

## Step 3: founder sign-off

After working through all 15 items above, the founder fills out the
sign-off block below:

```
Date:           ____________________________
Build (preview EAS link):
                ____________________________
Pixel 8:        OK / BLOCKING (item #__):  ___________________________
iPhone 15 Pro:  OK / BLOCKING (item #__):  ___________________________
Notes:          ____________________________
                ____________________________
                ____________________________

Sign-off:       ____________________________
```

If any item is BLOCKING, the implementing agent (Phase 2) re-runs that
slice's PR, ships a follow-up preview build, and the founder re-runs
the affected items.

After both Pixel 8 and iPhone 15 Pro come back OK, the founder
authorises the production submit by writing "PRODUCTION SUBMIT
APPROVED" + signature in the Notes field.

## Action items (founder, before production submit)

| ID | Item | Owner | Status |
| --- | --- | --- | --- |
| AI-1 | Populate `mobile/eas.json` `submit.production.ios` placeholders: `appleId`, `ascAppId`, `appleTeamId`. The agent left `PLACEHOLDER_*` strings; founder pastes the real values from App Store Connect + the Apple Developer account. Required ONCE before the first `eas submit --platform ios`. | Founder | OPEN |
| AI-2 | Drop `google-play-key.json` (the Play service account JSON) into `mobile/` (root of mobile workspace) OR set `EXPO_GOOGLE_SERVICE_ACCOUNT_PATH` env var pointing at it. Currently `eas.json` references `./google-play-key.json`; the file is gitignored. | Founder | OPEN |
| AI-3 | Confirm the EAS preview channel is "preview" (matches eas.json) AND the founder's Expo account is added as a Tester on the Internal Distribution channel so the install link works. | Founder | OPEN |
| AI-4 | Photo licensing: confirm the 3 Unsplash heroes (chalk-hands, barbell-macro, concrete-wall) are reused under the same Unsplash License attribution as marketing. For any future paid stock photo, use MANIFEST.md row updates + handle payment. (Founder note: "I will handle payments.") | Founder | OPEN |
| AI-5 | TestFlight: invite the founder's Apple ID to the IronPath app once AI-1 is populated; the EAS submit pipeline takes care of the upload. | Implementing agent (Phase 2) | OPEN |
| AI-6 | Production version bump: `mobile/app.json` `expo.version` to `1.1.0` is locked by SYNTHESIS; confirm `ios.buildNumber` and `android.versionCode` increment via `eas.json:autoIncrement`. | Implementing agent (Phase 2) | OPEN |

## Per-screen "what to look for" cheat sheet

Quick scan reference while running the 15-item checklist.

- **Splash:** ink-950 background `#0A0A0B`, crimson logomark centered,
  no orange anywhere. (Was `#FF6B35` orange pre-overhaul.)
- **Login (`(auth)/login.tsx`):** concrete-wall hero, top 40% mask
  to ink-950, ember 8% bottom, Mona Sans display weight on the
  wordmark.
- **Register (`(auth)/register.tsx`):** chalk-hands hero, left 50%
  mask, ember 8% bottom.
- **Feed (`(tabs)/index.tsx`):** barbell-macro top band, top 30%
  mask, ember 6% bottom. WorkoutCard is memoized -- liking one card
  should not flicker any other card.
- **Workouts / Train (`(tabs)/workouts.tsx` or `train.tsx`):**
  chalk-hands empty state when no routine. Pull-to-refresh works.
- **Progress (`(tabs)/progress.tsx`, NEW if Q1=B):** streak heatmap
  Skia canvas at top, monthly recap card below, body trends below
  that. Streak unit is "weeks" per Q2 lock; heatmap cells are daily.
- **Trainer (`(tabs)/trainer.tsx`):** coach-portrait empty state,
  adherence card with 75% completion ring, per-exercise narrative
  bullets.
- **Community (`(tabs)/community.tsx`, NEW if Q1=B):** leaderboard
  + boards + challenges sub-tabs. No photo (data-dense).
- **Me (`(tabs)/me.tsx`):** slimmed Profile, hero band uses
  user-provided photo OR concrete-wall fallback. Crimson focus ring
  on own avatar.
- **Workout active (`workout/active.tsx`):** ink-950 background, no
  decoration. Timer is Reanimated shared value (no React re-render
  storm). Haptic on `onPress` only.
- **Workout finish (`workout/finish.tsx`):** chalk-hands or
  barbell-macro hero, top 30% mask, ember 8% bottom. NumberRoll on
  stats.
- **Workout celebrate (`workout/celebrate.tsx`):** barbell-macro
  hero, radial dim with 50% center reveal, ember 12% bloom (dialed
  up), Skia particle puff under PR badge.
- **Analytics (`analytics/index.tsx`):** morning-gym hero on streak
  heatmap header, top 40% mask, ember 6% bottom.

## Phase 2 execution log

Phase 1 (this brief) is **infrastructure only**. Phase 2 is when
A+B+C land and the same agent re-spawns to actually:

- Run `eas build --profile preview --platform all` against the
  integrated codebase.
- Measure cold start on a Pixel 8 + iPhone 15 Pro (5 samples each).
- Run the audit scripts D-1 built (a11y + RTL + reduce-motion).
- Run `mobile/scripts/measure-apk-size.sh` against the built APK.
- Aggregate D-1 + D-2 outputs into a single PR D summary.

### Build artifacts (Phase 2)

| Platform | Build URL | SHA | Date |
| --- | --- | --- | --- |
| Android (Pixel 8) | _pending_ | _pending_ | _pending_ |
| iOS (iPhone 15 Pro) | _pending_ | _pending_ | _pending_ |

### Cold-start measurements (Phase 2)

| Device | Sample 1 | Sample 2 | Sample 3 | Sample 4 | Sample 5 | Median | Budget | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pixel 8 | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | 1800 ms | _pending_ |
| iPhone 15 Pro | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | 1500 ms | _pending_ |

### APK / IPA size (Phase 2)

| Artifact | Size | Budget | Delta vs baseline | Verdict |
| --- | --- | --- | --- | --- |
| APK arm64-v8a | _pending_ | 38 MB | _pending_ | _pending_ |
| IPA iPhone 15 Pro | _pending_ | 45 MB | _pending_ | _pending_ |

### A11y / RTL / reduce-motion audit (Phase 2 -- D-1 outputs)

_To be filled by D-1 audit scripts; cross-reference
`mobile/docs/A11Y_CHECKLIST.md` (D-1 slice)._

### Founder sign-off (Phase 2)

_Filled by the founder after side-loading and running the 15-item
checklist above._
