import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Pressable } from '../../src/components/Pressable';
import { Icon } from '../../src/components/Icon';
import { colors, spacing, radii } from '../../src/theme/tokens';

type Metric = 'total_volume' | 'workout_count' | 'exercise_volume';

const METRIC_OPTIONS: { key: Metric; label: string; desc: string }[] = [
  { key: 'total_volume', label: 'Total Volume', desc: 'Sum of weight × reps across all workouts' },
  { key: 'workout_count', label: 'Most Workouts', desc: 'Number of completed workouts' },
  { key: 'exercise_volume', label: 'Exercise Volume', desc: 'Volume on a specific exercise' },
];

const DURATION_OPTIONS = [
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '30 days' },
  { days: 60, label: '60 days' },
  { days: 90, label: '90 days' },
];

export default function CreateChallengeScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metric, setMetric] = useState<Metric>('total_volume');
  const [durationDays, setDurationDays] = useState(30);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (saving) return;
    if (title.trim().length < 3) return Alert.alert('Pick a title', 'At least 3 characters.');

    setSaving(true);
    try {
      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + durationDays * 86400 * 1000);
      const res = await api.post<{ data: { challenge: { id: string } } }>('/leaderboards/challenges', {
        title: title.trim(),
        description: description.trim(),
        metric,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      });
      const newId = res.data?.challenge?.id;
      if (newId) {
        router.replace(`/challenges/${newId}` as any);
      } else {
        router.replace('/(tabs)/leaderboard');
      }
    } catch (e: any) {
      Alert.alert('Could not create', e?.error?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="New Challenge" back />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Input
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. April Volume Push"
            returnKeyType="next"
          />
          <View style={{ height: spacing.base }} />
          <Input
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="What does it take to win?"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 72, paddingTop: spacing.md }}
          />

          <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>Metric</Text>
          <View style={{ gap: spacing.sm }}>
            {METRIC_OPTIONS.map(opt => {
              const selected = metric === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setMetric(opt.key)}
                  style={[styles.optCard, selected && styles.optCardActive]}
                  accessibilityLabel={opt.label}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyEmphasis" color={selected ? 'brand' : 'textPrimary'}>{opt.label}</Text>
                    <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xxs }}>{opt.desc}</Text>
                  </View>
                  {selected && <Icon icon={Check} size={18} color={colors.brand} />}
                </Pressable>
              );
            })}
          </View>

          <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>Duration</Text>
          <View style={styles.durationGrid}>
            {DURATION_OPTIONS.map(opt => {
              const selected = durationDays === opt.days;
              return (
                <Pressable
                  key={opt.days}
                  onPress={() => setDurationDays(opt.days)}
                  style={[styles.durationPill, selected && styles.durationPillActive]}
                  accessibilityLabel={opt.label}
                >
                  <Text variant="label" color={selected ? 'textOnBrand' : 'textSecondary'}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Surface level={2} style={styles.previewCard}>
            <Text variant="overline" color="textTertiary">Preview</Text>
            <Text variant="bodyEmphasis" color="textPrimary" style={{ marginTop: spacing.xs }}>
              {title.trim() || 'New Challenge'}
            </Text>
            <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xxs }}>
              Starts now · Runs for {durationDays} days · {METRIC_OPTIONS.find(m => m.key === metric)?.label}
            </Text>
          </Surface>
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Create Challenge" onPress={handleCreate} variant="primary" size="lg" fullWidth loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.base, paddingBottom: 40 },
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  optCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, borderRadius: radii.md,
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
  },
  optCardActive: { backgroundColor: colors.brandGlow, borderColor: colors.brand },
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  durationPill: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.full, backgroundColor: colors.surface2,
  },
  durationPillActive: { backgroundColor: colors.brand },
  previewCard: { padding: spacing.md, marginTop: spacing.lg },
  footer: {
    paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing['2xl'],
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
