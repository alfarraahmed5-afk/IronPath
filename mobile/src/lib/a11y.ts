/**
 * a11y.ts -- accessibility hooks + helpers for mobile.
 *
 * Per Lens 9 (skills/mobile-council/lens-09-accessibility-auditor.md).
 *
 * Hooks:
 *   useReduceMotion()        -- AccessibilityInfo.isReduceMotionEnabled + listener
 *   useReduceTransparency()  -- iOS only; Android falls back to false
 *   useScreenReader()        -- { isEnabled, announce(message) }
 *   useFontScale()           -- current OS font scale (PixelRatio.getFontScale)
 *   useHighContrast()        -- iOS isInvertColorsEnabled + Android isHighTextContrastEnabled
 *
 * Helpers:
 *   getMaxFontScaleForVariant(variant) -- caps per Lens 9 spec
 *   announceForAccessibility(message)  -- AccessibilityInfo.announceForAccessibility
 *
 * Reanimated callers: this module is for non-Reanimated consumers. Reanimated
 * worklets must use B-1's `useReanimatedReduceMotion` (which forwards
 * UI-thread-safe values).
 *
 * No em dashes -- founder rule.
 */
import { useEffect, useState, useCallback } from 'react';
import { AccessibilityInfo, PixelRatio, Platform } from 'react-native';

/* -------------------------------------------------------------------- */
/*  Reduce motion                                                       */
/* -------------------------------------------------------------------- */

/**
 * `useReduceMotion()` -- returns true when the user has enabled the OS
 * reduce-motion preference (iOS: Settings -> Accessibility -> Motion ->
 * Reduce Motion; Android: Settings -> Accessibility -> Remove animations).
 *
 * Updates live via the `reduceMotionChanged` AccessibilityInfo listener.
 *
 * USE CASE: gate non-Reanimated animations (e.g. CSS-style View transforms,
 * LayoutAnimation, expo-linear-gradient pulses, expo-blur intensity changes).
 *
 * For Reanimated worklets, prefer the UI-thread variant from
 * `mobile/src/design-system/motion/primitives.ts` (Team B-1) so the worklet
 * doesn't have to bridge to JS to read the flag.
 */
export function useReduceMotion(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (!cancelled) setEnabled(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setEnabled);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return enabled;
}

/* -------------------------------------------------------------------- */
/*  Reduce transparency                                                 */
/* -------------------------------------------------------------------- */

/**
 * `useReduceTransparency()` -- iOS only. Android does not expose a system
 * flag; mirror via in-app preference for parity.
 *
 * USE CASE: replace BlurView and any glass-card variant with a solid
 * surface fill when the user has Reduce Transparency on.
 */
export function useReduceTransparency(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    // @ts-expect-error: isReduceTransparencyEnabled exists at runtime on iOS
    const probe = AccessibilityInfo.isReduceTransparencyEnabled;
    if (typeof probe === 'function') {
      probe().then((v: boolean) => {
        if (!cancelled) setEnabled(v);
      });
    }
    // @ts-expect-error: 'reduceTransparencyChanged' exists at runtime on iOS
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setEnabled);
    return () => {
      cancelled = true;
      // @ts-expect-error
      sub.remove();
    };
  }, []);

  return enabled;
}

/* -------------------------------------------------------------------- */
/*  Screen reader                                                       */
/* -------------------------------------------------------------------- */

export interface ScreenReaderState {
  /** True when VoiceOver (iOS) or TalkBack (Android) is active. */
  isEnabled: boolean;
  /** Speak `message` via the system screen reader. No-op when SR is off. */
  announce: (message: string) => void;
}

/**
 * `useScreenReader()` -- returns the live state + an announce helper.
 *
 * USE CASES (per Lens 9):
 *   - Disable celebrate auto-dismiss when SR is on (WCAG 2.2.1).
 *   - Announce rest-timer milestones ("Rest, 90 seconds", "10 seconds left",
 *     "Rest done").
 *   - Announce a successful PR ("Personal record. Bench press 100 kilograms.").
 */
