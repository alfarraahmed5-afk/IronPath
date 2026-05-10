/**
 * STUB -- replaced by Team B (B-1) in PR B.
 *
 * Motion primitives: useListStagger, usePageEnter, useSpringSheet,
 * useMagnetic. Lens 1 spec.
 *
 * Public API stable; today returns inert defaults so consumers can
 * already wire imports.
 */
import { useSharedValue } from 'react-native-reanimated';

export function useListStagger(_index: number) {
  // Returns: { entry: AnimatedStyle, exit: AnimatedStyle }
  // Stub: returns inert objects.
  return { entry: {}, exit: {} };
}

export function usePageEnter() {
  // Returns AnimatedStyle for the page-enter transition.
  return {};
}

export function useSpringSheet(_visible: boolean) {
  // Returns translateY shared value driven by springModal.
  return useSharedValue(0);
}

export function useMagnetic(_strength = 0.18) {
  // Returns { x, y } shared values for cursor-proximity tug.
  return { x: useSharedValue(0), y: useSharedValue(0) };
}
