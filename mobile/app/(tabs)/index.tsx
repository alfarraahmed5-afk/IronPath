import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, MessageCircle, Bell, Clock, Weight, Hash } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/authStore';
import { Avatar } from '../../src/components/Avatar';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Icon } from '../../src/components/Icon';
import { EmptyState } from '../../src/components/EmptyState';
import { Button } from '../../src/components/Button';
import { colors, spacing, radii } from '../../src/theme/tokens';
import { haptic } from '../../src/lib/haptics';
import { router as globalRouter } from 'expo-router';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeedWorkout {
  id: string;
  user_id: string;
  name: string;
  started_at: string;
  duration_seconds: number;
  total_volume_kg: number | null;
  total_sets: number;
  visibility: 'public' | 'followers' | 'private';
  like_count: number;
  comment_count: number;
  viewer_liked: boolean;
  media: { url: string; media_type: 'photo' | 'video'; position: number }[];
  user: { username: string; full_name: string | null; avatar_url: string | null };
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
  user: { id: string; username: string; avatar_url: string | null };
}

type FeedFilter = 'all' | 'following';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── CommentItem ─────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  currentUserId,
  onDelete,
}: {
  comment: Comment;
  currentUserId: string | undefined;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={styles.commentRow}>
      <Avatar username={comment.user.username} avatarUrl={comment.user.avatar_url} size={32} />
      <View style={styles.commentBody}>
        <View style={styles.commentMeta}>
          <Text variant="bodyEmphasis" color="textPrimary">{comment.user.username}</Text>
          <Text variant="caption" color="textTertiary">{formatRelative(comment.created_at)}</Text>
        </View>
        <Text variant="body" color="textSecondary" style={{ marginTop: 2 }}>{comment.content}</Text>
      </View>
      {currentUserId === comment.user_id && (
        <TouchableOpacity onPress={() => onDelete(comment.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text variant="caption" color="danger">Delete</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── CommentModal ─────────────────────────────────────────────────────────────

function CommentModal({
  workoutId,
  visible,
  onClose,
  onCommentCountChange,
}: {
  workoutId: string | null;
  visible: boolean;
  onClose: () => void;
  onCommentCountChange: (workoutId: string, delta: number) => void;
}) {
  const user = useAuthStore(s => s.user);
  const [comments, setComments] = useState<Comment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newText, setNewText] = useState('');
  const [sending, setSending] = useState(false);

  const loadComments = useCallback(async (cursor?: string) => {
    if (!workoutId) return;
    cursor ? setLoadingMore(true) : setLoading(true);
    try {
      const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      const res = await api.get<{ data: { comments: Comment[]; next_cursor: string | null } }>(
        `/feed/workouts/${workoutId}/comments${params}`
      );
      const { comments: fetched, next_cursor } = res.data;
      setComments(prev => (cursor ? [...prev, ...fetched] : fetched));
      setNextCursor(next_cursor);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [workoutId]);

  React.useEffect(() => {
    if (visible && workoutId) {
      setComments([]);
      setNextCursor(null);
      loadComments();
    }
  }, [visible, workoutId]);

  const handleSend = async () => {
    if (!workoutId || !newText.trim() || !user) return;
    const text = newText.trim();
    setSending(true);
    try {
      const res = await api.post<{ data: { comment: Partial<Comment> } }>(
        `/feed/workouts/${workoutId}/comments`,
        { content: text }
      );
      // The backend may or may not return the joined `user` object; synthesize
      // from the current auth store to guarantee a renderable shape.
      const raw = res.data.comment;
      const safeComment: Comment = {
        id: raw.id ?? `tmp_${Date.now()}`,
        user_id: raw.user_id ?? user.id,
        content: raw.content ?? text,
        created_at: raw.created_at ?? new Date().toISOString(),
        deleted_at: null,
        user: raw.user ?? {
          id: user.id,
          username: user.username,
          avatar_url: user.avatar_url,
        },
      };
      setComments(prev => [...prev, safeComment]);
      setNewText('');
      onCommentCountChange(workoutId, 1);
    } catch {
      Alert.alert('Comment failed', 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!workoutId) return;
    try {
      await api.delete(`/feed/workouts/${workoutId}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
      onCommentCountChange(workoutId, -1);
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <Text variant="title3" color="textPrimary">Comments</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="label" color="textSecondary">Close</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <CommentItem comment={item} currentUserId={user?.id} onDelete={handleDelete} />
            )}
            ListEmptyComponent={
              <EmptyState illustration="comments" title="Be the first to comment" />
            }
            ListFooterComponent={
              nextCursor ? (
                <TouchableOpacity onPress={() => loadComments(nextCursor!)} style={styles.loadMore}>
                  {loadingMore
                    ? <ActivityIndicator color={colors.brand} />
                    : <Text variant="label" color="brand">Load more</Text>}
                </TouchableOpacity>
              ) : null
            }
          />
        )}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.commentInput}>
            <TextInput
              style={styles.commentField}
              placeholder="Add a comment…"
              placeholderTextColor={colors.textTertiary}
              value={newText}
              onChangeText={setNewText}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              editable={!sending}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={sending || !newText.trim()}
              style={[styles.sendBtn, { backgroundColor: newText.trim() ? colors.brand : colors.surface4 }]}
            >
              {sending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text variant="label" color="textOnBrand">Send</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── WorkoutCard ──────────────────────────────────────────────────────────────

function WorkoutCard({
  workout,
  onLikeToggle,
  onCommentPress,
}: {
  workout: FeedWorkout;
  onLikeToggle: (id: string) => void;
  onCommentPress: (id: string) => void;
}) {
  const router = useRouter();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/workouts/${workout.id}` as any)}
    >
      <Surface level={2} style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <Avatar
            username={workout.user.username}
            avatarUrl={workout.user.avatar_url}
            size={40}
          />
          <View style={styles.cardHeaderText}>
            <Text variant="bodyEmphasis" color="textPrimary">{workout.user.username}</Text>
            <Text variant="caption" color="textTertiary">{formatRelative(workout.started_at)}</Text>
          </View>
        </View>

        {/* Workout name */}
        <Text variant="title3" color="textPrimary" style={styles.workoutName}>{workout.name}</Text>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Icon icon={Clock} size={12} color={colors.textTertiary} />
            <Text variant="caption" color="textSecondary">{formatDuration(workout.duration_seconds)}</Text>
          </View>
          {workout.total_volume_kg !== null && (
            <View style={styles.statItem}>
              <Icon icon={Weight} size={12} color={colors.textTertiary} />
              <Text variant="caption" color="textSecondary">{workout.total_volume_kg.toLocaleString()} kg</Text>
            </View>
          )}
          <View style={styles.statItem}>
            <Icon icon={Hash} size={12} color={colors.textTertiary} />
            <Text variant="caption" color="textSecondary">{workout.total_sets} sets</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={e => {
              e.stopPropagation?.();
              haptic.light();
              onLikeToggle(workout.id);
            }}
            style={styles.actionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Heart
              size={20}
              color={workout.viewer_liked ? colors.danger : colors.textTertiary}
              fill={workout.viewer_liked ? colors.danger : 'none'}
              strokeWidth={2}
            />
            <Text
              variant="caption"
              color={workout.viewer_liked ? 'danger' : 'textTertiary'}
            >
              {workout.like_count}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={e => {
              e.stopPropagation?.();
              onCommentPress(workout.id);
            }}
            style={styles.actionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MessageCircle size={20} color={colors.textTertiary} strokeWidth={2} />
            <Text variant="caption" color="textTertiary">{workout.comment_count}</Text>
          </TouchableOpacity>
        </View>
      </Surface>
    </TouchableOpacity>
  );
}

// ─── Feed Screen ──────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [workouts, setWorkouts] = useState<FeedWorkout[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [commentModalWorkoutId, setCommentModalWorkoutId] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);

  const fetchFeed = useCallback(async (opts: { filter: FeedFilter; cursor?: string; isRefresh?: boolean }) => {
    const { filter: f, cursor, isRefresh } = opts;
    if (cursor) {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const params = new URLSearchParams({ filter: f });
      if (cursor) params.set('cursor', cursor);
      const res = await api.get<{ data: { workouts: FeedWorkout[]; next_cursor: string | null } }>(
        `/feed?${params.toString()}`
      );
      const { workouts: fetched, next_cursor } = res.data;
      setWorkouts(prev => (cursor ? [...prev, ...fetched] : fetched));
      setNextCursor(next_cursor);
    } catch {
      setError('Failed to load feed. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, []);

  React.useEffect(() => {
    setWorkouts([]);
    setNextCursor(null);
    fetchFeed({ filter });
  }, [filter]);

  const handleLikeToggle = async (workoutId: string) => {
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;
    const wasLiked = workout.viewer_liked;
    setWorkouts(prev =>
      prev.map(w =>
        w.id === workoutId
          ? { ...w, viewer_liked: !wasLiked, like_count: wasLiked ? w.like_count - 1 : w.like_count + 1 }
          : w
      )
    );
    try {
      if (wasLiked) {
        await api.delete(`/feed/workouts/${workoutId}/like`);
      } else {
        await api.post(`/feed/workouts/${workoutId}/like`, {});
      }
    } catch {
      setWorkouts(prev =>
        prev.map(w =>
          w.id === workoutId
            ? { ...w, viewer_liked: wasLiked, like_count: wasLiked ? w.like_count + 1 : w.like_count - 1 }
            : w
        )
      );
    }
  };

  const handleCommentCountChange = (workoutId: string, delta: number) => {
    setWorkouts(prev =>
      prev.map(w => w.id === workoutId ? { ...w, comment_count: Math.max(0, w.comment_count + delta) } : w)
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.topBar}>
        <Text variant="title2" color="textPrimary">Feed</Text>
        <TouchableOpacity
          onPress={() => globalRouter.push('/notifications' as any)}
          style={styles.bellBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Bell size={20} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {(['all', 'following'] as FeedFilter[]).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => { if (f !== filter) setFilter(f); }}
            style={[styles.filterPill, { backgroundColor: filter === f ? colors.brand : colors.surface2 }]}
          >
            <Text
              variant="label"
              color={filter === f ? 'textOnBrand' : 'textSecondary'}
              style={{ textTransform: 'capitalize' }}
            >
              {f === 'all' ? 'All' : 'Following'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : error && workouts.length === 0 ? (
        <View style={styles.centered}>
          <EmptyState
            title="Couldn't load feed"
            description={error}
            action={{ label: 'Retry', onPress: () => fetchFeed({ filter }) }}
          />
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <WorkoutCard
              workout={item}
              onLikeToggle={handleLikeToggle}
              onCommentPress={id => setCommentModalWorkoutId(id)}
            />
          )}
          contentContainerStyle={{ paddingVertical: spacing.sm }}
          onEndReached={() => {
            if (nextCursor && !loadingMoreRef.current) {
              fetchFeed({ filter, cursor: nextCursor });
            }
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchFeed({ filter, isRefresh: true })}
              tintColor={colors.brand}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyWrap}>
                <EmptyState
                  illustration="workouts"
                  title={filter === 'following' ? 'Follow members to see their lifts' : 'Quiet in here'}
                  description={
                    filter === 'following'
                      ? undefined
                      : 'When members complete workouts, they\'ll show up here.'
                  }
                />
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.brand} style={{ paddingVertical: spacing.lg }} /> : null
          }
        />
      )}

      <CommentModal
        workoutId={commentModalWorkoutId}
        visible={commentModalWorkoutId !== null}
        onClose={() => setCommentModalWorkoutId(null)}
        onCommentCountChange={handleCommentCountChange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { paddingTop: spacing['3xl'] },

  // Card
  card: { marginHorizontal: spacing.base, marginBottom: spacing.md, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.base, paddingBottom: spacing.sm },
  cardHeaderText: { marginLeft: spacing.md, flex: 1 },
  workoutName: { paddingHorizontal: spacing.base, paddingBottom: spacing.sm },
  statsStrip: { flexDirection: 'row', paddingHorizontal: spacing.base, paddingBottom: spacing.base, gap: spacing.base },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: spacing.base },
  actions: { flexDirection: 'row', paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.xl },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // Modal
  modalRoot: { flex: 1, backgroundColor: colors.surface2 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  commentBody: { flex: 1 },
  commentMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loadMore: { alignItems: 'center', paddingVertical: spacing.base },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface2,
    gap: spacing.sm,
  },
  commentField: {
    flex: 1,
    backgroundColor: colors.surface3,
    color: colors.textPrimary,
    borderRadius: radii.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontFamily: 'Barlow_400Regular',
    fontSize: 14,
  },
  sendBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
