/**
 * Hero -- standalone photo-hero band primitive.
 *
 * Lens 1 + 2 spec:
 *  - expo-image + blurhash placeholder
 *  - LinearGradient mask (configurable direction)
 *  - 8% bottom-up ember multiply
 *  - Ken Burns scale 1 -> 1.04 over 12s via Reanimated worklet
 *  - Reduce-motion: static photo, no Ken Burns
 *  - 1 px crimson EmberSeam at the bottom edge (closes against the
 *    next surface)
 */
import React, { useEffect } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { EmberSeam } from './EmberSeam';
import { useReanimatedReduceMotion } from '../motion/primitives';

export interface HeroProps {
  source?: { uri: string } | number;
  blurhash?: string;
  height?: number;
  /** Direction the dark gradient mask sweeps from. */
  maskDirection?: 'top' | 'bottom' | 'left' | 'right';
  /** 0-1 -- fraction of the band masked in the dark direction. */
  maskCoverage?: number;
  /** Apply 8% ember bottom-up multiply. Default true. */
  ember?: boolean;
  /** Apply Ken Burns 1 -> 1.04 over 12s. Default true. */
  kenBurns?: boolean;
  /** Bottom-edge EmberSeam closing the photo. Default true. */
  closingSeam?: boolean;
  style?: ViewStyle;
  children?: React.ReactNode;
}

const KEN_BURNS_DURATION_MS = 12_000;

export function Hero({
  source,
  blurhash,
  height = 280,
  maskDirection = 'bottom',
  maskCoverage = 0.4,
  ember = true,
  kenBurns = true,
  closingSeam = true,
  style,
  children,
}: HeroProps) {
  const scale = useSharedValue(1);
  const reduceSv = useReanimatedReduceMotion();

  useEffect(() => {
    if (kenBurns && !reduceSv.value) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: KEN_BURNS_DURATION_MS, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.00, { duration: KEN_BURNS_DURATION_MS, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      scale.value = 1;
    }
  }, [kenBurns, reduceSv, scale]);

  const animStyle = useAnimatedStyle(() => {
    'worklet';
    return { transform: [{ scale: scale.value }] };
  });

  // Compute the gradient mask coords based on the requested direction.
  // The mask LinearGradient runs from `maskStart` to `maskEnd` and the
  // `colors` are [transparent, dark]; `maskLocations` controls how
  // much of the band is dark vs. transparent.
  const maskColors: [string, string] = ['rgba(10,10,11,0)', 'rgba(10,10,11,0.85)'];
  let maskStart: { x: number; y: number };
  let maskEnd: { x: number; y: number };
  let maskLocations: [number, number];
  switch (maskDirection) {
    case 'top':
      // Dark at top, fading down.
      maskStart = { x: 0.5, y: 1 };
      maskEnd   = { x: 0.5, y: 0 };
      maskLocations = [1 - maskCoverage, 1];
      break;
    case 'left':
      maskStart = { x: 1, y: 0.5 };
      maskEnd   = { x: 0, y: 0.5 };
      maskLocations = [1 - maskCoverage, 1];
      break;
    case 'right':
      maskStart = { x: 0, y: 0.5 };
      maskEnd   = { x: 1, y: 0.5 };
      maskLocations = [1 - maskCoverage, 1];
      break;
    case 'bottom':
    default:
      // Default: dark at bottom, fading up. Used by photo-hero scrims.
      maskStart = { x: 0.5, y: 0 };
      maskEnd   = { x: 0.5, y: 1 };
      maskLocations = [1 - maskCoverage, 1];
  }

  return (
    <View style={[{ height, overflow: 'hidden' }, style]}>
      {source ? (
        <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
          <ExpoImage
            source={source}
            placeholder={blurhash ? { blurhash } : undefined}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={240}
          />
        </Animated.View>
      ) : null}
      <LinearGradient
        colors={maskColors}
        locations={maskLocations}
        start={maskStart}
        end={maskEnd}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {ember ? (
        <LinearGradient
          colors={['rgba(200,16,46,0)', 'rgba(200,16,46,0.08)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      {children}
      {closingSeam ? (
        <View style={styles.closingSeam}>
          <EmberSeam intensity="subtle" length={1080} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  closingSeam: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
