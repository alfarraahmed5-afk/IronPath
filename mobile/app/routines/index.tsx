import { useState, useEffect } from 'react';
import { View, SectionList, ScrollView, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Trophy } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Icon } from '../../src/components/Icon';
import { Pressable } from '../../src/components/Pressable';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface Routine {
  id: string;
  name: string;
  description: string | null;
  folder_id: string | null;
  exercise_count: number;
  created_at: string;
}

interface FolderGroup {
  id: string;
  name: string;
  position: number;
  routines: Routine[];
}

interface Section {
  title: string;
  data: Routine[];
}

export default function RoutinesScreen() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRoutines = async () => {
    try {
      const response = await api.get<{ data: { folders: FolderGroup[]; ungrouped: Routine[] } }>('/routines');
      const { folders, ungrouped } = response.data;
      const newSections: Section[] = [];
      if (folders?.length > 0) {
        folders.forEach(folder => {
          newSections.push({ title: folder.name, data: folder.routines ?? [] });
        });
      }
      if (ungrouped?.length > 0) {
        newSections.push({ title: 'My Routines', data: ungrouped });
      }
      setSections(newSections);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchRoutines(); }, []);

  const hasRoutines = sections.some(s => s.data.length > 0);

  const PrebuiltCard = () => (
    <Pressable onPress={() => router.push('/routines/prebuilt')} style={styles.prebuiltCard} accessibilityLabel="Browse pre-built programs">
      <Surface level={2} style={[styles.prebuiltInner, { borderColor: colors.brand }]}>
        <View style={styles.prebuiltIcon}>
          <Icon icon={Trophy} size={20} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="title3" color="textPrimary">Pre-Built Programs</Text>
          <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xxs }}>Browse curated workout routines</Text>
        </View>
      </Surface>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="title1" color="textPrimary">Routines</Text>
        <Pressable
          onPress={() => router.push('/routines/create')}
          style={styles.addButton}
          accessibilityLabel="Create routine"
        >
          <Icon icon={Plus} size={20} color={colors.textOnBrand} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : !hasRoutines ? (
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchRoutines} tintColor={colors.brand} />}
        >
          <PrebuiltCard />
          <EmptyState
            title="No routines yet"
            description="Create your first routine or browse pre-built programs."
          />
        </ScrollView>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/routines/${item.id}`)}
              style={styles.routineRow}
              accessibilityLabel={item.name}
            >
              <Surface level={2} style={styles.routineCard}>
                <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1}>{item.name}</Text>
                <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xxs }}>
                  {item.exercise_count} exercise{item.exercise_count !== 1 ? 's' : ''}
                </Text>
                {item.description ? (
                  <Text variant="caption" color="textTertiary" numberOfLines={1} style={{ marginTop: spacing.xxs }}>
                    {item.description}
                  </Text>
                ) : null}
              </Surface>
            </Pressable>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text variant="overline" color="textTertiary">{title}</Text>
            </View>
          )}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <PrebuiltCard />
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchRoutines} tintColor={colors.brand} />}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyScroll: { paddingHorizontal: spacing.base, paddingTop: spacing.base, flexGrow: 1 },
  prebuiltCard: { marginBottom: spacing.base },
  prebuiltInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderWidth: 1,
    gap: spacing.md,
  },
  prebuiltIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.brandGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: { paddingHorizontal: spacing.base, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  listHeader: { paddingHorizontal: spacing.base, paddingTop: spacing.base },
  routineRow: { paddingHorizontal: spacing.base, marginBottom: spacing.sm },
  routineCard: { padding: spacing.base },
});
