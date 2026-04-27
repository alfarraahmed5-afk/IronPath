import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Crown, ChevronRight } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Avatar } from '../../src/components/Avatar';
import { EmptyState } from '../../src/components/EmptyState';
import { Button } from '../../src/components/Button';
import { colors, spacing, radii } from '../../src/theme/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ranking {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  value: number;
  rank: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  metric: string;
  starts_at: string;
  ends_at: string;
  status: 'active' | 'upcoming' | 'completed';
}

interface SnapshotResult {
  rankings: Ranking[];
  my_rank: number | null;
  my_value: number | null;
  generated_at: string | null;
}

interface LiftSummary {
  exercise_id: string;
  exercise_name: string;
  top_user: Ranking | null;
  generated_at: string;
}

type TabKey = 'Lifts' | 'Volume' | 'Workouts' | 'Streak' | 'Challenges';
type Period = 'weekly' | 'monthly' | 'all_time';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function rankColor(rank: number): string {
  if (rank === 1) return '#FFD700';
  if (rank === 2) return '#C0C0C0';
  if (rank === 3) return '#CD7F32';
  return colors.textTertiary;
}

// ─── RankingsList ─────────────────────────────────────────────────────────────

function RankingsList({
  rankings,
  myRank,
  myValue,
  valueLabel,
}: {
  rankings: Ranking[];
  myRank: number | null;
  myValue: number | null;
  valueLabel?: (v: number) => string;
}) {
  const label = valueLabel ?? ((v: number) => String(v));

  if (rankings.length === 0) {
    return (
      <EmptyState
        illustration="exercises"
        title="Climb the board"
        description="Log a workout to put yourself on the leaderboard."
      />
    );
  }

  return (
    <View style={styles.rankList}>
      {myRank !== null && (
        <Surface level={3} style={[styles.myRankBanner, { borderColor: colors.brand }]}>
          <Text variant="label" color="brand">Your rank: #{myRank}</Text>
          {myValue !== null && <Text variant="label" color="brand">{label(myValue)}</Text>}
        </Surface>
      )}

      {rankings.map(item => {
        const isMe = myRank !== null && item.rank === myRank;
        return (
          <Surface
            key={item.user_id}
            level={isMe ? 3 : 2}
            style={[styles.rankRow, isMe ? { borderColor: colors.brand, borderWidth: 1 } : undefined]}
          >
            {item.rank <= 3 ? (
              <Crown size={16} color={rankColor(item.rank)} strokeWidth={2} />
            ) : (
              <Text variant="label" color="textTertiary" style={{ width: 32, textAlign: 'center' }}>
                #{item.rank}
              </Text>
            )}

            <Avatar username={item.username} avatarUrl={item.avatar_url} size={40} />

            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1}>
                {item.full_name || item.username}
              </Text>
              <Text variant="caption" color="textTertiary">@{item.username}</Text>
            </View>

            <Text variant="bodyEmphasis" color={isMe ? 'brand' : 'textPrimary'}>{label(item.value)}</Text>
          </Surface>
        );
      })}
    </View>
  );
}

// ─── LiftsTab ─────────────────────────────────────────────────────────────────

