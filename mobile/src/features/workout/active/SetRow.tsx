/**
 * SetRow -- single set row in the active-workout exercise card.
 *
 * Extracted from app/workout/active.tsx per the C-1 slice. Pure
 * presentational + a thin tap/long-press handler -- the parent owns
 * `set` and forwards updates.
 *
 * Lens 8 hooks (active-workout gestures):
 *   - swipe-left set delete -- TODO: caller wraps in a Swipeable; this
 *     component just renders the row.
 *   - shake on validation block -- uses `useShake()` from
 *     design-system/motion/primitives when `setHasRequiredValues`
 *     returns false on a complete-tap.
 *
 * The set-type color comes from the Q5-locked token map.
 */
import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import type { WorkoutSet } from '../../../stores/workoutStore';
import { Text } from '../../../components/Text';
import { Icon } from '../../../components/Icon';
import { Pressable } from '../../../components/Pressable';
import { useShake } from '../../../design-system/motion/primitives';
import { haptic } from '../../../lib/haptics';
import { colors, spacing, radii } from '../../../theme/tokens';

export const SET_TYPE_COLORS: Record<string, string> = {
  normal:  colors.setNormal,
  warmup:  colors.setWarmup,
  dropset: colors.setDropset,
  failure: colors.setFailure,
};

export const SET_TYPE_LABELS: Record<string, string> = {
  normal:  'N',
  warmup:  'W',
  dropset: 'D',
  failure: 'F',
};

export function setHasRequiredValues(set: WorkoutSet, loggingType: string): boolean {
  if (loggingType === 'weight_reps') {
    return set.weight_kg !== null && set.weight_kg > 0 && set.reps !== null && set.reps > 0;
  }
  if (loggingType === 'bodyweight_reps') {
    return set.reps !== null && set.reps > 0;
  }
  if (loggingType === 'duration') {
    return set.duration_seconds !== null && set.duration_seconds > 0;
  }
  if (loggingType === 'distance') {
    return set.distance_meters !== null && set.distance_meters > 0;
  }
  return false;
}

export interface SetRowProps {
  set: WorkoutSet;
  index: number;
  loggingType: string;
  onToggleComplete: () => void;
  onUpdateSet: (updated: Partial<WorkoutSet>) => void;
  onLongPress: () => void;
}

export function SetRow({ set, index, loggingType, onToggleComplete, onUpdateSet, onLongPress }: SetRowProps) {
  const isCompleted = set.is_completed;
  const typeColor = SET_TYPE_COLORS[set.set_type] ?? colors.setNormal;
  const canComplete = setHasRequiredValues(set, loggingType);
  const { animStyle: shakeStyle, trigger: shake } = useShake();

  return (
    <Animated.View style={[styles.setRow, isCompleted && styles.setRowComplete, shakeStyle]}>
      <Pressable
        onPress={() => {
          if (!isCompleted && !canComplete) {
            haptic.setBlocked();
            shake();
            return;
          }
          onToggleComplete();
        }}
        onLongPress={() => { haptic.setTypeOpen(); onLongPress(); }}
        delayLongPress={300}
        style={[styles.setNumBtn, {
          backgroundColor: isCompleted ? colors.success : typeColor + '30',
          borderColor: isCompleted ? colors.success : typeColor,
          opacity: !isCompleted && !canComplete ? 0.45 : 1,
        }]}
        accessibilityLabel={`Set ${index + 1}, ${set.set_type}, ${isCompleted ? 'completed' : 'incomplete'}, long-press to change type`}
      >
        {isCompleted
          ? <Icon icon={Check} size={14} color={colors.textPrimary} strokeWidth={2.5} />
          : set.set_type === 'normal'
            ? <Text variant="label" style={{ color: typeColor }}>{index + 1}</Text>
            : <Text variant="label" style={{ color: typeColor, fontSize: 14 }}>{SET_TYPE_LABELS[set.set_type]}</Text>
        }
      </Pressable>

      {(loggingType === 'weight_reps' || loggingType === 'bodyweight_reps') && (
        <>
          {loggingType === 'weight_reps' ? (
            <TextInput
              style={[styles.setInput, isCompleted && styles.setInputComplete]}
              placeholder="kg"
              placeholderTextColor={colors.textDisabled}
              keyboardType="decimal-pad"
              value={set.weight_kg !== null ? String(set.weight_kg) : ''}
              onChangeText={v => onUpdateSet({ weight_kg: v ? parseFloat(v) : null })}
              editable={!isCompleted}
            />
          ) : (
            <View style={[styles.setInput, { justifyContent: 'center' }]}>
              <Text variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>BW</Text>
            </View>
          )}
          <TextInput
            style={[styles.setInput, isCompleted && styles.setInputComplete]}
            placeholder="reps"
            placeholderTextColor={colors.textDisabled}
            keyboardType="number-pad"
            value={set.reps !== null ? String(set.reps) : ''}
            onChangeText={v => onUpdateSet({ reps: v ? parseInt(v) : null })}
            editable={!isCompleted}
          />
        </>
      )}
      {loggingType === 'duration' && (
        <TextInput
          style={[styles.setInput, styles.setInputFull, isCompleted && styles.setInputComplete]}
          placeholder="seconds"
          placeholderTextColor={colors.textDisabled}
          keyboardType="number-pad"
          value={set.duration_seconds !== null ? String(set.duration_seconds) : ''}
          onChangeText={v => onUpdateSet({ duration_seconds: v ? parseInt(v) : null })}
          editable={!isCompleted}
        />
      )}
      {loggingType === 'distance' && (
        <TextInput
          style={[styles.setInput, styles.setInputFull, isCompleted && styles.setInputComplete]}
          placeholder="meters"
          placeholderTextColor={colors.textDisabled}
          keyboardType="decimal-pad"
          value={set.distance_meters !== null ? String(set.distance_meters) : ''}
          onChangeText={v => onUpdateSet({ distance_meters: v ? parseFloat(v) : null })}
          editable={!isCompleted}
        />
      )}
    </Animated.View>
  );
}

const SETNUM_SIZE = 36;

const styles = StyleSheet.create({
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  setRowComplete: {},
  setNumBtn: {
    width: SETNUM_SIZE,
    height: SETNUM_SIZE,
    borderRadius: SETNUM_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.textTertiary,
    backgroundColor: 'transparent',
  },
  setInput: {
    flex: 1,
    backgroundColor: colors.surface3,
    color: colors.textPrimary,
    fontFamily: 'Barlow_400Regular',
    fontSize: 15,
    textAlign: 'center',
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    minHeight: 44,
  },
  setInputFull: { flex: 2 },
  setInputComplete: { backgroundColor: colors.successDim },
});
