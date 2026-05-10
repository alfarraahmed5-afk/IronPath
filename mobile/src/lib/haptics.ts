/**
 * Canonical haptic map -- 57-row implementation per lens 8.
 *
 * Single source of truth. Every interaction in the shipped v1 app maps
 * to exactly one named method here. iOS-rich (Soft / Rigid) variants
 * fall back to Light / Medium on Android via expo-haptics.
 *
 * Custom multi-pulse signatures (PR unlock, streak day-roll, milestone)
 * use `react-native` `Vibration.vibrate(pattern)` on Android paired
 * with sequenced expo-haptics calls on iOS.
 *
 * Anti-spam gates:
 *  - Module-level `enabled` flag, settable via `setEnabled(false)`.
 *    Every helper short-circuits when disabled.
 *  - No haptic during prolonged spring animations (callers gate; this
 *    module fires single-shot only).
 *  - No haptic on info toasts; only success / error variants exist.
 */
import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

// --- module-level gate -------------------------------------------------------

let enabled = true;

export function setHapticsEnabled(next: boolean): void {
  enabled = next;
}

export function areHapticsEnabled(): boolean {
  return enabled;
}

// --- low-level primitives ----------------------------------------------------

function safeImpact(style: Haptics.ImpactFeedbackStyle): void {
  if (!enabled) return;
  Haptics.impactAsync(style).catch(() => {});
}

function safeNotification(type: Haptics.NotificationFeedbackType): void {
  if (!enabled) return;
  Haptics.notificationAsync(type).catch(() => {});
}

function safeSelection(): void {
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => {});
}

// iOS Soft + Rigid (iOS 13+). Falls back to Light / Medium on Android
// since Android's HapticFeedbackConstants surface is coarser.
function softImpact(): void {
  if (!enabled) return;
  if (Platform.OS === 'ios') {
    // Soft is exposed as ImpactFeedbackStyle.Soft on iOS 13+. The expo
    // typed enum may not list it on older expo-haptics; cast to any to
    // pass the name through.
    const style = (Haptics.ImpactFeedbackStyle as any).Soft
      ?? Haptics.ImpactFeedbackStyle.Light;
    Haptics.impactAsync(style).catch(() => {});
  } else {
    safeImpact(Haptics.ImpactFeedbackStyle.Light);
  }
}

function rigidImpact(): void {
  if (!enabled) return;
  if (Platform.OS === 'ios') {
    const style = (Haptics.ImpactFeedbackStyle as any).Rigid
      ?? Haptics.ImpactFeedbackStyle.Medium;
    Haptics.impactAsync(style).catch(() => {});
  } else {
    safeImpact(Haptics.ImpactFeedbackStyle.Medium);
  }
}

// Multi-pulse pattern. Android uses Vibration.vibrate(pattern); iOS
// schedules sequenced notifications because it lacks a public
// custom-pattern API at the JS layer.
function pattern(durations: number[], iosNotifications: number): void {
  if (!enabled) return;
  if (Platform.OS === 'android') {
    Vibration.vibrate(durations);
    return;
  }
  // iOS: fire `iosNotifications` notifications spaced by the average
  // gap between durations[odd indices] (the rest periods).
  const gap = durations.length > 1
    ? Math.max(60, Math.round(durations[2] ?? 80))
    : 80;
  for (let i = 0; i < iosNotifications; i++) {
    setTimeout(
      () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
      i * gap,
    );
  }
}

// --- canonical haptic map ----------------------------------------------------
// Names track the Interaction column of the lens-8 table. Every screen
// imports `haptic` and calls a named method; no raw expo-haptics
// imports anywhere else in the app.

