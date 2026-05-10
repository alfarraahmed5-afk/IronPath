/**
 * MonthlyRecap -- Spotify-Wrapped 6-panel pager. Lens 7 P1-1.
 *
 *   - 6 panels: Hero, Volume, Top Lifts, Muscle, Consistency, Rank.
 *   - Tap right to advance, tap left to back. 4s auto-advance per
 *     panel (paused if screen reader is on per Q4 rationale).
 *   - Reduce-motion fork: panels crossfade (no slide), Numeric
 *     primitives auto-collapse, ember overlay stays static.
 *
 * The payload mirrors BE-E `monthly_recaps.payload` JSON, see
 * backend/src/jobs/monthlyRecapJob.ts for the shape.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable as RNPressable,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Hero } from '../../design-system/primitives/Hero';
import { Numeric } from '../../design-system/primitives/Numeric';
import { useTheme } from '../../design-system/theme/useTheme';
import { useScreenReader } from '../../lib/a11y';
import { colors, spacing, radii } from '../../theme/tokens';

const AUTO_MS = 4000;
const PANEL_COUNT = 6;

export interface MonthlyRecapPayload {
  period_label: string;
  total_workouts: number;
  total_volume_kg: number;
  total_sets: number;
  total_duration_seconds: number;
  prev_total_volume_kg: number;
  prev_total_workouts: number;
  weekly_volume: { week: string; volume_kg: number }[];
  top_lifts: { exercise_name: string; max_weight_kg: number; is_pr: boolean }[];
  dominant_muscle: { muscle: string; sets: number } | null;
  consistency: { sessions: number; target: number; weeks_in_a_row: number };
  gym_rank: { rank: number | null; total: number | null };
  prs: { exercise_name: string; value: number; record_type: string }[];
}

export interface MonthlyRecapProps {
  visible: boolean;
  payload: MonthlyRecapPayload;
  handle?: string;
  gymName?: string;
  /** Hero photo. Mid-tier per Q7; not a hard requirement. */
  photoSource?: { uri: string } | number;
  onDismiss: () => void;
  onShare?: (panelIndex: number) => void;
}

