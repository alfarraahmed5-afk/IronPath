import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';

const ORANGE = '#FF6B35';

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

// Default initial weights per experience level
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

export default function TrainerOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>('strength');
  const [experience, setExperience] = useState<Experience>('beginner');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [equipment, setEquipment] = useState<Equipment>('full_gym');
  const [weights, setWeights] = useState<{ label: string; wger_id: number; weight_kg: number }[]>([]);
  const [saving, setSaving] = useState(false);

  const totalSteps = 5;

  function goNext() {
    if (step === 1 && weights.length === 0) {
      // Populate weight defaults when experience is confirmed
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
    <KeyboardAvoidingView
      className="flex-1 bg-gray-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View className="flex-row items-center px-4 pt-14 pb-4 border-b border-gray-800">
        <TouchableOpacity onPress={goBack} className="mr-3 p-1">
          <Text className="text-white text-xl">←</Text>
        </TouchableOpacity>
        <Text className="text-white font-bold text-xl flex-1">AI Trainer Setup</Text>
        <Text className="text-gray-500 text-sm">{step + 1}/{totalSteps}</Text>
      </View>

      {/* Progress bar */}
      <View className="h-1 bg-gray-800 mx-4 rounded-full mt-3">
        <View
          className="h-1 rounded-full"
          style={{ backgroundColor: ORANGE, width: `${((step + 1) / totalSteps) * 100}%` }}
        />
      </View>

      <ScrollView className="flex-1 px-4 pt-6" keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View>
            <Text className="text-white text-xl font-bold mb-2">What's your goal?</Text>
            <Text className="text-gray-400 text-sm mb-6">We'll pick the right program template for you.</Text>
            <View className="gap-3">
              {GOALS.map(g => (
                <TouchableOpacity
                  key={g.key}
                  onPress={() => setGoal(g.key)}
                  className="rounded-xl p-4 border-2"
                  style={{ backgroundColor: '#111827', borderColor: goal === g.key ? ORANGE : '#374151' }}
                >
                  <Text className="text-white font-semibold">{g.label}</Text>
                  <Text className="text-gray-400 text-sm mt-0.5">{g.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text className="text-white text-xl font-bold mb-2">Experience level?</Text>
            <Text className="text-gray-400 text-sm mb-6">This determines your starting volume and progression speed.</Text>
            <View className="gap-3">
              {EXPERIENCE_LEVELS.map(e => (
                <TouchableOpacity
                  key={e.key}
                  onPress={() => setExperience(e.key)}
                  className="rounded-xl p-4 border-2"
                  style={{ backgroundColor: '#111827', borderColor: experience === e.key ? ORANGE : '#374151' }}
                >
                  <Text className="text-white font-semibold">{e.label}</Text>
                  <Text className="text-gray-400 text-sm mt-0.5">{e.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text className="text-white text-xl font-bold mb-2">Days per week?</Text>
            <Text className="text-gray-400 text-sm mb-6">How many days can you train consistently?</Text>
            <View className="flex-row flex-wrap gap-3">
              {DAYS_OPTIONS.map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDaysPerWeek(d)}
                  className="rounded-xl py-4 border-2 items-center justify-center"
                  style={{
                    width: '30%',
                    backgroundColor: '#111827',
                    borderColor: daysPerWeek === d ? ORANGE : '#374151',
                  }}
                >
                  <Text
                    className="font-bold text-xl"
                    style={{ color: daysPerWeek === d ? ORANGE : '#fff' }}
                  >
                    {d}
                  </Text>
                  <Text className="text-gray-400 text-xs">days</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text className="text-white text-xl font-bold mb-2">Available equipment?</Text>
            <Text className="text-gray-400 text-sm mb-6">We'll match a program to what you have access to.</Text>
            <View className="gap-3">
              {EQUIPMENT_OPTIONS.map(e => (
                <TouchableOpacity
                  key={e.key}
                  onPress={() => setEquipment(e.key)}
                  className="rounded-xl p-4 border-2"
                  style={{ backgroundColor: '#111827', borderColor: equipment === e.key ? ORANGE : '#374151' }}
                >
                  <Text className="text-white font-semibold">{e.label}</Text>
                  <Text className="text-gray-400 text-sm mt-0.5">{e.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text className="text-white text-xl font-bold mb-2">Starting weights</Text>
            <Text className="text-gray-400 text-sm mb-6">
              These are pre-filled based on your experience. Adjust to match your current working weights.
            </Text>
            <View className="gap-4">
              {weights.map((w, idx) => (
                <View key={w.wger_id} className="flex-row items-center gap-3">
                  <Text className="text-white flex-1 font-medium">{w.label}</Text>
                  <View className="flex-row items-center bg-gray-900 rounded-xl px-3 py-2 gap-2">
                    <TextInput
                      className="text-white text-right w-16 text-base"
                      keyboardType="decimal-pad"
                      value={String(w.weight_kg)}
                      onChangeText={v => updateWeight(idx, v)}
                      selectTextOnFocus
                    />
                    <Text className="text-gray-400 text-sm">kg</Text>
                  </View>
                </View>
              ))}
            </View>
            <View className="mt-6 p-4 bg-gray-900 rounded-xl border border-gray-800">
              <Text className="text-gray-400 text-xs">
                Your weights will adjust automatically as you train. You can always override them later.
              </Text>
            </View>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>

      {/* Footer */}
      <View className="px-4 pb-10 pt-4 border-t border-gray-800">
        {step < 4 ? (
          <TouchableOpacity
            onPress={goNext}
            className="rounded-xl py-4 items-center"
            style={{ backgroundColor: ORANGE }}
          >
            <Text className="text-white font-bold text-base">Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={saving}
            className="rounded-xl py-4 items-center"
            style={{ backgroundColor: ORANGE, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">Start My Program</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
