import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';
import { Text } from './Text';
import { colors, spacing, radii } from '../theme/tokens';

type Point = { date: string; value: number };

type Props = {
  points: Point[];
  height?: number;
  formatY?: (n: number) => string;
  emptyLabel?: string;
};

// Lightweight SVG line chart — no external chart lib required.
// Renders a polyline over a normalized [0,1] grid + start/end value labels.
export function LineChart({ points, height = 140, formatY, emptyLabel = 'No data yet' }: Props) {
  const screenW = Dimensions.get('window').width;
  const w = screenW - spacing.base * 4; // accommodate padding
  const padX = 12;
  const padY = 16;
  const innerW = Math.max(40, w - padX * 2);
  const innerH = height - padY * 2;

  if (!points || points.length === 0) {
    return (
      <View style={[styles.empty, { height, backgroundColor: colors.surface2 }]}>
        <Text variant="caption" color="textTertiary">{emptyLabel}</Text>
      </View>
    );
  }

  const values = points.map(p => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values, minV + 1);
  const range = maxV - minV || 1;

  const xStep = points.length > 1 ? innerW / (points.length - 1) : innerW;
  const coords = points.map((p, i) => {
    const x = padX + i * xStep;
    const y = padY + innerH - ((p.value - minV) / range) * innerH;
    return { x, y, value: p.value };
  });

  const polylinePoints = coords.map(c => `${c.x},${c.y}`).join(' ');
  const last = coords[coords.length - 1];
  const first = coords[0];

  return (
    <View style={[styles.wrap, { height, width: w + padX * 2 }]}>
      <Svg width={w + padX * 2} height={height}>
        {/* Subtle gridlines */}
        <Line x1={padX} y1={padY} x2={w + padX} y2={padY} stroke={colors.borderSubtle} strokeWidth={1} />
        <Line x1={padX} y1={padY + innerH / 2} x2={w + padX} y2={padY + innerH / 2} stroke={colors.borderSubtle} strokeWidth={1} strokeDasharray="2 4" />
        <Line x1={padX} y1={padY + innerH} x2={w + padX} y2={padY + innerH} stroke={colors.borderSubtle} strokeWidth={1} />

        {/* The line */}
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={colors.brand}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Endpoint dots */}
        <Circle cx={first.x} cy={first.y} r={3} fill={colors.brand} />
        <Circle cx={last.x} cy={last.y} r={5} fill={colors.brand} />

        {/* Y-axis labels */}
        <SvgText x={4} y={padY + 4} fontSize="10" fill={colors.textTertiary} fontFamily="Barlow_500Medium">
          {formatY ? formatY(maxV) : Math.round(maxV)}
        </SvgText>
        <SvgText x={4} y={padY + innerH} fontSize="10" fill={colors.textTertiary} fontFamily="Barlow_500Medium">
          {formatY ? formatY(minV) : Math.round(minV)}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  empty: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
