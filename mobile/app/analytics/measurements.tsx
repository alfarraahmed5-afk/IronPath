import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '../../src/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  'neck_cm',
  'chest_cm',
  'waist_cm',
  'hips_cm',
  'left_arm_cm',
  'right_arm_cm',
  'left_thigh_cm',
  'right_thigh_cm',
  'left_calf_cm',
  'right_calf_cm',
];

const GRID_LABELS: Record<string, string> = {
  neck_cm: 'Neck',
  chest_cm: 'Chest',
  waist_cm: 'Waist',
  hips_cm: 'Hips',
  left_arm_cm: 'L. Arm',
  right_arm_cm: 'R. Arm',
  left_thigh_cm: 'L. Thigh',
  right_thigh_cm: 'R. Thigh',
  left_calf_cm: 'L. Calf',
  right_calf_cm: 'R. Calf',
};

function emptyDraft(): MeasurementDraft {
  return {
    bodyweight_kg: null,
    body_fat_percentage: null,
    neck_cm: null,
    chest_cm: null,
    waist_cm: null,
    hips_cm: null,
    left_arm_cm: null,
    right_arm_cm: null,
    left_thigh_cm: null,
    right_thigh_cm: null,
    left_calf_cm: null,
    right_calf_cm: null,
    notes: null,
  };
}

// ─── Add Measurement Modal ────────────────────────────────────────────────────

