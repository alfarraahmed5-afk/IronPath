/**
 * STUB -- expanded by Team A in PR A.
 *
 * Public API contract (other agents may import these names):
 *   <ThemeProvider>{children}</ThemeProvider>
 *   useTheme(): { tokens, colorScheme, reduceMotion, fontScale, isRTL,
 *                 setReduceMotionOverride }
 *
 * Team A finalizes:
 *   - AccessibilityInfo.isReduceMotionEnabled() + listener
 *   - I18nManager.isRTL detection + reload helper
 *   - per-user override persisted to AsyncStorage
 *   - light-mode-future-ready colorScheme (locked 'dark' for v1)
 */
import React, { createContext, ReactNode } from 'react';
import { I18nManager } from 'react-native';
import * as tokens from '../tokens';

export interface ThemeContextValue {
  tokens: typeof tokens;
  colorScheme: 'dark' | 'light';
  reduceMotion: boolean;
  fontScale: number;
  isRTL: boolean;
  setReduceMotionOverride: (v: boolean | null) => void;
}

const defaultValue: ThemeContextValue = {
  tokens,
  colorScheme: 'dark',
  reduceMotion: false,
  fontScale: 1,
  isRTL: I18nManager.isRTL,
  setReduceMotionOverride: () => {},
};

export const ThemeContext = createContext<ThemeContextValue>(defaultValue);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={defaultValue}>
      {children}
    </ThemeContext.Provider>
  );
}
