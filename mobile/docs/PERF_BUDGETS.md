# Mobile performance budgets

Source of truth for the runtime performance ceilings the cinematic
overhaul must respect. Sourced verbatim from
`skills/mobile-council/lens-06-performance-engineer.md`.

Every budget is enforced at PR D's preview build via the measurement
scripts in `mobile/scripts/measure-*`. Numbers below are the lens 6
sign-off line; missing them on a flagship device is a regression.

## Targets

| Metric | Pixel 8 / S24 | iPhone 15 Pro | Notes |
| --- | --- | --- | --- |
| Cold start to first interactive frame | <= 1800 ms | <= 1500 ms | Process start to Feed tab interactive |
| Warm start (resume from background) | <= 600 ms | <= 400 ms | Splash should NOT show on warm start |
| Tab switch first paint | <= 100 ms | <= 80 ms | Tabs eager-bundled, route swap only |
| Stack push first paint | <= 250 ms | <= 200 ms | Skeleton must show within 80 ms |
| Frame budget steady state | 8.3 ms (120 fps) | 8.3 ms (120 fps) | ProMotion + Pixel 8 high refresh |
| Frame budget under heavy scroll | 16.6 ms (60 fps) | 8.3 ms (120 fps) | OK to drop to 60 fps on Android during scroll |
| JS thread cost per anim frame | <= 1 ms | <= 1 ms | Animations on UI thread, not JS |
| Active workout re-render per tick | <= 2 ms | <= 2 ms | Currently ~10-20 ms; lens 6 fix lands in PR C |
| APK size (release, arm64-v8a) | <= 38 MB | <= 45 MB IPA | Pre-overhaul baseline ~25-30 MB |
| APK size delta vs baseline | <= +5 MB | <= +5 MB | Mona Sans + photos + Skia particles + RQ |
| Mona Sans payload | <= 90 KB axis-cut | same | Variable WOFF2, Latin subset |
| Lottie cap (per file) | <= 60 KB JSON | same | Strict |
| Lottie cap (total) | <= 250 KB | same | Hard ceiling |
| Peak heap during active workout | <= 220 MB | <= 250 MB | Skia + photos + 30+ sets + rest timer |
| Photo decode hero card | <= 1280w | same | Server resizes; never decode source |
| Heatmap GPU draw cost (84 cells) | <= 4 ms | <= 4 ms | Single Skia canvas, not 84 Image cells |
| Bundle delta total (overhaul) | <= +5 MB | same | Hard cap |

## Bundle delta accounting

Per lens 6 sign-off matrix:

| Item | Delta |
| --- | --- |
| Mona Sans variable WOFF2 (Latin axis-cut) | ~90 KB |
| IBM Plex Sans Arabic (4 statics) | ~260 KB |
| Photo bundle (10 AVIF x 2 sizes) | ~1.6 MB |
| Skia particle layer (already-paid native; JS only) | ~50 KB JS |
| React Query v5 | ~25 KB JS |
| Drop victory-native (already installed, zero imports) | -120 KB JS |
| **Net APK delta** | **~+1.8 to +2.0 MB** |

Headroom under the 5 MB cap allows for a single Lottie addition
(<=250 KB) without breaking the ceiling.

## Library sign-off matrix

Approved (no change in PR D):

- Reanimated 4.2.1 (already paid; UI-thread worklets only)
- @shopify/react-native-skia 2.4.18 (already paid; native ~3 MB)
- expo-blur 55.0.14 (already paid; iOS native, Android software-emul)
- react-native-view-shot 4.0.3 (already paid; share-card export)
- expo-image (already paid; replaces stock Image everywhere)

Conditional / approved subject to budget:

- Lottie (`lottie-react-native`) -- ONLY if a confirmed asset arrives
  AND the file fits 60 KB / 250 KB caps.

Rejected:

- Moti (wraps Reanimated; not worth the indirection)
- react-native-redash (most utilities inlinable)
- victory-native (zero imports; remove for ~120 KB savings)

