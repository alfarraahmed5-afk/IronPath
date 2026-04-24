import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
  RefreshControl,
} from 'react-native';
import { api } from '../../src/lib/api';

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
  metric: 'total_volume' | 'workout_count' | 'exercise_volume' | 'exercise_1rm';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function medalFor(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface AvatarProps {
  name: string;
  size?: number;
}

function Avatar({ name, size = 36 }: AvatarProps) {
  const letters = initials(name);
  return (
    <View
      className="rounded-full bg-gray-700 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Text className="text-white font-bold" style={{ fontSize: size * 0.38 }}>
        {letters}
      </Text>
    </View>
  );
}

interface RankingsListProps {
  rankings: Ranking[];
  myRank: number | null;
  myValue: number | null;
  valueLabel?: (v: number) => string;
}

function RankingsList({ rankings, myRank, myValue, valueLabel }: RankingsListProps) {
  const label = valueLabel ?? ((v: number) => String(v));

  if (rankings.length === 0) {
    return (
      <View className="items-center py-12">
        <Text className="text-gray-500 text-base">No data yet</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* My rank banner */}
      {myRank !== null && (
        <View className="mx-4 mb-3 px-4 py-3 rounded-xl bg-orange-500/20 border border-orange-500 flex-row items-center justify-between">
          <Text className="text-orange-400 font-semibold text-sm">
            Your rank: #{myRank}
          </Text>
          {myValue !== null && (
            <Text className="text-orange-300 text-sm font-medium">
              {label(myValue)}
            </Text>
          )}
        </View>
      )}

      {rankings.map((item) => {
        const isMe = myRank !== null && item.rank === myRank;
        return (
          <View
            key={item.user_id}
            className={`mx-4 mb-2 px-4 py-3 rounded-xl flex-row items-center ${
              isMe ? 'bg-orange-500/10 border border-orange-500' : 'bg-gray-900'
            }`}
          >
            {/* Medal / rank */}
            <Text
              className={`w-10 text-center font-bold ${
                item.rank <= 3 ? 'text-lg' : 'text-gray-400 text-sm'
              }`}
            >
              {medalFor(item.rank)}
            </Text>

            {/* Avatar */}
            <View className="mr-3">
              <Avatar name={item.full_name || item.username} />
            </View>

            {/* Name */}
            <View className="flex-1">
              <Text className="text-white font-semibold text-sm" numberOfLines={1}>
                {item.full_name || item.username}
              </Text>
              <Text className="text-gray-500 text-xs" numberOfLines={1}>
                @{item.username}
              </Text>
            </View>

            {/* Value */}
            <Text className={`font-bold text-sm ${isMe ? 'text-orange-400' : 'text-white'}`}>
              {label(item.value)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Tab: Lifts ──────────────────────────────────────────────────────────────

function LiftsTab() {
  const [summaries, setSummaries] = useState<LiftSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Exercise detail modal state
  const [selectedExercise, setSelectedExercise] = useState<LiftSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<SnapshotResult | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<{ data: LiftSummary[] }>('/leaderboards/lifts');
      setSummaries(res.data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load lifts leaderboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const openExercise = async (summary: LiftSummary) => {
    setSelectedExercise(summary);
    setDetailData(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await api.get<{ data: SnapshotResult }>(
        `/leaderboards/lifts?exercise_id=${summary.exercise_id}`
      );
      setDetailData(res.data);
    } catch (e: any) {
      setDetailError(e?.message ?? 'Failed to load rankings');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedExercise(null);
    setDetailData(null);
    setDetailError(null);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#FF6B35" size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-red-400 text-center mb-4">{error}</Text>
        <TouchableOpacity onPress={load} className="px-6 py-2 rounded-full bg-orange-500">
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
      >
        <View className="pt-2 pb-8">
          {summaries.length === 0 && (
            <View className="items-center py-12">
              <Text className="text-gray-500">No lift leaderboards yet</Text>
            </View>
          )}
          {summaries.map((item) => (
            <TouchableOpacity
              key={item.exercise_id}
              onPress={() => openExercise(item)}
              activeOpacity={0.7}
              className="mx-4 mb-2 px-4 py-4 rounded-xl bg-gray-900 flex-row items-center"
            >
              <View className="flex-1">
                <Text className="text-white font-semibold text-base" numberOfLines={1}>
                  {item.exercise_name}
                </Text>
                {item.top_user ? (
                  <Text className="text-gray-400 text-sm mt-0.5">
                    🥇 {item.top_user.full_name || item.top_user.username} — {item.top_user.value} kg
                  </Text>
                ) : (
                  <Text className="text-gray-600 text-sm mt-0.5">No entries yet</Text>
                )}
              </View>
              <Text className="text-gray-500 text-lg">›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Exercise detail modal */}
      <Modal
        visible={selectedExercise !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView className="flex-1 bg-gray-950">
          {/* Header */}
          <View className="flex-row items-center px-4 py-4 border-b border-gray-800">
            <TouchableOpacity onPress={closeModal} className="mr-3 p-1">
              <Text className="text-orange-500 font-semibold text-base">Close</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-white font-bold text-lg" numberOfLines={1}>
              {selectedExercise?.exercise_name}
            </Text>
          </View>

          {/* Content */}
          <ScrollView className="flex-1 pt-4">
            {detailLoading && (
              <View className="items-center py-12">
                <ActivityIndicator color="#FF6B35" size="large" />
              </View>
            )}
            {detailError && (
              <View className="items-center py-12 px-8">
                <Text className="text-red-400 text-center">{detailError}</Text>
              </View>
            )}
            {detailData && (
              <View className="pb-8">
                <RankingsList
                  rankings={detailData.rankings}
                  myRank={detailData.my_rank}
                  myValue={detailData.my_value}
                  valueLabel={(v) => `${v} kg`}
                />
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ─── Tab: Volume / Workouts ───────────────────────────────────────────────────

interface PeriodTabProps {
  endpoint: 'volume' | 'workouts';
  valueLabel?: (v: number) => string;
}

const PERIODS: { label: string; value: Period }[] = [
  { label: 'This Week', value: 'weekly' },
  { label: 'This Month', value: 'monthly' },
  { label: 'All Time', value: 'all_time' },
];

function PeriodTab({ endpoint, valueLabel }: PeriodTabProps) {
  const [period, setPeriod] = useState<Period>('weekly');
  const [data, setData] = useState<SnapshotResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p: Period) => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.get<{ data: SnapshotResult }>(
        `/leaderboards/${endpoint}?period=${p}`
      );
      setData(res.data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load leaderboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [endpoint]);

  useEffect(() => { load(period); }, [load, period]);

  const onRefresh = () => { setRefreshing(true); load(period); };

  const changePeriod = (p: Period) => {
    if (p !== period) {
      setPeriod(p);
    }
  };

  return (
    <View className="flex-1">
      {/* Period selector */}
      <View className="flex-row px-4 pt-4 pb-3 gap-2">
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.value}
            onPress={() => changePeriod(p.value)}
            className={`flex-1 py-2 rounded-full items-center ${
              period === p.value ? 'bg-orange-500' : 'bg-gray-800'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                period === p.value ? 'text-white' : 'text-gray-400'
              }`}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Rankings */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FF6B35" size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-red-400 text-center mb-4">{error}</Text>
          <TouchableOpacity onPress={() => load(period)} className="px-6 py-2 rounded-full bg-orange-500">
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
        >
          <View className="pt-2 pb-8">
            <RankingsList
              rankings={data?.rankings ?? []}
              myRank={data?.my_rank ?? null}
              myValue={data?.my_value ?? null}
              valueLabel={valueLabel}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Tab: Streak ─────────────────────────────────────────────────────────────

function StreakTab() {
  const [data, setData] = useState<SnapshotResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<{ data: SnapshotResult }>('/leaderboards/streak');
      setData(res.data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load streak leaderboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#FF6B35" size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-red-400 text-center mb-4">{error}</Text>
        <TouchableOpacity onPress={load} className="px-6 py-2 rounded-full bg-orange-500">
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
    >
      <View className="pt-4 pb-8">
        <RankingsList
          rankings={data?.rankings ?? []}
          myRank={data?.my_rank ?? null}
          myValue={data?.my_value ?? null}
          valueLabel={(v) => `${v} days`}
        />
      </View>
    </ScrollView>
  );
}

// ─── Tab: Challenges ─────────────────────────────────────────────────────────

function statusStyle(status: Challenge['status']): { bg: string; text: string; label: string } {
  switch (status) {
    case 'active':
      return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'ACTIVE' };
    case 'upcoming':
      return { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'UPCOMING' };
    case 'completed':
      return { bg: 'bg-gray-700', text: 'text-gray-400', label: 'COMPLETED' };
  }
}

function ChallengesTab() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Challenge detail modal
  const [selected, setSelected] = useState<Challenge | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{
    challenge: Challenge;
    rankings: Ranking[];
    my_rank: number | null;
    my_value: number | null;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<{ data: Challenge[] }>('/leaderboards/challenges');
      setChallenges(res.data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load challenges');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const openChallenge = async (challenge: Challenge) => {
    setSelected(challenge);
    setDetailData(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await api.get<{
        data: { challenge: Challenge; rankings: Ranking[]; my_rank: number | null; my_value: number | null };
      }>(`/leaderboards/challenges/${challenge.id}`);
      setDetailData(res.data);
    } catch (e: any) {
      setDetailError(e?.message ?? 'Failed to load challenge rankings');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setDetailData(null);
    setDetailError(null);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#FF6B35" size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-red-400 text-center mb-4">{error}</Text>
        <TouchableOpacity onPress={load} className="px-6 py-2 rounded-full bg-orange-500">
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
      >
        <View className="pt-2 pb-8">
          {challenges.length === 0 && (
            <View className="items-center py-12">
              <Text className="text-gray-500">No challenges available</Text>
            </View>
          )}
          {challenges.map((challenge) => {
            const s = statusStyle(challenge.status);
            return (
              <TouchableOpacity
                key={challenge.id}
                onPress={() => openChallenge(challenge)}
                activeOpacity={0.7}
                className="mx-4 mb-3 px-4 py-4 rounded-xl bg-gray-900"
              >
                {/* Title row */}
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="flex-1 text-white font-semibold text-base mr-2" numberOfLines={1}>
                    {challenge.title}
                  </Text>
                  <View className={`px-2 py-0.5 rounded-full ${s.bg}`}>
                    <Text className={`text-xs font-bold ${s.text}`}>{s.label}</Text>
                  </View>
                </View>

                {/* Description */}
                {challenge.description ? (
                  <Text className="text-gray-400 text-sm mb-2" numberOfLines={2}>
                    {challenge.description}
                  </Text>
                ) : null}

                {/* Dates */}
                <Text className="text-gray-600 text-xs">
                  {formatDate(challenge.starts_at)} – {formatDate(challenge.ends_at)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Challenge detail modal */}
      <Modal
        visible={selected !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView className="flex-1 bg-gray-950">
          {/* Header */}
          <View className="flex-row items-center px-4 py-4 border-b border-gray-800">
            <TouchableOpacity onPress={closeModal} className="mr-3 p-1">
              <Text className="text-orange-500 font-semibold text-base">Close</Text>
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg" numberOfLines={1}>
                {selected?.title}
              </Text>
              {selected && (
                <View className="flex-row items-center mt-0.5">
                  <View className={`px-2 py-0.5 rounded-full ${statusStyle(selected.status).bg}`}>
                    <Text className={`text-xs font-bold ${statusStyle(selected.status).text}`}>
                      {statusStyle(selected.status).label}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          {detailData?.challenge.description ? (
            <View className="px-4 py-3 border-b border-gray-800">
              <Text className="text-gray-400 text-sm">{detailData.challenge.description}</Text>
            </View>
          ) : null}

          {/* Rankings */}
          <ScrollView className="flex-1 pt-4">
            {detailLoading && (
              <View className="items-center py-12">
                <ActivityIndicator color="#FF6B35" size="large" />
              </View>
            )}
            {detailError && (
              <View className="items-center py-12 px-8">
                <Text className="text-red-400 text-center">{detailError}</Text>
              </View>
            )}
            {detailData && (
              <View className="pb-8">
                <RankingsList
                  rankings={detailData.rankings}
                  myRank={detailData.my_rank}
                  myValue={detailData.my_value}
                />
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ─── Root Screen ─────────────────────────────────────────────────────────────

const TABS: TabKey[] = ['Lifts', 'Volume', 'Workouts', 'Streak', 'Challenges'];

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('Lifts');

  const renderTab = () => {
    switch (activeTab) {
      case 'Lifts':
        return <LiftsTab />;
      case 'Volume':
        return (
          <PeriodTab
            endpoint="volume"
            valueLabel={(v) => `${(v / 1000).toFixed(1)}k kg`}
          />
        );
      case 'Workouts':
        return (
          <PeriodTab
            endpoint="workouts"
            valueLabel={(v) => `${v} sessions`}
          />
        );
      case 'Streak':
        return <StreakTab />;
      case 'Challenges':
        return <ChallengesTab />;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      {/* Screen header */}
      <View className="px-4 pt-2 pb-4 border-b border-gray-800">
        <Text className="text-white text-2xl font-bold">🏆 Leaderboard</Text>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-none"
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 8 }}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full ${
              activeTab === tab ? 'bg-orange-500' : 'bg-gray-800'
            }`}
          >
            <Text
              className={`font-semibold text-sm ${
                activeTab === tab ? 'text-white' : 'text-gray-400'
              }`}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab content */}
      <View className="flex-1">{renderTab()}</View>
    </SafeAreaView>
  );
}
