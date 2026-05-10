/**
 * PerExercisePRSparkline -- 36 px tall sparkline of recent projected-
 * 1RM points for an exercise. Lens 7 P1-5.
 *
 * Pure presentational; the parent fetches via /analytics/exercises/:id
 * and passes the points in.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { Text } from '../../components/Text';
import { colors } from '../../theme/tokens';

export interface PerExercisePRSparklineProps {
  /** Recent projected-1RM points, oldest first. */
  points: number[];
  width?: number;
  height?: number;
  /** Optional label appended after the sparkline (e.g. exercise name). */
  label?: string;
}

export function PerExercisePRSparkline({ points, width = 96, height = 36, label }: PerExercisePRSparklineProps) {
  if (!points || points.length < 2) {
    return (
      <View style={[styles.wrap, { width, height }]}>
        <Text variant="caption" color="textTertiary">--</Text>
      </View>
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const padding = 4;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const stepX = innerW / (points.length - 1);
  const xy = points.map((v, i) => {
    const x = padding + i * stepX;
    const y = padding + (1 - (v - min) / range) * innerH;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const last = xy[xy.length - 1].split(',').map(Number) as [number, number];

  return (
    <View
      style={[styles.wrap, { width, height }]}
      accessibilityLabel={label ? `${label} trend, ${points.length} sessions` : 'PR trend sparkline'}
    >
      <Svg width={width} height={height}>
        <Polyline
          points={xy.join(' ')}
          stroke={colors.brandText}
          strokeWidth={2}
          fill="none"
        />
        <Circle cx={last[0]} cy={last[1]} r={2.4} fill={colors.brandDisplay} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