function AddMeasurementModal({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: (m: Measurement) => void;
}) {
  const [draft, setDraft] = useState<MeasurementDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const today = new Date();

  function setNumeric(key: keyof MeasurementDraft, raw: string) {
    const parsed = raw === '' ? null : parseFloat(raw);
    setDraft((prev) => ({ ...prev, [key]: isNaN(parsed as number) ? null : parsed }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        measured_at: new Date().toISOString(),
      };
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
        className="flex-1 bg-gray-950"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Modal header */}
        <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-gray-800">
          <Pressable onPress={handleCancel}>
            <Text className="text-gray-400 font-semibold" style={{ fontSize: 15 }}>
              Cancel
            </Text>
          </Pressable>
          <Text className="text-white font-bold" style={{ fontSize: 18 }}>
            Log Measurements
          </Text>
          <Pressable onPress={handleSave} disabled={saving}>
            <Text
              className="font-bold"
              style={{ color: saving ? '#9CA3AF' : '#FF6B35', fontSize: 15 }}
            >
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Date row */}
          <View className="py-4 border-b border-gray-800">
            <Text className="text-gray-400 text-xs mb-1">Date</Text>
            <Text className="text-white font-semibold" style={{ fontSize: 15 }}>
              {formatDate(today.toISOString())}
            </Text>
          </View>

          {/* Numeric fields */}
          {NUMERIC_FIELDS.map((field) => (
            <View
              key={field.key}
              className="flex-row items-center py-4 border-b border-gray-800"
            >
              <Text className="text-white flex-1" style={{ fontSize: 15 }}>
                {field.label}
              </Text>
              <TextInput
                className="bg-gray-800 rounded-lg px-3 py-2 text-white text-right"
                style={{ width: 100, fontSize: 15 }}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor="#6B7280"
                value={draft[field.key] != null ? String(draft[field.key]) : ''}
                onChangeText={(t) => setNumeric(field.key, t)}
              />
            </View>
          ))}

          {/* Notes */}
          <View className="py-4">
            <Text className="text-white mb-2" style={{ fontSize: 15 }}>
              Notes
            </Text>
            <TextInput
              className="bg-gray-800 rounded-xl p-3 text-white"
              style={{ fontSize: 14, minHeight: 80, textAlignVertical: 'top' }}
              placeholder="Optional notes…"
              placeholderTextColor="#6B7280"
              multiline
              value={draft.notes ?? ''}
              onChangeText={(t) => setDraft((prev) => ({ ...prev, notes: t || null }))}
            />
          </View>
        </ScrollView>

        {/* Bottom save button */}
        <View className="px-5 pb-8 pt-4 border-t border-gray-800">
          <Pressable
            className="rounded-xl py-4 items-center"
            style={{ backgroundColor: saving ? '#9CA3AF' : '#FF6B35' }}
            onPress={handleSave}
            disabled={saving}
          >
            <Text className="text-white font-bold" style={{ fontSize: 16 }}>
              {saving ? 'Saving…' : 'Save Measurement'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Measurement Card ─────────────────────────────────────────────────────────

function MeasurementCard({
  item,
  onDelete,
}: {
  item: Measurement;
  onDelete: (id: string) => void;
}) {
  const gridEntries = GRID_FIELDS.filter((k) => item[k] != null);

  function confirmDelete() {
    Alert.alert(
      'Delete Measurement',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(item.id),
        },
      ],
    );
  }

  return (
    <View className="bg-gray-900 rounded-xl mx-4 mb-4 p-4">
      {/* Header row */}
      <View className="flex-row items-start justify-between mb-2">
        <Text className="text-white font-bold" style={{ fontSize: 16 }}>
          {formatDate(item.measured_at)}
        </Text>
        <Pressable onPress={confirmDelete} hitSlop={8}>
          <Text style={{ fontSize: 18 }}>🗑️</Text>
        </Pressable>
      </View>

      {/* Bodyweight */}
      {item.bodyweight_kg != null && (
        <Text className="font-bold mb-1" style={{ color: '#FF6B35', fontSize: 22 }}>
          ⚖️ {item.bodyweight_kg} kg
        </Text>
      )}

      {/* Body fat */}
      {item.body_fat_percentage != null && (
        <Text className="text-gray-400 mb-2" style={{ fontSize: 14 }}>
          {item.body_fat_percentage}% body fat
        </Text>
      )}

      {/* Grid of other measurements */}
      {gridEntries.length > 0 && (
        <View className="flex-row flex-wrap mt-1" style={{ gap: 8 }}>
          {gridEntries.map((k) => (
            <View
              key={k}
              className="bg-gray-800 rounded-lg px-3 py-1.5"
              style={{ minWidth: '44%', flexBasis: '44%', flexGrow: 1 }}
            >
              <Text className="text-gray-400" style={{ fontSize: 11 }}>
                {GRID_LABELS[k]}
              </Text>
              <Text className="text-white font-semibold" style={{ fontSize: 14 }}>
                {item[k]} cm
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Notes */}
      {item.notes && (
        <Text className="text-gray-400 mt-3 italic" style={{ fontSize: 13 }}>
          {item.notes}
        </Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

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

  useEffect(() => {
    fetchMeasurements();
  }, [fetchMeasurements]);

  function handleSaved(m: Measurement) {
    setMeasurements((prev) => [m, ...prev]);
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/analytics/measurements/${id}`);
      setMeasurements((prev) => prev.filter((m) => m.id !== id));
    } catch {
      Alert.alert('Error', 'Could not delete measurement.');
    }
  }

  function handleLoadMore() {
    if (nextCursor && !loadingMore) {
      fetchMeasurements(nextCursor);
    }
  }

  const ListHeader = (
    <View className="flex-row items-center justify-between px-4 pt-14 pb-5">
      <Text className="text-white font-bold" style={{ fontSize: 28 }}>
        Body Measurements
      </Text>
      <Pressable
        className="rounded-full px-4 py-2"
        style={{ backgroundColor: '#FF6B35' }}
        onPress={() => setModalVisible(true)}
      >
        <Text className="text-white font-bold" style={{ fontSize: 14 }}>
          + Log
        </Text>
      </Pressable>
    </View>
  );

  const ListEmpty = loadingInitial ? (
    <View className="items-center mt-16">
      <Text className="text-gray-500">Loading…</Text>
    </View>
  ) : (
    <View className="items-center mt-16 px-8">
      <Text className="text-gray-400 text-center" style={{ fontSize: 15 }}>
        No measurements yet.{'\n'}Tap{' '}
        <Text className="font-bold" style={{ color: '#FF6B35' }}>
          + Log
        </Text>{' '}
        to record your first.
      </Text>
    </View>
  );

  const ListFooter =
    loadingMore ? (
      <View className="items-center py-6">
        <Text className="text-gray-500">Loading more…</Text>
      </View>
    ) : null;

  return (
    <View className="flex-1 bg-gray-950">
      <FlatList
        data={measurements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MeasurementCard item={item} onDelete={handleDelete} />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      />

      <AddMeasurementModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={handleSaved}
      />
    </View>
  );
}
