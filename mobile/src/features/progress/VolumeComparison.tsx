/**
 * VolumeComparison -- "You lifted as much as X" + percentile callout.
 *
 * Lens 7 P1-4. Reads `gym_volume_percentile` (already wired by BE-H,
 * surfaced in `/analytics/stats`). Hides when percentile is null (gym
 * too small) per lens 7 empty-state rule.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../../components/Text';
import { Surface } from '../../components/Surface';
import { colors, spacing, radii } from '../../theme/tokens';

export interface VolumeComparisonProps {
  totalVolumeKg: number;
  comparisonLabel?: string | null;
  /** Top X% in the gym, 0-100. Null => hide the percentile chip. */
  gymPercentile?: number | null;
}

export function VolumeComparison({
  totalVolumeKg,
  comparisonLabel,
  gymPercentile,
}: VolumeComparisonProps) {
  const formattedVol = totalVolumeKg >= 1000
    ? `${(totalVolumeKg / 1000).toFixed(1)}k`
    : Math.round(totalVolumeKg).toString();

  // gym_volume_percentile in our backend is "your percentile rank"
  // (high = good). Convert to "top X%": top X means percentile >= 100-X.
  let topPct: number | null = null;
  if (gymPercentile != null && gymPercentile >= 0 && gymPercentile <= 100) {
    topPct = Math.max(1, Math.round(100 - gymPercentile));
  }

  return (
    <Surface level={2} style={styles.card}>
      <Text variant="overline" color="textTertiary">VOLUME</Text>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text variant="display3" color="textPrimary">{formattedVol} kg</Text>
          {comparisonLabel ? (
            <Text variant="caption" color="textSecondary" style={{ marginTop: 4 }}>
              As much as {comparisonLabel}
            </Text>
          ) : null}
        </View>
        {topPct != null ? (
          <View style={styles.pill} accessibilityLabel={`Top ${topPct} percent in your gym`}>
            <Text variant="caption" style={styles.pillText}>Top {topPct}%</Text>
          </View>
        ) : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.base,
    borderRadius: radii.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.brandGlow,
    borderWidth: 1,
    borderColor: colors.brandText,
  },
  pillText: { color: colors.brandText, fontWeight: '600' },
});
