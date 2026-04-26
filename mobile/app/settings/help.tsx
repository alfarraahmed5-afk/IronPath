import { View, ScrollView, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Mail, Bug, Shield, FileText, ChevronRight } from 'lucide-react-native';
import { Header } from '../../src/components/Header';
import { Surface } from '../../src/components/Surface';
import { Text } from '../../src/components/Text';
import { Pressable } from '../../src/components/Pressable';
import { Icon } from '../../src/components/Icon';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface HelpLink {
  icon: any;
  label: string;
  url: string;
}

export default function HelpScreen() {
  const links: HelpLink[] = [
    {
      icon: Mail,
      label: 'Email support',
      url: 'mailto:support@ironpath.app?subject=IronPath Support',
    },
    {
      icon: Bug,
      label: 'Report a bug',
      url: 'mailto:support@ironpath.app?subject=IronPath Bug Report',
    },
    {
      icon: Shield,
      label: 'Privacy policy',
      url: 'https://ironpath.app/privacy',
    },
    {
      icon: FileText,
      label: 'Terms of service',
      url: 'https://ironpath.app/terms',
    },
  ];

  const handlePress = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.error('Failed to open URL:', err);
    }
  };

  const appVersion = Constants.expoConfig?.version || 'Unknown';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="Help & Feedback" back />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={styles.section}>
          <Surface level={2}>
            {links.map((link, idx) => (
              <Pressable
                key={link.label}
                onPress={() => handlePress(link.url)}
                accessibilityLabel={link.label}
                style={[
                  styles.row,
                  idx < links.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.rowIcon, { backgroundColor: colors.surface3 }]}>
                  <Icon icon={link.icon} size={16} color={colors.textSecondary} />
                </View>
                <Text variant="body" color="textPrimary" style={{ flex: 1 }}>
                  {link.label}
                </Text>
                <Icon icon={ChevronRight} size={16} color={colors.textTertiary} />
              </Pressable>
            ))}
          </Surface>
        </View>

        <View style={styles.versionSection}>
          <Text variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>
            App version {appVersion}
          </Text>
        </View>
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
    marginTop: spacing.base,
  },
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
  versionSection: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
});
