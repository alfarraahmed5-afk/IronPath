import { View, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/authStore';
import { Header } from '../../src/components/Header';
import { Surface } from '../../src/components/Surface';
import { Text } from '../../src/components/Text';
import { colors, spacing } from '../../src/theme/tokens';

interface UserSettings {
  is_profile_private: boolean;
}

export default function PrivacyScreen() {
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);

  const [isPrivate, setIsPrivate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load current settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get<{ data: UserSettings }>('/users/me');
        setIsPrivate(res.data.is_profile_private);
      } catch (err) {
        console.error('Failed to load privacy settings:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleToggle = async (newValue: boolean) => {
    const previousValue = isPrivate;
    setIsPrivate(newValue);
    setIsSaving(true);

    try {
      await api.patch<{ data: UserSettings }>('/users/me', {
        is_profile_private: newValue,
      });

      // Update local auth store
      if (user) {
        setUser({ ...user, is_profile_private: newValue });
      }
    } catch (err) {
      console.error('Failed to update privacy settings:', err);
      // Revert on error
      setIsPrivate(previousValue);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="Privacy" back />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={styles.section}>
          <Surface level={2}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text variant="body" color="textPrimary">Private Profile</Text>
                <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xs }}>
                  Only approved followers can see your workouts.
                </Text>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={handleToggle}
                disabled={isSaving || isLoading}
                trackColor={{ false: colors.surface3, true: colors.brand }}
                thumbColor={colors.textPrimary}
              />
            </View>
          </Surface>
        </View>

        {isSaving && (
          <View style={styles.savingIndicator}>
            <Text variant="caption" color="textTertiary">Saving...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg
  },
  section: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.lg,
    marginTop: spacing.base,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.base,
  },
  savingIndicator: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
});
