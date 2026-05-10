/**
 * Notification settings -- per-channel toggles aligned with A-2's
 * 3-channel split (active-workout, social, pr-and-streak).
 *
 * Per lens 5 P1: each toggle gets a short description, sections are
 * named after the underlying notification channel so the user knows
 * which OS-level channel they'd silence by muting the channel
 * directly in system settings.
 */
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

interface ToggleSpec {
  key: NotificationKey;
  label: string;
  description: string;
}

interface ToggleSection {
  title: string;
  channel: string;
  caption: string;
  rows: ToggleSpec[];
}

const SECTIONS: ToggleSection[] = [
  {
    title: 'Social',
    channel: 'social',
    caption: 'Likes, comments, follows, and mentions.',
    rows: [
      { key: 'notif_likes',         label: 'Likes',         description: 'Someone hearts your workout' },
      { key: 'notif_comments',      label: 'Comments',      description: 'Replies on your workouts' },
      { key: 'notif_follows',       label: 'New followers', description: 'When someone follows you' },
      { key: 'notif_announcements', label: '@Mentions',     description: 'When someone tags you' },
    ],
  },
  {
    title: 'PRs and streaks',
    channel: 'pr-and-streak',
    caption: 'Milestones worth celebrating.',
    rows: [
      { key: 'notif_prs',                label: 'Personal records',  description: 'You hit a new PR' },
      { key: 'notif_streak_milestones',  label: 'Streak milestones', description: '2-week, 1-month, 3-month, 6-month, 1-year' },
      { key: 'notif_leaderboard',        label: 'Leaderboard',       description: 'You move up a rank in your gym' },
    ],
  },
  {
    title: 'Reminders',
    channel: 'social',
    caption: 'Optional nudges so you remember to log.',
    rows: [
      { key: 'notif_weekly_nudge', label: 'Weekly workout nudge', description: 'A friendly reminder once a week' },
    ],
  },
];

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

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get<{ data: NotificationSettings }>('/users/me/settings');
        setSettings(res.data);
      } catch {
        // Swallow; defaults render.
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleToggle = async (key: NotificationKey, newValue: boolean) => {
    const previous = settings[key];
    setSettings((prev) => ({ ...prev, [key]: newValue }));
    setSavingKey(key);
    try {
      await api.patch<{ data: NotificationSettings }>('/users/me/settings', { [key]: newValue });
    } catch {
      // Revert on error
      setSettings((prev) => ({ ...prev, [key]: previous }));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="Notifications" back />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>
              {section.title}
            </Text>
            <Text variant="caption" color="textTertiary" style={styles.sectionCaption}>
              {section.caption}
            </Text>
            <Surface level={2}>
              {section.rows.map((row, idx) => (
                <View
                  key={row.key}
                  style={[
                    styles.row,
                    idx < section.rows.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="body" color="textPrimary">{row.label}</Text>
                    <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                      {row.description}
                    </Text>
                  </View>
                  <Switch
                    value={settings[row.key]}
                    onValueChange={(v) => handleToggle(row.key, v)}
                    disabled={isLoading || savingKey === row.key}
                    trackColor={{ false: colors.surface3, true: colors.brand }}
                    thumbColor={colors.textPrimary}
                    accessibilityLabel={`${row.label} notifications`}
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
});
