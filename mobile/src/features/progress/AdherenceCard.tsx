/**
 * AdherenceCard -- "March on track" card surfaced on the Trainer
 * Progress sub-section. Lens 7 P0-3.
 *
 *   - Big "12 / 16" ratio + 64px ProgressRing.
 *   - 4-week sparkline of weekly attendance vs prescribed target.
 *   - Per-exercise narrative bullets passed in via `narratives`.
 *   - Reduce-motion: ring fills instantly, sparkline static.
 *
 * Consumes the BE-B `period_summary` payload added to
 * /trainer/progress, plus the per-exercise narratives the caller
 * formats from the existing exercises array.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TrendingUp, Minus, TrendingDown } from 'lucide-react-native';
import { Text } from '../../components/Text';
import { Surface } from '../../components/Surface';
import { Icon } from '../../components/Icon';
import { ProgressRing } from '../../components/ProgressRing';
import { colors, spacing, radii } from '../../theme/tokens';

export interface AdherencePeriodSummary {
  period: string;
  prescribed_sessions: number;
  completed_sessions: number;
  consecutive_completed: number;
  weekly_breakdown: { week: string; prescribed: number; completed: number }[];
}

export interface AdherenceNarrative {
  text: string;
  trend: 'up' | 'flat' | 'down';
}

export interface AdherenceCardProps {
  summary?: AdherencePeriodSummary | null;
  narratives?: AdherenceNarrative[];
}

function monthLabel(period?: string): string {
  if (!period) return 'This month';
  const [y, m] = period.split('-').map(n => parseInt(n, 10));
  if (!y || !m) return 'This month';
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
}

export function AdherenceCard({ summary, narratives = [] }: AdherenceCardProps) {
  if (!summary) {
    return (
      <Surface level={2} style={styles.card}>
        <Text variant="overline" color="textTertiary">Adherence</Text>
        <Text variant="body" color="textSecondary" style={{ marginTop: spacing.sm }}>
          Build a program in Trainer to track adherence.
        </Text>
      </Surface>
    );
  }

  const prescribed = Math.max(1, summary.prescribed_sessions);
  const pct = Math.max(0, Math.min(1, summary.completed_sessions / prescribed));
  const month = monthLabel(summary.period);
  const onTrack = pct >= 0.75;

  const sparkMax = Math.max(
    1,
    ...summary.weekly_breakdown.map(w => Math.max(w.prescribed, w.completed)),
  );

  return (
    <Surface level={2} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text variant="overline" color="textTertiary">Adherence</Text>
          <Text variant="title3" color="textPrimary" style={{ marginTop: 2 }}>
            {month} {onTrack ? 'on track' : 'catch up'}
          </Text>
        </View>
        <View style={styles.ringWrap}>
          <ProgressRing
            progress={pct}
            size={64}
            strokeWidth={6}
            color={colors.brandDisplay}
          />
          <View pointerEvents="none" style={StyleSheet.absoluteFillObject as any}>
            <View style={styles.ringLabel}>
              <Text variant="numeric" color="textPrimary">
                {summary.completed_sessions}
              </Text>
              <Text variant="caption" color="textTertiary">/{prescribed}</Text>
            </View>
          </View>
        </View>
      </View>

      <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xs }}>
        {summary.consecutive_completed > 1
          ? `${summary.consecutive_completed} in a row`
          : 'New streak begins with the next session'}
      </Text>

      {/* 4-week sparkline */}
      <View style={styles.spark}>
        {summary.weekly_breakdown.map((w, i) => {
          const h = Math.round((w.completed / sparkMax) * 32) + 4;
          const target = Math.round((w.prescribed / sparkMax) * 32);
          const hit = w.completed >= w.prescribed;
          return (
            <View key={w.week + i} style={styles.sparkCol}>
              <View style={[styles.sparkBar, {
                height: h,
                backgroundColor: hit ? colors.brandDisplay : colors.brandText,
                opacity: hit ? 1 : 0.55,
              }]} />
              {/* target hairline */}
              <View
                pointerEvents="none"
                style={[styles.sparkTarget, { bottom: target + 4 }]}
              />
            </View>
          );
        })}
      </View>

      {/* Narrative bullets */}
      {narratives.length > 0 ? (
        <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
          {narratives.slice(0, 3).map((n, i) => (
            <View key={i} style={styles.bulletRow}>
              <Icon
                icon={n.trend === 'up' ? TrendingUp : n.trend === 'down' ? TrendingDown : Minus}
                size={14}
                color={
                  n.trend === 'up' ? colors.success
                  : n.trend === 'down' ? colors.warning
                  : colors.textTertiary
                }
                strokeWidth={2}
              />
              <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
                {n.text}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.base,
    borderRadius: radii.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ringWrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 1,
  },
  spark: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    height: 56,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  sparkCol: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sparkBar: {
    width: '70%',
    borderRadius: 4,
  },
  sparkTarget: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    height: 1,
    backgroundColor: colors.textTertiary,
    opacity: 0.4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
