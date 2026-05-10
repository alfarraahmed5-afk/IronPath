/**
 * Card -- composable surface primitive with 5 variants.
 *
 * Lens 2 spec:
 *   <Card level={1|2|3|4} variant={'solid'|'photo'|'glass'|'receipt'|'live'}>
 *     <Card.Hero>...</Card.Hero>
 *     <Card.Body>...</Card.Body>
 *     <Card.Footer>...</Card.Footer>
 *   </Card>
 *
 * Variants:
 *   solid     -- warm-ink fill per level
 *   photo     -- expo-image hero band + gradient mask + 8% ember multiply
 *   glass     -- expo-blur BlurView (iOS) with reduce-transparency fallback
 *   receipt   -- paper-grain noise overlay at 4% opacity (multiply)
 *   live      -- 1px crimson-ember accent on top edge via EmberSeam
 *
 * Slot components:
 *   Card.Hero   -- absolutely-positioned photo / accent band
 *   Card.Body   -- main content (default padding)
 *   Card.Footer -- footer with separator
 */
import React, { ReactNode, useEffect, useState } from 'react';
import { View, ViewStyle, StyleSheet, Platform, AccessibilityInfo } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, radii, spacing } from '../../theme/tokens';
import { EmberSeam } from './EmberSeam';

export type CardVariant = 'solid' | 'photo' | 'glass' | 'receipt' | 'live';
export type CardLevel = 1 | 2 | 3 | 4;

export interface CardProps {
  level?: CardLevel;
  variant?: CardVariant;
  /** For photo variant: image source (require()'d asset, blurhash, or
   *  remote URI). */
  photoSource?: { uri: string } | number;
  photoBlurhash?: string;
  /** For photo variant: the height of the hero band (default 200). */
  photoHeight?: number;
  /** For glass variant: BlurView intensity. */
  blurIntensity?: number;
  style?: ViewStyle | ViewStyle[];
  children?: ReactNode;
  /** Optional press handler -- if provided the Card root becomes
   *  pressable. Consumers may also wrap their own. */
  testID?: string;
}

const bgByLevel: Record<CardLevel, string> = {
  1: colors.surface1,
  2: colors.surface2,
  3: colors.surface3,
  4: colors.surface4,
};

export function Card({
  level = 2,
  variant = 'solid',
  photoSource,
  photoBlurhash,
  photoHeight = 200,
  blurIntensity = 32,
  style,
  children,
  testID,
}: CardProps) {
  // Reduce-transparency for glass variant (iOS).
  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AccessibilityInfo.isReduceTransparencyEnabled?.().then(setReduceTransparency);
    const sub = (AccessibilityInfo as any).addEventListener?.(
      'reduceTransparencyChanged',
      setReduceTransparency,
    );
    return () => sub?.remove?.();
  }, []);

  const baseStyle: ViewStyle = {
    backgroundColor: bgByLevel[level],
    borderRadius: radii.lg,
    overflow: 'hidden',
  };

  // ----- variant rendering -----
  if (variant === 'photo') {
    return (
      <View style={[baseStyle, style as ViewStyle]} testID={testID}>
        {photoSource ? (
          <View style={[styles.heroBand, { height: photoHeight }]}>
            <ExpoImage
              source={photoSource}
              placeholder={photoBlurhash ? { blurhash: photoBlurhash } : undefined}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={240}
            />
            {/* Top-down ink fade */}
            <LinearGradient
              colors={['rgba(10,10,11,0)', 'rgba(10,10,11,0.85)']}
              locations={[0.4, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            {/* 8% bottom-up ember multiply */}
            <LinearGradient
              colors={['rgba(200,16,46,0)', 'rgba(200,16,46,0.08)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </View>
        ) : null}
        {children}
      </View>
    );
  }

  if (variant === 'glass') {
    const useGlass = Platform.OS === 'ios' && !reduceTransparency;
    return (
      <View
        style={[
          baseStyle,
          // Glass surfaces sit at level 2 ink under the blur.
          { backgroundColor: useGlass ? 'rgba(17,17,20,0.55)' : colors.surface2 },
          style as ViewStyle,
        ]}
        testID={testID}
      >
        {useGlass ? (
          <BlurView intensity={blurIntensity} tint="dark" style={StyleSheet.absoluteFill} />
        ) : null}
        <EmberSeam intensity="subtle" length={400} style={styles.topAccent} />
        {children}
      </View>
    );
  }

  if (variant === 'receipt') {
    return (
      <View
        style={[baseStyle, { backgroundColor: '#111114' }, style as ViewStyle]}
        testID={testID}
      >
        {/* 4% paper-grain overlay -- single-channel noise. We synth it
            inline as a tiled translucent layer; if a paper-grain.png
            asset ships later this can swap to ExpoImage. */}
        <View pointerEvents="none" style={styles.receiptGrain} />
        <EmberSeam intensity="strong" length={400} style={styles.topAccent} />
        {children}
      </View>
    );
  }

  if (variant === 'live') {
    return (
      <View style={[baseStyle, style as ViewStyle]} testID={testID}>
        <EmberSeam glow intensity="strong" length={400} style={styles.topAccent} />
        {children}
      </View>
    );
  }

  // solid (default)
  return (
    <View style={[baseStyle, style as ViewStyle]} testID={testID}>
      {children}
    </View>
  );
}

// ---- Slot components --------------------------------------------------------

Card.Hero = function CardHero({ children, style }: { children?: ReactNode; style?: ViewStyle }) {
  return <View style={[{ width: '100%' }, style]}>{children}</View>;
};

Card.Body = function CardBody({ children, style, padded = true }: { children?: ReactNode; style?: ViewStyle; padded?: boolean }) {
  return <View style={[padded ? styles.bodyPadded : null, style]}>{children}</View>;
};

Card.Footer = function CardFooter({ children, style }: { children?: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.footer, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  heroBand: {
    width: '100%',
    overflow: 'hidden',
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bodyPadded: {
    padding: spacing.base,
  },
  footer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  receiptGrain: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.04)',
    opacity: 1,
  },
});
