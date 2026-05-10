/**
 * ThemeProvider -- runtime theme + accessibility + locale context.
 *
 * Cinematic overhaul (PR A) finalized by Team A per lens 10 [A2] spec.
 *
 * Responsibilities:
 *   - Expose static design tokens (colors, typography, spacing, radii,
 *     shadows, motion) under a single `tokens` field for context-based
 *     consumption. Non-React contexts (Skia paint, Tailwind config) keep
 *     reading the raw exports from `@/design-system/tokens`.
 *   - Track `reduceMotion` (AccessibilityInfo + live listener) so primitives
 *     that animate can fork to a no-animation fallback.
 *   - Track `fontScale` (Dimensions.fontScale + change listener) so primitives
 *     can clamp Dynamic Type per lens 9.
 *   - Track `isRTL` (I18nManager.isRTL) so primitives that mirror flexDirection
 *     can fork. RTL recompose requires app reload; we capture the value at
 *     mount time and a future locale-switcher will trigger I18nManager.forceRTL
 *     plus an Updates.reloadAsync().
 *   - Persist a per-user reduce-motion override (`expo-secure-store` key
 *     `theme.reduceMotionOverride`). The override wins over the OS setting
 *     when set; setting to `null` clears it (back to OS-driven).
 *
 * v1 ships dark-only. `colorScheme` is locked to `'dark'`. `setColorScheme`
 * is wired but a no-op for now so future light-mode work is a single-line
 * flip.
 */
import React, {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Dimensions,
  I18nManager,
  type EmitterSubscription,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

import * as tokens from '../tokens';

const REDUCE_MOTION_OVERRIDE_KEY = 'theme.reduceMotionOverride';

export type ColorScheme = 'dark' | 'light';

export interface ThemeContextValue {
  /** Static design tokens. Identity-stable across renders. */
  tokens: typeof tokens;
  /** Active color scheme. v1 locked 'dark'. */
  colorScheme: ColorScheme;
  /** No-op in v1; preserved for future light-mode wiring. */
  setColorScheme: (s: ColorScheme) => void;
  /**
   * Live reduce-motion flag. True when either:
   *   1. The user override is `true`, OR
   *   2. The user override is null AND the OS setting is on.
   */
  reduceMotion: boolean;
  /**
   * Persist a per-user override for reduce-motion. `null` clears the
   * override and falls back to the OS setting.
   */
  setReduceMotionOverride: (v: boolean | null) => Promise<void>;
  /** The current persisted override, or null if none. */
  reduceMotionOverride: boolean | null;
  /** `Dimensions.fontScale` -- live updated. */
  fontScale: number;
  /** `I18nManager.isRTL` at provider mount. RTL toggle requires app reload. */
  isRTL: boolean;
}

const noopAsync = async () => {};

const defaultValue: ThemeContextValue = {
  tokens,
  colorScheme: 'dark',
  setColorScheme: () => {},
  reduceMotion: false,
  setReduceMotionOverride: noopAsync,
  reduceMotionOverride: null,
  fontScale: 1,
  isRTL: I18nManager.isRTL,
};

export const ThemeContext = createContext<ThemeContextValue>(defaultValue);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Locked to dark for v1; setter is preserved for future flip.
  const [colorScheme, setColorScheme] = useState<ColorScheme>('dark');

  // OS-level reduce-motion. Live updated.
  const [osReduceMotion, setOsReduceMotion] = useState(false);

  // User override. `undefined` = "not yet loaded from storage"; `null` =
  // "loaded, no override set"; `boolean` = "explicit override".
  // Treat undefined as null externally so consumers always get one of the
  // three documented shapes.
  const [override, setOverride] = useState<boolean | null | undefined>(
    undefined,
  );

  const [fontScale, setFontScale] = useState(
    () => Dimensions.get('window').fontScale || 1,
  );

  // Capture isRTL at mount. Live changes only happen via Updates.reloadAsync.
  const isRTLRef = useRef(I18nManager.isRTL);

  // Initial OS reduce-motion read + listener.
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!cancelled) setOsReduceMotion(!!enabled);
      })
      .catch(() => {
        // Non-critical; default false.
      });

    // RN's listener returns an EmitterSubscription on modern versions.
    const sub: EmitterSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => setOsReduceMotion(!!enabled),
    );

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  // Live fontScale tracking via Dimensions.
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      const next = window.fontScale || 1;
      setFontScale((prev) => (prev === next ? prev : next));
    });
    return () => sub.remove();
  }, []);

  // Load the persisted override on mount.
  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(REDUCE_MOTION_OVERRIDE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw === 'true') setOverride(true);
        else if (raw === 'false') setOverride(false);
        else setOverride(null);
      })
      .catch(() => {
        if (!cancelled) setOverride(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setReduceMotionOverride = useCallback(
    async (v: boolean | null) => {
      setOverride(v);
      try {
        if (v === null) {
          await SecureStore.deleteItemAsync(REDUCE_MOTION_OVERRIDE_KEY);
        } else {
          await SecureStore.setItemAsync(
            REDUCE_MOTION_OVERRIDE_KEY,
            v ? 'true' : 'false',
          );
        }
      } catch {
        // Swallow; in-memory state already reflects the change.
      }
    },
    [],
  );

  const resolvedOverride = override ?? null;
  const reduceMotion =
    resolvedOverride === true
      ? true
      : resolvedOverride === false
      ? false
      : osReduceMotion;

  const value = useMemo<ThemeContextValue>(
    () => ({
      tokens,
      colorScheme,
      setColorScheme,
      reduceMotion,
      setReduceMotionOverride,
      reduceMotionOverride: resolvedOverride,
      fontScale,
      isRTL: isRTLRef.current,
    }),
    [
      colorScheme,
      reduceMotion,
      resolvedOverride,
      setReduceMotionOverride,
      fontScale,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
