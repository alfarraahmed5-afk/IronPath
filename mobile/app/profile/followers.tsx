import { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Avatar } from '../../src/components/Avatar';
import { Icon } from '../../src/components/Icon';
import { Pressable } from '../../src/components/Pressable';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, spacing } from '../../src/theme/tokens';

interface FollowerRow {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  followed_at: string;
}

export default function FollowersScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [items, setItems] = useState<FollowerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    api.get<{ data: { followers: FollowerRow[] } }>(`/users/${user.id}/followers?limit=50`)
      .then(res => setItems(res.data.followers ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="Followers" back />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/users/${item.id}` as any)}
              style={styles.row}
              accessibilityLabel={item.username}
            >
              <Avatar username={item.full_name || item.username} avatarUrl={item.avatar_url} size={40} />
              <View style={styles.rowText}>
                <Text variant="bodyEmphasis" color="textPrimary">{item.username}</Text>
                {item.full_name ? <Text variant="caption" color="textTertiary">{item.full_name}</Text> : null}
              </View>
              <Icon icon={ChevronRight} size={16} color={colors.textTertiary} />
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <EmptyState
              title="No followers yet"
              description="Train hard. Show up. They'll find you."
            />
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.md },
  rowText: { flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
