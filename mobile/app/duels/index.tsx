import { useEffect, useState, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Swords, Trophy } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/authStore';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Pressable } from '../../src/components/Pressable';
import { Icon } from '../../src/components/Icon';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface Duel {
  id: string;
  challenger_id: string;
  opponent_id: string;
  exercise_id: string;
  metric: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'expired';
  winner_id: string | null;
  ends_at: string;
  resolved_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: colors.warning,
  accepted: colors.info,
  completed: colors.success,
  declined: colors.textTertiary,
  expired: colors.textTertiary,
};

const METRIC_LABEL: Record<string, string> = {
  heaviest_weight: 'Max Weight',
  most_reps: 'Max Reps',
  best_volume_set: 'Top Set Volume',
  projected_1rm: 'Est. 1RM',
};

export default function DuelsListScreen() {
  const router = useRouter();
  const myId = useAuthStore(s => s.user?.id);
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<{ data: { duels: Duel[] } }>('/duels');
      setDuels(r.data?.duels ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="My Duels" back />

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.brand} size="large" /></View>
      ) : (
        <FlatList
          data={duels}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const won = item.status === 'completed' && item.winner_id === myId;
            const lost = item.status === 'completed' && item.winner_id && item.winner_id !== myId;
            return (
              <Pressable
                onPress={() => router.push(`/duels/${item.id}` as any)}
                style={styles.row}
                accessibilityLabel={`Duel ${item.status}`}
              >
                <Surface level={2} style={styles.card}>
                  <View style={styles.iconWrap}>
                    {won
                      ? <Icon icon={Trophy} size={18} color="#FFD700" />
                      : <Icon icon={Swords} size={18} color={lost ? colors.textTertiary : colors.brand} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyEmphasis" color="textPrimary">
                      {METRIC_LABEL[item.metric] ?? item.metric}
                    </Text>
                    <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                      Ends {new Date(item.ends_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { borderColor: STATUS_COLORS[item.status] }]}>
                    <Text variant="overline" style={{ color: STATUS_COLORS[item.status] }}>
                      {won ? 'WON' : lost ? 'LOST' : item.status.toUpperCase()}
                    </Text>
                  </View>
                </Surface>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <EmptyState
              illustration="exercises"
              title="No duels yet"
              description="Pin an exercise on your profile to invite challenges, or visit someone else's profile to challenge them."
            />
          }
          contentContainerStyle={duels.length === 0 ? { flex: 1 } : { padding: spacing.base }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {},
  card: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.base, gap: spacing.md,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: radii.full,
    backgroundColor: colors.surface3,
    alignItems: 'center', justifyContent: 'center',
  },
  statusPill: {
    borderWidth: 1, borderRadius: radii.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
});