export const haptic = {
  // Legacy primitives kept for backwards compat with existing call
  // sites (Pressable, Button, active.tsx). New code SHOULD prefer the
  // semantic methods below.
  light:   () => safeImpact(Haptics.ImpactFeedbackStyle.Light),
  medium:  () => safeImpact(Haptics.ImpactFeedbackStyle.Medium),
  heavy:   () => safeImpact(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => safeNotification(Haptics.NotificationFeedbackType.Success),
  warning: () => safeNotification(Haptics.NotificationFeedbackType.Warning),
  error:   () => safeNotification(Haptics.NotificationFeedbackType.Error),
  select:  () => safeSelection(),
  soft:    () => softImpact(),
  rigid:   () => rigidImpact(),

  // ---- semantic map (lens 8 rows 1-57) ------------------------------------
  // Tab bar
  tabSwitch:        () => safeSelection(),                                       // 1
  tabLongPress:     () => safeImpact(Haptics.ImpactFeedbackStyle.Medium),        // 2
  tabDoubleTap:     () => safeSelection(),                                       // 3

  // Buttons
  buttonPrimary:    () => softImpact(),                                          // 4
  buttonSecondary:  () => safeImpact(Haptics.ImpactFeedbackStyle.Light),         // 5
  rowTap:           () => safeImpact(Haptics.ImpactFeedbackStyle.Light),         // 6

  // Like / comment
  likeOn:           () => safeNotification(Haptics.NotificationFeedbackType.Success), // 7
  likeOff:          () => safeImpact(Haptics.ImpactFeedbackStyle.Light),         // 8
  commentSend:      () => safeImpact(Haptics.ImpactFeedbackStyle.Light),         // 9
  commentDelete:    () => safeNotification(Haptics.NotificationFeedbackType.Warning), // 10

  // Pull to refresh
  pullRefreshTrigger: () => safeImpact(Haptics.ImpactFeedbackStyle.Medium),      // 11
  pullRefreshLoaded:  () => safeNotification(Haptics.NotificationFeedbackType.Success), // 12

  // Workout sets
  setComplete:      () => safeImpact(Haptics.ImpactFeedbackStyle.Light),         // 13
  setBlocked:       () => safeNotification(Haptics.NotificationFeedbackType.Warning), // 14
  setTypeOpen:      () => rigidImpact(),                                         // 15
  setTypeSelect:    () => safeSelection(),                                       // 16
  setRevealAction:  () => safeImpact(Haptics.ImpactFeedbackStyle.Light),         // 17
  setDeleteCommit:  () => safeNotification(Haptics.NotificationFeedbackType.Warning), // 18
  setAdd:           () => safeImpact(Haptics.ImpactFeedbackStyle.Light),         // 19

  // Exercise reorder + swipe
  reorderPickup:    () => safeImpact(Haptics.ImpactFeedbackStyle.Medium),        // 20
  reorderDrop:      () => safeImpact(Haptics.ImpactFeedbackStyle.Heavy),         // 21
  exerciseSnap:     () => safeSelection(),                                       // 22
  exerciseRemove:   () => safeNotification(Haptics.NotificationFeedbackType.Warning), // 23

  // Rest timer
  timerAdjust:      () => safeImpact(Haptics.ImpactFeedbackStyle.Light),         // 24
  timerSkip:        () => safeImpact(Haptics.ImpactFeedbackStyle.Light),         // 25
  timerExpire:      () => safeNotification(Haptics.NotificationFeedbackType.Success), // 26

  // Workout finish
  workoutFinishCta: () => softImpact(),                                          // 27
  workoutDiscard:   () => safeNotification(Haptics.NotificationFeedbackType.Warning), // 28
  workoutSaveOk:    () => safeNotification(Haptics.NotificationFeedbackType.Success), // 29

  // Celebration signatures
  prUnlock:         () => pattern([0, 30, 60, 30], 2),                           // 30
  streakDayRoll:    () => pattern([0, 25, 50, 25, 50, 25], 3),                   // 31
  milestoneUnlock:  () => pattern([0, 30, 60, 30], 2),                           // 32

  // Photo / share
  shareExport:      () => safeNotification(Haptics.NotificationFeedbackType.Success), // 33
  photoCapture:     () => safeImpact(Haptics.ImpactFeedbackStyle.Heavy),         // 34
  measurementSave:  () => safeNotification(Haptics.NotificationFeedbackType.Success), // 35

  // Modal / sheet
  modalDismiss:     () => safeImpact(Haptics.ImpactFeedbackStyle.Light),         // 36
  sheetDragCommit:  () => safeImpact(Haptics.ImpactFeedbackStyle.Light),         // 37
  // sheetSnapBack: no haptic by design (row 38)

  // Routines
  routineSave:      () => safeNotification(Haptics.NotificationFeedbackType.Success), // 39
  routineReorderPickup: () => safeImpact(Haptics.ImpactFeedbackStyle.Medium),    // 40
  routineReorderDrop:   () => safeImpact(Haptics.ImpactFeedbackStyle.Heavy),     // 41
  routineDelete:    () => safeNotification(Haptics.NotificationFeedbackType.Warning), // 42

  // Misc
  exercisePin:      () => safeImpact(Haptics.ImpactFeedbackStyle.Light),         // 43
  notificationDismiss: () => safeImpact(Haptics.ImpactFeedbackStyle.Light),      // 44
  filterChange:     () => safeSelection(),                                       // 45
  segmentChange:    () => safeSelection(),                                       // 46
  formError:        () => safeNotification(Haptics.NotificationFeedbackType.Error), // 47
  networkError:     () => safeNotification(Haptics.NotificationFeedbackType.Error), // 48
  signOut:          () => safeImpact(Haptics.ImpactFeedbackStyle.Medium),        // 49
  duelAccept:       () => safeNotification(Haptics.NotificationFeedbackType.Success), // 50
  duelDecline:      () => safeNotification(Haptics.NotificationFeedbackType.Warning),
  challengeJoin:    () => safeNotification(Haptics.NotificationFeedbackType.Success), // 51

  // Toasts
  // toastInfo: no haptic (row 52)
  toastSuccess:     () => safeNotification(Haptics.NotificationFeedbackType.Success), // 53
  toastError:       () => safeNotification(Haptics.NotificationFeedbackType.Error),   // 54
  toastSwipeDismiss: () => safeImpact(Haptics.ImpactFeedbackStyle.Light),        // 55

  // Showcase reorder
  showcasePickup:   () => safeImpact(Haptics.ImpactFeedbackStyle.Medium),        // 56
  showcaseDrop:     () => safeImpact(Haptics.ImpactFeedbackStyle.Heavy),         // 57
};

export type HapticKey = keyof typeof haptic;
