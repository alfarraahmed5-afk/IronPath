/**
 * Challenges feature -- absorbed from legacy (tabs)/leaderboard.tsx
 * during the Option B IA restructure. Now lives inside the Community
 * tab as its own sub-tab.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { Text } from '../../components/Text';
import { Surface } from '../../components/Surface';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { colors, spacing, radii } from '../../theme/tokens';

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  metric: string;
  starts_at: string;
  ends_at: string;
  status: 'active' | 'upcoming' | 'completed';
}

const STATUS_COLORS: Record<Challenge['status'], string> = {
  active: colors.success,
  upcoming: colors.info,
  completed: colors.textDisabled,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Challenges() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: Challenge[] }>('/leaderboards/challenges');
      setChallenges(res.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.brand}
        />
      }
      contentContainerStyle={styles.listPad}
    >
      <View style={{ marginBottom: spacing.base }}>
        <Button
          label="+ Create Challenge"
          onPress={() => router.push('/challenges/create' as any)}
          variant="secondary"
          size="md"
          fullWidth
        />
      </View>

      {challenges.length === 0 ? (
        <EmptyState
          illustration="notifications"
          title="No challenges yet."
          description="Create one and invite the gym to compete."
        />
      ) : (
        challenges.map((challenge) => (
          <TouchableOpacity
            key={challenge.id}
            onPress={() => router.push(`/challenges/${challenge.id}` as any)}
            activeOpacity={0.8}
          >
            <Surface level={2} style={styles.challengeCard}>
              <View style={styles.challengeTop}>
                <Text
                  variant="bodyEmphasis"
                  color="textPrimary"
                  numberOfLines={1}
                  style={{ flex: 1, marginRight: spacing.sm }}
                >
                  {challenge.title}
                </Text>
                <View style={[styles.statusPill, { borderColor: STATUS_COLORS[challenge.status] }]}>
                  <Text variant="overline" style={{ color: STATUS_COLORS[challenge.status] }}>
                    {challenge.status}
                  </Text>
                </View>
              </View>
              {challenge.description ? (
                <Text
                  variant="body"
                  color="textSecondary"
                  numberOfLines={2}
                  style={{ marginTop: spacing.xs }}
                >
                  {challenge.description}
                </Text>
              ) : null}
              <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.sm }}>
                {formatDate(challenge.starts_at)} - {formatDate(challenge.ends_at)}
              </Text>
            </Surface>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listPad: { paddingHorizontal: spacing.base, paddingBottom: spacing['2xl'] },
  challengeCard: {
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  challengeTop: { flexDirection: 'row', alignItems: 'center' },
  statusPill: {
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
