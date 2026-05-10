/**
 * BottomBar -- legacy `Add Exercise` CTA at the bottom of the
 * exercise list. Kept as a separate component so the orchestrator
 * stays readable and so it can be reused on an empty-state.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Text } from '../../../components/Text';
import { Icon } from '../../../components/Icon';
import { Pressable } from '../../../components/Pressable';
import { colors, spacing, radii } from '../../../theme/tokens';

export interface BottomBarProps {
  onAddExercise: () => void;
}

export function BottomBar({ onAddExercise }: BottomBarProps) {
  return (
    <Pressable
      onPress={onAddExercise}
      style={styles.addExerciseBtn}
      accessibilityLabel="Add exercise"
    >
      <Icon icon={Plus} size={18} color={colors.textSecondary} />
      <Text variant="bodyEmphasis" color="textSecondary" style={{ marginLeft: spacing.sm }}>
        Add Exercise
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.base,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
});
