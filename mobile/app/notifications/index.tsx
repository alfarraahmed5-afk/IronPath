import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Heart, MessageCircle, UserPlus, Trophy, Flame, Bell, BarChart2, Swords } from 'lucide-react-native';
import { LucideIcon } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Header } from '../../src/components/Header';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'follow_request' | 'follow_request_approved' | 'pr' | 'streak_broken' | 'challenge_started' | 'challenge_ended' | 'monthly_report' | 'yearly_report' | 'duel_invite' | 'duel_accepted' | 'duel_won' | 'duel_lost' | 'mention';
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

// Deep-link a notification's data payload to its target screen.
function routeForNotification(n: Notification) {
  const d = (n.data ?? {}) as Record<string, any>;
  switch (n.type) {
    case 'like':
    case 'comment':
    case 'pr':
    case 'mention':
      if (d.workout_id) return `/workouts/${d.workout_id}`;
      break;
    case 'follow':
    case 'follow_request':
    case 'follow_request_approved':
      if (d.actor_user_id) return `/users/${d.actor_user_id}`;
      break;
    case 'challenge_started':
    case 'challenge_ended':
      if (d.challenge_id) return `/challenges/${d.challenge_id}`;
      break;
    case 'duel_invite':
    case 'duel_accepted':
    case 'duel_won':
    case 'duel_lost':
      if (d.duel_id) return `/duels/${d.duel_id}`;
      break;
  }
  return null;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const NOTIF_CONFIG: Record<string, { icon: LucideIcon; color: string }> = {
  like:                    { icon: Heart,          color: colors.danger },
  comment:                 { icon: MessageCircle,  color: colors.info },
  mention:                 { icon: MessageCircle,  color: colors.brand },
  follow:                  { icon: UserPlus,       color: colors.success },
  follow_request:          { icon: UserPlus,       color: colors.info },
  follow_request_approved: { icon: UserPlus,       color: colors.success },
  pr:                      { icon: Trophy,         color: '#F59E0B' },
  streak_broken:           { icon: Flame,          color: colors.brand },
  challenge_started:       { icon: Trophy,         color: colors.info },
  challenge_ended:         { icon: Trophy,         color: colors.textTertiary },
  monthly_report:          { icon: BarChart2,      color: colors.info },
  yearly_report:           { icon: BarChart2,      color: colors.brand },
  duel_invite:             { icon: Swords,         color: colors.brand },
  duel_accepted:           { icon: Swords,         color: colors.info },
  duel_won:                { icon: Trophy,         color: '#FFD700' },
  duel_lost:               { icon: Swords,         color: colors.textTertiary },
};

function NotificationRow({ item, onPress }: { item: Notification; onPress: (item: Notification) => void }) {
  const config = NOTIF_CONFIG[item.type] ?? { icon: Bell, color: colors.textTertiary };
  const IconComp = config.icon;

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.8}
      style={[styles.row, { backgroundColor: item.is_read ? colors.bg : colors.surface2 }]}
    >
      {!item.is_read && <View style={styles.unreadBar} />}

      <View style={[styles.iconCircle, { backgroundColor: config.color + '20' }]}>
        <IconComp size={18} color={config.color} strokeWidth={2} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={2} style={{ flex: 1, marginRight: spacing.sm }}>
            {item.title}
          </Text>
          <Text variant="caption" color="textTertiary">{formatRelative(item.created_at)}</Text>
        </View>
        {item.body ? (
          <Text variant="body" color="textSecondary" numberOfLines={2} style={{ marginTop: 2 }}>
            {item.body}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async (cursor?: string) => {
    try {
      const url = cursor ? `/notifications?cursor=${encodeURIComponent(cursor)}` : '/notifications';
      const res = await api.get<{ data: { notifications: Notification[]; next_cursor: string | null } }>(url);
      const { notifications: items, next_cursor } = res.data;
      setNotifications(prev => cursor ? [...prev, ...items] : items);
      setNextCursor(next_cursor);
    } catch {}
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await fetchNotifications(nextCursor);
    setLoadingMore(false);
  }, [nextCursor, loadingMore, fetchNotifications]);

  const handleNotificationPress = useCallback(async (n: Notification) => {
    // Optimistic mark-as-read
    if (!n.is_read) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      api.patch(`/notifications/${n.id}/read`).catch(() => {
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: false } : x));
      });
    }
    // Deep-link to the relevant screen
    const target = routeForNotification(n);
    if (target) router.push(target as any);
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header
        title="Notifications"
        right={
          <TouchableOpacity onPress={handleMarkAllRead} disabled={markingAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="label" color={markingAll ? 'textDisabled' : 'brand'}>
              {markingAll ? '…' : 'Mark all read'}
            </Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.brand} size="large" /></View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={({ item }) => <NotificationRow item={item} onPress={handleNotificationPress} />}
          keyExtractor={item => item.id}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.brand} style={{ paddingVertical: spacing.base }} /> : null}
          ListEmptyComponent={<EmptyState illustration="notifications" title="All caught up" description="You'll see likes, comments, and PR alerts here." />}
          contentContainerStyle={notifications.length === 0 ? { flex: 1 } : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.brand,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
});
