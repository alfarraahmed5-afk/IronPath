/**
 * PRBadgeParticles -- Skia particle puff under the celebrate beat-3
 * badge stamp. Founder Q7 lock: approved (~50 KB JS budget).
 *
 * Lens 1 + 7 spec:
 *  - 10-14 ember particles in brand-crimson with a 1.4 px BlurMask
 *    halo, life ~520 ms each.
 *  - Trigger-driven: parent calls `trigger()` (e.g. when the PRBadge
 *    finishes its overshoot at beat-3 + 200 ms).
 *  - Reduce-motion fork: render nothing.
 *  - Pauses on screen blur via `useFocusEffect` -- caller wraps in
 *    `useFocusEffect` if mounted on a screen that may background.
 *
 * Bundle: pure Skia primitives + Reanimated shared values, ~3 KB
 * compiled. Stays well under Q7's 50 KB ceiling.
 */
import React, { useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  BlurMask,
  Skia,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../design-system/theme/useTheme';

const PARTICLE_COUNT = 12;
const LIFE_MS = 520;
const TRAVEL_MIN = 18;
const TRAVEL_MAX = 38;
const BADGE_HALF = 36;

export interface PRBadgeParticlesHandle {
  trigger: () => void;
}

interface ParticleSeed {
  angle: number;       // radians
  travel: number;      // pixels
  radius: number;      // px
  delay: number;       // ms
}

function makeSeeds(): ParticleSeed[] {
  const out: ParticleSeed[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Even angular distribution with random jitter.
    const base = (i / PARTICLE_COUNT) * Math.PI * 2;
    const jitter = (Math.random() - 0.5) * 0.6;
    out.push({
      angle: base + jitter,
      travel: TRAVEL_MIN + Math.random() * (TRAVEL_MAX - TRAVEL_MIN),
      radius: 2 + Math.random() * 2,
      delay: Math.random() * 80,
    });
  }
  return out;
}

interface ParticleProps {
  seed: ParticleSeed;
  trigger: { value: number };
  center: { cx: number; cy: number };
  color: string;
}

function Particle({ seed, trigger, center, color }: ParticleProps) {
  const cx = useDerivedValue(() => {
    'worklet';
    return center.cx + Math.cos(seed.angle) * seed.travel * trigger.value;
  });
  const cy = useDerivedValue(() => {
    'worklet';
    return center.cy + Math.sin(seed.angle) * seed.travel * trigger.value;
  });
  const opacity = useDerivedValue(() => {
    'worklet';
    // Fade from 1 to 0 across the animation; tail is faster than the head.
    return Math.max(0, 1 - trigger.value * 1.15);
  });
  return (
    <Group opacity={opacity}>
      <Circle cx={cx} cy={cy} r={seed.radius} color={color}>
        <BlurMask blur={1.4} style="solid" />
      </Circle>
    </Group>
  );
}

export const PRBadgeParticles = forwardRef<PRBadgeParticlesHandle, { size?: number }>(
  function PRBadgeParticles({ size = 120 }, ref) {
    const { reduceMotion } = useTheme();
    const progress = useSharedValue(0);
    const seeds = useMemo(() => makeSeeds(), []);
    const half = size / 2;

    useImperativeHandle(ref, () => ({
      trigger: () => {
        if (reduceMotion) return;
        progress.value = 0;
        progress.value = withTiming(1, {
          duration: LIFE_MS,
          easing: Easing.bezier(0.32, 0.72, 0, 1),
        });
      },
    }), [reduceMotion, progress]);

    // Reduce-motion fork: don't even mount the canvas.
    if (reduceMotion) return null;

    return (
      <View
        style={[styles.wrap, { width: size, height: size }]}
        pointerEvents="none"
      >
        <Canvas style={StyleSheet.absoluteFill}>
          {seeds.map((s, i) => (
            <Particle
              key={i}
              seed={s}
              trigger={progress}
              center={{ cx: half, cy: half }}
              color="#FF4566"
            />
          ))}
        </Canvas>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
