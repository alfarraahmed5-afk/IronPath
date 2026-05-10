/**
 * Tile -- grid tile primitive.
 *
 * Lens 2 spec:
 *  - size={'sm'|'md'|'lg'} -- 96 / 128 / 160 px square
 *  - photo support via expo-image with blurhash placeholder
 *  - mono-avatar fallback (initials block) when no photo
 *  - hover-lift via Reanimated press (translateY -1pt + scale 1.02)
 *  - reduce-motion: static, no lift
 */
import React, { ReactNode, useCallback } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Pressable } from './Pressable';
import { colors, radii, spacing } from '../../theme/tokens';
import { springMagnetic } from '../tokens/motion';
import { useReanimatedReduceMotion } from '../motion/primitives';

export type TileSize = 'sm' | 'md' | 'lg';

export interface TileProps {
  size?: TileSize;
  photoSource?: { uri: string } | number;
  photoBlurhash?: string;
  /** Initials shown when no photo. */
  initials?: string;
  label?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
  children?: ReactNode;
}

const TILE_PX: Record<TileSize, number> = { sm: 96, md: 128, lg: 160 };

export function Tile({
  size = 'md',
  photoSource,
  photoBlurhash,
  initials,
  label,
  onPress,
  accessibilityLabel,
  style,
  children,
}: TileProps) {
  const px = TILE_PX[size];
  const lift = useSharedValue(0);
  const scale = useSharedValue(1);
  const reduceSv = useReanimatedReduceMotion();

  const onPressIn = useCallback(() => {
    if (reduceSv.value) return;
    lift.value = withSpring(-1, springMagnetic);
    scale.value = withSpring(1.02, springMagnetic);
  }, [lift, scale, reduceSv]);

  const onPressOut = useCallback(() => {
    lift.value = withSpring(0, springMagnetic);
    scale.value = withSpring(1, springMagnetic);
  }, [lift, scale]);

  const animStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateY: lift.value },
        { scale: scale.value },
      ],
    };
  });

  const a11y = accessibilityLabel ?? label ?? 'Tile';

  const Inner = (
    <Animated.View
      style={[
        styles.tile,
        { width: px, height: px, borderRadius: radii.lg },
        animStyle,
        style,
      ]}
    >
      {photoSource ? (
        <ExpoImage
          source={photoSource}
          placeholder={photoBlurhash ? { blurhash: photoBlurhash } : undefined}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={240}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.monoAvatar]}>
          <Text style={styles.monoText}>{(initials || '?').slice(0, 2).toUpperCase()}</Text>
        </View>
      )}
      {label ? (
        <View style={styles.labelOverlay}>
          <Text style={styles.label} numberOfLines={1}>{label}</Text>
        </View>
      ) : null}
      {children}
    </Animated.View>
  );

  if (!onPress) return Inner;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      scaleOnPress={false}
      haptic="rowTap"
      accessibilityLabel={a11y}
    >
      {Inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    overflow: 'hidden',
    backgroundColor: colors.surface3,
  },
  monoAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F1F24',
  },
  monoText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 28,
    color: colors.textPrimary,
  },
  labelOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(10,10,11,0.6)',
  },
  label: {
    color: colors.textPrimary,
    fontFamily: 'Barlow_500Medium',
    fontSize: 13,
  },
});
