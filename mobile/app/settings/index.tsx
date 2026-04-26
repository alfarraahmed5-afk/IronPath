import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LogOut, ChevronRight, Shield, Bell, HelpCircle } from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Icon } from '../../src/components/Icon';
import { Pressable } from '../../src/components/Pressable';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface SettingRow {
  icon: any;
  label: string;
  description?: string;
  onPress: () => void;
  destructive?: boolean;
}

export default function SettingsScreen() {
  const router = useRouter();
  const logout = useAuthStore(s => s.logout);

  const sections: { title: string; rows: SettingRow[] }[] = [
    {
      title: 'Account',
      rows: [
        {
          icon: Shield,
          label: 'Privacy',
          description: 'Control who sees your profile',
          onPress: () => {},
        },
        {
          icon: Bell,
          label: 'Notifications',
          description: 'Manage push notifications',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Support',
      rows: [
        {
          icon: HelpCircle,
          label: 'Help & Feedback',
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="Settings" back />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text variant="overline" color="textTertiary" style={styles.sectionLabel}>{section.title}</Text>
            <Surface level={2}>
              {section.rows.map((row, idx) => (
                <Pressable
                  key={row.label}
                  onPress={row.onPress}
                  style={[
                    styles.row,
                    idx < section.rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  ]}
                  accessibilityLabel={row.label}
                >
                  <View style={[styles.rowIcon, { backgroundColor: (row.destructive ? colors.dangerDim : colors.surface3) }]}>
                    <Icon icon={row.icon} size={16} color={row.destructive ? colors.danger : colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" color={row.destructive ? 'danger' : 'textPrimary'}>{row.label}</Text>
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
            <Pressable
              onPress={async () => {
                await logout();
                router.replace('/(auth)/login');
              }}
              style={styles.row}
              accessibilityLabel="Sign out"
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.dangerDim }]}>
                <Icon icon={LogOut} size={16} color={colors.danger} />
              </View>
              <Text variant="body" color="danger" style={{ flex: 1 }}>Sign Out</Text>
            </Pressable>
          </Surface>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  section: { paddingHorizontal: spacing.base, marginBottom: spacing.lg },
  sectionLabel: { marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
