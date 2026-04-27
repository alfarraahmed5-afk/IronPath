import { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Camera, Check, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { api, getAccessToken } from '../../src/lib/api';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Icon } from '../../src/components/Icon';
import { Button } from '../../src/components/Button';
import { Pressable } from '../../src/components/Pressable';
import { Input } from '../../src/components/Input';
import { Sheet } from '../../src/components/Sheet';
import { colors, spacing, radii } from '../../src/theme/tokens';

type LoggingType = 'weight_reps' | 'bodyweight_reps' | 'duration' | 'distance';
type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'resistance_band' | 'other';

const LOGGING_OPTIONS: { key: LoggingType; label: string; desc: string }[] = [
  { key: 'weight_reps', label: 'Weight + Reps', desc: 'Barbell, dumbbell, machine' },
  { key: 'bodyweight_reps', label: 'Bodyweight + Reps', desc: 'Pull-ups, push-ups, dips' },
  { key: 'duration', label: 'Duration', desc: 'Plank, holds, cardio time' },
  { key: 'distance', label: 'Distance', desc: 'Running, cycling, rowing' },
];

const EQUIPMENT_OPTIONS: { key: Equipment; label: string }[] = [
  { key: 'barbell', label: 'Barbell' },
  { key: 'dumbbell', label: 'Dumbbell' },
  { key: 'machine', label: 'Machine' },
  { key: 'cable', label: 'Cable' },
  { key: 'bodyweight', label: 'Bodyweight' },
  { key: 'kettlebell', label: 'Kettlebell' },
  { key: 'resistance_band', label: 'Resistance Band' },
  { key: 'other', label: 'Other' },
];

const MUSCLES = [
  'Chest', 'Back', 'Lats', 'Traps', 'Shoulders',
  'Biceps', 'Triceps', 'Forearms',
  'Quads', 'Hamstrings', 'Glutes', 'Calves',
  'Abs', 'Core', 'Cardio',
];

