/**
 * LivePulseStrip -- the signature live-surface artifact.
 *
 * Lens 1 + 2 spec, P0 #10 / lens 2 brand fingerprint:
 *   - 1px crimson hairline along the top edge of a "live" surface.
 *   - Ember sliver sweep across the strip, 1.4s per pass.
 *   - 6-12s pulse cadence (random in range) between passes.
 *   - Sliver width = 12% of strip width.
 *   - Honors useReducedMotion + screen-focus visibility.
 *   - Pure-Skia draw: one Canvas, one Group, no per-frame React work.
 *
 * Mobile differs from marketing in one lens-2 directive: NO counter
 * drift on mobile. The strip is decorative-only.
 *
 * The component is layout-agnostic: it draws fullWidth x height into
 * its own Canvas. Caller positions it absolutely on the parent.
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  Canvas,
  Rect,
  LinearGradient,
  vec,
  Group,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';

export interface LivePulseStripProps {
  /** Total strip width in px. Defaults to filling parent via onLayout. */
  width?: number;
  /** Strip height in px. Default 1 (hairline). */
  height?: number;
  /**
   * Sliver width fraction of total width. Default 0.12 per spec.
   */
  sliverFraction?: number;
  /** Sweep duration ms. Default 1400. */
  sweepMs?: number;
  /**
   * Random pulse gap range ms [min, max]. Default [6000, 12000].
   */
  gapRangeMs?: [number, number];
  /** Hairline color. Default brand crimson. */
  hairlineColor?: string;
  /** Sliver gradient color. Default brand crimson. */
  sliverColor?: string;
  /** Container style override. */
  style?: ViewStyle;
}

const DEFAULT_HAIRLINE_ALPHA = 0.42;

/**
 * Random integer in [min, max]. Worklet-safe via plain JS Math.
 */
function pickGap([min, max]: [number, number]): number {
  return Math.floor(min + Math.random() * (max - min));
}

export function LivePulseStrip({
  width: forcedWidth,
  height = 1,
  sliverFraction = 0.12,
  sweepMs = 1400,
  gapRangeMs = [6000, 12000],
  hairlineColor,
  sliverColor,
  style,
}: LivePulseStripProps) {
  const { reduceMotion, tokens } = useTheme();
  const colors: any = (tokens as any)?.colors?.colors ?? (tokens as any)?.colors ?? {};
  const brand: string = colors.brand ?? '#C8102E';
  const hairline = hairlineColor ?? brand;
  const sliver = sliverColor ?? brand;

  const [measuredWidth, setMeasuredWidth] = useState<number>(forcedWidth ?? 0);
  const width = forcedWidth ?? measuredWidth;
  const sliverPx = Math.max(2, Math.round(width * sliverFraction));

  // Drives the sliver's left-edge x position from -sliverPx (just
  // off-screen left) to width (just off-screen right). Resets to the
  // start position between sweeps.
  const sweepX = useSharedValue(-sliverPx);
  // 1 = visible (sweep underway), 0 = idle (hairline only).
  const sliverOpacity = useSharedValue(0);
  const isFocused = useSharedValue(true);

  useFocusEffect(
    React.useCallback(() => {
      isFocused.value = 1;
      return () => {
        isFocused.value = 0;
      };
    }, [isFocused]),
  );

  // Effect: schedule sweeps. Cleanup cancels in-flight animations
  // and clears the timer.
  useEffect(() => {
    if (reduceMotion || width <= 0) {
      sweepX.value = -sliverPx;
      sliverOpacity.value = 0;
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function runSweep() {
      if (cancelled) return;
      if (!isFocused.value) {
        // Skip the sweep but reschedule -- we don't want a paused tab
        // to back up a queue.
        timer = setTimeout(runSweep, pickGap(gapRangeMs));
        return;
      }
      sweepX.value = -sliverPx;
      sliverOpacity.value = 1;
      sweepX.value = withTiming(width, { duration: sweepMs, easing: Easing.linear }, () => {
        // Hide instantly at the far end so the gap shows the hairline only.
        sliverOpacity.value = 0;
      });
      timer = setTimeout(runSweep, sweepMs + pickGap(gapRangeMs));
    }

    // Start with a small initial delay so the strip doesn't sweep on
    // the same frame as the screen pushes in -- avoids a "flash" the
    // user can't perceive but feels.
    timer = setTimeout(runSweep, 600);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      cancelAnimation(sweepX);
      cancelAnimation(sliverOpacity);
    };
  }, [reduceMotion, width, sliverPx, sweepMs, gapRangeMs, sweepX, sliverOpacity, isFocused]);

  // Derive the gradient start/end points so they ride the sweepX value.
  const sliverStart = useDerivedValue(() => vec(sweepX.value, 0));
  const sliverEnd = useDerivedValue(() => vec(sweepX.value + sliverPx, 0));

  return (
    <View
      style={[styles.root, { height }, style]}
      onLayout={forcedWidth ? undefined : e => setMeasuredWidth(Math.round(e.nativeEvent.layout.width))}
    >
      {width > 0 ? (
        <Canvas style={{ width, height }}>
          {/* Hairline -- always on. */}
          <Rect x={0} y={0} width={width} height={height} color={hairline} opacity={DEFAULT_HAIRLINE_ALPHA} />
          {/* Ember sliver sweep. Linear gradient from transparent ->
              crimson core -> transparent so the head + tail fade. */}
          <Group opacity={sliverOpacity}>
            <Rect x={0} y={0} width={width} height={height}>
              <LinearGradient
                start={sliverStart}
                end={sliverEnd}
                colors={['rgba(200,16,46,0)', sliver, 'rgba(200,16,46,0)']}
                positions={[0, 0.5, 1]}
              />
            </Rect>
          </Group>
        </Canvas>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    overflow: 'hidden',
  },
});