## Animation rules (binding)

1. Animate transform + opacity ONLY. Never width/height/top/left.
2. Use `useSharedValue` + `useAnimatedStyle`. Legacy `Animated`
   forbidden in net-new code.
3. `runOnJS` is fine for haptics + analytics + toast triggers,
   never inside a tight per-frame worklet loop.
4. Variable-font axis morph via `useDerivedValue` -> `fontVariationSettings`.
   Do NOT animate `transform: scale` on text.
5. Skia for procedural motion (count-up, ember seam, heatmap, sparkline,
   share-card composition).
6. Reanimated for UI element transforms + shared-element transitions.
7. Lottie ONLY for hand-illustrated celebration moments, max 2-4 files.
8. Target 120 fps on ProMotion + Pixel 8/S24. Acceptable drop to 60 fps
   under heavy scroll; never below.

## Photo rules (binding)

1. Hero photos: max 1280w on phone displays; 640w on card thumbs.
2. Avatars: 2x display size (40px display fetches 80x80).
3. Heatmap: ONE Skia canvas, single GPU draw, ~4 ms target.
   84 sub-images is forbidden.
4. Share-card export at 1080x1920 via react-native-view-shot, wrapped:
   ```
   await new Promise(r => requestAnimationFrame(r));
   await captureRef(ref, { width: 1080, height: 1920 });
   ```
5. No PNG over 200 KB shipped in `assets/`. Splash + adaptive icon is
   the entire bundle budget.
6. Blurhash placeholder mandatory for any photo over 320w.
7. B&W gym macros: bundled via the EAS build (Lens 2 P0-5 spec).
   The lens-6 default of "ship from CDN" is overridden by lens-2's
   "ship in EAS to avoid first-frame color flash"; the 1.6 MB bundle
   delta fits inside the 5 MB ceiling.

## Cold-start surgery (already locked by lens 6)

1. Reduce eager font load to the critical 3 weights (Barlow_400Regular,
   Barlow_500Medium, BarlowCondensed_900Black or Mona Sans axis-cut
   once ported). Defer the rest to first authenticated render.
2. 3000 ms splash-hide timeout regardless of fontsLoaded.
3. Defer push token registration via `InteractionManager.runAfterInteractions`.
4. Cold-start nav uses `router.replace` once the layout reports ready,
   not a hard-coded 600 ms setTimeout.

## Active-workout re-render storm fix (lens 6 P0)

1. Move `elapsed_seconds` to a Reanimated `useSharedValue`.
2. Same for `restTimer`. Sample to JS only at milestones (30s, 10s, 0s).
3. Wrap `SetRow` + `ExerciseCard` in `React.memo` with stable handler refs.
4. Per-field Zustand selectors instead of object destructure.
5. Memoize PR-fetch dep array via `useMemo`.

## Telemetry (lens 6 recommendation)

1. Sentry Performance Monitoring (5% prod sample rate).
2. Custom timing instrumentation in `_layout.tsx` at four checkpoints.
3. Reanimated `useFrameCallback` for frame-drop counter during the
   active workout flow.
4. Production-only; dev disabled.

## Verification protocol (PR D Phase 2)

1. Run `mobile/scripts/build-preview.ps1` (or .sh) to produce the
   side-load APK + IPA.
2. Run `mobile/scripts/measure-cold-start.mjs` instructions on a
   physical Pixel 8 with USB debugging enabled. Sample 5 cold starts;
   median must be <= 1800 ms.
3. Run `mobile/scripts/measure-apk-size.sh` against the EAS build
   artifact; total must be <= 38 MB.
4. Open Xcode Instruments time-profiler on iPhone 15 Pro for the
   iOS cold-start measurement. Median must be <= 1500 ms.
5. Frame-drop measurement: enter active workout, log 30 sets, scroll
   feed for 60 seconds. `useFrameCallback` log must show no frame
   over 16.6 ms in steady state.

Failures are blocking for production submit.
