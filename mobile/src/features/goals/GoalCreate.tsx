/**
 * GoalCreate -- form for adding a new goal. Lens 7 P1-2.
 *
 * v1 form: type picker + per-type fields. Keeping the UI inline
 * rather than RHF/zod-heavy because the schema is simple and the
 * goal kinds vary; backend zod validation is the contract.
 */
import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Dumbbell, Calendar, Scale } from 'lucide-react-native';
import { Text } from '../../components/Text';
import { Surface } from '../../components/Surface';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Pressable } from '../../design-system/primitives/Pressable';
import { api } from '../../lib/api';
import { haptic } from '../../lib/haptics';
import { colors, spacing, radii } from '../../theme/tokens';
import { GoalType, GoalCreatePayload, Goal } from './types';

export interface GoalCreateProps {
  /** Optional list of recent exercises to pick from for target_weight. */
  exerciseOptions?: { id: string; name: string }[];
  onCreated?: (goal: Goal) => void;
  onCancel?: () => void;
}

const TYPE_OPTIONS: { key: GoalType; label: string; icon: typeof Dumbbell; desc: string }[] = [
  { key: 'target_weight', label: 'Lift target',   icon: Dumbbell, desc: 'Hit a target weight on an exercise' },
  { key: 'consistency',   label: 'Consistency',    icon: Calendar, desc: 'Train N times per week' },
  { key: 'bodyweight',    label: 'Bodyweight',     icon: Scale,    desc: 'Hit a target bodyweight by a date' },
];

export function GoalCreate({ exerciseOptions = [], onCreated, onCancel }: GoalCreateProps) {
  const [type, setType] = useState<GoalType | null>(null);
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('kg');
  const [targetDate, setTargetDate] = useState('');
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (!type) return false;
    if (!targetValue || isNaN(Number(targetValue)) || Number(targetValue) <= 0) return false;
    if (type === 'target_weight' && !exerciseId) return false;
    return true;
  }, [type, targetValue, exerciseId]);

  async function submit() {
    if (!canSubmit || !type) return;
    setSubmitting(true);
    try {
      const payload: GoalCreatePayload = {
        goal_type: type,
        exercise_id: type === 'target_weight' ? exerciseId : null,
        target_value: Number(targetValue),
        target_unit: type === 'consistency' ? 'sessions_per_week' : targetUnit,
        target_date: targetDate || null,
      };
      const res = await api.post<{ data: { goal: Goal } }>('/goals', payload);
      haptic.success();
      onCreated?.(res.data.goal);
    } catch (e: any) {
      haptic.error();
      Alert.alert('Could not create goal', e?.message ?? 'Try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
      <Text variant="title2" color="textPrimary">New goal</Text>

      <View style={{ gap: spacing.sm }}>
        <Text variant="overline" color="textTertiary">TYPE</Text>
        {TYPE_OPTIONS.map((opt) => {
          const selected = type === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => {
                setType(opt.key);
                setTargetUnit(opt.key === 'consistency' ? 'sessions/week' : 'kg');
              }}
              style={[styles.typeRow, selected ? styles.typeRowSelected : null]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${opt.label} goal type`}
            >
              <Icon icon={opt.icon} size={20} color={selected ? colors.brandText : colors.textSecondary} strokeWidth={1.6} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyEmphasis" color={selected ? 'brand' : 'textPrimary'}>{opt.label}</Text>
                <Text variant="caption" color="textTertiary">{opt.desc}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {type === 'target_weight' ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" color="textTertiary">EXERCISE</Text>
          <Surface level={2} style={styles.exerciseList}>
            {exerciseOptions.length === 0 ? (
              <Text variant="caption" color="textTertiary" style={{ padding: spacing.md }}>
                No recent exercises. Log a workout to populate this list.
              </Text>
            ) : (
              exerciseOptions.map((ex) => (
                <Pressable
                  key={ex.id}
                  onPress={() => setExerciseId(ex.id)}
                  style={[styles.exerciseRow, exerciseId === ex.id ? styles.exerciseRowActive : null]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: exerciseId === ex.id }}
                  accessibilityLabel={`Select ${ex.name}`}
                >
                  <Text variant="body" color={exerciseId === ex.id ? 'brand' : 'textPrimary'}>{ex.name}</Text>
                </Pressable>
              ))
            )}
          </Surface>
        </View>
      ) : null}

      {type ? (
        <View style={{ gap: spacing.sm }}>
          <Input
            label={
              type === 'consistency' ? 'Sessions per week'
              : type === 'bodyweight' ? 'Target bodyweight'
              : 'Target weight'
            }
            value={targetValue}
            onChangeText={setTargetValue}
            keyboardType="decimal-pad"
            placeholder={
              type === 'consistency' ? '4'
              : type === 'bodyweight' ? '75'
              : '100'
            }
          />
          {type !== 'consistency' ? (
            <Input
              label="Unit"
              value={targetUnit}
              onChangeText={setTargetUnit}
              placeholder="kg"
            />
          ) : null}
          <Input
            label="Target date (optional)"
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder="YYYY-MM-DD"
          />
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" size="lg" onPress={onCancel ?? (() => {})} style={{ flex: 1 }} />
        <Button label="Create" variant="primary" size="lg" loading={submitting} onPress={submit} style={{ flex: 1 }} disabled={!canSubmit || submitting} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeRowSelected: {
    borderColor: colors.brandText,
    backgroundColor: colors.brandGlow,
  },
  exerciseList: {
    overflow: 'hidden',
    borderRadius: radii.md,
  },
  exerciseRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  exerciseRowActive: {
    backgroundColor: colors.brandGlow,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.base,
  },
});
