/**
 * Help screen -- founder-rule fixes per lens 5 P0.
 *
 * Founder rule 10: WhatsApp is the only support channel.
 *   +20 10 3659 6238 -- https://wa.me/201036596238
 * Founder domain: ironpath.health is the canonical domain.
 *
 * Previously this screen used mailto links and a non-canonical
 * domain. Both have been replaced with WhatsApp CTAs + ironpath.health.
 */
import React from 'react';
import { View, ScrollView, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { MessageCircle, Bug, Shield, FileText, ChevronRight, Award } from 'lucide-react-native';
import { Header } from '../../src/components/Header';
import { Surface } from '../../src/components/Surface';
import { Text } from '../../src/components/Text';
import { Pressable } from '../../src/design-system/primitives/Pressable';
import { Icon } from '../../src/components/Icon';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface HelpLink {
  icon: any;
  label: string;
  description?: string;
  url: string;
  accent?: 'whatsapp' | 'default';
}

// Single source of truth for the support contact.
const WHATSAPP_NUMBER = '201036596238';
const WHATSAPP_BASE = `https://wa.me/${WHATSAPP_NUMBER}`;

export default function HelpScreen() {
  const links: HelpLink[] = [
    {
      icon: MessageCircle,
      label: 'Message us on WhatsApp',
      description: '+20 10 3659 6238',
      url: WHATSAPP_BASE,
      accent: 'whatsapp',
    },
    {
      icon: Bug,
      label: 'Report a bug',
      description: 'Opens WhatsApp with a prefilled report',
      url: `${WHATSAPP_BASE}?text=${encodeURIComponent('Bug report: ')}`,
      accent: 'whatsapp',
    },
    {
      icon: Shield,
      label: 'Privacy policy',
      url: 'https://ironpath.health/privacy',
    },
    {
      icon: FileText,
      label: 'Terms of service',
      url: 'https://ironpath.health/terms',
    },
    {
      icon: Award,
      label: 'Acknowledgments',
      url: 'https://ironpath.health/credits',
    },
  ];

  const handlePress = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (err) {
      // Swallow -- non-critical; the lens 5 P0 fix is the WhatsApp + domain.
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
                <View
                  style={[
                    styles.rowIcon,
                    {
                      backgroundColor:
                        link.accent === 'whatsapp' ? colors.successDim : colors.surface3,
                    },
                  ]}
                >
                  <Icon
                    icon={link.icon}
                    size={16}
                    color={link.accent === 'whatsapp' ? colors.success : colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" color="textPrimary">{link.label}</Text>
                  {link.description ? (
                    <Text variant="caption" color="textTertiary">{link.description}</Text>
                  ) : null}
                </View>
                <Icon icon={ChevronRight} size={16} color={colors.textTertiary} />
              </Pressable>
            ))}
          </Surface>
        </View>

        <View style={styles.versionSection}>
          <Text variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>
            App version {appVersion}
          </Text>
          <Text
            variant="caption"
            color="textTertiary"
            style={{ textAlign: 'center', marginTop: spacing.xs }}
          >
            ironpath.health
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
    minHeight: 48,
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
