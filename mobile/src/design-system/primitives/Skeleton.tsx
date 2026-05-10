/**
 * Skeleton -- placeholder primitive with Skia shimmer.
 *
 * Lens 1 + 5 spec, P0 #55: replace ActivityIndicator on every list +
 * stat surface (64 instances across 26 files in legacy code). Variants
 * cover the shapes the rest of the design-system needs:
 *
 *   block  -- generic rectangle (default)
 *   line   -- single text line, defaults to a subdued line height
 *   circle -- avatar / icon placeholder
 *   tile   -- square tile (Stat / KPI tile)
 *   card   -- a stack of two lines + meta line
 *
 * Animation:
 *   - Default: Skia LinearGradient sweep, 1.4s cycle.
 *   - Reduce-motion: static block at the dim opacity, no animation.
 *
 * The shimmer is implemented as a sweeping gradient over a
 * surface-3-colored rect. We use Reanimated's shared value clock-
 * advance pattern (no per-frame React re-render) wired into Skia
 * via `useDerivedValue`.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import {
  Canvas,
  Rect,
  LinearGradient,
  vec,
  Group,
  RoundedRect,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { colors, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../theme/useTheme';

export type SkeletonVariant = 'block' | 'line' | 'circle' | 'tile' | 'card';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const SHIMMER_DURATION = 1400;

interface ShimmerCanvasProps {
  width: number;
  height: number;
  borderRadius: number;
}

function ShimmerCanvas({ width, height, borderRadius }: ShimmerCanvasProps) {
  const { reduceMotion } = useTheme();

  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 0.5;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: SHIMMER_DURATION, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [reduceMotion, progress]);

  // Sweep an X-band from `-bandWidth` to `width + bandWidth`.
  const bandWidth = Math.max(40, width * 0.4);
  const start = useDerivedValue(() => vec(-bandWidth + (width + bandWidth * 2) * progress.value, 0));
  const end = useDerivedValue(() => vec(-bandWidth + (width + bandWidth * 2) * progress.value + bandWidth, 0));

  return (
    <Canvas style={{ width, height }}>
      <Group>
        <RoundedRect x={0} y={0} width={width} height={height} r={borderRadius} color={colors.surface3} />
      </Group>
      <Group>
        <RoundedRect x={0} y={0} width={width} height={height} r={borderRadius}>
          <LinearGradient
            start={start}
            end={end}
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.08)',
              'rgba(255,255,255,0)',
            ]}
            positions={[0, 0.5, 1]}
          />
        </RoundedRect>
      </Group>
    </Canvas>
  );
}

/**
 * Block -- a single shimmering rectangle. Used for everything that
 * isn't a circle / line / tile / card variant.
 */
function BlockSkeleton({
  width,
  height,
  borderRadius,
  style,
}: {
  width: DimensionValue;
  height: number;
  borderRadius: number;
  style?: ViewStyle;
}) {
  const [measured, setMeasured] = React.useState<number>(typeof width === 'number' ? width : 0);
  const onLayout = typeof width === 'number'
    ? undefined
    : (e: any) => setMeasured(Math.round(e.nativeEvent.layout.width));

  return (
    <View
      onLayout={onLayout}
      style={[
        { width, height, borderRadius, overflow: 'hidden', backgroundColor: colors.surface3 },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      {measured > 0 && height > 0 ? (
        <ShimmerCanvas width={measured} height={height} borderRadius={borderRadius} />
      ) : null}
    </View>
  );
}

const VARIANT_DEFAULTS: Record<SkeletonVariant, { height: number; borderRadius: number; width?: DimensionValue }> = {
  block:  { height: 16, borderRadius: radii.sm },
  line:   { height: 12, borderRadius: 6 },
  circle: { height: 40, borderRadius: radii.full, width: 40 },
  tile:   { height: 96, borderRadius: radii.lg },
  card:   { height: 88, borderRadius: radii.lg },
};

export function Skeleton({
  variant = 'block',
  width,
  height,
  borderRadius,
  style,
}: SkeletonProps) {
  const defaults = VARIANT_DEFAULTS[variant];
  const w = width ?? defaults.width ?? '100%';
  const h = height ?? defaults.height;
  const r = borderRadius ?? defaults.borderRadius;

  if (variant === 'card') {
    return (
      <View style={[styles.cardWrap, style]}>
        <BlockSkeleton width={w} height={h} borderRadius={r} />
        <View style={{ height: spacing.sm }} />
        <BlockSkeleton width={'70%'} height={10} borderRadius={6} />
        <View style={{ height: spacing.xs }} />
        <BlockSkeleton width={'45%'} height={10} borderRadius={6} />
      </View>
    );
  }

  return <BlockSkeleton width={w} height={h} borderRadius={r} style={style} />;
}

const styles = StyleSheet.create({
  cardWrap: {
    width: '100%',
  },
});
