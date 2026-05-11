/**
 * GoalCard -- single-goal summary row used in GoalsList + Progress tab.
 * Lens 7 P1-2.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Dumbbell, Calendar, Scale } from 'lucide-react-native';
import { Text } from '../../components/Text';
import { Icon } from '../../components/Icon';
import { ProgressRing } from '../../components/ProgressRing';
import { Pressable } from '../../design-system/primitives/Pressable';
import { colors, spacing, radii } from '../../theme/tokens';
import { Goal, goalProgressPercent } from './types';

const ICON_BY_TYPE = {
  target_weight: Dumbbell,
  consistency: Calendar,
  bodyweight: Scale,
} as const;

export interface GoalCardProps {
  goal: Goal;
  /** Optional exercise-name resolver for target_weight goals. */
  exerciseName?: string | null;
  onPress?: (goal: Goal) => void;
}

export function GoalCard({ goal, exerciseName, onPress }: GoalCardProps) {
  const pct = goalProgressPercent(goal);
  const pctInt = Math.round(pct * 100);
  const Icn = ICON_BY_TYPE[goal.goal_type];

  let primaryLine = '';
  let secondaryLine = '';
  switch (goal.goal_type) {
    case 'target_weight':
      primaryLine = `${exerciseName ?? 'Lift'}: ${goal.target_value} ${goal.target_unit}`;
      secondaryLine = goal.current_value != null
        ? `Now ${goal.current_value} ${goal.target_unit}`
        : 'No PR yet';
      break;
    case 'consistency':
      primaryLine = `${goal.target_value} sessions / week`;
      secondaryLine = `Now ${goal.current_value ?? 0} weeks on target`;
      break;
    case 'bodyweight':
      primaryLine = `Bodyweight: ${goal.target_value} ${goal.target_unit}`;
      secondaryLine = goal.current_value != null
        ? `Now ${goal.current_value} ${goal.target_unit}`
        : 'No measurement yet';
      break;
  }

  const daysRemaining = goal.target_date
    ? Math.max(0, Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <Pressable
      onPress={() => onPress?.(goal)}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${primaryLine}. ${pctInt} percent complete.`}
    >
      <View style={styles.iconWrap}>
        <Icon icon={Icn} size={18} color={colors.brandText} strokeWidth={1.6} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1}>{primaryLine}</Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {secondaryLine}
          {daysRemaining != null ? ` · ${daysRemaining}d remaining` : ''}
        </Text>
      </View>
      <View style={styles.ringWrap}>
        <ProgressRing progress={pct} size={48} strokeWidth={4} color={colors.brandDisplay} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject as any, styles.ringLabelWrap]}>
          <Text variant="caption" color="textPrimary">{pctInt}%</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface2,
    borderRadius: radii.lg,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  ringLabelWrap: { alignItems: 'center', justifyContent: 'center' },
});
