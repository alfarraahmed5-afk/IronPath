import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, Scale } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { Pressable } from '../../src/components/Pressable';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface Measurement {
  id: string;
  measured_at: string;
  bodyweight_kg: number | null;
  body_fat_percentage: number | null;
  neck_cm: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  left_arm_cm: number | null;
  right_arm_cm: number | null;
  left_thigh_cm: number | null;
  right_thigh_cm: number | null;
  left_calf_cm: number | null;
  right_calf_cm: number | null;
  notes: string | null;
}

type MeasurementDraft = Omit<Measurement, 'id' | 'measured_at'>;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const NUMERIC_FIELDS: { key: keyof MeasurementDraft; label: string }[] = [
  { key: 'bodyweight_kg', label: 'Weight (kg)' },
  { key: 'body_fat_percentage', label: 'Body Fat %' },
  { key: 'neck_cm', label: 'Neck (cm)' },
  { key: 'chest_cm', label: 'Chest (cm)' },
  { key: 'waist_cm', label: 'Waist (cm)' },
  { key: 'hips_cm', label: 'Hips (cm)' },
  { key: 'left_arm_cm', label: 'Left Arm (cm)' },
  { key: 'right_arm_cm', label: 'Right Arm (cm)' },
  { key: 'left_thigh_cm', label: 'Left Thigh (cm)' },
  { key: 'right_thigh_cm', label: 'Right Thigh (cm)' },
  { key: 'left_calf_cm', label: 'Left Calf (cm)' },
  { key: 'right_calf_cm', label: 'Right Calf (cm)' },
];

const GRID_FIELDS: (keyof Omit<MeasurementDraft, 'bodyweight_kg' | 'body_fat_percentage' | 'notes'>)[] = [
  'neck_cm', 'chest_cm', 'waist_cm', 'hips_cm',
  'left_arm_cm', 'right_arm_cm', 'left_thigh_cm', 'right_thigh_cm',
  'left_calf_cm', 'right_calf_cm',
];

const GRID_LABELS: Record<string, string> = {
  neck_cm: 'Neck', chest_cm: 'Chest', waist_cm: 'Waist', hips_cm: 'Hips',
  left_arm_cm: 'L. Arm', right_arm_cm: 'R. Arm',
  left_thigh_cm: 'L. Thigh', right_thigh_cm: 'R. Thigh',
  left_calf_cm: 'L. Calf', right_calf_cm: 'R. Calf',
};

function emptyDraft(): MeasurementDraft {
  return {
    bodyweight_kg: null, body_fat_percentage: null,
    neck_cm: null, chest_cm: null, waist_cm: null, hips_cm: null,
    left_arm_cm: null, right_arm_cm: null,
    left_thigh_cm: null, right_thigh_cm: null,
    left_calf_cm: null, right_calf_cm: null, notes: null,
  };
}

function AddMeasurementModal({
  visible, onClose, onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: (m: Measurement) => void;
}) {
  const [draft, setDraft] = useState<MeasurementDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  function setNumeric(key: keyof MeasurementDraft, raw: string) {
    const parsed = raw === '' ? null : parseFloat(raw);
    setDraft((prev) => ({ ...prev, [key]: isNaN(parsed as number) ? null : parsed }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { measured_at: new Date().toISOString() };
      for (const f of NUMERIC_FIELDS) {
        if (draft[f.key] != null) payload[f.key] = draft[f.key];
      }
      if (draft.notes) payload.notes = draft.notes;
      const res = await api.post<{ data: { measurement: Measurement } }>('/analytics/measurements', payload);
      onSaved(res.data.measurement);
      setDraft(emptyDraft());
      onClose();
    } catch {
      Alert.alert('Error', 'Could not save measurement.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(emptyDraft());
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Modal header */}
        <View style={styles.modalHeader}>
          <Pressable onPress={handleCancel} accessibilityLabel="Cancel">
            <Text variant="label" color="textSecondary">Cancel</Text>
          </Pressable>
          <Text variant="title3" color="textPrimary">Log Measurements</Text>
          <Pressable onPress={handleSave} accessibilityLabel="Save">
            <Text variant="label" color={saving ? 'textDisabled' : 'brand'}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.modalScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Date */}
          <View style={styles.dateRow}>
            <Text variant="overline" color="textTertiary">Date</Text>
            <Text variant="bodyEmphasis" color="textPrimary">{formatDate(new Date().toISOString())}</Text>
          </View>

          {/* Fields */}
          {NUMERIC_FIELDS.map((field) => (
            <View key={field.key} style={styles.fieldRow}>
              <Text variant="body" color="textPrimary" style={{ flex: 1 }}>{field.label}</Text>
              <TextInput
                style={styles.fieldInput}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={colors.textTertiary}
                value={draft[field.key] != null ? String(draft[field.key]) : ''}
                onChangeText={(t) => setNumeric(field.key, t)}
              />
            </View>
          ))}

          {/* Notes */}
          <View style={styles.notesSection}>
            <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.sm }}>Notes</Text>
            <Surface level={2} style={styles.notesInput}>
              <TextInput
                style={styles.notesText}
                placeholder="Optional notes…"
                placeholderTextColor={colors.textTertiary}
                multiline
                value={draft.notes ?? ''}
                onChangeText={(t) => setDraft((prev) => ({ ...prev, notes: t || null }))}
              />
            </Surface>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button
            label={saving ? 'Saving…' : 'Save Measurement'}
            onPress={handleSave}
            variant="primary"
            size="lg"
            fullWidth
            loading={saving}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MeasurementCard({ item, onDelete }: { item: Measurement; onDelete: (id: string) => void }) {
  const gridEntries = GRID_FIELDS.filter((k) => item[k] != null);

  function confirmDelete() {
    Alert.alert('Delete Measurement', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  }

  return (
    <Surface level={2} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text variant="bodyEmphasis" color="textPrimary">{formatDate(item.measured_at)}</Text>
        <Pressable onPress={confirmDelete} accessibilityLabel="Delete measurement">
          <Icon icon={Trash2} size={18} color={colors.danger} />
        </Pressable>
      </View>

      {item.bodyweight_kg != null && (
        <View style={styles.weightRow}>
          <Icon icon={Scale} size={18} color={colors.brand} />
          <Text variant="numeric" color="brand" style={{ marginLeft: spacing.sm }}>
            {item.bodyweight_kg} kg
          </Text>
        </View>
      )}

      {item.body_fat_percentage != null && (
        <Text variant="caption" color="textTertiary" style={{ marginBottom: spacing.sm }}>
          {item.body_fat_percentage}% body fat
        </Text>
      )}

      {gridEntries.length > 0 && (
        <View style={styles.gridWrap}>
          {gridEntries.map((k) => (
            <Surface key={k} level={3} style={styles.gridCell}>
              <Text variant="overline" color="textTertiary">{GRID_LABELS[k]}</Text>
              <Text variant="bodyEmphasis" color="textPrimary" style={{ marginTop: spacing.xxs }}>
                {item[k]} cm
              </Text>
            </Surface>
          ))}
        </View>
      )}

      {item.notes ? (
        <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.sm, fontStyle: 'italic' }}>
          {item.notes}
        </Text>
      ) : null}
    </Surface>
  );
}

