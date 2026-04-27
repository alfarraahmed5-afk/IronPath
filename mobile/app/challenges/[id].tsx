import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trophy, Users, Calendar } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Icon } from '../../src/components/Icon';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { haptic } from '../../src/lib/haptics';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  metric: 'total_volume' | 'workout_count' | 'exercise_volume';
  starts_at: string;
  ends_at: string;
  status: 'active' | 'upcoming' | 'completed';
  created_by_user_id: string | null;
}

interface Ranking {
  user_id: string;
  username: string;
  full_name?: string;
  avatar_url: string | null;
  value: number;
  rank: number;
}

interface DetailResponse {
  challenge: Challenge;
  rankings: Ranking[];
  my_rank: number | null;
  my_value: number | null;
  is_enrolled: boolean;
  participant_count: number;
}

const METRIC_LABEL: Record<Challenge['metric'], string> = {
  total_volume: 'Total Volume',
  workout_count: 'Workouts',
  exercise_volume: 'Exercise Volume',
};

function formatValue(metric: Challenge['metric'], value: number): string {
  if (metric === 'total_volume' || metric === 'exercise_volume') {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k kg` : `${Math.round(value)} kg`;
  }
  return String(Math.round(value));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ChallengeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get<{ data: DetailResponse }>(`/leaderboards/challenges/${id}`);
      setData(res.data);
    } catch (e: any) {
      setErrorMsg(e?.error?.message ?? 'Could not load challenge');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleEnroll() {
    if (!data || enrolling) return;
    setEnrolling(true);
    try {
      if (data.is_enrolled) {
        const res = await api.delete<{ data: { is_enrolled: boolean; participant_count: number } }>(
          `/leaderboards/challenges/${data.challenge.id}/leave`
        );
        setData(prev => prev ? { ...prev, is_enrolled: false, participant_count: res.data.participant_count } : prev);
      } else {
        const res = await api.post<{ data: { is_enrolled: boolean; participant_count: number } }>(
          `/leaderboards/challenges/${data.challenge.id}/join`
        );
        setData(prev => prev ? { ...prev, is_enrolled: true, participant_count: res.data.participant_count } : prev);
        haptic.success();
      }
    } catch {
      // Silently fail; user can retry
    } finally {
      setEnrolling(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/leaderboard');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <Header title="Challenge" back onBack={goBack} />
        <View style={styles.centered}><ActivityIndicator color={colors.brand} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <Header title="Challenge" back onBack={goBack} />
        <View style={styles.centered}>
          <EmptyState
            illustration="404"
            title={errorMsg ?? 'Challenge not found'}
            action={{ label: 'Go back', onPress: goBack }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { challenge, rankings, my_rank, my_value, is_enrolled, participant_count } = data;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title={challenge.title} back onBack={goBack} />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero card */}
        <Surface level={2} style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconWrap}>
              <Icon icon={Trophy} size={24} color={colors.brand} />
            </View>
            <View style={[styles.statusPill, { borderColor: challenge.status === 'active' ? colors.success : colors.info }]}>
              <Text variant="overline" style={{ color: challenge.status === 'active' ? colors.success : colors.info }}>
                {challenge.status}
              </Text>
            </View>
          </View>

          {challenge.description ? (
            <Text variant="body" color="textSecondary" style={{ marginTop: spacing.md }}>
              {challenge.description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon icon={Calendar} size={14} color={colors.textTertiary} />
              <Text variant="caption" color="textSecondary">{formatDate(challenge.starts_at)} – {formatDate(challenge.ends_at)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon icon={Users} size={14} color={colors.textTertiary} />
              <Text variant="caption" color="textSecondary">{participant_count} joined</Text>
            </View>
          </View>

          <View style={styles.metricChip}>
            <Text variant="overline" color="brand">{METRIC_LABEL[challenge.metric]}</Text>
          </View>
        </Surface>

        {/* My standing */}
        {is_enrolled && my_rank !== null && (
          <Surface level={3} style={[styles.myCard, { borderColor: colors.brand }]}>
            <Text variant="overline" color="brand">Your standing</Text>
            <View style={styles.myCardRow}>
              <Text variant="display3" color="textPrimary">#{my_rank}</Text>
              <Text variant="numeric" color="textSecondary">{formatValue(challenge.metric, my_value ?? 0)}</Text>
            </View>
          </Surface>
        )}

        {/* Rankings */}
        <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>Leaderboard</Text>
        {rankings.length === 0 ? (
          <View style={styles.emptyRankings}>
            <Text variant="body" color="textTertiary">No activity yet. Be the first.</Text>
          </View>
        ) : (
          rankings.slice(0, 50).map(r => (
            <Surface key={r.user_id} level={2} style={styles.rankRow}>
              <Text variant="bodyEmphasis" color={r.rank <= 3 ? 'brand' : 'textTertiary'} style={styles.rankNum}>
                {r.rank}
              </Text>
              <Avatar username={r.username} avatarUrl={r.avatar_url} size={32} />
              <Text variant="body" color="textPrimary" numberOfLines={1} style={{ flex: 1, marginLeft: spacing.sm }}>
                {r.full_name || r.username}
              </Text>
              <Text variant="numeric" color="textPrimary" style={{ fontSize: 16, lineHeight: 20 }}>
                {formatValue(challenge.metric, r.value)}
              </Text>
            </Surface>
          ))
        )}
      </ScrollView>

      {/* Sticky bottom action */}
      <View style={styles.footer}>
        <Button
          label={is_enrolled ? 'Leave Challenge' : 'Join Challenge'}
          onPress={handleEnroll}
          variant={is_enrolled ? 'destructive' : 'primary'}
          size="lg"
          fullWidth
          loading={enrolling}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: { margin: spacing.base, padding: spacing.base },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIconWrap: {
    width: 48, height: 48, borderRadius: radii.full,
    backgroundColor: colors.brandGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  statusPill: {
    borderWidth: 1, borderRadius: radii.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metricChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandGlow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    marginTop: spacing.md,
  },
  myCard: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    padding: spacing.base,
    borderWidth: 1.5,
  },
  myCardRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.xs },
  sectionLabel: { paddingHorizontal: spacing.base, marginTop: spacing.sm, marginBottom: spacing.sm },
  emptyRankings: { padding: spacing.xl, alignItems: 'center' },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rankNum: { width: 32 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
