import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, MessageCircle, UserPlus, Trophy, Flame, Bell, BarChart2 } from 'lucide-react-native';
import { LucideIcon } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Header } from '../../src/components/Header';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'follow_request' | 'follow_request_approved' | 'pr' | 'streak_broken' | 'challenge_started' | 'challenge_ended' | 'monthly_report' | 'yearly_report';
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
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
  follow:                  { icon: UserPlus,       color: colors.success },
  follow_request:          { icon: UserPlus,       color: colors.info },
  follow_request_approved: { icon: UserPlus,       color: colors.success },
  pr:                      { icon: Trophy,         color: '#F59E0B' },
  streak_broken:           { icon: Flame,          color: colors.brand },
  challenge_started:       { icon: Trophy,         color: colors.info },
  challenge_ended:         { icon: Trophy,         color: colors.textTertiary },
  monthly_report:          { icon: BarChart2,      color: colors.info },
  yearly_report:           { icon: BarChart2,      color: colors.brand },
};

function NotificationRow({ item, onPress }: { item: Notification; onPress: (id: string) => void }) {
  const config = NOTIF_CONFIG[item.type] ?? { icon: Bell, color: colors.textTertiary };
  const IconComp = config.icon;

  return (
    <TouchableOpacity
      onPress={() => { if (!item.is_read) onPress(item.id); }}
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

  const handleMarkRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n));
    }
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
          renderItem={({ item }) => <NotificationRow item={item} onPress={handleMarkRead} />}
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