export default function MeasurementsScreen() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchMeasurements = useCallback(async (cursor?: string) => {
    const isInitial = !cursor;
    if (isInitial) setLoadingInitial(true);
    else setLoadingMore(true);
    try {
      const url = cursor
        ? `/analytics/measurements?cursor=${encodeURIComponent(cursor)}`
        : '/analytics/measurements';
      const res = await api.get<{ data: { measurements: Measurement[]; next_cursor: string | null } }>(url);
      const { measurements: fetched, next_cursor } = res.data;
      setMeasurements((prev) => (isInitial ? fetched : [...prev, ...fetched]));
      setNextCursor(next_cursor);
    } catch {
      Alert.alert('Error', 'Could not load measurements.');
    } finally {
      if (isInitial) setLoadingInitial(false);
      else setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchMeasurements(); }, [fetchMeasurements]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header
        title="Measurements"
        back
        right={
          <Pressable
            onPress={() => setModalVisible(true)}
            style={styles.addBtn}
            accessibilityLabel="Log measurement"
          >
            <Icon icon={Plus} size={18} color={colors.textOnBrand} />
          </Pressable>
        }
      />

      <FlatList
        data={measurements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <MeasurementCard item={item} onDelete={async (id) => {
              try {
                await api.delete(`/analytics/measurements/${id}`);
                setMeasurements((prev) => prev.filter((m) => m.id !== id));
              } catch {
                Alert.alert('Error', 'Could not delete measurement.');
              }
            }} />
          </View>
        )}
        ListEmptyComponent={
          loadingInitial ? null : (
            <EmptyState
              title="No measurements yet"
              description="Tap the + button to record your first."
              action={{ label: 'Log Measurement', onPress: () => setModalVisible(true) }}
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <Text variant="caption" color="textTertiary">Loading more…</Text>
            </View>
          ) : null
        }
        onEndReached={() => { if (nextCursor && !loadingMore) fetchMeasurements(nextCursor); }}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48, flexGrow: 1 }}
      />

      <AddMeasurementModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={(m) => setMeasurements((prev) => [m, ...prev])}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: { paddingHorizontal: spacing.base, marginBottom: spacing.md },
  card: { padding: spacing.base },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  weightRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  gridCell: { padding: spacing.sm, minWidth: '44%', flex: 1 },
  footer: { paddingVertical: spacing.lg, alignItems: 'center' },
  // Modal
  modalRoot: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalScroll: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  dateRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  fieldInput: {
    width: 100,
    backgroundColor: colors.surface2,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontFamily: 'Barlow_400Regular',
    fontSize: 15,
    textAlign: 'right',
  },
  notesSection: { paddingTop: spacing.lg },
  notesInput: { padding: spacing.md },
  notesText: {
    color: colors.textPrimary,
    fontFamily: 'Barlow_400Regular',
    fontSize: 15,
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