function LiftsTab() {
  const [summaries, setSummaries] = useState<LiftSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<LiftSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<SnapshotResult | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: LiftSummary[] }>('/leaderboards/lifts');
      setSummaries(res.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openExercise = async (summary: LiftSummary) => {
    setSelectedExercise(summary);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res = await api.get<{ data: SnapshotResult }>(`/leaderboards/lifts?exercise_id=${summary.exercise_id}`);
      setDetailData(res.data);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.brand} size="large" /></View>;

  return (
    <>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
        contentContainerStyle={styles.listPad}
      >
        {summaries.length === 0 ? (
          <EmptyState illustration="exercises" title="No lift leaderboards yet" />
        ) : summaries.map(item => (
          <TouchableOpacity key={item.exercise_id} onPress={() => openExercise(item)} activeOpacity={0.8}>
            <Surface level={2} style={styles.liftRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1}>{item.exercise_name}</Text>
                {item.top_user ? (
                  <Text variant="caption" color="textTertiary">
                    {item.top_user.full_name || item.top_user.username} — {item.top_user.value} kg
                  </Text>
                ) : (
                  <Text variant="caption" color="textDisabled">No entries yet</Text>
                )}
              </View>
              <ChevronRight size={16} color={colors.textTertiary} />
            </Surface>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={selectedExercise !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedExercise(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedExercise(null)}>
              <Text variant="label" color="brand">Close</Text>
            </TouchableOpacity>
            <Text variant="title3" color="textPrimary" numberOfLines={1} style={{ flex: 1, marginLeft: spacing.md }}>
              {selectedExercise?.exercise_name}
            </Text>
          </View>
          <ScrollView contentContainerStyle={styles.listPad}>
            {detailLoading ? <ActivityIndicator color={colors.brand} style={{ marginTop: spacing['3xl'] }} /> : null}
            {detailData ? <RankingsList rankings={detailData.rankings} myRank={detailData.my_rank} myValue={detailData.my_value} valueLabel={v => `${v} kg`} /> : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ─── PeriodTab ────────────────────────────────────────────────────────────────

const PERIODS: { label: string; value: Period }[] = [
  { label: 'This Week', value: 'weekly' },
  { label: 'This Month', value: 'monthly' },
  { label: 'All Time', value: 'all_time' },
];

function PeriodTab({ endpoint, valueLabel }: { endpoint: 'volume' | 'workouts' | 'streak'; valueLabel?: (v: number) => string }) {
  const [period, setPeriod] = useState<Period>('weekly');
  const [data, setData] = useState<SnapshotResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await api.get<{ data: SnapshotResult }>(`/leaderboards/${endpoint}?period=${p}`);
      setData(res.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [endpoint]);

  useEffect(() => { load(period); }, [load, period]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.value}
            onPress={() => { if (p.value !== period) setPeriod(p.value); }}
            style={[styles.periodPill, { backgroundColor: period === p.value ? colors.brand : colors.surface2 }]}
          >
            <Text variant="label" color={period === p.value ? 'textOnBrand' : 'textSecondary'}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.brand} size="large" /></View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(period); }} tintColor={colors.brand} />}
          contentContainerStyle={styles.listPad}
        >
          <RankingsList rankings={data?.rankings ?? []} myRank={data?.my_rank ?? null} myValue={data?.my_value ?? null} valueLabel={valueLabel} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── ChallengesTab ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<Challenge['status'], string> = {
  active: colors.success,
  upcoming: colors.info,
  completed: colors.textDisabled,
};

function ChallengesTab() {
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

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.brand} size="large" /></View>;

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
      contentContainerStyle={styles.listPad}
    >
      {/* Create challenge CTA */}
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
          title="No challenges yet"
          description="Create one and invite the gym to compete."
        />
      ) : challenges.map(challenge => (
        <TouchableOpacity
          key={challenge.id}
          onPress={() => router.push(`/challenges/${challenge.id}` as any)}
          activeOpacity={0.8}
        >
          <Surface level={2} style={styles.challengeCard}>
            <View style={styles.challengeTop}>
              <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1} style={{ flex: 1, marginRight: spacing.sm }}>
                {challenge.title}
              </Text>
              <View style={[styles.statusPill, { borderColor: STATUS_COLORS[challenge.status] }]}>
                <Text variant="overline" style={{ color: STATUS_COLORS[challenge.status] }}>{challenge.status}</Text>
              </View>
            </View>
            {challenge.description ? (
              <Text variant="body" color="textSecondary" numberOfLines={2} style={{ marginTop: spacing.xs }}>
                {challenge.description}
              </Text>
            ) : null}
            <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.sm }}>
              {formatDate(challenge.starts_at)} – {formatDate(challenge.ends_at)}
            </Text>
          </Surface>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Root Screen ─────────────────────────────────────────────────────────────

const TABS: TabKey[] = ['Lifts', 'Volume', 'Workouts', 'Streak', 'Challenges'];

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('Lifts');

  function renderTab() {
    switch (activeTab) {
      case 'Lifts':    return <LiftsTab />;
      case 'Volume':   return <PeriodTab endpoint="volume" valueLabel={v => `${(v / 1000).toFixed(1)}k kg`} />;
      case 'Workouts': return <PeriodTab endpoint="workouts" valueLabel={v => `${v} sessions`} />;
      case 'Streak':   return <PeriodTab endpoint="streak" valueLabel={v => `${v} days`} />;
      case 'Challenges': return <ChallengesTab />;
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <Text variant="title2" color="textPrimary">Leaderboard</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollWrap}
        contentContainerStyle={styles.tabScroll}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabPill, { backgroundColor: activeTab === tab ? colors.brand : colors.surface2 }]}
          >
            <Text variant="label" color={activeTab === tab ? 'textOnBrand' : 'textSecondary'}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ flex: 1 }}>{renderTab()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tabScrollWrap: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabScroll: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  tabPill: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    alignSelf: 'center',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listPad: { paddingHorizontal: spacing.base, paddingBottom: spacing['2xl'] },
  rankList: { gap: spacing.sm, paddingTop: spacing.sm },
  myRankBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  liftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  periodPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
