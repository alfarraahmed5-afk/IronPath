/**
 * Pressable -- haptic + scale + ripple primitive.
 *
 * BUG FIX (lens 8 row 6): haptics now fire on `onPress`, not
 * `onPressIn`. Firing on press-in caused haptic-spam when the user
 * scrolled with their finger landing on a Pressable inside a
 * ScrollView. The scale animation still uses press-in / press-out for
 * the tactile feel.
 *
 * Lens 8 + 4 additions:
 *  - android_ripple forwarded so consumers pick the surface-typed
 *    color, borderless flag, radius, foreground.
 *  - Magnetic scale (1.0 -> 0.97 on press) supersedes ripple on
 *    primary CTAs by passing `android_ripple={null}`.
 *
 * Reduce-motion: scale stays at 1.0 (the press-scale hook handles).
 *
 * Min touch target: 44pt iOS / 48pt Android via default hitSlop.
 */
import React from 'react';
import {
  Pressable as RNPressable,
  PressableProps,
  ViewStyle,
  Platform,
  type PressableAndroidRippleConfig,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { haptic, type HapticKey } from '../../lib/haptics';
import { usePressScale } from '../motion/primitives';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export interface IronPressableProps extends Omit<PressableProps, 'children' | 'style'> {
  /** Required for accessibility. VoiceOver / TalkBack reads this. */
  accessibilityLabel: string;
  /** Named haptic from the canonical map. Default: `rowTap`. Set to
   *  `'none'` to suppress. */
  haptic?: HapticKey | 'none';
  /** Legacy alias for `haptic` -- accepted for backwards-compat with
   *  pre-overhaul call sites. New code should use `haptic`. */
  hapticType?: 'light' | 'medium' | 'heavy' | 'select' | 'success' | 'warning' | 'error' | 'none';
  /** Disable the press-scale animation (kept for API compat with
   *  legacy callers). */
  scaleOnPress?: boolean;
  /** Target scale on press. Default 0.97 per lens 1. */
  pressScale?: number;
  /** Forward android_ripple. Pass `null` to disable ripple. */
  android_ripple?: PressableAndroidRippleConfig | null;
  /** Style overrides. Accepts the full ViewStyle union plus the
   *  legacy `false | {...}` pattern so existing code keeps compiling. */
  style?: ViewStyle | (ViewStyle | false | undefined | null)[] | (ViewStyle | false | undefined | null);
  children: React.ReactNode;
}

const DEFAULT_RIPPLE: PressableAndroidRippleConfig = {
  color: 'rgba(255, 255, 255, 0.10)',
  borderless: false,
  foreground: true,
};

export function Pressable({
  haptic: hapticKey,
  hapticType,
  scaleOnPress = true,
  pressScale = 0.97,
  onPress,
  onPressIn,
  onPressOut,
  style,
  children,
  hitSlop,
  accessibilityLabel,
  disabled,
  android_ripple,
  ...rest
}: IronPressableProps) {
  // Resolve haptic name. New `haptic` prop wins; fall back to legacy
  // `hapticType` which maps to the same primitives by name.
  const resolvedHaptic: HapticKey | 'none' =
    hapticKey ?? (hapticType as HapticKey | undefined) ?? 'rowTap';

  const { animStyle, pressIn, pressOut } = usePressScale(pressScale);

  function handlePressIn(e: any) {
    if (scaleOnPress && !disabled) pressIn();
    onPressIn?.(e);
  }
  function handlePressOut(e: any) {
    if (scaleOnPress) pressOut();
    onPressOut?.(e);
  }
  function handlePress(e: any) {
    if (resolvedHaptic !== 'none' && !disabled) {
      haptic[resolvedHaptic]?.();
    }
    onPress?.(e);
  }

  // Allow callers to pass `android_ripple={null}` to disable ripple
  // entirely (e.g. on primary CTAs that have their own scale + glow).
  const ripple = android_ripple === null
    ? undefined
    : android_ripple ?? (Platform.OS === 'android' ? DEFAULT_RIPPLE : undefined);

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      hitSlop={hitSlop ?? { top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      android_ripple={ripple}
      style={[animStyle, style as ViewStyle]}
      {...rest}
    >
      {children as any}
    </AnimatedPressable>
  );
}