export default function CreateExerciseScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [loggingType, setLoggingType] = useState<LoggingType>('weight_reps');
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [muscles, setMuscles] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string>('image/jpeg');
  const [description, setDescription] = useState('');

  const [equipSheetOpen, setEquipSheetOpen] = useState(false);
  const [muscleSheetOpen, setMuscleSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function pickPhoto() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo library access to add an image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const manip = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setPhotoUri(manip.uri);
      setPhotoMime('image/jpeg');
    } catch (e: any) {
      Alert.alert('Image error', e?.message ?? 'Could not load image.');
    }
  }

  async function handleSave() {
    if (saving) return;
    if (!name.trim()) return Alert.alert('Missing name', 'Give your exercise a name.');
    if (muscles.length === 0) return Alert.alert('Pick muscles', 'Select at least one muscle group.');

    setSaving(true);
    try {
      // The backend POST /exercises uses multer + multipart.
      // Build a FormData with optional image.
      const form = new FormData();
      form.append('name', name.trim());
      form.append('description', description);
      form.append('equipment', equipment);
      form.append('logging_type', loggingType);
      form.append('primary_muscles', JSON.stringify(muscles.map(m => m.toLowerCase())));
      form.append('secondary_muscles', JSON.stringify([]));
      if (photoUri) {
        // React Native FormData accepts { uri, name, type } shape
        form.append('image', {
          uri: photoUri,
          name: 'exercise.jpg',
          type: photoMime,
        } as any);
      }

      // Hand-roll fetch because `api` doesn't handle multipart
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
      const token = getAccessToken();
      const res = await fetch(`${apiUrl}/exercises`, {
        method: 'POST',
        body: form,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          // Don't set Content-Type — let RN set the boundary
        } as any,
      });
      const json = await res.json();
      if (!res.ok) throw json;
      const newId = json?.data?.id ?? json?.data?.exercise?.id;
      if (!newId) throw new Error('Unexpected response');
      router.replace(`/exercises/${newId}` as any);
    } catch (e: any) {
      Alert.alert('Save failed', e?.error?.message ?? e?.message ?? 'Could not create exercise.');
    } finally {
      setSaving(false);
    }
  }

  function toggleMuscle(m: string) {
    setMuscles(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  }

  const equipLabel = EQUIPMENT_OPTIONS.find(e => e.key === equipment)?.label ?? '—';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="New Exercise" back />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Photo */}
          <Pressable onPress={pickPhoto} accessibilityLabel="Add photo" style={styles.photoSection}>
            {photoUri ? (
              <View style={styles.photoWrap}>
                <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
                <Pressable
                  style={styles.photoRemove}
                  onPress={() => setPhotoUri(null)}
                  accessibilityLabel="Remove photo"
                >
                  <Icon icon={X} size={14} color={colors.textPrimary} />
                </Pressable>
              </View>
            ) : (
              <Surface level={2} style={styles.photoPlaceholder}>
                <Icon icon={Camera} size={28} color={colors.textTertiary} strokeWidth={1.5} />
                <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xs }}>Add photo (optional)</Text>
              </Surface>
            )}
          </Pressable>

          {/* Name */}
          <View style={styles.field}>
            <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Cable Lateral Raise" returnKeyType="next" />
          </View>

          {/* Logging type */}
          <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>Tracking Type</Text>
          <View style={styles.loggingGrid}>
            {LOGGING_OPTIONS.map(opt => {
              const selected = loggingType === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setLoggingType(opt.key)}
                  style={[styles.loggingCard, selected && styles.loggingCardActive]}
                  accessibilityLabel={opt.label}
                >
                  <Text variant="bodyEmphasis" color={selected ? 'brand' : 'textPrimary'}>{opt.label}</Text>
                  <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xxs }}>{opt.desc}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Equipment */}
          <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>Equipment</Text>
          <Pressable onPress={() => setEquipSheetOpen(true)} accessibilityLabel="Pick equipment" style={styles.selectorRow}>
            <Surface level={2} style={styles.selectorInner}>
              <Text variant="body" color="textPrimary" style={{ flex: 1 }}>{equipLabel}</Text>
              <Text variant="label" color="brand">Change</Text>
            </Surface>
          </Pressable>

          {/* Muscles */}
          <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>Muscles</Text>
          <Pressable onPress={() => setMuscleSheetOpen(true)} accessibilityLabel="Pick muscles" style={styles.selectorRow}>
            <Surface level={2} style={styles.selectorInner}>
              <Text variant="body" color={muscles.length ? 'textPrimary' : 'textTertiary'} style={{ flex: 1 }}>
                {muscles.length ? muscles.join(', ') : 'Select muscle groups'}
              </Text>
              <Text variant="label" color="brand">Pick</Text>
            </Surface>
          </Pressable>

          {/* Description */}
          <View style={styles.field}>
            <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.xs }}>Notes (optional)</Text>
            <Surface level={2} style={styles.descSurface}>
              <TextInput
                style={styles.descInput}
                value={description}
                onChangeText={setDescription}
                placeholder="Setup, cue, or anything you want to remember"
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
              />
            </Surface>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Save Exercise" onPress={handleSave} variant="primary" size="lg" fullWidth loading={saving} />
        </View>
      </KeyboardAvoidingView>

      {/* Equipment sheet */}
      <Sheet visible={equipSheetOpen} onClose={() => setEquipSheetOpen(false)} snapPoint={0.6}>
        <Text variant="title3" color="textPrimary" style={{ marginBottom: spacing.base }}>Equipment</Text>
        {EQUIPMENT_OPTIONS.map(opt => {
          const selected = equipment === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => { setEquipment(opt.key); setEquipSheetOpen(false); }}
              style={[styles.sheetRow, selected && { backgroundColor: colors.brandGlow }]}
              accessibilityLabel={opt.label}
            >
              <Text variant="body" color={selected ? 'brand' : 'textPrimary'} style={{ flex: 1 }}>{opt.label}</Text>
              {selected && <Icon icon={Check} size={16} color={colors.brand} />}
            </Pressable>
          );
        })}
      </Sheet>

      {/* Muscle sheet */}
      <Sheet visible={muscleSheetOpen} onClose={() => setMuscleSheetOpen(false)} snapPoint={0.85}>
        <View style={styles.muscleSheetHeader}>
          <Text variant="title3" color="textPrimary" style={{ flex: 1 }}>Muscle Groups</Text>
          <Pressable onPress={() => setMuscleSheetOpen(false)} accessibilityLabel="Done">
            <Text variant="label" color="brand">Done ({muscles.length})</Text>
          </Pressable>
        </View>
        {MUSCLES.map(m => {
          const selected = muscles.includes(m);
          return (
            <Pressable
              key={m}
              onPress={() => toggleMuscle(m)}
              style={[styles.sheetRow, selected && { backgroundColor: colors.brandGlow }]}
              accessibilityLabel={m}
            >
              <View style={[styles.muscleCheck, selected && { backgroundColor: colors.brand, borderColor: colors.brand }]}>
                {selected && <Icon icon={Check} size={12} color={colors.textPrimary} strokeWidth={3} />}
              </View>
              <Text variant="body" color="textPrimary" style={{ flex: 1, marginLeft: spacing.md }}>{m}</Text>
            </Pressable>
          );
        })}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.base, paddingBottom: 48 },
  photoSection: { alignItems: 'center', marginBottom: spacing.lg },
  photoWrap: { position: 'relative' },
  photo: { width: 200, height: 150, borderRadius: radii.md },
  photoRemove: {
    position: 'absolute', top: -8, right: -8,
    width: 28, height: 28, borderRadius: radii.full,
    backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  photoPlaceholder: {
    width: 200, height: 150, borderRadius: radii.md,
    alignItems: 'center', justifyContent: 'center',
    borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border,
  },
  field: { marginBottom: spacing.base },
  sectionLabel: { marginBottom: spacing.sm, marginTop: spacing.sm },
  loggingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.base },
  loggingCard: {
    width: '48%',
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
  },
  loggingCardActive: { backgroundColor: colors.brandGlow, borderColor: colors.brand },
  selectorRow: { marginBottom: spacing.base },
  selectorInner: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radii.md },
  descSurface: { padding: spacing.md, borderRadius: radii.md },
  descInput: {
    color: colors.textPrimary,
    fontFamily: 'Barlow_400Regular',
    fontSize: 15,
    minHeight: 60,
  },
  footer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.xxs,
  },
  muscleSheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.base },
  muscleCheck: {
    width: 22, height: 22, borderRadius: radii.sm,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
});
