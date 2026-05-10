/**
 * Modal transitions for `<Stack.Screen presentation: 'modal'>`.
 *
 * Lens 5 IA spec: any full-screen modal route (compose workout, edit
 * measurement, share-card preview, settings/* full-screen pages)
 * uses these options so they all arrive on the same rhythm.
 *
 * iOS: pageSheet by default. Spring on dismiss is the system spring
 * (we can't override it cleanly via react-native-screens without
 * dropping to native). When the screen wants the bottom-sheet feel
 * (pageSheet detents, drag-to-dismiss), use `bottomSheetModal`.
 *
 * Android: stock slide-from-bottom. The springModal preset isn't
 * honored on Android stack animation but the duration is.
 */
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

export const MODAL_DURATION_MS = 320;

/**
 * Default modal presentation. Use via:
 *
 *   <Stack.Screen
 *     name="compose-workout"
 *     options={modalTransition}
 *   />
 */
export const modalTransition: NativeStackNavigationOptions = {
  presentation: 'modal',
  animation: 'slide_from_bottom',
  animationDuration: MODAL_DURATION_MS,
  gestureEnabled: true,
};

/**
 * Bottom-sheet modal -- iOS pageSheet detents, Android slide. Lens 3
 * spec for the Comments / Followers / Exercise picker / Routines
 * picker surfaces.
 */
export const bottomSheetModal: NativeStackNavigationOptions = {
  presentation: 'formSheet',
  animation: 'slide_from_bottom',
  animationDuration: MODAL_DURATION_MS,
  gestureEnabled: true,
  // Detents are honored on iOS 15+; Android falls back to a
  // standard formSheet.
  sheetAllowedDetents: [0.5, 0.99],
  sheetGrabberVisible: true,
};

/**
 * Reduce-motion variant: hard slide trimmed to 200 ms.
 */
export const modalTransitionReduced: NativeStackNavigationOptions = {
  presentation: 'modal',
  animation: 'fade',
  animationDuration: 160,
  gestureEnabled: true,
};
