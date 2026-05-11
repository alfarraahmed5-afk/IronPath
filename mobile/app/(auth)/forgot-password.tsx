/**
 * Forgot password -- cinematic treatment matching login + register.
 *
 * Same hero treatment with quieter copy. Lowercase voice copy. No
 * em dashes. Non-enumerable success path (the API call always
 * "succeeds" from the user's POV regardless of email existence).
 */
import React, { useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { CheckCircle2, Mail, ArrowLeft } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Input } from '../../src/components/Input';
import { Hero } from '../../src/design-system/primitives/Hero';
import { Button } from '../../src/design-system/primitives/Button';
import { Pressable } from '../../src/design-system/primitives/Pressable';
import { Icon } from '../../src/components/Icon';
import { colors, spacing } from '../../src/theme/tokens';

const FORGOT_HERO_BLURHASH = 'L13Im5xu00WB?wt7~qWBxujsR%t7';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
    } catch {
      // Non-enumerable. Always show success.
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Hero source={undefined} blurhash={FORGOT_HERO_BLURHASH} height={220} maskCoverage={0.75} ember>
          <View style={styles.heroBody}>
            <Text variant="overline" color="brand" style={styles.brandMark}>
              IRONPATH
            </Text>
            <Text variant="display2" color="textPrimary" style={styles.headline}>
              {sent ? 'check your inbox.' : 'reset password.'}
            </Text>
          </View>
        </Hero>

        <View style={styles.container}>
          <Pressable
            onPress={() => router.back()}
            haptic="rowTap"
            accessibilityLabel="Back"
            style={styles.back}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={16} color={colors.brand} strokeWidth={2} />
            <Text variant="label" color="brand" style={{ marginLeft: 4 }}>back</Text>
          </Pressable>

          {sent ? (
            <View style={styles.successBox}>
              <Icon icon={CheckCircle2} size={56} color={colors.brand} />
              <Text variant="title3" color="textPrimary" style={styles.successTitle}>
                check your inbox.
              </Text>
              <Text variant="body" color="textSecondary" style={styles.successBody}>
                if an account exists for that email, a reset link has been sent.
              </Text>
              <Button
                label="back to sign in"
                onPress={() => router.back()}
                variant="primary"
                size="lg"
                fullWidth
                style={{ marginTop: spacing.xl }}
                magnetic
              />
            </View>
          ) : (
            <View>
              <Text variant="body" color="textSecondary" style={styles.subheading}>
                enter your email and we'll send a reset link.
              </Text>
              <Input
                label="email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@gym.com"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Icon icon={Mail} size={16} color={colors.textTertiary} />}
              />
              <Button
                label={loading ? 'sending...' : 'send reset link'}
                onPress={handleSubmit}
                variant="primary"
                size="lg"
                loading={loading}
                fullWidth
                style={{ marginTop: spacing.xl }}
                magnetic
              />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  heroBody: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.xl,
  },
  brandMark: {
    letterSpacing: 4,
    marginBottom: spacing.xs,
    fontFamily: 'MonaSans-SemiBold',
  },
  headline: {
    fontFamily: 'MonaSans-Bold',
    letterSpacing: -1,
    lineHeight: 40,
  },
  container: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.xl,
  },
  subheading: { marginBottom: spacing.xl },
  successBox: { alignItems: 'center', gap: spacing.md },
  successTitle: { textAlign: 'center', marginTop: spacing.sm },
  successBody: { textAlign: 'center' },
});