export function useScreenReader(): ScreenReaderState {
  const [isEnabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isScreenReaderEnabled().then((v) => {
      if (!cancelled) setEnabled(v);
    });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const announce = useCallback((message: string) => {
    if (!message) return;
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  return { isEnabled, announce };
}

/**
 * `announceForAccessibility(message)` -- imperative shortcut for callsites
 * that don't need the live state.
 */
export function announceForAccessibility(message: string): void {
  if (!message) return;
  AccessibilityInfo.announceForAccessibility(message);
}

/* -------------------------------------------------------------------- */
/*  Font scale                                                          */
/* -------------------------------------------------------------------- */

/**
 * `useFontScale()` -- current OS font scale. iOS Dynamic Type categories
 * map to scales 0.82 (XS) through 3.10 (AX5). Android scales 0.85 - 2.0
 * on most flagships.
 *
 * RN updates the scale on locale/preference changes via the same Appearance
 * mechanism as colorScheme; we just read PixelRatio.getFontScale() once
 * and let React's render cycle handle the rest.
 */
export function useFontScale(): number {
  const [scale, setScale] = useState<number>(() => PixelRatio.getFontScale());

  useEffect(() => {
    // PixelRatio doesn't expose a listener directly. AccessibilityInfo on
    // iOS fires `boldTextChanged` and similar but not a font-scale change.
    // Best practice is to re-read on AppState foreground; for v1, a single
    // read on mount is acceptable. The Text primitive bakes its own
    // maxFontSizeMultiplier so visual breakage from a stale scale is bounded.
    setScale(PixelRatio.getFontScale());
  }, []);

  return scale;
}

/* -------------------------------------------------------------------- */
/*  High contrast                                                       */
/* -------------------------------------------------------------------- */

/**
 * `useHighContrast()` -- proxy for "user wants higher contrast".
 *
 * iOS: actual Increase Contrast flag is NOT exposed in RN. We use
 *   `isInvertColorsEnabled()` as the closest reliable proxy.
 * Android: API 21+ exposes `isHighTextContrastEnabled()`.
 *
 * USE CASE: swap `border` / `borderSubtle` to a high-contrast fork
 * (`#5C5C66`) so card edges stay visible.
 */
export function useHighContrast(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (Platform.OS === 'android') {
      // @ts-expect-error: isHighTextContrastEnabled exists at runtime on Android
      const probe = AccessibilityInfo.isHighTextContrastEnabled;
      if (typeof probe === 'function') {
        probe().then((v: boolean) => {
          if (!cancelled) setEnabled(v);
        });
      }
      return () => {
        cancelled = true;
      };
    }
    // iOS proxy
    AccessibilityInfo.isInvertColorsEnabled().then((v) => {
      if (!cancelled) setEnabled(v);
    });
    const sub = AccessibilityInfo.addEventListener('invertColorsChanged', setEnabled);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return enabled;
}

/* -------------------------------------------------------------------- */
/*  Per-variant Dynamic Type caps                                       */
/* -------------------------------------------------------------------- */

/**
 * Type variants known to the design-system Text primitive. Keep in sync
 * with `mobile/src/design-system/tokens/typography.ts`.
 */
export type TypeVariant =
  | 'display1'
  | 'display2'
  | 'display3'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'body'
  | 'bodyEmphasis'
  | 'label'
  | 'caption'
  | 'overline'
  | 'numeric'
  | 'numericLarge'
  | 'mono';

/**
 * `getMaxFontScaleForVariant(variant)` -- per Lens 9 caps:
 *
 *   display* / numericLarge:  1.4x  (hero only; protects line breaks)
 *   title*:                   1.6x  (section headers)
 *   body / bodyEmphasis:      1.8x  (full Dynamic Type for body)
 *   label:                    1.8x
 *   numeric / mono:           1.4x / 1.6x  (tabular columns)
 *   caption / overline:       uncapped  (smallest; let them grow)
 */
export function getMaxFontScaleForVariant(variant: TypeVariant): number | undefined {
  switch (variant) {
    case 'display1':
    case 'display2':
    case 'display3':
    case 'numericLarge':
      return 1.4;
    case 'title1':
    case 'title2':
    case 'title3':
      return 1.6;
    case 'body':
    case 'bodyEmphasis':
    case 'label':
      return 1.8;
    case 'numeric':
      return 1.4;
    case 'mono':
      return 1.6;
    case 'caption':
    case 'overline':
      return undefined; // uncapped
    default:
      return 1.8;
  }
}

/* -------------------------------------------------------------------- */
/*  Layout breakpoint helper                                            */
/* -------------------------------------------------------------------- */

/**
 * `useLargeFontLayout(threshold = 1.4)` -- returns true when the OS font
 * scale meets or exceeds `threshold`. Use to switch a screen from
 * horizontal-row layouts to stacked-column layouts at large Dynamic Type.
 *
 * Example: active-workout SetRow stacks `[setBtn][weight][reps]` into two
 * lines when `useLargeFontLayout() === true`.
 */
export function useLargeFontLayout(threshold = 1.4): boolean {
  const scale = useFontScale();
  return scale >= threshold;
}

/* -------------------------------------------------------------------- */
/*  Default exports                                                     */
/* -------------------------------------------------------------------- */

const a11y = {
  useReduceMotion,
  useReduceTransparency,
  useScreenReader,
  useFontScale,
  useHighContrast,
  useLargeFontLayout,
  announceForAccessibility,
  getMaxFontScaleForVariant,
};

export default a11y;
