/**
 * BodyTrend -- per-metric line chart + ghost overlay + photo before/
 * after. Lens 7 P0-4.
 *
 * Consumes BE-I `/analytics/measurements/series` for the trend, and
 * BE-C `/analytics/measurements/photos/recent` for the side-by-side.
 * Built as a presentational component -- the parent screen does the
 * fetching + period chip wiring + metric picker; this just renders.
 */
import React from 'react';
import { View, StyleSheet, Pressable as RNPressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Camera } from 'lucide-react-native';
import { Text } from '../../components/Text';
import { Surface } from '../../components/Surface';
import { Icon } from '../../components/Icon';
import { LineChart } from '../../components/LineChart';
import { colors, spacing, radii } from '../../theme/tokens';

export type BodyTrendMetric =
  | 'weight'
  | 'bodyfat'
  | 'neck'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'arm'
  | 'forearm'
  | 'thigh'
  | 'calf';

const METRIC_LABEL: Record<BodyTrendMetric, string> = {
  weight: 'Weight',
  bodyfat: 'Body Fat %',
  neck: 'Neck',
  chest: 'Chest',
  waist: 'Waist',
  hips: 'Hips',
  arm: 'Arms',
  forearm: 'Forearms',
  thigh: 'Thighs',
  calf: 'Calves',
};

const METRIC_UNIT: Record<BodyTrendMetric, string> = {
  weight: 'kg',
  bodyfat: '%',
  neck: 'cm',
  chest: 'cm',
  waist: 'cm',
  hips: 'cm',
  arm: 'cm',
  forearm: 'cm',
  thigh: 'cm',
  calf: 'cm',
};

export interface BodyTrendSeries {
  metric: BodyTrendMetric | string;
  period: string;
  points: { date: string; value: number }[];
  thirty_days_ago: number | null;
  goal: { value: number; type: string } | null;
}

export interface BodyTrendPhoto {
  id: string;
  photo_url: string;
  measured_at?: string | null;
  storage_path?: string;
}

export interface BodyTrendProps {
  metric: BodyTrendMetric;
  series?: BodyTrendSeries | null;
  photos: BodyTrendPhoto[];
  onAddPhoto?: () => void;
  onExpandPhoto?: (photo: BodyTrendPhoto) => void;
}

export function BodyTrend({ metric, series, photos, onAddPhoto, onExpandPhoto }: BodyTrendProps) {
  const label = METRIC_LABEL[metric] ?? metric;
  const unit = METRIC_UNIT[metric] ?? '';
  const points = series?.points ?? [];
  const latest = points.length > 0 ? points[points.length - 1].value : null;
  const thirty = series?.thirty_days_ago ?? null;
  const delta = (latest != null && thirty != null) ? latest - thirty : null;
  const periodDays = points.length > 0 ? Math.max(
    1,
    Math.round((Date.parse(points[points.length - 1].date) - Date.parse(points[0].date)) / 86400000),
  ) : 0;

  // Delta phrasing (neutral by default; bodyweight goals can flip polarity).
  let deltaCopy: string | null = null;
  if (delta != null) {
    const abs = Math.abs(delta).toFixed(1);
    if (delta > 0.05) deltaCopy = `Up ${abs} ${unit} in ${periodDays} days`;
    else if (delta < -0.05) deltaCopy = `Down ${abs} ${unit} in ${periodDays} days`;
    else deltaCopy = `Flat over the last ${periodDays} days`;
  }

  // Photos
  const before = photos.length >= 2 ? photos[photos.length - 1] : null;
  const after = photos.length >= 1 ? photos[0] : null;

  return (
    <View style={{ gap: spacing.base }}>
      <Surface level={2} style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text variant="overline" color="textTertiary">{label.toUpperCase()}</Text>
          {latest != null ? (
            <Text variant="title3" color="textPrimary">{latest.toFixed(1)} {unit}</Text>
          ) : (
            <Text variant="caption" color="textSecondary">No data yet</Text>
          )}
        </View>

        <View style={{ marginTop: spacing.sm }}>
          {points.length === 0 ? (
            <View style={styles.chartEmpty}>
              <Text variant="caption" color="textTertiary">
                No measurements yet. Tap + to log your first.
              </Text>
            </View>
          ) : (
            <LineChart
              points={points}
              height={180}
              formatY={(n) => `${n.toFixed(1)}`}
            />
          )}

          {/* Ghost overlay note */}
          {thirty != null ? (
            <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xs }}>
              30 days ago: {thirty.toFixed(1)} {unit}
            </Text>
          ) : null}

          {/* Goal-line note */}
          {series?.goal ? (
            <Text variant="caption" style={{ color: colors.brandText, marginTop: 2 }}>
              Goal: {series.goal.value.toFixed(1)} {unit}
            </Text>
          ) : null}
        </View>

        {deltaCopy ? (
          <Text variant="bodyEmphasis" color="textPrimary" style={{ marginTop: spacing.md }}>
            {deltaCopy}
          </Text>
        ) : null}
      </Surface>

      <Surface level={2} style={styles.photosCard}>
        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.sm }}>
          PROGRESS PHOTOS
        </Text>
        <Text variant="caption" color="textTertiary" style={{ marginBottom: spacing.md }}>
          Your photos are private. Only you can see them.
        </Text>
        <View style={styles.photoRow}>
          <PhotoSlot
            label="Before"
            photo={before}
            onPress={before ? () => onExpandPhoto?.(before) : onAddPhoto}
            placeholderCta="Add photo"
          />
          <PhotoSlot
            label="Now"
            photo={after && (!before || after.id !== before.id) ? after : photos.length === 1 ? after : null}
            onPress={(after && (!before || after.id !== before.id))
              ? () => onExpandPhoto?.(after)
              : onAddPhoto}
            placeholderCta="Add photo"
          />
        </View>
      </Surface>
    </View>
  );
}

function PhotoSlot({
  label,
  photo,
  onPress,
  placeholderCta,
}: {
  label: string;
  photo: BodyTrendPhoto | null;
  onPress?: () => void;
  placeholderCta: string;
}) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text variant="caption" color="textTertiary">{label}</Text>
      <RNPressable
        onPress={onPress}
        style={styles.photoSlot}
        accessibilityRole="button"
        accessibilityLabel={photo ? `${label} photo, tap to expand` : `${label} photo, ${placeholderCta}`}
      >
        {photo ? (
          <ExpoImage
            source={{ uri: photo.photo_url }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View style={styles.photoEmpty}>
            <Icon icon={Camera} size={18} color={colors.textTertiary} strokeWidth={1.5} />
            <Text variant="caption" color="textTertiary">{placeholderCta}</Text>
          </View>
        )}
      </RNPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    padding: spacing.base,
    borderRadius: radii.lg,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  chartEmpty: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    borderStyle: 'dashed',
  },
  photosCard: {
    padding: spacing.base,
    borderRadius: radii.lg,
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  photoSlot: {
    aspectRatio: 3 / 4,
    backgroundColor: colors.surface3,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderStyle: 'dashed',
  },
  photoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