export function MonthlyRecap({ visible, payload, handle, gymName, photoSource, onDismiss, onShare }: MonthlyRecapProps) {
  const { reduceMotion } = useTheme();
  const { isEnabled: srOn } = useScreenReader();
  const [panel, setPanel] = useState(0);
  const fade = useSharedValue(1);

  const advance = useCallback((dir: 1 | -1 = 1) => {
    const next = panel + dir;
    if (next < 0) return;
    if (next >= PANEL_COUNT) {
      onDismiss();
      return;
    }
    // Crossfade.
    if (reduceMotion) {
      setPanel(next);
      return;
    }
    fade.value = withTiming(0, { duration: 120, easing: Easing.bezier(0.32, 0.72, 0, 1) }, () => {
      // setPanel runs on JS; can't be invoked from worklet -- so we use the
      // useEffect on `panel` change to ramp fade back. Trigger via a
      // dispatched value.
    });
    setTimeout(() => {
      setPanel(next);
      fade.value = withTiming(1, { duration: 240, easing: Easing.bezier(0.32, 0.72, 0, 1) });
    }, 120);
  }, [panel, reduceMotion, fade, onDismiss]);

  // Auto-advance timer. Disabled when screen reader is on.
  useEffect(() => {
    if (!visible) return;
    if (srOn) return;
    const t = setTimeout(() => advance(1), AUTO_MS);
    return () => clearTimeout(t);
  }, [visible, panel, srOn, advance]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (!visible) return null;

  return (
    <Modal visible animationType="fade" statusBarTranslucent transparent>
      <StatusBar barStyle="light-content" />
      <View style={styles.backdrop}>
        {/* Panel-progress segments at the top */}
        <View style={styles.segments}>
          {Array.from({ length: PANEL_COUNT }).map((_, i) => (
            <View key={i} style={[styles.segment, i <= panel ? styles.segmentActive : null]} />
          ))}
        </View>

        {/* Close affordance */}
        <RNPressable onPress={onDismiss} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close recap">
          <Icon icon={X} size={22} color={colors.textPrimary} strokeWidth={1.6} />
        </RNPressable>

        {/* Hero photo backdrop */}
        <Hero
          source={photoSource}
          height={1200}
          maskDirection="top"
          maskCoverage={0.65}
          kenBurns={!reduceMotion}
          closingSeam={false}
          ember
          style={styles.heroFill}
        />

        {/* Panel body */}
        <Animated.View style={[styles.panelArea, fadeStyle]}>
          {panel === 0 ? (
            <HeroPanel payload={payload} gymName={gymName} handle={handle} />
          ) : panel === 1 ? (
            <VolumePanel payload={payload} />
          ) : panel === 2 ? (
            <TopLiftsPanel payload={payload} />
          ) : panel === 3 ? (
            <MusclePanel payload={payload} />
          ) : panel === 4 ? (
            <ConsistencyPanel payload={payload} />
          ) : (
            <RankPanel payload={payload} />
          )}
        </Animated.View>

        {/* Tap zones (left = back, right = forward). Excluded from a11y so
            the screen reader user uses the explicit Continue button. */}
        {!srOn ? (
          <>
            <RNPressable
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              onPress={() => advance(-1)}
              style={[styles.tapZone, { left: 0 }]}
            />
            <RNPressable
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              onPress={() => advance(1)}
              style={[styles.tapZone, { right: 0 }]}
            />
          </>
        ) : null}

        {/* Footer CTAs */}
        <View style={styles.footer}>
          {onShare ? (
            <Button label="Share" variant="secondary" size="md" onPress={() => onShare(panel)} style={{ flex: 1 }} />
          ) : null}
          <Button label={panel === PANEL_COUNT - 1 ? 'Done' : 'Continue'} variant="primary" size="md" onPress={() => advance(1)} style={{ flex: 1 }} />
        </View>
      </View>
    </Modal>
  );
}

function HeroPanel({ payload, gymName, handle }: { payload: MonthlyRecapPayload; gymName?: string; handle?: string }) {
  return (
    <View style={styles.panelInner}>
      <Text variant="display3" color="textPrimary" style={{ textAlign: 'center' }}>
        {payload.period_label}
      </Text>
      <Text variant="title3" color="textSecondary" style={{ textAlign: 'center', marginTop: spacing.md }}>
        Your month under the bar
      </Text>
      <View style={{ marginTop: spacing.xl, gap: spacing.xs, alignItems: 'center' }}>
        {handle ? (
          <Text variant="bodyEmphasis" color="textPrimary">@{handle}</Text>
        ) : null}
        {gymName ? (
          <Text variant="caption" color="textTertiary">{gymName.toUpperCase()}</Text>
        ) : null}
      </View>
    </View>
  );
}

function VolumePanel({ payload }: { payload: MonthlyRecapPayload }) {
  const prevDelta = payload.prev_total_volume_kg > 0
    ? Math.round(((payload.total_volume_kg - payload.prev_total_volume_kg) / payload.prev_total_volume_kg) * 100)
    : null;
  const deltaCopy = prevDelta == null
    ? null
    : prevDelta > 0 ? `up ${prevDelta}% from last month`
    : prevDelta < 0 ? `down ${Math.abs(prevDelta)}% from last month`
    : 'matched last month';
  return (
    <View style={styles.panelInner}>
      <Text variant="overline" color="textTertiary" style={{ textAlign: 'center' }}>VOLUME</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md, alignItems: 'baseline', gap: 8 }}>
        <Numeric value={payload.total_volume_kg} variant="display1" color="textPrimary"
          format={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString()} />
        <Text variant="title3" color="textSecondary">kg</Text>
      </View>
      <Text variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: spacing.md }}>
        Across {payload.total_workouts} session{payload.total_workouts === 1 ? '' : 's'},{' '}
        {Math.round(payload.total_duration_seconds / 3600)} hours under the bar.
      </Text>
      {deltaCopy ? (
        <Text variant="caption" style={{ textAlign: 'center', marginTop: spacing.md, color: colors.brandText }}>
          {deltaCopy}
        </Text>
      ) : null}
    </View>
  );
}

