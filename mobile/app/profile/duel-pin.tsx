import { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, Check, Swords, X } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Pressable } from '../../src/components/Pressable';
import { Icon } from '../../src/components/Icon';
import { Button } from '../../src/components/Button';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface ExerciseRow {
  id: string;
  name: string;
  equipment: string | null;
  primary_muscles: string[];
}

export default function DuelPinScreen() {
  const router = useRouter();
  const setUser = useAuthStore(s => s.setUser);
  const user = useAuthStore(s => s.user);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState<ExerciseRow[]>([]);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [pinnedName, setPinnedName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get<{ data: any }>('/users/me')
      .then(r => {
        const id = r.data?.pinned_challenge_exercise_id ?? null;
        setPinnedId(id);
        if (id) {
          api.get<{ data: { exercises: Array<{ id: string; name: string }> } }>(`/exercises/by-ids?ids=${id}`)
            .then(rr => setPinnedName(rr.data?.exercises?.[0]?.name ?? null))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), 300);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '30' });
    if (search) params.set('search', search);
    api.get<{ data: { exercises: ExerciseRow[] } }>(`/exercises?${params.toString()}`)
      .then(r => setResults(r.data?.exercises ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [search]);

  async function handleSave(exercise_id: string | null, name: string | null) {
    setSaving(true);
    try {
      await api.put('/users/me/pinned-challenge', { exercise_id });
      setPinnedId(exercise_id);
      setPinnedName(name);
      if (setUser && user) setUser({ ...user, pinned_challenge_exercise_id: exercise_id } as any);
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e?.error?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="Pin Duel Exercise" back />

      <View style={styles.intro}>
        <View style={styles.heroIcon}>
          <Icon icon={Swords} size={20} color={colors.brand} />
        </View>
        <Text variant="body" color="textSecondary" style={{ flex: 1, marginLeft: spacing.md }}>
          Pin one exercise to invite 1v1 challenges. Anyone visiting your profile can challenge you on it.
        </Text>
      </View>

      {pinnedId && pinnedName ? (
        <Surface level={2} style={styles.currentCard}>
          <Text variant="overline" color="textTertiary">Currently pinned</Text>
          <View style={styles.currentRow}>
            <Text variant="bodyEmphasis" color="brand" style={{ flex: 1 }}>{pinnedName}</Text>
            <Pressable onPress={() => handleSave(null, null)} style={styles.unpinBtn} accessibilityLabel="Unpin">
              <Icon icon={X} size={14} color={colors.danger} />
              <Text variant="label" color="danger" style={{ marginLeft: spacing.xs }}>Unpin</Text>
            </Pressable>
          </View>
        </Surface>
      ) : null}

      <View style={styles.searchWrap}>
        <Surface level={2} style={styles.searchBar}>
          <Icon icon={Search} size={16} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises…"
            placeholderTextColor={colors.textTertiary}
            value={searchInput}
            onChangeText={setSearchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </Surface>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const selected = pinnedId === item.id;
            return (
              <Pressable
                onPress={() => handleSave(item.id, item.name)}
                style={styles.row}
                accessibilityLabel={item.name}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="bodyEmphasis" color={selected ? 'brand' : 'textPrimary'} numberOfLines={1}>{item.name}</Text>
                  <Text variant="caption" color="textTertiary" numberOfLines={1}>
                    {(item.equipment || 'other').replace(/_/g, ' ')}
                    {item.primary_muscles?.length ? ' · ' + item.primary_muscles[0] : ''}
                  </Text>
                </View>
                {selected && <Icon icon={Check} size={16} color={colors.brand} />}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={results.length === 0 ? styles.centered : undefined}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.centered}>
                <Text variant="caption" color="textTertiary">No exercises match</Text>
              </View>
            ) : null
          }
        />
      )}

      {saving && (
        <View style={styles.savingOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.brand} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  intro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  heroIcon: {
    width: 36, height: 36, borderRadius: radii.full,
    backgroundColor: colors.brandGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  currentCard: { padding: spacing.base, marginHorizontal: spacing.base, marginBottom: spacing.base },
  currentRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  unpinBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.dangerDim,
  },
  searchWrap: { paddingHorizontal: spacing.base, paddingBottom: spacing.sm },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    gap: spacing.sm, borderRadius: radii.md,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontFamily: 'Barlow_400Regular', fontSize: 15 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    gap: spacing.md,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.base },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
});
