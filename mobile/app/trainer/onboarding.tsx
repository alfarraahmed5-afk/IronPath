import { useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Button } from '../../src/components/Button';
import { Pressable } from '../../src/components/Pressable';
import { colors, spacing, radii } from '../../src/theme/tokens';

type Goal = 'strength' | 'hypertrophy' | 'endurance' | 'general';
type Experience = 'beginner' | 'intermediate' | 'advanced';
type Equipment = 'full_gym' | 'dumbbells' | 'bodyweight' | 'home_mixed';

const GOALS: { key: Goal; label: string; desc: string }[] = [
  { key: 'strength', label: 'Strength', desc: 'Get stronger on key lifts' },
  { key: 'hypertrophy', label: 'Hypertrophy', desc: 'Build muscle size and definition' },
  { key: 'endurance', label: 'Endurance', desc: 'Improve stamina and conditioning' },
  { key: 'general', label: 'General Fitness', desc: 'Overall health and athleticism' },
];

const EXPERIENCE_LEVELS: { key: Experience; label: string; desc: string }[] = [
  { key: 'beginner', label: 'Beginner', desc: 'Less than 1 year of training' },
  { key: 'intermediate', label: 'Intermediate', desc: '1–3 years of consistent training' },
  { key: 'advanced', label: 'Advanced', desc: '3+ years with a solid base' },
];

const EQUIPMENT_OPTIONS: { key: Equipment; label: string; desc: string }[] = [
  { key: 'full_gym', label: 'Full Gym', desc: 'Barbells, racks, machines' },
  { key: 'dumbbells', label: 'Dumbbells Only', desc: 'Dumbbell set at home or gym' },
  { key: 'bodyweight', label: 'Bodyweight', desc: 'No equipment needed' },
  { key: 'home_mixed', label: 'Home Mixed', desc: 'Bands, dumbbells, pull-up bar' },
];

const DAYS_OPTIONS = [2, 3, 4, 5, 6];

const DEFAULT_WEIGHTS: Record<Experience, { label: string; wger_id: number; weight_kg: number }[]> = {
  beginner: [
    { label: 'Squat', wger_id: 110, weight_kg: 60 },
    { label: 'Bench Press', wger_id: 192, weight_kg: 40 },
    { label: 'Deadlift', wger_id: 241, weight_kg: 80 },
    { label: 'Overhead Press', wger_id: 74, weight_kg: 30 },
    { label: 'Barbell Row', wger_id: 63, weight_kg: 50 },
  ],
  intermediate: [
    { label: 'Squat', wger_id: 110, weight_kg: 100 },
    { label: 'Bench Press', wger_id: 192, weight_kg: 70 },
    { label: 'Deadlift', wger_id: 241, weight_kg: 130 },
    { label: 'Overhead Press', wger_id: 74, weight_kg: 50 },
    { label: 'Barbell Row', wger_id: 63, weight_kg: 80 },
  ],
  advanced: [
    { label: 'Squat', wger_id: 110, weight_kg: 140 },
    { label: 'Bench Press', wger_id: 192, weight_kg: 100 },
    { label: 'Deadlift', wger_id: 241, weight_kg: 180 },
    { label: 'Overhead Press', wger_id: 74, weight_kg: 70 },
    { label: 'Barbell Row', wger_id: 63, weight_kg: 110 },
  ],
};

const TOTAL_STEPS = 5;

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.dot, i <= step ? styles.dotActive : styles.dotInactive]} />
      ))}
    </View>
  );
}

function SelectCard({ label, desc, selected, onPress }: { label: string; desc: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.selectCard, selected && styles.selectCardActive]}
      accessibilityLabel={label}
    >
      <Text variant="bodyEmphasis" color={selected ? 'brand' : 'textPrimary'}>{label}</Text>
      <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xxs }}>{desc}</Text>
    </Pressable>
  );
}

