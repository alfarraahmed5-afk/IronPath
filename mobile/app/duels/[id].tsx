import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Swords, Trophy, Clock } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/authStore';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { EmptyState } from '../../src/components/EmptyState';
import { haptic } from '../../src/lib/haptics';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface Duel {
  id: string;
  challenger_id: string;
  opponent_id: string;
  exercise_id: string;
  metric: 'heaviest_weight' | 'most_reps' | 'best_volume_set' | 'projected_1rm';
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'expired';
  winner_id: string | null;
  starts_at: string;
  ends_at: string;
  challenger_value: number | null;
  opponent_value: number | null;
  live_challenger_value?: number;
  live_opponent_value?: number;
}

interface PartialUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface ExerciseLite {
  id: string;
  name: string;
}

const METRIC_LABEL: Record<string, string> = {
  heaviest_weight: 'Heaviest Weight',
  most_reps: 'Most Reps',
  best_volume_set: 'Top Set Volume',
  projected_1rm: 'Estimated 1RM',
};

function formatValue(metric: string, v: number | null | undefined): string {
  if (v == null) return '—';
  if (metric.includes('reps')) return `${Math.round(v)}`;
  return `${Math.round(v * 10) / 10} kg`;
}

export default function DuelDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const myId = useAuthStore(s => s.user?.id);

  const [duel, setDuel] = useState<Duel | null>(null);
  const [challenger, setChallenger] = useState<PartialUser | null>(null);
  const [opponent, setOpponent] = useState<PartialUser | null>(null);
  const [exercise, setExercise] = useState<ExerciseLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await api.get<{ data: { duel: Duel } }>(`/duels/${id}`);
      const d = r.data?.duel;
      if (!d) throw new Error('Not found');
      setDuel(d);
      // Fetch users + exercise in parallel
      const [chRes, opRes, exRes] = await Promise.allSettled([
        api.get<{ data: PartialUser }>(`/users/${d.challenger_id}`),
        api.get<{ data: PartialUser }>(`/users/${d.opponent_id}`),
        api.get<{ data: { exercises: ExerciseLite[] } }>(`/exercises/by-ids?ids=${d.exercise_id}`),
      ]);
      if (chRes.status === 'fulfilled') setChallenger((chRes.value as any).data);
      if (opRes.status === 'fulfilled') setOpponent((opRes.value as any).data);
      if (exRes.status === 'fulfilled') setExercise((exRes.value as any).data?.exercises?.[0] ?? null);
    } catch {
      // remain null → 404 view below
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/duels' as any);
  }

  async function handleAccept() {
    if (!duel) return;
    setActing(true);
    try {
      await api.post(`/duels/${duel.id}/accept`);
      haptic.success();
      load();
    } catch (e: any) {
      Alert.alert('Could not accept', e?.error?.message ?? 'Try again.');
    } finally { setActing(false); }
  }

  async function handleDecline() {
    if (!duel) return;
    setActing(true);
    try {
      await api.post(`/duels/${duel.id}/decline`);
      haptic.warning();
      goBack();
    } catch (e: any) {
      Alert.alert('Could not decline', e?.error?.message ?? 'Try again.');
    } finally { setActing(false); }
  }

  async function handleResolve() {
    if (!duel) return;
    setActing(true);
    try {
      await api.post(`/duels/${duel.id}/resolve`);
      haptic.success();
      load();
    } catch (e: any) {
      Alert.alert('Cannot resolve yet', e?.error?.message ?? 'Try again.');
    } finally { setActing(false); }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <Header title="Duel" back onBack={goBack} />
        <View style={styles.centered}><ActivityIndicator color={colors.brand} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!duel) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <Header title="Duel" back onBack={goBack} />
        <View style={styles.centered}>
          <EmptyState illustration="404" title="Duel not found" action={{ label: 'Go back', onPress: goBack }} />
        </View>
      </SafeAreaView>
    );
  }

  const meIsChallenger = duel.challenger_id === myId;
  const meIsOpponent = duel.opponent_id === myId;
  const myVal = meIsChallenger ? duel.live_challenger_value : duel.live_opponent_value;
  const oppVal = meIsChallenger ? duel.live_opponent_value : duel.live_challenger_value;
  const meWon = duel.status === 'completed' && duel.winner_id === myId;
  const meLost = duel.status === 'completed' && duel.winner_id && duel.winner_id !== myId;
  const tied = duel.status === 'completed' && !duel.winner_id;
  const endsInMs = new Date(duel.ends_at).getTime() - Date.now();
  const canResolve = duel.status === 'accepted' && endsInMs <= 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="Duel" back onBack={goBack} />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <Surface level={2} style={styles.heroCard}>
          <View style={styles.heroIcon}><Icon icon={Swords} size={24} color={colors.brand} /></View>
          <Text variant="title3" color="textPrimary" style={{ marginTop: spacing.md }}>
            {exercise?.name ?? 'Exercise'}
          </Text>
          <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xxs }}>
            {METRIC_LABEL[duel.metric] ?? duel.metric}
          </Text>
        </Surface>

        {/* Versus */}
        <View style={styles.versusRow}>
          <View style={styles.versusSide}>
            <Avatar username={challenger?.username ?? '?'} avatarUrl={challenger?.avatar_url ?? null} size={56} />
            <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1} style={{ marginTop: spacing.sm }}>
              {challenger?.username ?? '—'}
            </Text>
            <Text variant="numeric" color="brand" style={{ fontSize: 22, lineHeight: 26, marginTop: spacing.xs }}>
              {formatValue(duel.metric, duel.live_challenger_value ?? duel.challenger_value)}
            </Text>
            {duel.winner_id === duel.challenger_id && (
              <View style={styles.crownBadge}>
                <Icon icon={Trophy} size={12} color="#FFD700" />
                <Text variant="overline" style={{ color: '#FFD700', marginLeft: spacing.xxs }}>WINNER</Text>
              </View>
            )}
          </View>

          <View style={styles.versusDivider}>
            <Text variant="display3" color="textTertiary">vs</Text>
          </View>

          <View style={styles.versusSide}>
            <Avatar username={opponent?.username ?? '?'} avatarUrl={opponent?.avatar_url ?? null} size={56} />
            <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1} style={{ marginTop: spacing.sm }}>
              {opponent?.username ?? '—'}
            </Text>
            <Text variant="numeric" color="brand" style={{ fontSize: 22, lineHeight: 26, marginTop: spacing.xs }}>
              {formatValue(duel.metric, duel.live_opponent_value ?? duel.opponent_value)}
            </Text>
            {duel.winner_id === duel.opponent_id && (
              <View style={styles.crownBadge}>
                <Icon icon={Trophy} size={12} color="#FFD700" />
                <Text variant="overline" style={{ color: '#FFD700', marginLeft: spacing.xxs }}>WINNER</Text>
              </View>
            )}
          </View>
        </View>

        {/* Status banner */}
        <Surface level={2} style={styles.statusCard}>
          <Icon icon={Clock} size={16} color={colors.textTertiary} />
          <Text variant="caption" color="textSecondary" style={{ marginLeft: spacing.sm, flex: 1 }}>
            {duel.status === 'pending' && (meIsOpponent ? 'They challenged you. Accept or decline.' : 'Waiting for opponent to accept.')}
            {duel.status === 'accepted' && (canResolve ? 'Time is up. Anyone can resolve.' : `Ends ${new Date(duel.ends_at).toLocaleString()}`)}
            {duel.status === 'completed' && (meWon ? 'You won!' : meLost ? 'You lost — get them next time.' : tied ? 'Tied' : 'Completed')}
            {duel.status === 'declined' && 'Duel declined.'}
            {duel.status === 'expired' && 'Duel expired without resolution.'}
          </Text>
        </Surface>

        {/* My standing */}
        {(meIsChallenger || meIsOpponent) && duel.status === 'accepted' && (
          <Surface level={3} style={styles.myCard}>
            <Text variant="overline" color="brand">Your value (live)</Text>
            <Text variant="numeric" color="textPrimary" style={{ fontSize: 28, lineHeight: 32 }}>
              {formatValue(duel.metric, myVal)}
            </Text>
            <Text variant="caption" color="textTertiary">
              {(myVal ?? 0) > (oppVal ?? 0) ? 'You are ahead.' : (myVal ?? 0) < (oppVal ?? 0) ? 'You are behind.' : 'Tied.'}
            </Text>
          </Surface>
        )}
      </ScrollView>

      {/* Actions */}
      {meIsOpponent && duel.status === 'pending' && (
        <View style={styles.footerRow}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Button label="Decline" onPress={handleDecline} variant="destructive" size="lg" fullWidth loading={acting} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Accept" onPress={handleAccept} variant="primary" size="lg" fullWidth loading={acting} />
          </View>
        </View>
      )}
      {canResolve && (meIsChallenger || meIsOpponent) && (
        <View style={styles.footer}>
          <Button label="Resolve Duel" onPress={handleResolve} variant="primary" size="lg" fullWidth loading={acting} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: { margin: spacing.base, padding: spacing.lg, alignItems: 'center' },
  heroIcon: {
    width: 56, height: 56, borderRadius: radii.full,
    backgroundColor: colors.brandGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  versusRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  versusSide: { flex: 1, alignItems: 'center' },
  versusDivider: { paddingHorizontal: spacing.md },
  crownBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFD70020',
    borderColor: '#FFD700',
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    marginTop: spacing.sm,
  },
  statusCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.base,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  myCard: {
    margin: spacing.base, padding: spacing.base,
    borderColor: colors.brand, borderWidth: 1.5,
    alignItems: 'center', gap: spacing.xs,
  },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing['2xl'],
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  footerRow: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing['2xl'],
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
