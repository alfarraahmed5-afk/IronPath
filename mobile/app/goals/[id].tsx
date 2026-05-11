/**
 * /goals/[id] -- single-goal detail.
 *
 * Reads the goal via GET /goals/:id, renders the GoalCard summary,
 * exposes a Delete action. Edit + per-metric chart are lens 7 P2 work
 * not in this commit.
 */
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import { Pressable } from '../../src/design-system/primitives/Pressable';
import { Icon } from '../../src/components/Icon';
import { Text } from '../../src/components/Text';
import { Button } from '../../src/components/Button';
import { GoalCard } from '../../src/features/goals/GoalCard';
import { Goal } from '../../src/features/goals/types';
import { api } from '../../src/lib/api';
import { haptic } from '../../src/lib/haptics';
import { colors, spacing } from '../../src/theme/tokens';

export default function GoalDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const goalId = String(params.id ?? '');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: { goal: Goal } }>(`/goals/${goalId}`);
        if (!cancelled) setGoal(res.data.goal);
      } catch {
        if (!cancelled) setGoal(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [goalId]);

  function confirmDelete() {
    Alert.alert(
      'Delete goal',
      'This removes the goal and its progress. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete(`/goals/${goalId}`);
              haptic.success();
              router.back();
            } catch {
              haptic.error();
              Alert.alert('Could not delete', 'Try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Stack.Screen options={{ headerShown: false, title: 'Goal' }} />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Back" style={styles.iconBtn}>
          <Icon icon={ChevronLeft} size={22} color={colors.textPrimary} />
        </Pressable>
        <Text variant="title3" color="textPrimary">Goal</Text>
        <Pressable
          onPress={confirmDelete}
          accessibilityLabel="Delete goal"
          style={styles.iconBtn}
          disabled={!goal || deleting}
        >
          <Icon icon={Trash2} size={20} color={goal ? colors.danger : colors.textTertiary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : !goal ? (
        <View style={styles.centered}>
          <Text variant="body" color="textTertiary">Goal not found.</Text>
          <View style={{ height: spacing.lg }} />
          <Button label="Back" onPress={() => router.back()} variant="secondary" size="md" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <GoalCard goal={goal} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: spacing.base,
    gap: spacing.base,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
});
