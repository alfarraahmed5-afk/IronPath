/**
 * AddExerciseSheet -- the modal exercise picker used by active.tsx.
 * Extracted to keep the orchestrator slim. Uses pageSheet on iOS per
 * lens 3 (matching the existing legacy presentation).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  FlatList,
  ActivityIndicator,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { Search, X, Check } from 'lucide-react-native';
import { Text } from '../../../components/Text';
import { Surface } from '../../../components/Surface';
import { Icon } from '../../../components/Icon';
import { Pressable } from '../../../components/Pressable';
import { Button } from '../../../components/Button';
import { api } from '../../../lib/api';
import { haptic } from '../../../lib/haptics';
import { colors, spacing, radii } from '../../../theme/tokens';

export interface PickedExercise {
  id: string;
  name: string;
  logging_type?: string;
  equipment?: string;
  primary_muscles?: string[];
  image_url?: string;
}

export interface AddExerciseSheetProps {
  visible: boolean;
  onClose: () => void;
  onAddMany: (exs: PickedExercise[]) => void;
}

const EQUIPMENT_PILLS = ['', 'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'];

export function AddExerciseSheet({ visible, onClose, onAddMany }: AddExerciseSheetProps) {
  const [exercises, setExercises] = useState<PickedExercise[]>([]);
  const [searchText, setSearchText] = useState('');
  const [equipment, setEquipment] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ limit: '50' });
      if (searchText) params.set('search', searchText);
      if (equipment) params.set('equipment', equipment);
      api.get<any>(`/exercises?${params.toString()}`)
        .then(r => setExercises(r.data.exercises || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
  }, [visible, searchText, equipment]);

  function handleClose() {
    setSearchText('');
    setSelectedIds([]);
    setEquipment('');
    onClose();
  }

  function toggleSelect(id: string) {
    haptic.select();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleAddSelected() {
    const picks = exercises.filter(e => selectedIds.includes(e.id));
    if (picks.length === 0) return;
    onAddMany(picks);
    handleClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.pickerRoot} edges={['top']}>
        <View style={styles.pickerHeader}>
          <Text variant="title3" color="textPrimary" style={{ flex: 1 }}>
            Add Exercises{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
          </Text>
          <Pressable onPress={handleClose} accessibilityLabel="Close" style={{ paddingHorizontal: spacing.sm }}>
            <Text variant="label" color="textSecondary">Cancel</Text>
          </Pressable>
        </View>

        <View style={styles.pickerSearch}>
          <Surface level={2} style={styles.searchBar}>
            <Icon icon={Search} size={16} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor={colors.textTertiary}
              value={searchText}
              onChangeText={setSearchText}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchText.length > 0 && (
              <Pressable onPress={() => setSearchText('')} accessibilityLabel="Clear">
                <Icon icon={X} size={14} color={colors.textTertiary} />
              </Pressable>
            )}
          </Surface>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.equipScroll}>
          {EQUIPMENT_PILLS.map((eq) => {
            const active = equipment === eq;
            return (
              <Pressable
                key={eq || 'all'}
                onPress={() => setEquipment(eq)}
                style={[styles.equipPill, active && { backgroundColor: colors.brandDisplay }]}
                accessibilityLabel={eq || 'All equipment'}
              >
                <Text variant="label" color={active ? 'textOnBrand' : 'textTertiary'}>
                  {eq ? eq.charAt(0).toUpperCase() + eq.slice(1) : 'All'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.pickerLoading}>
            <ActivityIndicator color={colors.brandText} />
          </View>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const selected = selectedIds.includes(item.id);
              const initials = item.name.split(' ').slice(0, 2).map((w: string) => w.charAt(0).toUpperCase()).join('');
              return (
                <Pressable
                  onPress={() => toggleSelect(item.id)}
                  style={[styles.pickerRow, selected && { backgroundColor: colors.brandGlow }]}
                  accessibilityLabel={item.name}
                >
                  <View style={[styles.pickerCheck, selected && { backgroundColor: colors.brandDisplay, borderColor: colors.brandDisplay }]}>
                    {selected ? <Icon icon={Check} size={12} color={colors.textPrimary} strokeWidth={3} /> : null}
                  </View>
                  {item.image_url ? (
                    <ExpoImage source={{ uri: item.image_url }} style={styles.pickerThumb} contentFit="cover" cachePolicy="memory-disk" />
                  ) : (
                    <View style={[styles.pickerThumb, styles.pickerThumbFallback]}>
                      <Text variant="overline" color="textTertiary" style={{ fontSize: 10 }}>{initials}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1}>{item.name}</Text>
                    <Text variant="caption" color="textTertiary" numberOfLines={1} style={{ marginTop: spacing.xxs }}>
                      {(item.equipment || 'Other').replace(/_/g, ' ')}
                      {item.primary_muscles?.length ? ' · ' + item.primary_muscles[0] : ''}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.pickerEmpty}>
                <Text variant="body" color="textTertiary">No exercises found</Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.base }} />}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {selectedIds.length > 0 && (
          <View style={styles.pickerFooter}>
            <Button
              label={`Add ${selectedIds.length} exercise${selectedIds.length > 1 ? 's' : ''}`}
              onPress={handleAddSelected}
              variant="primary"
              size="lg"
              fullWidth
            />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pickerRoot: { flex: 1, backgroundColor: colors.bg },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pickerSearch: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderRadius: radii.md,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: 'Barlow_400Regular',
    fontSize: 15,
  },
  equipScroll: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, gap: spacing.sm },
  equipPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surface2,
  },
  pickerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  pickerCheck: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerThumb: { width: 40, height: 40, borderRadius: radii.sm, overflow: 'hidden' },
  pickerThumbFallback: { backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center' },
  pickerEmpty: { paddingVertical: spacing['3xl'], alignItems: 'center' },
  pickerFooter: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
