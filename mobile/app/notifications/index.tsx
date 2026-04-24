import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../src/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type:
    | 'like'
    | 'comment'
    | 'follow'
    | 'follow_request'
    | 'follow_request_approved'
    | 'pr'
    | 'streak_broken'
    | 'challenge_started'
    | 'challenge_ended'
    | 'monthly_report'
    | 'yearly_report';
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const NOTIF_ICON: Record<string, string> = {
  like: '❤️',
  comment: '💬',
  follow: '👤',
  follow_request: '👤',
  follow_request_approved: '✅',
  pr: '🏆',
  streak_broken: '🔥',
  challenge_started: '⚡',
  challenge_ended: '⚡',
  monthly_report: '📊',
  yearly_report: '📊',
};

// ─── NotificationRow ─────────────────────────────────────────────────────────

interface NotificationRowProps {
  item: Notification;
  onPress: (id: string) => void;
}

function NotificationRow({ item, onPress }: NotificationRowProps) {
  const icon = NOTIF_ICON[item.type] ?? '🔔';

  return (
    <TouchableOpacity
      onPress={() => {
        if (!item.is_read) onPress(item.id);
      }}
      activeOpacity={0.7}
      className={`flex-row items-start px-4 py-3 border-b border-gray-800 ${
        item.is_read ? 'bg-gray-950' : 'bg-gray-900'
      }`}
    >
      {/* Unread indicator bar */}
      {!item.is_read && (
        <View className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
      )}

      {/* Icon */}
      <Text className="text-2xl mr-3 mt-0.5">{icon}</Text>

      {/* Content */}
      <View className="flex-1">
        <View className="flex-row justify-between items-start">
          <Text
            className="text-white font-semibold text-sm flex-1 mr-2"
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text className="text-gray-500 text-xs mt-0.5 shrink-0">
            {formatRelative(item.created_at)}
          </Text>
        </View>

        {item.body ? (
          <Text className="text-gray-400 text-sm mt-0.5" numberOfLines={2}>
            {item.body}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  // ── Fetch (initial + paginated) ───────────────────────────────────────────

  const fetchNotifications = useCallback(
    async (cursor?: string) => {
      try {
        const url = cursor
          ? `/notifications?cursor=${encodeURIComponent(cursor)}`
          : '/notifications';
        const res = await api.get<{
          data: { notifications: Notification[]; next_cursor: string | null };
        }>(url);
        const { notifications: items, next_cursor } = res.data;

        setNotifications((prev) =>
          cursor ? [...prev, ...items] : items
        );
        setNextCursor(next_cursor);
      } catch {
        setError('Failed to load notifications.');
      }
    },
    []
  );

  useEffect(() => {
    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  // ── Load more ─────────────────────────────────────────────────────────────

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await fetchNotifications(nextCursor);
    setLoadingMore(false);
  }, [nextCursor, loadingMore, fetchNotifications]);

  // ── Mark single read ──────────────────────────────────────────────────────

  const handleMarkRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await api.patch<{ data: { read: true } }>(`/notifications/${id}/read`);
    } catch {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
    }
  }, []);

  // ── Mark all read ─────────────────────────────────────────────────────────

  const handleMarkAllRead = useCallback(async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await api.post<{ data: { updated: number } }>('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // silently fail — user can retry
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll]);

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationRow item={item} onPress={handleMarkRead} />
    ),
    [handleMarkRead]
  );

  const keyExtractor = useCallback((item: Notification) => item.id, []);

  const ListFooter = loadingMore ? (
    <ActivityIndicator color="#FF6B35" className="py-4" />
  ) : null;

  const ListEmpty = loading ? null : (
    <View className="flex-1 items-center justify-center py-24">
      <Text className="text-gray-500 text-base">No notifications yet</Text>
    </View>
  );

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-gray-950">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-4 border-b border-gray-800">
        <Text className="text-white text-xl font-bold">Notifications</Text>
        <TouchableOpacity
          onPress={handleMarkAllRead}
          disabled={markingAll}
          activeOpacity={0.7}
        >
          <Text
            className="text-base font-medium"
            style={{ color: markingAll ? '#6b7280' : '#FF6B35' }}
          >
            {markingAll ? 'Marking…' : 'Mark all read'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error banner */}
      {error ? (
        <View className="bg-red-900/40 px-4 py-3 mx-4 mt-3 rounded-lg">
          <Text className="text-red-400 text-sm">{error}</Text>
        </View>
      ) : null}

      {/* Loading state */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FF6B35" size="large" />
          <Text className="text-gray-400 mt-3">Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={
            notifications.length === 0 ? { flex: 1 } : undefined
          }
        />
      )}
    </View>
  );
}
