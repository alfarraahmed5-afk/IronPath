/**
 * Motion primitives -- Reanimated worklet hooks.
 *
 * Lens 1 fingerprint:
 *   - Vercel ease (0.32, 0.72, 0, 1) for non-spring transitions
 *   - 60ms list stagger between successive children
 *   - 240ms entry / 60ms entry-delay / 180ms exit on page transitions
 *   - springModal { stiffness 380, damping 32 } for sheets / modals
 *   - springMagnetic { stiffness 480, damping 28 } for press / cursor tug
 *
 * All animated styles go through the UI thread; reduce-motion forks
 * collapse to crossfades. JS-side reduce-motion is read via
 * AccessibilityInfo and forwarded into the worklet via a shared value.
 *
 * Worklet correctness:
 *  - No JS-thread closure capture inside `useAnimatedStyle` callbacks.
 *  - Shared values are the only mutable bridge.
 *  - Easing.bezier is worklet-safe in Reanimated 4.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Dimensions } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
  Extrapolation,
  type SharedValue,
  type WithSpringConfig,
} from 'react-native-reanimated';
import {
  VERCEL_EASE,
  springModal,
  springMagnetic,
  LIST_STAGGER_MS,
  PAGE_ENTRY_MS,
  PAGE_ENTRY_DELAY_MS,
  PAGE_EXIT_MS,
} from '../tokens/motion';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// ---------------------------------------------------------------------------
// Reduce-motion hook (JS-thread). Worklets read via shared value.
// ---------------------------------------------------------------------------

/**
 * Read the OS-level reduce-motion preference. Re-renders on change.
 * Use the return value on the JS thread; for worklet-side guards, see
 * `useReanimatedReduceMotion()`.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (!cancelled) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      cancelled = true;
      sub.remove?.();
    };
  }, []);
  return reduce;
}

/**
 * Worklet-side reduce-motion read. Returns a SharedValue<boolean> so
 * `useAnimatedStyle` callbacks can branch without crossing the JS
 * bridge.
 */
export function useReanimatedReduceMotion(): SharedValue<boolean> {
  const sv = useSharedValue(false);
  const reduce = useReduceMotion();
  useEffect(() => {
    sv.value = reduce;
  }, [reduce, sv]);
  return sv;
}

// ---------------------------------------------------------------------------
// useListStagger -- per-index entry styles for staggered list reveal.
// ---------------------------------------------------------------------------

export interface ListStaggerStyles {
  entry: ReturnType<typeof useAnimatedStyle>;
  exit: ReturnType<typeof useAnimatedStyle>;
}

/**
 * Returns Reanimated styles for staggered list entry / exit. Each item
 * enters with `{ opacity 0 -> 1, translateY 16 -> 0 }` over 240ms with
 * VERCEL_EASE, delayed by `LIST_STAGGER_MS * index`. Reduce-motion
 * collapses to a 120ms opacity-only crossfade with no stagger.
 */
export function useListStagger(index: number, deps: ReadonlyArray<unknown> = []): ListStaggerStyles {
  const progress = useSharedValue(0);
  const exitProgress = useSharedValue(1);
  const reduceSv = useReanimatedReduceMotion();

  // Drive entry on mount + when `deps` change identity (e.g. data
  // reload). The dep array is left to the consumer so list keys can
  // re-trigger the stagger.
  useEffect(() => {
    progress.value = 0;
    const delay = (index ?? 0) * LIST_STAGGER_MS;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 240, easing: VERCEL_EASE }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, ...deps]);

  const entry = useAnimatedStyle(() => {
    'worklet';
    if (reduceSv.value) {
      return { opacity: progress.value };
    }
    const opacity = progress.value;
    const ty = interpolate(progress.value, [0, 1], [16, 0], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateY: ty }],
    };
  });

  const exit = useAnimatedStyle(() => {
    'worklet';
    if (reduceSv.value) {
      return { opacity: exitProgress.value };
    }
    const ty = interpolate(exitProgress.value, [0, 1], [-8, 0], Extrapolation.CLAMP);
    return {
      opacity: exitProgress.value,
      transform: [{ translateY: ty }],
    };
  });

  return { entry, exit };
}

// ---------------------------------------------------------------------------
// usePageEnter -- asymmetric page-entry style (240ms / 60ms delay).
// ---------------------------------------------------------------------------

/**
 * Page-level entry animation. Uses VERCEL_EASE timing curve. Returns a
 * single `entry` animated style. Reduce-motion fork: 120ms opacity
 * crossfade, no translate.
 */
export function usePageEnter() {
  const progress = useSharedValue(0);
  const reduceSv = useReanimatedReduceMotion();

  useEffect(() => {
    progress.value = withDelay(
      PAGE_ENTRY_DELAY_MS,
      withTiming(1, { duration: PAGE_ENTRY_MS, easing: VERCEL_EASE }),
    );
  }, [progress]);

  return useAnimatedStyle(() => {
    'worklet';
    if (reduceSv.value) {
      return { opacity: progress.value };
    }
    const ty = interpolate(progress.value, [0, 1], [12, 0], Extrapolation.CLAMP);
    return {
      opacity: progress.value,
      transform: [{ translateY: ty }],
    };
  });
}