export default function TrainerOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>('strength');
  const [experience, setExperience] = useState<Experience>('beginner');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [equipment, setEquipment] = useState<Equipment>('full_gym');
  const [weights, setWeights] = useState<{ label: string; wger_id: number; weight_kg: number }[]>([]);
  const [saving, setSaving] = useState(false);

  function goNext() {
    if (step === 1 && weights.length === 0) {
      setWeights(DEFAULT_WEIGHTS[experience].map(w => ({ ...w })));
    }
    setStep(s => s + 1);
  }

  function goBack() {
    if (step === 0) { router.back(); return; }
    setStep(s => s - 1);
  }

  function updateWeight(idx: number, val: string) {
    const num = parseFloat(val);
    setWeights(prev => prev.map((w, i) => i === idx ? { ...w, weight_kg: isNaN(num) ? 0 : num } : w));
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      await api.post('/trainer/program', {
        goal,
        experience_level: experience,
        days_per_week: daysPerWeek,
        equipment,
        initial_weights: weights.map(w => ({ wger_id: w.wger_id, weight_kg: w.weight_kg })),
      });
      router.replace('/(tabs)/trainer');
    } catch {
      Alert.alert('Error', 'Failed to create program. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="AI Trainer Setup" back />

      {/* Progress dots */}
      <View style={styles.dotsContainer}>
        <StepDots step={step} total={TOTAL_STEPS} />
        <Text variant="caption" color="textTertiary">{step + 1} of {TOTAL_STEPS}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` as any }]} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {step === 0 && (
            <View>
              <Text variant="title2" color="textPrimary" style={styles.stepTitle}>What's your goal?</Text>
              <Text variant="body" color="textTertiary" style={styles.stepDesc}>We'll pick the right program template for you.</Text>
              <View style={styles.cardList}>
                {GOALS.map(g => (
                  <SelectCard key={g.key} label={g.label} desc={g.desc} selected={goal === g.key} onPress={() => setGoal(g.key)} />
                ))}
              </View>
            </View>
          )}

          {step === 1 && (
            <View>
              <Text variant="title2" color="textPrimary" style={styles.stepTitle}>Experience level?</Text>
              <Text variant="body" color="textTertiary" style={styles.stepDesc}>This determines your starting volume and progression speed.</Text>
              <View style={styles.cardList}>
                {EXPERIENCE_LEVELS.map(e => (
                  <SelectCard key={e.key} label={e.label} desc={e.desc} selected={experience === e.key} onPress={() => setExperience(e.key)} />
                ))}
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text variant="title2" color="textPrimary" style={styles.stepTitle}>Days per week?</Text>
              <Text variant="body" color="textTertiary" style={styles.stepDesc}>How many days can you train consistently?</Text>
              <View style={styles.daysGrid}>
                {DAYS_OPTIONS.map(d => (
                  <Pressable
                    key={d}
                    onPress={() => setDaysPerWeek(d)}
                    style={[styles.dayCard, daysPerWeek === d && styles.dayCardActive]}
                    accessibilityLabel={`${d} days`}
                  >
                    <Text variant="display3" color={daysPerWeek === d ? 'brand' : 'textPrimary'}>{d}</Text>
                    <Text variant="overline" color="textTertiary">days</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text variant="title2" color="textPrimary" style={styles.stepTitle}>Available equipment?</Text>
              <Text variant="body" color="textTertiary" style={styles.stepDesc}>We'll match a program to what you have access to.</Text>
              <View style={styles.cardList}>
                {EQUIPMENT_OPTIONS.map(e => (
                  <SelectCard key={e.key} label={e.label} desc={e.desc} selected={equipment === e.key} onPress={() => setEquipment(e.key)} />
                ))}
              </View>
            </View>
          )}

          {step === 4 && (
            <View>
              <Text variant="title2" color="textPrimary" style={styles.stepTitle}>Starting weights</Text>
              <Text variant="body" color="textTertiary" style={styles.stepDesc}>
                Pre-filled based on your experience. Adjust to match your current working weights.
              </Text>
              <View style={styles.weightsList}>
                {weights.map((w, idx) => (
                  <Surface key={w.wger_id} level={2} style={styles.weightRow}>
                    <Text variant="bodyEmphasis" color="textPrimary" style={{ flex: 1 }}>{w.label}</Text>
                    <View style={styles.weightInputWrap}>
                      <TextInput
                        style={styles.weightInput}
                        keyboardType="decimal-pad"
                        value={String(w.weight_kg)}
                        onChangeText={v => updateWeight(idx, v)}
                        selectTextOnFocus
                      />
                      <Text variant="label" color="textTertiary">kg</Text>
                    </View>
                  </Surface>
                ))}
              </View>
              <Surface level={2} style={styles.noteCard}>
                <Text variant="caption" color="textTertiary">
                  Your weights will adjust automatically as you train. You can always override them later.
                </Text>
              </Surface>
            </View>
          )}

          <View style={{ height: spacing['3xl'] }} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {step < TOTAL_STEPS - 1 ? (
            <Button label="Continue" onPress={goNext} variant="primary" size="lg" fullWidth />
          ) : (
            <Button
              label={saving ? 'Building…' : 'Start My Program'}
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              fullWidth
              loading={saving}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  dotsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingTop: spacing.md },
  dotsRow: { flexDirection: 'row', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: radii.full },
  dotActive: { backgroundColor: colors.brand },
  dotInactive: { backgroundColor: colors.surface3 },
  progressTrack: {
    height: 3,
    backgroundColor: colors.surface2,
    marginHorizontal: spacing.base,
    borderRadius: radii.full,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.brand, borderRadius: radii.full },
  scrollContent: { paddingHorizontal: spacing.base, paddingTop: spacing.xl },
  stepTitle: { marginBottom: spacing.xs },
  stepDesc: { marginBottom: spacing.xl },
  cardList: { gap: spacing.sm },
  selectCard: {
    padding: spacing.base,
    borderRadius: radii.lg,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectCardActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandGlow,
  },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dayCard: {
    flex: 1,
    minWidth: '28%',
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  dayCardActive: { borderColor: colors.brand, backgroundColor: colors.brandGlow },
  weightsList: { gap: spacing.sm },
  weightRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.base },
  weightInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface3, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  weightInput: {
    width: 60,
    color: colors.textPrimary,
    fontFamily: 'Barlow_400Regular',
    fontSize: 15,
    textAlign: 'right',
  },
  noteCard: { padding: spacing.base, marginTop: spacing.lg },
  footer: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