function TopLiftsPanel({ payload }: { payload: MonthlyRecapPayload }) {
  return (
    <View style={styles.panelInner}>
      <Text variant="overline" color="textTertiary" style={{ textAlign: 'center' }}>TOP LIFTS</Text>
      <View style={{ marginTop: spacing.lg, gap: spacing.md, width: '100%' }}>
        {payload.top_lifts.slice(0, 3).map((l, i) => (
          <View key={i} style={styles.liftRow}>
            <Text variant="title3" color="textTertiary" style={{ width: 24 }}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1}>{l.exercise_name}</Text>
              <Text variant="caption" color="textSecondary">{l.max_weight_kg} kg{l.is_pr ? ' · PR' : ''}</Text>
            </View>
          </View>
        ))}
        {payload.top_lifts.length === 0 ? (
          <Text variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>
            No weighted lifts logged this month.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function MusclePanel({ payload }: { payload: MonthlyRecapPayload }) {
  return (
    <View style={styles.panelInner}>
      <Text variant="overline" color="textTertiary" style={{ textAlign: 'center' }}>MOST-TRAINED</Text>
      {payload.dominant_muscle ? (
        <>
          <Text variant="display3" color="textPrimary" style={{ textAlign: 'center', marginTop: spacing.lg, textTransform: 'capitalize' }}>
            {payload.dominant_muscle.muscle}
          </Text>
          <Text variant="caption" color="textSecondary" style={{ textAlign: 'center', marginTop: spacing.sm }}>
            {payload.dominant_muscle.sets} sets across the month
          </Text>
        </>
      ) : (
        <Text variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>
          No muscle-group data captured for this month.
        </Text>
      )}
    </View>
  );
}

function ConsistencyPanel({ payload }: { payload: MonthlyRecapPayload }) {
  const { sessions, weeks_in_a_row } = payload.consistency;
  return (
    <View style={styles.panelInner}>
      <Text variant="overline" color="textTertiary" style={{ textAlign: 'center' }}>CONSISTENCY</Text>
      <Text variant="display3" color="textPrimary" style={{ textAlign: 'center', marginTop: spacing.lg }}>
        {sessions} session{sessions === 1 ? '' : 's'}
      </Text>
      <Text variant="caption" color="textSecondary" style={{ textAlign: 'center', marginTop: spacing.sm }}>
        Across {weeks_in_a_row} week{weeks_in_a_row === 1 ? '' : 's'} of training
      </Text>
    </View>
  );
}

function RankPanel({ payload }: { payload: MonthlyRecapPayload }) {
  const { rank, total } = payload.gym_rank;
  return (
    <View style={styles.panelInner}>
      <Text variant="overline" color="textTertiary" style={{ textAlign: 'center' }}>GYM RANK</Text>
      {rank != null && total != null ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: 6, marginTop: spacing.lg }}>
            <Text variant="caption" color="textSecondary">#</Text>
            <Numeric value={rank} variant="display1" color="textPrimary" />
            <Text variant="title3" color="textSecondary">/ {total}</Text>
          </View>
          <Text variant="caption" color="textSecondary" style={{ textAlign: 'center', marginTop: spacing.sm }}>
            By total volume in your gym this month
          </Text>
        </>
      ) : (
        <Text variant="caption" color="textTertiary" style={{ textAlign: 'center', marginTop: spacing.lg }}>
          Rank unavailable -- gym too small or snapshot not yet generated.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000' },
  heroFill: { ...StyleSheet.absoluteFillObject as any, height: '100%' as any },
  segments: {
    position: 'absolute',
    top: 56,
    left: spacing.base,
    right: spacing.base,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  segment: { flex: 1, height: 3, backgroundColor: 'rgba(245,245,247,0.18)', borderRadius: 1.5 },
  segmentActive: { backgroundColor: '#F5F5F7' },
  closeBtn: {
    position: 'absolute',
    top: 64,
    right: spacing.base,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 11,
  },
  panelArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 120,
  },
  panelInner: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  liftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(31,31,36,0.7)',
    borderRadius: radii.md,
  },
  tapZone: {
    position: 'absolute',
    top: 96,
    bottom: 96,
    width: '40%',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.md,
  },
});