// ---------------------------------------------------------------------------
// useSpringSheet -- visible -> animated translateY for a bottom sheet.
// ---------------------------------------------------------------------------

/**
 * Drives a translateY shared value via springModal when `visible`
 * toggles. Caller passes the shared value into a `transform: [{
 * translateY }]` animated style on the sheet root.
 *
 * Returns the shared value so callers can also read it from gesture
 * worklets (drag-to-dismiss can move the same value imperatively).
 */
export function useSpringSheet(visible: boolean, sheetHeight: number = SCREEN_HEIGHT): SharedValue<number> {
  const translateY = useSharedValue(sheetHeight);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, springModal);
    } else {
      translateY.value = withSpring(sheetHeight, springModal);
    }
  }, [visible, sheetHeight, translateY]);

  return translateY;
}

// ---------------------------------------------------------------------------
// useMagnetic -- cursor-proximity tug for primary CTAs.
// ---------------------------------------------------------------------------

export interface MagneticOffsets {
  x: SharedValue<number>;
  y: SharedValue<number>;
  /**
   * Apply a tug toward (dx, dy) where dx/dy are the pointer offsets in
   * the button's local coordinate space. Caller is responsible for
   * detecting hover / press position. Reduce-motion zeroes the tug.
   */
  tug: (dx: number, dy: number) => void;
  /** Release the tug back to (0, 0) with springMagnetic. */
  release: () => void;
}

/**
 * Magnetic offset shared values for press / hover tug. Strength 0.18
 * matches marketing's anchor.
 *
 * On mobile there is no cursor, so this hook is most useful as a press
 * feedback enhancement: at touch-down, the button "pulls" 0.18 of the
 * touch's offset from center; on release, springs back. Touch-only
 * surfaces can ignore this and rely on Pressable's scale.
 */
export function useMagnetic(strength: number = 0.18): MagneticOffsets {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const reduceSv = useReanimatedReduceMotion();

  function tug(dx: number, dy: number): void {
    if (reduceSv.value) {
      x.value = 0;
      y.value = 0;
      return;
    }
    x.value = withSpring(dx * strength, springMagnetic);
    y.value = withSpring(dy * strength, springMagnetic);
  }

  function release(): void {
    x.value = withSpring(0, springMagnetic);
    y.value = withSpring(0, springMagnetic);
  }

  return { x, y, tug, release };
}

// ---------------------------------------------------------------------------
// usePressScale -- crisp press feedback (1.0 -> 0.97). Used by Button +
// Pressable. Reduce-motion fork keeps scale at 1.0.
// ---------------------------------------------------------------------------

const PRESS_SPRING: WithSpringConfig = { stiffness: 400, damping: 18, mass: 0.8 };

export function usePressScale(targetScale: number = 0.97) {
  const scale = useSharedValue(1);
  const reduceSv = useReanimatedReduceMotion();

  function pressIn(): void {
    if (reduceSv.value) return;
    scale.value = withSpring(targetScale, PRESS_SPRING);
  }
  function pressOut(): void {
    scale.value = withSpring(1, PRESS_SPRING);
  }

  const animStyle = useAnimatedStyle(() => {
    'worklet';
    return { transform: [{ scale: scale.value }] };
  });

  return { animStyle, pressIn, pressOut, scale };
}

// ---------------------------------------------------------------------------
// useShake -- horizontal shake on validation block. (-8, +8, -4, +4, 0)
// over 280ms easeInOut. One-shot on `trigger()`.
// ---------------------------------------------------------------------------

export function useShake() {
  const tx = useSharedValue(0);
  const reduceSv = useReanimatedReduceMotion();

  function trigger(): void {
    if (reduceSv.value) {
      // Reduce motion: a single brief opacity flash via the consumer is
      // expected. We zero translation so callers don't see ghost shake.
      tx.value = 0;
      return;
    }
    tx.value = withSequence(
      withTiming(-8, { duration: 56, easing: Easing.inOut(Easing.ease) }),
      withTiming(8,  { duration: 56, easing: Easing.inOut(Easing.ease) }),
      withTiming(-4, { duration: 56, easing: Easing.inOut(Easing.ease) }),
      withTiming(4,  { duration: 56, easing: Easing.inOut(Easing.ease) }),
      withTiming(0,  { duration: 56, easing: Easing.inOut(Easing.ease) }),
    );
  }

  const animStyle = useAnimatedStyle(() => {
    'worklet';
    return { transform: [{ translateX: tx.value }] };
  });

  return { animStyle, trigger, tx };
}

// ---------------------------------------------------------------------------
// Re-exports for convenience so consumers can pull everything from
// `design-system/motion/primitives`.
// ---------------------------------------------------------------------------

export {
  VERCEL_EASE,
  PAGE_EXIT_MS,
  PAGE_ENTRY_MS,
  PAGE_ENTRY_DELAY_MS,
  springModal,
  springMagnetic,
  LIST_STAGGER_MS,
};
