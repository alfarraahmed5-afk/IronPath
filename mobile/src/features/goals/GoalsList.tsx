/**
 * GoalsList -- list active goals + a recently-completed section. Used
 * on the Progress tab + Me tab summary. Lens 7 P1-2 + founder Q3 lock.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Surface } from '../../components/Surface';
import { Icon } from '../../components/Icon';
import { api } from '../../lib/api';
import { colors, spacing, radii } from '../../theme/tokens';
import { GoalCard } from './GoalCard';
import { Goal } from './types';

export interface GoalsListProps {
  /** Optional preloaded list (e.g. parent screen prefetched). */
  initial?: Goal[];
  /** When tapping a goal -- defaults to a placeholder log. */
  onSelect?: (goal: Goal) => void;
  /** When tapping "+ New" -- defaults to /goals/create. */
  onCreate?: () => void;
  /** Optional exerciseId -> name map for target_weight goals. */
  exerciseNames?: Record<string, string>;
  /** Limit display (e.g. show 3 on Me tab). */
  limit?: number;
  hideHeader?: boolean;
}

export function GoalsList({ initial, onSelect, onCreate, exerciseNames, limit, hideHeader }: GoalsListProps) {
  const [goals, setGoals] = useState<Goal[]>(initial ?? []);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: { goals: Goal[] } }>('/goals');
      setGoals(res.data?.goals ?? []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initial) load();
  }, [initial, load]);

  const active = goals.filter(g => g.status === 'active');
  const completed = goals.filter(g => g.status === 'completed').slice(0, 2);
  const displayActive = limit ? active.slice(0, limit) : active;

  const handleCreate = onCreate ?? (() => router.push('/goals/create' as any));
  const handleSelect = onSelect ?? ((g: Goal) => router.push(`/goals/${g.id}` as any));

  return (
    <View style={{ gap: spacing.md }}>
      {!hideHeader ? (
        <View style={styles.headerRow}>
          <Text variant="overline" color="textTertiary">GOALS</Text>
          <Button
            label="+ New"
            variant="secondary"
            size="sm"
            onPress={handleCreate}
          />
        </View>
      ) : null}

      {loading ? (
        <Surface level={2} style={styles.placeholder}>
          <Text variant="caption" color="textTertiary">Loading goals...</Text>
        </Surface>
      ) : error ? (
        <Surface level={2} style={styles.placeholder}>
          <Text variant="caption" color="textTertiary">{error}</Text>
        </Surface>
      ) : displayActive.length === 0 ? (
        <Surface level={2} style={styles.empty}>
          <Text variant="body" color="textPrimary">Set a goal to chase.</Text>
          <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xs }}>
            Pick a lift, pick a number, pick a date.
          </Text>
          <View style={{ marginTop: spacing.md }}>
            <Button label="New goal" variant="primary" size="md" onPress={handleCreate} />
          </View>
        </Surface>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {displayActive.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              exerciseName={g.exercise_id ? exerciseNames?.[g.exercise_id] : null}
              onPress={handleSelect}
            />
          ))}
        </View>
      )}

      {completed.length > 0 ? (
        <View style={{ gap: spacing.xs, marginTop: spacing.md }}>
          <Text variant="overline" color="textTertiary">RECENTLY COMPLETED</Text>
          {completed.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              exerciseName={g.exercise_id ? exerciseNames?.[g.exercise_id] : null}
              onPress={handleSelect}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeholder: {
    padding: spacing.base,
    borderRadius: radii.lg,
  },
  empty: {
    padding: spacing.base,
    borderRadius: radii.lg,
  },
});
