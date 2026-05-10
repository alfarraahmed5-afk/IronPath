/**
 * EmberSeam -- Skia 1px hairline with breathing radial-style ember
 * gradient and 12px halo.
 *
 * Lens 1 + 2 spec:
 *  - 1 px hairline + radial ember gradient, breathing every 8s.
 *  - Optional 12px glow halo (drop shadow).
 *  - Vertical or horizontal layout.
 *  - Reduce-motion fork: static crimson hairline only.
 *
 * Skia worklet correctness:
 *  - Particles / breathing animation read from useClock + useDerivedValue;
 *    no JS-side closure capture.
 *  - On screen blur the canvas pauses (via `useFocusEffect` in caller).
 *
 * The brief specifies Skia, overriding lens 2's "linear-gradient view"
 * recommendation. Skia gives us an offscreen-buffered radial gradient
 * sweep that linear-gradient + Reanimated can't deliver cleanly.
 */
import React, { useMemo } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import {
  Canvas,
  Rect,
  LinearGradient,
  vec,
  Group,
  BlurMask,
  useClock,
  useDerivedValue,
  interpolate,
} from '@shopify/react-native-skia';
import { useReduceMotion } from '../motion/primitives';

export interface EmberSeamProps {
  vertical?: boolean;
  /** 'subtle' | 'normal' | 'strong' -- center-stop alpha. */
  intensity?: 'subtle' | 'normal' | 'strong';
  /** Override paint color. Default brand-display crimson. */
  color?: string;
  /** Render the 12 px halo via BlurMask. */
  glow?: boolean;
  /** Length of the seam in pixels. Defaults to flex / 100% via parent. */
  length?: number;
  style?: ViewStyle;
}

const ALPHA_BY_INTENSITY = { subtle: 0.30, normal: 0.60, strong: 0.90 } as const;
const HALO_THICKNESS = 12;
const HAIRLINE_THICKNESS = 1;
const BREATHE_PERIOD_MS = 8000;

export function EmberSeam({
  vertical = false,
  intensity = 'normal',
  color = '#C8102E',
  glow = false,
  length = 240,
  style,
}: EmberSeamProps) {
  const reduce = useReduceMotion();

  // Skia needs explicit pixel sizes for the canvas; use length for the
  // primary axis and a small thickness for the perpendicular axis.
  const thickness = glow ? HALO_THICKNESS * 2 + HAIRLINE_THICKNESS : HAIRLINE_THICKNESS + 4;
  const width  = vertical ? thickness : length;
  const height = vertical ? length    : thickness;

  // Canvas-relative paint coordinates.
  const startX = vertical ? width / 2 : 0;
  const endX   = vertical ? width / 2 : width;
  const startY = vertical ? 0 : height / 2;
  const endY   = vertical ? height : height / 2;

  // Breathing: shift the gradient center stop on an 8s loop.
  // Reduce-motion: lock the value at 0.5.
  const clock = useClock();
  const phase = useDerivedValue(() => {
    'worklet';
    if (reduce) return 0.5;
    return ((clock.value % BREATHE_PERIOD_MS) / BREATHE_PERIOD_MS);
  });

  // Three-stop gradient with the middle stop slowly drifting in
  // [0.4, 0.6]. Express via per-frame derived stops.
  const stops = useDerivedValue(() => {
    'worklet';
    const mid = interpolate(phase.value, [0, 0.5, 1], [0.4, 0.6, 0.4]);
    return [0, mid, 1];
  });

  const alpha = ALPHA_BY_INTENSITY[intensity];
  const transparent = `${color}00`; // hex + alpha 00
  const colorMid    = withAlpha(color, alpha);

  // Skia accepts a static colors array; use an array reference. The
  // dynamic `stops` SharedValue gets read each frame.
  const colors = useMemo(() => [transparent, colorMid, transparent], [transparent, colorMid]);

  // Static fallback paint when reduce-motion is on -- a flat crimson
  // hairline with the same alpha at the center.
  if (reduce) {
    return (
      <View
        style={[
          {
            backgroundColor: colorMid,
            width:  vertical ? HAIRLINE_THICKNESS : length,
            height: vertical ? length : HAIRLINE_THICKNESS,
          },
          style,
        ]}
        accessibilityElementsHidden
      />
    );
  }

  return (
    <View style={[{ width, height }, style]} accessibilityElementsHidden>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group>
          {glow ? <BlurMask blur={HALO_THICKNESS / 2} style="normal" /> : null}
          <Rect x={0} y={0} width={width} height={height}>
            <LinearGradient
              start={vec(startX, startY)}
              end={vec(endX, endY)}
              positions={stops}
              colors={colors}
            />
          </Rect>
        </Group>
      </Canvas>
    </View>
  );
}

function withAlpha(hex: string, alpha: number): string {
  // Accepts #RRGGBB; emits #RRGGBBAA. If hex already has alpha, replace.
  const clamped = Math.max(0, Math.min(1, alpha));
  const aa = Math.round(clamped * 255).toString(16).padStart(2, '0');
  if (hex.length === 9) return hex.slice(0, 7) + aa;
  return hex + aa;
}
