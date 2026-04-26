import { View, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { api } from '../../src/lib/api';
import { Header } from '../../src/components/Header';
import { Surface } from '../../src/components/Surface';
import { Text } from '../../src/components/Text';
import { colors, spacing } from '../../src/theme/tokens';

interface NotificationSettings {
  notif_likes: boolean;
  notif_comments: boolean;
  notif_follows: boolean;
  notif_announcements: boolean;
  notif_prs: boolean;
  notif_leaderboard: boolean;
  notif_streak_milestones: boolean;
  notif_weekly_nudge: boolean;
}

type NotificationKey = keyof NotificationSettings;

export default function NotificationsScreen() {
  const [settings, setSettings] = useState<NotificationSettings>({
    notif_likes: true,
    notif_comments: true,
    notif_follows: true,
    notif_announcements: true,
    notif_prs: true,
    notif_leaderboard: true,
    notif_streak_milestones: true,
    notif_weekly_nudge: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<NotificationKey | null>(null);

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get<{ data: NotificationSettings }>('/users/me/settings');
        setSettings(res.data);
      } catch (err) {
        console.error('Failed to load notification settings:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleToggle = async (key: NotificationKey, newValue: boolean) => {
    const previousValue = settings[key];
    setSettings(prev => ({ ...prev, [key]: newValue }));
    setSavingKey(key);

    try {
      await api.patch<{ data: NotificationSettings }>('/users/me/settings', {
        [key]: newValue,
      });
    } catch (err) {
      console.error(`Failed to update ${key}:`, err);
      // Revert on error
      setSettings(prev => ({ ...prev, [key]: previousValue }));
    } finally {
      setSavingKey(null);
    }
  };

  const sections = [
    {
      title: 'Activity',
      settings: [
        { key: 'notif_likes' as NotificationKey, label: 'Likes' },
        { key: 'notif_comments' as NotificationKey, label: 'Comments' },
        { key: 'notif_follows' as NotificationKey, label: 'New followers' },
        { key: 'notif_announcements' as NotificationKey, label: '@Mentions' },
      ],
    },
    {
      title: 'Achievements',
      settings: [
        { key: 'notif_prs' as NotificationKey, label: 'Personal records' },
        { key: 'notif_streak_milestones' as NotificationKey, label: 'Streak milestones' },
        { key: 'notif_leaderboard' as NotificationKey, label: 'Leaderboard' },
      ],
    },
    {
      title: 'Reminders',
      settings: [
        { key: 'notif_weekly_nudge' as NotificationKey, label: 'Weekly workout nudge' },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="Notifications" back />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>
              {section.title}
            </Text>
            <Surface level={2}>
              {section.settings.map((item, idx) => (
                <View
                  key={item.key}
                  style={[
                    styles.settingRow,
                    idx < section.settings.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <Text variant="body" color="textPrimary" style={{ flex: 1 }}>
                    {item.label}
                  </Text>
                  <Switch
                    value={settings[item.key]}
                    onValueChange={(newValue) => handleToggle(item.key, newValue)}
                    disabled={isLoading || savingKey === item.key}
                    trackColor={{ false: colors.surface3, true: colors.brand }}
                    thumbColor={colors.textPrimary}
                  />
                </View>
              ))}
            </Surface>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  section: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.base,
  },
});
