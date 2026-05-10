/**
 * Progress tab -- NEW (Option B IA, founder Q1 lock).
 *
 * This is a PLACEHOLDER landed by C-2 to make the tab route real from
 * the IA-restructure commit forward. C-1 owns the real body (streak
 * heatmap, monthly recap, body trends, etc.) and will replace this
 * file in their slice.
 *
 * Voice-copy in the placeholder follows lens 5's progress empty-state
 * pattern.
 */
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '../../src/components/Text';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, spacing } from '../../src/theme/tokens';

export default function ProgressScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <Text variant="title2" color="textPrimary">Progress</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <EmptyState
          illustration="workouts"
          title="Your story starts on day one."
          description="Complete a workout and the heatmap, sparklines, and volume curve start filling in."
          action={{ label: 'Start workout', onPress: () => router.push('/workout/active' as any) }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
