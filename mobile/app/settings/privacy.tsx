/**
 * Privacy settings -- restructured per lens 5 P1.
 *
 * Sections:
 *   1. Profile visibility (private profile toggle).
 *   2. Default workout visibility (global default, kept in sync with
 *      per-workout settings).
 *   3. Leaderboard opt-out (don't surface me on the gym leaderboard).
 *
 * Backend may not yet have all fields; we fall back gracefully.
 */
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/authStore';
import { Header } from '../../src/components/Header';
import { Surface } from '../../src/components/Surface';
import { Text } from '../../src/components/Text';
import { Pressable } from '../../src/design-system/primitives/Pressable';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface UserPrivacySettings {
  is_profile_private?: boolean;
  default_workout_visibility?: 'public' | 'followers' | 'private';
  leaderboard_opt_out?: boolean;
}

const VIS_OPTIONS: { value: 'public' | 'followers' | 'private'; label: string; description: string }[] = [
  { value: 'public',    label: 'Public',           description: 'Anyone in your gym can see it.' },
  { value: 'followers', label: 'Followers only',   description: 'Only members who follow you.' },
  { value: 'private',   label: 'Just me',          description: 'Only you can see your workouts.' },
];

export default function PrivacyScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [settings, setSettings] = useState<UserPrivacySettings>({
    is_profile_private: false,
    default_workout_visibility: 'public',
    leaderboard_opt_out: false,
  });
  const [savingKey, setSavingKey] = useState<keyof UserPrivacySettings | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<{ data: UserPrivacySettings }>('/users/me');
        setSettings((prev) => ({ ...prev, ...res.data }));
      } catch {
        // Defaults remain.
      }
    }
    load();
  }, []);

  async function persist<K extends keyof UserPrivacySettings>(key: K, value: UserPrivacySettings[K]) {
    const previous = settings[key];
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSavingKey(key);
    try {
      await api.patch('/users/me', { [key]: value });
      if (key === 'is_profile_private' && user) {
        setUser({ ...user, is_profile_private: Boolean(value) });
      }
    } catch {
      setSettings((prev) => ({ ...prev, [key]: previous }));
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="Privacy" back />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Profile visibility */}
        <View style={styles.section}>
          <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>
            Profile
          </Text>
          <Surface level={2}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="body" color="textPrimary">Private profile</Text>
                <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                  Only approved followers can see your workouts.
                </Text>
              </View>
              <Switch
                value={!!settings.is_profile_private}
                onValueChange={(v) => persist('is_profile_private', v)}
                disabled={savingKey === 'is_profile_private'}
                trackColor={{ false: colors.surface3, true: colors.brand }}
                thumbColor={colors.textPrimary}
                accessibilityLabel="Private profile toggle"
              />
            </View>
          </Surface>
        </View>

        {/* Default workout visibility */}
        <View style={styles.section}>
          <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>
            Workout visibility
          </Text>
          <Text variant="caption" color="textTertiary" style={styles.sectionCaption}>
            Default for new workouts. You can change visibility per workout.
          </Text>
          <Surface level={2}>
            {VIS_OPTIONS.map((opt, idx) => {
              const selected = settings.default_workout_visibility === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => persist('default_workout_visibility', opt.value)}
                  accessibilityLabel={opt.label}
                  accessibilityState={{ selected }}
                  style={[
                    styles.row,
                    idx < VIS_OPTIONS.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="body" color="textPrimary">{opt.label}</Text>
                    <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                      {opt.description}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      { borderColor: selected ? colors.brand : colors.border },
                    ]}
                  >
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </Surface>
        </View>

        {/* Leaderboard opt-out */}
        <View style={styles.section}>
          <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>
            Leaderboard
          </Text>
          <Surface level={2}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="body" color="textPrimary">Hide me from leaderboard</Text>
                <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                  Your workouts still log, but your name doesn't appear on the gym boards.
                </Text>
              </View>
              <Switch
                value={!!settings.leaderboard_opt_out}
                onValueChange={(v) => persist('leaderboard_opt_out', v)}
                disabled={savingKey === 'leaderboard_opt_out'}
                trackColor={{ false: colors.surface3, true: colors.brand }}
                thumbColor={colors.textPrimary}
                accessibilityLabel="Hide from leaderboard"
              />
            </View>
          </Surface>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  section: { paddingHorizontal: spacing.base, marginTop: spacing.base, marginBottom: spacing.lg },
  sectionLabel: { marginBottom: 2 },
  sectionCaption: { marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.base,
    minHeight: 56,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.brand,
  },
});
