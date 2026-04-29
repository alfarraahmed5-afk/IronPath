import { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Trophy, Check } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Button } from '../../src/components/Button';
import { Pressable } from '../../src/components/Pressable';
import { Icon } from '../../src/components/Icon';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface PR {
  id: string;
  exercise_id: string;
  record_type: string;
  value: number;
  achieved_at: string;
  exercises?: { id: string; name: string } | null;
}

const RECORD_LABELS: Record<string, string> = {
  heaviest_weight: 'Max Weight',
  most_reps: 'Max Reps',
  best_volume_set: 'Top Set Volume',
  best_volume_session: 'Best Session',
  projected_1rm: 'Est. 1RM',
  '3rm': '3RM',
  '5rm': '5RM',
  '10rm': '10RM',
  longest_duration: 'Longest Duration',
  longest_distance: 'Longest Distance',
};

function formatValue(rt: string, v: number): string {
  if (rt.includes('reps')) return `${v}`;
  if (rt.includes('duration')) {
    const m = Math.floor(v / 60), s = v % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  if (rt.includes('distance')) return `${v} m`;
  return `${Math.round(v * 10) / 10} kg`;
}

export default function ShowcasePickerScreen() {
  const router = useRouter();
  const [prs, setPrs] = useState<PR[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<{ data: { prs: PR[] } }>('/users/me/prs'),
      api.get<{ data: { showcase: PR[] } }>('/users/me/showcase').catch(() => ({ data: { showcase: [] } })),
    ])
      .then(([prsRes, showcaseRes]) => {
        setPrs(prsRes.data?.prs ?? []);
        const ids = (showcaseRes.data?.showcase ?? []).map((s: any) => s.id);
        setSelected(ids);
      })
      .catch(() => Alert.alert('Error', 'Could not load PRs'))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) {
        Alert.alert('Maximum reached', 'You can pin up to 3 PRs. Remove one first.');
        return prev;
      }
      return [...prev, id];
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/users/me/showcase', { pr_ids: selected });
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e?.error?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  // Group PRs by exercise; pick the 1 highest-value PR per exercise per record_type
  const grouped = (() => {
    const map = new Map<string, PR[]>();
    for (const pr of prs) {
      const k = pr.exercises?.name ?? 'Other';
      const arr = map.get(k) ?? [];
      arr.push(pr);
      map.set(k, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  })();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="Showcase PRs" back />

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.brand} size="large" /></View>
      ) : prs.length === 0 ? (
        <EmptyState
          illustration="exercises"
          title="No PRs yet"
          description="Complete some workouts and your PRs will show up here."
          action={{ label: 'Go back', onPress: () => router.back() }}
        />
      ) : (
        <>
          <View style={styles.helper}>
            <Text variant="caption" color="textTertiary">
              Pick up to 3 PRs to feature on your profile. {selected.length}/3 selected.
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
            {grouped.map(([name, list]) => (
              <View key={name} style={{ marginBottom: spacing.md }}>
                <Text variant="overline" color="textTertiary" style={styles.groupHeader}>{name}</Text>
                {list.map(pr => {
                  const isSelected = selected.includes(pr.id);
                  return (
                    <Pressable
                      key={pr.id}
                      onPress={() => toggle(pr.id)}
                      accessibilityLabel={`${name} ${pr.record_type}`}
                      style={styles.row}
                    >
                      <Surface level={2} style={[styles.rowSurface, isSelected && { borderColor: colors.brand, borderWidth: 1.5 }]}>
                        <View style={styles.rowIconWrap}>
                          <Icon icon={Trophy} size={16} color={isSelected ? colors.brand : colors.textTertiary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text variant="bodyEmphasis" color="textPrimary">{RECORD_LABELS[pr.record_type] ?? pr.record_type}</Text>
                          <Text variant="caption" color="textTertiary">{new Date(pr.achieved_at).toLocaleDateString()}</Text>
                        </View>
                        <Text variant="numeric" color={isSelected ? 'brand' : 'textSecondary'} style={{ fontSize: 18, lineHeight: 22, marginRight: spacing.sm }}>
                          {formatValue(pr.record_type, pr.value)}
                        </Text>
                        {isSelected && (
                          <View style={[styles.check, { backgroundColor: colors.brand }]}>
                            <Icon icon={Check} size={12} color={colors.textPrimary} strokeWidth={3} />
                          </View>
                        )}
                      </Surface>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
          <View style={styles.footer}>
            <Button label="Save Showcase" onPress={handleSave} variant="primary" size="lg" fullWidth loading={saving} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  helper: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  groupHeader: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  row: { paddingHorizontal: spacing.base, marginBottom: spacing.xs },
  rowSurface: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, borderRadius: radii.md,
    borderWidth: 1, borderColor: 'transparent',
    gap: spacing.sm,
  },
  rowIconWrap: {
    width: 32, height: 32, borderRadius: radii.full,
    backgroundColor: colors.surface3,
    alignItems: 'center', justifyContent: 'center',
  },
  check: {
    width: 22, height: 22, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing['2xl'],
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
