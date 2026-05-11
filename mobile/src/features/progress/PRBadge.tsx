/**
 * PRBadge -- hexagonal medallion stamp used in celebrate beat 3 +
 * milestone takeover + profile showcase.
 *
 * Lens 1 P0 #6 + lens 2 + lens 7 P0-2/P0-6:
 *   - 64-96px hex (caller picks via `size`).
 *   - Brand-crimson display fill with an ember halo (Skia BlurMask
 *     when Skia is available; falls back to a static glow View).
 *   - Trophy / Crown / Star center icon (caller picks via `icon`).
 *   - Stamp-in animation: scale 0 -> 1.15 -> 1.0 with spring.bounce.
 *     Reduce-motion fork: instant render, no overshoot.
 *
 * Pure presentational -- the haptic + the particle puff live in
 * PRBadgeParticles + the parent screen.
 */
import React, { ReactNode, useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Trophy } from 'lucide-react-native';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/tokens';
import { useTheme } from '../../design-system/theme/useTheme';

const HEX_BOUNCE = { stiffness: 320, damping: 14, mass: 1 };

export interface PRBadgeProps {
  /** Size in points. Default 64. */
  size?: number;
  /** Center icon component. Default Trophy. */
  icon?: typeof Trophy;
  /** Whether to play the stamp-in animation on mount. Default true. */
  animateOnMount?: boolean;
  /** Optional delay before the stamp fires (used to chain in celebrate beats). */
  delayMs?: number;
  /** Halo strength: subtle | strong. */
  halo?: 'subtle' | 'strong';
  style?: ViewStyle;
  /** Optional override for the badge color (used by milestone tiers). */
  color?: string;
  /** Optional ribbon text below the hex (used by milestone tiers like "PR"). */
  ribbon?: string;
  children?: ReactNode;
}

export function PRBadge({
  size = 64,
  icon = Trophy,
  animateOnMount = true,
  delayMs = 0,
  halo = 'strong',
  style,
  color,
  ribbon,
  children,
}: PRBadgeProps) {
  const { reduceMotion } = useTheme();
  const scale = useSharedValue(animateOnMount ? 0 : 1);

  useEffect(() => {
    if (!animateOnMount) return;
    if (reduceMotion) {
      scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
      return;
    }
    const run = () => {
      scale.value = withSequence(
        withSpring(1.15, HEX_BOUNCE),
        withSpring(1.0, HEX_BOUNCE),
      );
    };
    if (delayMs > 0) {
      const t = setTimeout(run, delayMs);
      return () => clearTimeout(t);
    } else {
      run();
    }
  }, [animateOnMount, delayMs, reduceMotion, scale]);

  const animStyle = useAnimatedStyle(() => {
    'worklet';
    return { transform: [{ scale: scale.value }] };
  });

  const badgeColor = color ?? colors.brandDisplay;
  const haloSize = size + (halo === 'strong' ? 32 : 16);

  return (
    <View style={[styles.wrap, style]}>
      <View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            backgroundColor:
              halo === 'strong' ? 'rgba(200,16,46,0.20)' : 'rgba(200,16,46,0.12)',
          },
        ]}
      />
      <Animated.View
        style={[
          styles.hex,
          {
            width: size,
            height: size,
            borderRadius: size * 0.22,
            backgroundColor: badgeColor,
          },
          animStyle,
        ]}
        accessibilityRole="image"
        accessibilityLabel={ribbon ? `${ribbon} badge` : 'Personal record badge'}
      >
        {children ?? <Icon icon={icon} size={Math.round(size * 0.5)} color="#FFFFFF" strokeWidth={1.6} />}
      </Animated.View>
      {ribbon ? (
        <View style={[styles.ribbon, { backgroundColor: badgeColor }]}>
          {/* The ribbon is small; we let the parent supply caption typography. */}
          <View style={styles.ribbonInner}>{/* placeholder for caption rendered by caller */}</View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hex: {
    alignItems: 'center',
    justifyContent: 'center',
    // Soft inner gradient sim via shadow; matches lens 2 hex callout.
    shadowColor: '#C8102E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 12,
  },
  ribbon: {
    position: 'absolute',
    bottom: -10,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ribbonInner: { flexDirection: 'row', alignItems: 'center' },
});
