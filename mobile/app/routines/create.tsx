import { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Switch,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, X, Search, Check } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Pressable } from '../../src/components/Pressable';
import { Icon } from '../../src/components/Icon';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface ExerciseSearchResult {
  id: string;
  name: string;
  equipment: string | null;
  primary_muscles: string[];
  logging_type: 'weight_reps' | 'bodyweight_reps' | 'duration' | 'distance';
}

interface DraftSet {
  position: number;
  set_type: 'normal' | 'warmup' | 'dropset' | 'failure';
  target_weight_kg: number | null;
  target_reps: number | null;
  target_duration_seconds: number | null;
  target_distance_meters: number | null;
}

interface DraftExercise {
  exercise_id: string;
  exercise_name: string;
  logging_type: 'weight_reps' | 'bodyweight_reps' | 'duration' | 'distance';
  position: number;
  rest_seconds: number;
  notes: string;
  sets: DraftSet[];
}

function defaultSet(position: number): DraftSet {
  return {
    position,
    set_type: 'normal',
    target_weight_kg: null,
    target_reps: null,
    target_duration_seconds: null,
    target_distance_meters: null,
  };
}

export default function CreateRoutineScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  function addExercises(picked: ExerciseSearchResult[]) {
    setExercises(prev => {
      const next = [...prev];
      picked.forEach(p => {
        next.push({
          exercise_id: p.id,
          exercise_name: p.name,
          logging_type: p.logging_type,
          position: next.length,
          rest_seconds: 90,
          notes: '',
          sets: [defaultSet(0), defaultSet(1), defaultSet(2)],
        });
      });
      return next;
    });
    setPickerOpen(false);
  }

  function removeExercise(idx: number) {
    setExercises(prev => prev.filter((_, i) => i !== idx).map((ex, i) => ({ ...ex, position: i })));
  }

  function updateSet(exIdx: number, setIdx: number, patch: Partial<DraftSet>) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      return { ...ex, sets: ex.sets.map((s, j) => j === setIdx ? { ...s, ...patch } : s) };
    }));
  }

  function addSet(exIdx: number) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      return { ...ex, sets: [...ex.sets, defaultSet(ex.sets.length)] };
    }));
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx).map((s, j) => ({ ...s, position: j })) };
    }));
  }

  async function handleSave() {
    if (saving) return;
    if (name.trim().length < 1) return Alert.alert('Pick a name', 'Give your routine a title.');
    if (exercises.length === 0) return Alert.alert('Add exercises', 'Pick at least one exercise.');

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        is_public: isPublic,
        exercises: exercises.map(ex => ({
          exercise_id: ex.exercise_id,
          position: ex.position,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes,
          sets: ex.sets.map(s => ({
            position: s.position,
            set_type: s.set_type,
            target_weight_kg: s.target_weight_kg,
            target_reps: s.target_reps,
            target_duration_seconds: s.target_duration_seconds,
            target_distance_meters: s.target_distance_meters,
          })),
        })),
      };
      const res = await api.post<{ data: { id: string } }>('/routines', body);
      const newId = res.data?.id;
      if (newId) router.replace(`/routines/${newId}` as any);
      else router.back();
    } catch (e: any) {
      Alert.alert('Could not save', e?.error?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="New Routine" back />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Push Day A" returnKeyType="next" />
          <View style={{ height: spacing.base }} />
          <Input
            label="Description (optional)"
            value={description} onChangeText={setDescription}
            placeholder="What's the focus?"
            multiline numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 72, paddingTop: spacing.md }}
          />

          <Surface level={2} style={styles.publicRow}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyEmphasis" color="textPrimary">Make Public</Text>
              <Text variant="caption" color="textTertiary">Anyone in your gym can copy this routine</Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ true: colors.brand, false: colors.surface3 }}
              thumbColor={colors.textPrimary}
            />
          </Surface>

          <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>Exercises</Text>

          {exercises.length === 0 ? (
            <Surface level={2} style={styles.emptyExercises}>
              <Text variant="body" color="textTertiary">No exercises yet</Text>
            </Surface>
          ) : exercises.map((ex, exIdx) => (
            <Surface key={`${ex.exercise_id}-${exIdx}`} level={2} style={styles.exCard}>
              <View style={styles.exHeader}>
                <Text variant="bodyEmphasis" color="textPrimary" style={{ flex: 1 }} numberOfLines={1}>
                  {ex.exercise_name}
                </Text>
                <Pressable onPress={() => removeExercise(exIdx)} style={styles.removeBtn} accessibilityLabel="Remove exercise">
                  <Icon icon={X} size={14} color={colors.textTertiary} />
                </Pressable>
              </View>

              {/* Sets */}
              {ex.sets.map((s, setIdx) => (
                <View key={setIdx} style={styles.setRow}>
                  <Text variant="overline" color="textTertiary" style={{ width: 28 }}>{setIdx + 1}</Text>
                  {(ex.logging_type === 'weight_reps' || ex.logging_type === 'bodyweight_reps') && (
                    <>
                      <TextInput
                        style={styles.setInput}
                        placeholder="kg"
                        placeholderTextColor={colors.textDisabled}
                        keyboardType="decimal-pad"
                        value={s.target_weight_kg !== null ? String(s.target_weight_kg) : ''}
                        onChangeText={v => updateSet(exIdx, setIdx, { target_weight_kg: v ? parseFloat(v) : null })}
                      />
                      <TextInput
                        style={styles.setInput}
                        placeholder="reps"
                        placeholderTextColor={colors.textDisabled}
                        keyboardType="number-pad"
                        value={s.target_reps !== null ? String(s.target_reps) : ''}
                        onChangeText={v => updateSet(exIdx, setIdx, { target_reps: v ? parseInt(v) : null })}
                      />
                    </>
                  )}
                  {ex.logging_type === 'duration' && (
                    <TextInput
                      style={[styles.setInput, { flex: 2 }]}
                      placeholder="seconds"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="number-pad"
                      value={s.target_duration_seconds !== null ? String(s.target_duration_seconds) : ''}
                      onChangeText={v => updateSet(exIdx, setIdx, { target_duration_seconds: v ? parseInt(v) : null })}
                    />
                  )}
                  {ex.logging_type === 'distance' && (
                    <TextInput
                      style={[styles.setInput, { flex: 2 }]}
                      placeholder="meters"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="decimal-pad"
                      value={s.target_distance_meters !== null ? String(s.target_distance_meters) : ''}
                      onChangeText={v => updateSet(exIdx, setIdx, { target_distance_meters: v ? parseFloat(v) : null })}
                    />
                  )}
                  <Pressable onPress={() => removeSet(exIdx, setIdx)} style={styles.removeBtn} accessibilityLabel="Remove set">
                    <Icon icon={X} size={12} color={colors.textTertiary} />
                  </Pressable>
                </View>
              ))}

              <Pressable onPress={() => addSet(exIdx)} style={styles.addSetBtn} accessibilityLabel="Add set">
                <Icon icon={Plus} size={14} color={colors.textTertiary} />
                <Text variant="label" color="textTertiary" style={{ marginLeft: spacing.xs }}>Add Set</Text>
              </Pressable>
            </Surface>
          ))}

          <Pressable onPress={() => setPickerOpen(true)} style={styles.addExerciseBtn} accessibilityLabel="Add exercise">
            <Icon icon={Plus} size={16} color={colors.textSecondary} />
            <Text variant="bodyEmphasis" color="textSecondary" style={{ marginLeft: spacing.sm }}>Add Exercise</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Save Routine" onPress={handleSave} variant="primary" size="lg" fullWidth loading={saving} />
        </View>
      </KeyboardAvoidingView>

      <ExercisePicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onAdd={addExercises} />
    </SafeAreaView>
  );
}

