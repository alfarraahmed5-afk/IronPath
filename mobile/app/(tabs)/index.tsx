import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/authStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeedWorkout {
  id: string;
  user_id: string;
  workout_name: string;
  started_at: string;
  duration_seconds: number;
  total_volume_kg: number | null;
  exercise_count: number;
  visibility: 'public' | 'followers' | 'private';
  like_count: number;
  comment_count: number;
  viewer_liked: boolean;
  media: { id: string; storage_path: string; media_type: 'photo' | 'video' }[];
  user: { id: string; username: string; full_name: string; avatar_url: string | null };
}

interface Comment {
  id: string;
  user_id: string;
  text: string;
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

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

interface AvatarProps {
  avatarUrl: string | null;
  fullName: string;
  size?: number;
}

function Avatar({ avatarUrl, fullName, size = 40 }: AvatarProps) {
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      className="rounded-full items-center justify-center bg-orange-500"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text className="text-white font-bold text-sm">{initials(fullName)}</Text>
    </View>
  );
}

// ─── CommentItem ─────────────────────────────────────────────────────────────

interface CommentItemProps {
  comment: Comment;
  currentUserId: string | undefined;
  onDelete: (commentId: string) => void;
}

function CommentItem({ comment, currentUserId, onDelete }: CommentItemProps) {
  return (
    <View className="flex-row items-start px-4 py-3 border-b border-gray-800">
      <Avatar
        avatarUrl={comment.user.avatar_url}
        fullName={comment.user.username}
        size={32}
      />
      <View className="flex-1 ml-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-white font-semibold text-sm">
            {comment.user.username}
          </Text>
          <Text className="text-gray-500 text-xs">
            {formatRelative(comment.created_at)}
          </Text>
        </View>
        <Text className="text-gray-300 text-sm mt-0.5">{comment.text}</Text>
      </View>
      {currentUserId === comment.user_id && (
        <TouchableOpacity
          onPress={() => onDelete(comment.id)}
          className="ml-2 mt-1"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-gray-500 text-xs">Delete</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── CommentModal ─────────────────────────────────────────────────────────────

interface CommentModalProps {
  workoutId: string | null;
  visible: boolean;
  onClose: () => void;
  onCommentCountChange: (workoutId: string, delta: number) => void;
}

function CommentModal({
  workoutId,
  visible,
  onClose,
  onCommentCountChange,
}: CommentModalProps) {
  const user = useAuthStore((s) => s.user);
  const [comments, setComments] = useState<Comment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newText, setNewText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(
    async (cursor?: string) => {
      if (!workoutId) return;
      if (cursor) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
        const res = await api.get<{
          data: { comments: Comment[]; next_cursor: string | null };
        }>(`/workouts/${workoutId}/comments${params}`);
        const { comments: fetched, next_cursor } = res.data;
        setComments((prev) => (cursor ? [...prev, ...fetched] : fetched));
        setNextCursor(next_cursor);
      } catch {
        setError('Failed to load comments.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [workoutId]
  );

  React.useEffect(() => {
    if (visible && workoutId) {
      setComments([]);
      setNextCursor(null);
      loadComments();
    }
  }, [visible, workoutId]);

  const handleSend = async () => {
    if (!workoutId || !newText.trim()) return;
    setSending(true);
    try {
      const res = await api.post<{ data: { comment: Comment } }>(
        `/workouts/${workoutId}/comments`,
        { text: newText.trim() }
      );
      const created = res.data.comment;
      setComments((prev) => [created, ...prev]);
      setNewText('');
      onCommentCountChange(workoutId, 1);
    } catch {
      // silent — user can retry
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!workoutId) return;
    try {
      await api.delete(`/workouts/${workoutId}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCommentCountChange(workoutId, -1);
    } catch {
      // silent
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-950">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-800">
          <Text className="text-white text-lg font-bold">Comments</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text className="text-gray-400 text-base">Close</Text>
          </TouchableOpacity>
        </View>

        {/* Comment list */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#FF6B35" />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-4">
            <Text className="text-gray-400 text-center">{error}</Text>
            <TouchableOpacity
              onPress={() => loadComments()}
              className="mt-3 px-4 py-2 rounded-full bg-gray-800"
            >
              <Text className="text-white">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CommentItem
                comment={item}
                currentUserId={user?.id}
                onDelete={handleDelete}
              />
            )}
            ListEmptyComponent={
              <View className="items-center justify-center py-12">
                <Text className="text-gray-500">No comments yet. Be the first!</Text>
              </View>
            }
            ListFooterComponent={
              nextCursor ? (
                <TouchableOpacity
                  onPress={() => loadComments(nextCursor)}
                  disabled={loadingMore}
                  className="items-center py-4"
                >
                  {loadingMore ? (
                    <ActivityIndicator color="#FF6B35" />
                  ) : (
                    <Text className="text-orange-500">Load more</Text>
                  )}
                </TouchableOpacity>
              ) : null
            }
          />
        )}

        {/* Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View className="flex-row items-center px-4 py-3 border-t border-gray-800 bg-gray-900">
            <TextInput
              className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 text-sm mr-2"
              placeholder="Add a comment…"
              placeholderTextColor="#6B7280"
              value={newText}
              onChangeText={setNewText}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              editable={!sending}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={sending || !newText.trim()}
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: newText.trim() ? '#FF6B35' : '#374151' }}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white font-semibold text-sm">Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── WorkoutCard ──────────────────────────────────────────────────────────────

interface WorkoutCardProps {
  workout: FeedWorkout;
  onLikeToggle: (workoutId: string) => void;
  onCommentPress: (workoutId: string) => void;
}

function WorkoutCard({ workout, onLikeToggle, onCommentPress }: WorkoutCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/workouts/${workout.id}` as any)}
      className="bg-gray-900 rounded-2xl mx-4 mb-4 overflow-hidden"
    >
      {/* Header */}
      <View className="flex-row items-center px-4 pt-4 pb-3">
        <Avatar
          avatarUrl={workout.user.avatar_url}
          fullName={workout.user.full_name}
          size={40}
        />
        <View className="ml-3 flex-1">
          <Text className="text-white font-semibold text-sm">
            {workout.user.username}
          </Text>
          <Text className="text-gray-500 text-xs">
            {formatRelative(workout.started_at)}
          </Text>
        </View>
      </View>

      {/* Workout name */}
      <View className="px-4 pb-3">
        <Text className="text-white font-bold text-base">{workout.workout_name}</Text>
      </View>

      {/* Stats row */}
      <View className="flex-row px-4 pb-4" style={{ gap: 16 }}>
        <View className="items-center">
          <Text className="text-gray-400 text-xs mb-0.5">Duration</Text>
          <Text className="text-white font-semibold text-sm">
            {formatDuration(workout.duration_seconds)}
          </Text>
        </View>
        {workout.total_volume_kg !== null && (
          <View className="items-center">
            <Text className="text-gray-400 text-xs mb-0.5">Volume</Text>
            <Text className="text-white font-semibold text-sm">
              {workout.total_volume_kg.toLocaleString()} kg
            </Text>
          </View>
        )}
        <View className="items-center">
          <Text className="text-gray-400 text-xs mb-0.5">Exercises</Text>
          <Text className="text-white font-semibold text-sm">
            {workout.exercise_count}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View className="h-px bg-gray-800 mx-4" />

      {/* Action row */}
      <View className="flex-row items-center px-4 py-3" style={{ gap: 24 }}>
        {/* Like */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onLikeToggle(workout.id);
          }}
          className="flex-row items-center"
          style={{ gap: 6 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 18 }}>
            {workout.viewer_liked ? '❤️' : '🤍'}
          </Text>
          <Text
            className="text-sm font-medium"
            style={{ color: workout.viewer_liked ? '#FF6B35' : '#9CA3AF' }}
          >
            {workout.like_count}
          </Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onCommentPress(workout.id);
          }}
          className="flex-row items-center"
          style={{ gap: 6 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 18 }}>💬</Text>
          <Text className="text-gray-400 text-sm font-medium">
            {workout.comment_count}
          </Text>
        </TouchableOpacity>
      </View>
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

  const fetchFeed = useCallback(
    async (opts: { filter: FeedFilter; cursor?: string; isRefresh?: boolean }) => {
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
        const res = await api.get<{
          data: { workouts: FeedWorkout[]; next_cursor: string | null };
        }>(`/feed?${params.toString()}`);
        const { workouts: fetched, next_cursor } = res.data;
        setWorkouts((prev) => (cursor ? [...prev, ...fetched] : fetched));
        setNextCursor(next_cursor);
      } catch {
        setError('Failed to load feed. Pull down to retry.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    []
  );

  React.useEffect(() => {
    setWorkouts([]);
    setNextCursor(null);
    fetchFeed({ filter });
  }, [filter]);

  const handleFilterChange = (f: FeedFilter) => {
    if (f === filter) return;
    setFilter(f);
  };

  const handleEndReached = () => {
    if (nextCursor && !loadingMoreRef.current) {
      fetchFeed({ filter, cursor: nextCursor });
    }
  };

  const handleRefresh = () => {
    fetchFeed({ filter, isRefresh: true });
  };

  const handleLikeToggle = async (workoutId: string) => {
    const workout = workouts.find((w) => w.id === workoutId);
    if (!workout) return;

    const wasLiked = workout.viewer_liked;

    // Optimistic update
    setWorkouts((prev) =>
      prev.map((w) =>
        w.id === workoutId
          ? {
              ...w,
              viewer_liked: !wasLiked,
              like_count: wasLiked ? w.like_count - 1 : w.like_count + 1,
            }
          : w
      )
    );

    try {
      if (wasLiked) {
        await api.delete(`/workouts/${workoutId}/like`);
      } else {
        await api.post(`/workouts/${workoutId}/like`, {});
      }
    } catch {
      // Revert on failure
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === workoutId
            ? {
                ...w,
                viewer_liked: wasLiked,
                like_count: wasLiked ? w.like_count + 1 : w.like_count - 1,
              }
            : w
        )
      );
    }
  };

  const handleCommentCountChange = (workoutId: string, delta: number) => {
    setWorkouts((prev) =>
      prev.map((w) =>
        w.id === workoutId
          ? { ...w, comment_count: Math.max(0, w.comment_count + delta) }
          : w
      )
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      {/* Filter row */}
      <View className="flex-row px-4 pt-3 pb-2" style={{ gap: 8 }}>
        <TouchableOpacity
          onPress={() => handleFilterChange('all')}
          className="px-5 py-2 rounded-full"
          style={{ backgroundColor: filter === 'all' ? '#FF6B35' : '#1F2937' }}
        >
          <Text
            className="font-semibold text-sm"
            style={{ color: filter === 'all' ? '#fff' : '#9CA3AF' }}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleFilterChange('following')}
          className="px-5 py-2 rounded-full"
          style={{ backgroundColor: filter === 'following' ? '#FF6B35' : '#1F2937' }}
        >
          <Text
            className="font-semibold text-sm"
            style={{ color: filter === 'following' ? '#fff' : '#9CA3AF' }}
          >
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FF6B35" size="large" />
        </View>
      ) : error && workouts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-gray-400 text-center mb-4">{error}</Text>
          <TouchableOpacity
            onPress={() => fetchFeed({ filter })}
            className="px-6 py-3 rounded-full"
            style={{ backgroundColor: '#FF6B35' }}
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WorkoutCard
              workout={item}
              onLikeToggle={handleLikeToggle}
              onCommentPress={(id) => setCommentModalWorkoutId(id)}
            />
          )}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 16 }}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            !loading ? (
              <View className="flex-1 items-center justify-center py-20">
                <Text className="text-4xl mb-4">🏋️</Text>
                <Text className="text-white font-semibold text-lg mb-2">
                  No workouts yet
                </Text>
                <Text className="text-gray-500 text-center px-8">
                  {filter === 'following'
                    ? 'Follow some athletes to see their workouts here.'
                    : 'Be the first to log a workout!'}
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4 items-center">
                <ActivityIndicator color="#FF6B35" />
              </View>
            ) : null
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
