/**
 * Settings -- restructured per lens 5 P1.
 *
 * Sections (top-down):
 *   1. Profile card -- avatar, username, "View profile" tap to /me.
 *   2. Account      -- Email, Password (placeholder until BE adds CRUD).
 *   3. Notifications-- Granular per-channel toggles.
 *   4. Privacy      -- Visibility + leaderboard opt-out.
 *   5. Help         -- WhatsApp + .health links (founder rule).
 *   6. About        -- Version, ToS, Privacy Policy, Acknowledgments.
 *   7. Sign Out     -- destructive, bottom.
 *
 * Founder rule reminders implemented here:
 *   - No mailto:; only WhatsApp -- handled in help.tsx.
 *   - ironpath.app -> ironpath.health -- about row links to the health
 *     domain.
 *   - No em dashes -- all copy uses periods.
 */
import React from 'react';
import { View, ScrollView, StyleSheet, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  LogOut,
  ChevronRight,
  Shield,
  Bell,
  HelpCircle,
  Info,
  User as UserIcon,
  AtSign,
} from 'lucide-react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '../../src/stores/authStore';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Icon } from '../../src/components/Icon';
import { Pressable } from '../../src/design-system/primitives/Pressable';
import { Avatar } from '../../src/components/Avatar';
import { colors, spacing, radii } from '../../src/theme/tokens';
import { haptic } from '../../src/lib/haptics';

interface SettingRow {
  icon: any;
  label: string;
  description?: string;
  onPress: () => void;
  destructive?: boolean;
}

interface SettingSection {
  title: string;
  rows: SettingRow[];
}

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const sections: SettingSection[] = [
    {
      title: 'Account',
      rows: [
        {
          icon: AtSign,
          label: 'Email & Password',
          description: 'Change your sign-in credentials',
          onPress: () => router.push('/profile/edit' as any),
        },
      ],
    },
    {
      title: 'Notifications',
      rows: [
        {
          icon: Bell,
          label: 'Push notifications',
          description: 'Per-channel toggles for likes, PRs, streaks, more',
          onPress: () => router.push('/settings/notifications' as any),
        },
      ],
    },
    {
      title: 'Privacy',
      rows: [
        {
          icon: Shield,
          label: 'Privacy & visibility',
          description: 'Control who sees your workouts and profile',
          onPress: () => router.push('/settings/privacy' as any),
        },
      ],
    },
    {
      title: 'Support',
      rows: [
        {
          icon: HelpCircle,
          label: 'Help & Feedback',
          description: 'Message us on WhatsApp',
          onPress: () => router.push('/settings/help' as any),
        },
        {
          icon: Info,
          label: 'About IronPath',
          description: 'ironpath.health',
          onPress: () => Linking.openURL('https://ironpath.health').catch(() => {}),
        },
      ],
    },
  ];

  function handleSignOut() {
    haptic.signOut();
    // Two-step confirm so accidental taps don't sign out a logged-in member.
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ],
      { cancelable: true },
    );
  }

  const appVersion = Constants.expoConfig?.version || '';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="Settings" back />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Profile card */}
        {user ? (
          <Pressable
            onPress={() => router.push('/(tabs)/me' as any)}
            accessibilityLabel="View your profile"
            style={styles.profileCard}
          >
            <Avatar
              username={user.full_name || user.username}
              avatarUrl={user.avatar_url}
              size={48}
            />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text variant="bodyEmphasis" color="textPrimary">{user.full_name || user.username}</Text>
              <Text variant="caption" color="textTertiary">@{user.username}</Text>
            </View>
            <View style={styles.viewProfileChip}>
              <Text variant="overline" color="brand">View profile</Text>
            </View>
          </Pressable>
        ) : null}

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>
              {section.title}
            </Text>
            <Surface level={2}>
              {section.rows.map((row, idx) => (
                <Pressable
                  key={row.label}
                  onPress={row.onPress}
                  style={[
                    styles.row,
                    idx < section.rows.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                  ]}
                  accessibilityLabel={row.label}
                >
                  <View
                    style={[
                      styles.rowIcon,
                      {
                        backgroundColor: row.destructive ? colors.dangerDim : colors.surface3,
                      },
                    ]}
                  >
                    <Icon
                      icon={row.icon}
                      size={16}
                      color={row.destructive ? colors.danger : colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" color={row.destructive ? 'danger' : 'textPrimary'}>
                      {row.label}
                    </Text>
                    {row.description ? (
                      <Text variant="caption" color="textTertiary">{row.description}</Text>
                    ) : null}
                  </View>
                  <Icon icon={ChevronRight} size={16} color={colors.textTertiary} />
                </Pressable>
              ))}
            </Surface>
          </View>
        ))}

        {/* Sign out */}
        <View style={styles.section}>
          <Surface level={2}>
            <Pressable onPress={handleSignOut} style={styles.row} accessibilityLabel="Sign out">
              <View style={[styles.rowIcon, { backgroundColor: colors.dangerDim }]}>
                <Icon icon={LogOut} size={16} color={colors.danger} />
              </View>
              <Text variant="body" color="danger" style={{ flex: 1 }}>Sign Out</Text>
            </Pressable>
          </Surface>
        </View>

        {/* Version footer */}
        {appVersion ? (
          <View style={styles.footer}>
            <Text variant="caption" color="textTertiary">IronPath {appVersion}</Text>
            <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>ironpath.health</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    padding: spacing.base,
    borderRadius: radii.lg,
    backgroundColor: colors.surface2,
  },
  viewProfileChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.brandGlow,
  },
  section: { paddingHorizontal: spacing.base, marginTop: spacing.lg },
  sectionLabel: { marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 48,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
});