function ExercisePicker({
  visible, onClose, onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (picked: ExerciseSearchResult[]) => void;
}) {
  const [exercises, setExercises] = useState<ExerciseSearchResult[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ limit: '50' });
      if (searchText) params.set('search', searchText);
      api.get<{ data: { exercises: ExerciseSearchResult[] } }>(`/exercises?${params.toString()}`)
        .then(r => setExercises(r.data?.exercises ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
  }, [visible, searchText]);

  function toggle(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleAdd() {
    const picks = exercises.filter(e => selectedIds.includes(e.id));
    setSelectedIds([]);
    setSearchText('');
    onAdd(picks);
  }

  function handleClose() {
    setSelectedIds([]);
    setSearchText('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.pickerRoot} edges={['top']}>
        <View style={styles.pickerHeader}>
          <Text variant="title3" color="textPrimary" style={{ flex: 1 }}>
            Add Exercises{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
          </Text>
          <Pressable onPress={handleClose} accessibilityLabel="Close">
            <Text variant="label" color="textSecondary">Cancel</Text>
          </Pressable>
        </View>

        <View style={styles.pickerSearch}>
          <Surface level={2} style={styles.searchBar}>
            <Icon icon={Search} size={16} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search…"
              placeholderTextColor={colors.textTertiary}
              value={searchText}
              onChangeText={setSearchText}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Surface>
        </View>

        {loading ? (
          <View style={styles.pickerLoading}><ActivityIndicator color={colors.brand} /></View>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const selected = selectedIds.includes(item.id);
              return (
                <Pressable
                  onPress={() => toggle(item.id)}
                  style={[styles.pickerRow, selected && { backgroundColor: colors.brandGlow }]}
                  accessibilityLabel={item.name}
                >
                  <View style={[styles.pickerCheck, selected && { backgroundColor: colors.brand, borderColor: colors.brand }]}>
                    {selected && <Icon icon={Check} size={12} color={colors.textPrimary} strokeWidth={3} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1}>{item.name}</Text>
                    <Text variant="caption" color="textTertiary" numberOfLines={1}>
                      {(item.equipment || 'other').replace(/_/g, ' ')}
                      {item.primary_muscles?.length ? ' · ' + item.primary_muscles[0] : ''}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}

        {selectedIds.length > 0 && (
          <View style={styles.pickerFooter}>
            <Button label={`Add ${selectedIds.length}`} onPress={handleAdd} variant="primary" size="lg" fullWidth />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.base, paddingBottom: 40 },
  publicRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.base, marginTop: spacing.base },
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  emptyExercises: { padding: spacing.lg, alignItems: 'center' },
  exCard: { padding: spacing.md, marginBottom: spacing.sm },
  exHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  removeBtn: {
    width: 28, height: 28, borderRadius: radii.full,
    backgroundColor: colors.surface3,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  setRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  setInput: {
    flex: 1,
    backgroundColor: colors.surface3,
    color: colors.textPrimary,
    fontFamily: 'Barlow_400Regular',
    fontSize: 14,
    textAlign: 'center',
    borderRadius: radii.sm,
    paddingVertical: spacing.xs,
  },
  addSetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.sm, marginTop: spacing.xs,
    borderRadius: radii.sm, backgroundColor: colors.surface3,
  },
  addExerciseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.lg, marginTop: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    borderStyle: 'dashed',
  },
  footer: {
    paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing['2xl'],
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  // Picker
  pickerRoot: { flex: 1, backgroundColor: colors.bg },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  pickerSearch: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    gap: spacing.sm, borderRadius: radii.md,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontFamily: 'Barlow_400Regular', fontSize: 15 },
  pickerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },
  pickerCheck: {
    width: 22, height: 22, borderRadius: radii.sm,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  pickerFooter: {
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
});
