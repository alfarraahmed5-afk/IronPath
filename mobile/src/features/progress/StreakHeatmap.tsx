/**
 * StreakHeatmap -- Skia 7-row x 12-col (or 26-col) grid of daily
 * workout intensity. Lens 7 P0-1 + lens 2 + lens 9.
 *
 *   - Single <Canvas> draw call (not 84 Views).
 *   - 5-step crimson intensity ramp (L0 empty -> L4 max).
 *   - Today's cell carries a hairline border.
 *   - Diagonal-sweep fill-in on first focus (30 ms stagger top-left
 *     to bottom-right). Reduce-motion fork: instant fill.
 *   - Per-cell a11y overlay so VoiceOver / TalkBack enumerate
 *     each day with a meaningful label.
 *   - RTL mirror: origin flips to top-right when isRTL.
 *
 * Data shape:
 *   days: Array<{ date: 'YYYY-MM-DD'; set_count?: number;
 *                 muscle_groups?: string[] }>
 * The provided `days` may be sparse; missing dates within the
 * window render as L0 rest days.
 */
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable as RNPressable, AccessibilityInfo } from 'react-native';
import {
  Canvas,
  Rect,
  Group,
  RoundedRect,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../design-system/theme/useTheme';
import { colors, spacing } from '../../theme/tokens';
import { haptic } from '../../lib/haptics';

export interface StreakDay {
  date: string; // YYYY-MM-DD
  set_count?: number;
  muscle_groups?: string[];
}

export interface StreakHeatmapProps {
  /** Sparse list. Missing dates render as L0. */
  days: StreakDay[];
  /** Show 12 or 26 weeks. */
  weeks?: 12 | 26;
  /** Tap a cell. */
  onCellPress?: (day: StreakDay & { isRest: boolean }) => void;
  /** Tuning: cap for L4 intensity. Default 20 working sets. */
  intensityCap?: number;
  /** Override the canvas width (else fills parent). */
  width?: number;
}

const ROW_COUNT = 7;
const VERCEL_EASE = Easing.bezier(0.32, 0.72, 0, 1);

/** 5-step ramp -- lens 2 final values. */
function intensityColor(level: 0 | 1 | 2 | 3 | 4): string {
  switch (level) {
    case 0: return '#1F1F24';
    case 1: return 'rgba(200,16,46,0.18)';
    case 2: return 'rgba(200,16,46,0.38)';
    case 3: return 'rgba(200,16,46,0.62)';
    case 4: return '#C8102E';
  }
}

function classify(setCount: number, cap: number): 0 | 1 | 2 | 3 | 4 {
  if (setCount <= 0) return 0;
  const frac = Math.min(1, setCount / cap);
  if (frac < 0.20) return 1;
  if (frac < 0.45) return 2;
  if (frac < 0.75) return 3;
  return 4;
}

function toLocalKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

interface CellModel {
  date: string;
  col: number;
  row: number;
  level: 0 | 1 | 2 | 3 | 4;
  setCount: number;
  isToday: boolean;
}

/**
 * A single Skia cell. Owns its own opacity SharedValue so we can use
 * Reanimated hooks safely (one hook per child component, not in a
 * map-loop on the parent).
 */
function HeatmapCell({
  x,
  y,
  size,
  level,
  isToday,
  delay,
  sweep,
}: {
  x: number;
  y: number;
  size: number;
  level: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
  delay: number;
  sweep: ReturnType<typeof useSharedValue<number>>;
}) {
  const opacity = useDerivedValue(() => {
    'worklet';
    const v = (sweep.value - delay) * 4;
    return Math.max(0, Math.min(1, v));
  });
  return (
    <Group opacity={opacity}>
      <RoundedRect x={x} y={y} width={size} height={size} r={2} color={intensityColor(level)} />
      {isToday ? (
        <RoundedRect
          x={x + 0.5}
          y={y + 0.5}
          width={size - 1}
          height={size - 1}
          r={2}
          color="#FFFFFF"
          style="stroke"
          strokeWidth={1}
        />
      ) : null}
    </Group>
  );
}

export function StreakHeatmap({
  days,
  weeks = 12,
  onCellPress,
  intensityCap = 20,
  width,
}: StreakHeatmapProps) {
  const { reduceMotion, isRTL } = useTheme();

  // Build a date -> set_count map.
  const byDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of days) m.set(d.date, d.set_count ?? 0);
    return m;
  }, [days]);

  // Build the cell grid. Anchor on TODAY in the rightmost column (or
  // leftmost in RTL). Week columns go left-to-right (LTR). The
  // newest week is rightmost. Rows = days of week starting Sunday at
  // top.
  const grid = useMemo<CellModel[]>(() => {
    const todayKey = toLocalKey(new Date());
    const totalCells = ROW_COUNT * weeks;
    const out: CellModel[] = [];
    const now = new Date();
    // Find the most recent Saturday (end of the most recent week);
    // walk back N weeks.
    const rightEdge = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    // Adjust to Saturday: 0=Sun..6=Sat. Move forward to next Saturday so
    // that the rightmost column contains the current week's days.
    const daysUntilSaturday = (6 - rightEdge.getUTCDay() + 7) % 7;
    rightEdge.setUTCDate(rightEdge.getUTCDate() + daysUntilSaturday);

    for (let i = 0; i < totalCells; i++) {
      const fromEnd = totalCells - 1 - i;
      const cellDate = new Date(rightEdge);
      cellDate.setUTCDate(rightEdge.getUTCDate() - fromEnd);
      const col = Math.floor(i / ROW_COUNT);
      const row = i % ROW_COUNT;
      const key = toLocalKey(cellDate);
      const setCount = byDate.get(key) ?? 0;
      out.push({
        date: key,
        col,
        row,
        level: classify(setCount, intensityCap),
        setCount,
        isToday: key === todayKey,
      });
    }
    return out;
  }, [byDate, weeks, intensityCap]);

  // Diagonal sweep progress.
  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = 0;
    if (reduceMotion) {
      sweep.value = withTiming(1, { duration: 1 });
    } else {
      sweep.value = withDelay(60, withTiming(1, { duration: 700, easing: VERCEL_EASE }));
    }
  }, [reduceMotion, sweep]);

  // Layout: cell sizing.
  const CELL = weeks === 26 ? 8 : 14;
  const GAP = weeks === 26 ? 2 : 3;
  const totalCols = weeks;
  const canvasWidth = width ?? (totalCols * (CELL + GAP) - GAP);
  const canvasHeight = ROW_COUNT * (CELL + GAP) - GAP;

  const renderedCells = grid.map((c, i) => {
    // Compute the per-cell delay along the diagonal: (col + row) reads
    // top-left to bottom-right.
    const cells = totalCols + ROW_COUNT - 2;
    const delay = (c.col + c.row) / cells;
    return { cell: c, delay, index: i };
  });

  return (
    <View
      style={styles.wrap}
      accessibilityLabel={`Workout consistency, last ${weeks} weeks`}
    >
      <Canvas
        style={{ width: canvasWidth, height: canvasHeight }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {renderedCells.map(({ cell, delay }) => {
          // Anchor: in LTR newest week is rightmost; in RTL flip.
          const colDisplay = isRTL ? totalCols - 1 - cell.col : cell.col;
          const x = colDisplay * (CELL + GAP);
          const y = cell.row * (CELL + GAP);
          return (
            <HeatmapCell
              key={`${cell.date}-${cell.row}`}
              x={x}
              y={y}
              size={CELL}
              level={cell.level}
              isToday={cell.isToday}
              delay={delay}
              sweep={sweep}
            />
          );
        })}
      </Canvas>

      {/* A11y + tap overlay -- one zero-paint Pressable per cell. */}
      <View
        pointerEvents="box-none"
        style={[styles.overlay, {
          width: canvasWidth,
          height: canvasHeight,
        }]}
      >
        {renderedCells.map(({ cell }) => {
          const colDisplay = isRTL ? totalCols - 1 - cell.col : cell.col;
          const x = colDisplay * (CELL + GAP);
          const y = cell.row * (CELL + GAP);
          const dateObj = new Date(cell.date);
          const labelDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          const a11y = cell.setCount > 0
            ? `${labelDate}, ${cell.setCount} sets logged`
            : `${labelDate}, rest day`;
          return (
            <RNPressable
              key={`tap-${cell.date}-${cell.row}`}
              onPress={() => {
                haptic.select();
                onCellPress?.({ ...cell, isRest: cell.setCount === 0 } as any);
              }}
              accessibilityRole="button"
              accessibilityLabel={a11y}
              style={[
                styles.tap,
                {
                  left: x,
                  top: y,
                  width: CELL,
                  height: CELL,
                },
              ]}
              hitSlop={4}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  tap: {
    position: 'absolute',
  },
});
