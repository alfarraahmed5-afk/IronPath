/**
 * ExerciseHeader -- the top strip of an exercise card on active.tsx.
 * Renders name + summary + remove + info-detail tap.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Info, X } from 'lucide-react-native';
import { Text } from '../../../components/Text';
import { Icon } from '../../../components/Icon';
import { Pressable } from '../../../components/Pressable';
import type { WorkoutExercise } from '../../../stores/workoutStore';
import { colors, spacing, radii } from '../../../theme/tokens';

export interface ExerciseHeaderProps {
  exercise: WorkoutExercise;
  onRemove: () => void;
}

export function ExerciseHeader({ exercise, onRemove }: ExerciseHeaderProps) {
  const router = useRouter();
  const completedCount = exercise.sets.filter(s => s.is_completed).length;
  const totalCount = exercise.sets.length;
  return (
    <View style={styles.exerciseHeader}>
      <Pressable
        onPress={() => router.push(`/exercises/${exercise.exercise_id}` as any)}
        style={{ flex: 1 }}
        accessibilityLabel={`View ${exercise.exercise_name} details`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text variant="title3" color="textPrimary" numberOfLines={1} style={{ flex: 1 }}>
            {exercise.exercise_name}
          </Text>
          <Icon icon={Info} size={14} color={colors.textTertiary} />
        </View>
        <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xxs }}>
          {completedCount}/{totalCount} sets · {exercise.rest_seconds}s rest
        </Text>
      </Pressable>
      <Pressable onPress={onRemove} style={styles.removeBtn} accessibilityLabel="Remove exercise">
        <Icon icon={X} size={16} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  exerciseHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
});
