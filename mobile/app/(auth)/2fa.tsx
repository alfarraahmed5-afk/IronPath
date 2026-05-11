/**
 * 2FA challenge -- super_admin login second factor.
 *
 * Phase B.5 (commit 043) added mandatory TOTP for super_admin accounts.
 * The /auth/login response returns `{ requires_2fa: true,
 * challenge_token, expires_in }` for super_admins with TOTP enrolled,
 * and login.tsx routes here with the challenge_token as a query param.
 *
 * Flow:
 *  1. User enters 6-digit TOTP code (or toggles to recovery code).
 *  2. POST /auth/2fa/verify { challenge_token, totp_code | recovery_code }.
 *  3. On success: { data: { access_token, refresh_token, user } }.
 *     authStore.login() persists the session and we route to (tabs).
 *  4. On failure: stay on this screen and surface the error.
 *
 * Voice + visual style mirrors the cinematic login screen (Hero band,
 * lowercase copy, magnetic primary button).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Hero } from '../../src/design-system/primitives/Hero';
import { Button } from '../../src/design-system/primitives/Button';
import { Pressable } from '../../src/design-system/primitives/Pressable';
import { useToast } from '../../src/design-system/primitives/Toast';
import { colors, spacing, radii } from '../../src/theme/tokens';

const LOGIN_HERO_BLURHASH = 'L13Im5xu00WB?wt7~qWBxujsR%t7';
const TOTP_LENGTH = 6;

export default function TwoFactorScreen() {
  const params = useLocalSearchParams<{ token: string }>();
  const challengeToken = String(params.token ?? '');
  const { login } = useAuthStore();
  const toast = useToast();

  const [code, setCode] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto-focus on mount so the keyboard pops up immediately.
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [recoveryMode]);

  useEffect(() => {
    // Auto-submit when the 6-digit code is complete. Matches the
    // standard authenticator-app UX.
    if (!recoveryMode && code.length === TOTP_LENGTH && !loading) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, recoveryMode]);

  async function handleVerify() {
    if (!challengeToken) {
      toast.show('session expired. sign in again.', 'error');
      router.replace('/(auth)/login');
      return;
    }

    const body: Record<string, string> = { challenge_token: challengeToken };
    if (recoveryMode) {
      if (!recoveryCode.trim()) {
        toast.show('enter a recovery code.', 'error');
        return;
      }
      body.recovery_code = recoveryCode.trim();
    } else {
      if (code.length !== TOTP_LENGTH) {
        toast.show(`enter the ${TOTP_LENGTH}-digit code.`, 'error');
        return;
      }
      body.totp_code = code;
    }

    setLoading(true);
    try {
      const res: any = await api.post('/auth/2fa/verify', body);
      await login(res.data.user, res.data.access_token, res.data.refresh_token);
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err?.error?.message || 'verification failed. try a fresh code.';
      toast.show(msg, 'error');
      // Clear the input so the user can retype without backspacing.
      if (recoveryMode) {
        setRecoveryCode('');
      } else {
        setCode('');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleToggleRecovery() {
    setRecoveryMode((v) => !v);
    setCode('');
    setRecoveryCode('');
  }

  function handleBackToLogin() {
    router.replace('/(auth)/login');
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Hero
          source={undefined}
          blurhash={LOGIN_HERO_BLURHASH}
          height={220}
          maskCoverage={0.7}
          ember
        />

        <View style={styles.container}>
          <Text variant="display3" color="textPrimary" style={styles.headline}>
            two-factor sign in
          </Text>
          <Text variant="body" color="textSecondary" style={styles.subline}>
            {recoveryMode
              ? 'enter a recovery code from when you set up 2fa.'
              : 'enter the 6-digit code from your authenticator app.'}
          </Text>

          {/* The single text input is styled to look like 6 boxes via
              letter-spacing + monospace + max length. Simpler than 6
              separate boxes and avoids the focus-jumping gymnastics. */}
          <View style={styles.fields}>
            {recoveryMode ? (
              <TextInput
                ref={inputRef}
                value={recoveryCode}
                onChangeText={setRecoveryCode}
                placeholder="recovery-code"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                editable={!loading}
                style={styles.recoveryInput}
                accessibilityLabel="recovery code"
                returnKeyType="done"
                onSubmitEditing={handleVerify}
              />
            ) : (
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, TOTP_LENGTH))}
                placeholder="000000"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                inputMode="numeric"
                textContentType="oneTimeCode"
                maxLength={TOTP_LENGTH}
                editable={!loading}
                style={styles.totpInput}
                accessibilityLabel="six digit code"
                returnKeyType="done"
                onSubmitEditing={handleVerify}
              />
            )}
          </View>

          <Button
            label={loading ? 'verifying...' : 'verify'}
            variant="primary"
            magnetic
            onPress={handleVerify}
            disabled={loading}
            style={{ marginTop: spacing.lg }}
          />

          <Pressable
            onPress={handleToggleRecovery}
            disabled={loading}
            style={styles.linkRow}
            accessibilityLabel={
              recoveryMode ? 'use authenticator code instead' : 'use recovery code instead'
            }
          >
            <Text variant="label" color="brandText">
              {recoveryMode ? 'use authenticator code instead' : 'use a recovery code'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleBackToLogin}
            disabled={loading}
            style={[styles.linkRow, { marginTop: spacing.xs }]}
            accessibilityLabel="back to sign in"
          >
            <Text variant="caption" color="textTertiary">
              back to sign in
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
  },
  container: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  headline: {
    marginBottom: spacing.xs,
  },
  subline: {
    marginBottom: spacing.xl,
  },
  fields: {
    marginTop: spacing.sm,
  },
  totpInput: {
    backgroundColor: colors.surface2,
    color: colors.textPrimary,
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 28,
    letterSpacing: 8,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recoveryInput: {
    backgroundColor: colors.surface2,
    color: colors.textPrimary,
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkRow: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
});
