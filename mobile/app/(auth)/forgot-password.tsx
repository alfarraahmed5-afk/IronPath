import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { CheckCircle2, Mail } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { colors, spacing } from '../../src/theme/tokens';

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
      // Non-enumerable — always show success
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
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text variant="label" color="brand">← Back</Text>
        </TouchableOpacity>

        <Text variant="title1" color="textPrimary" style={styles.heading}>Reset Password</Text>

        {sent ? (
          <View style={styles.successBox}>
            <Icon icon={CheckCircle2} size={56} color={colors.brand} />
            <Text variant="title3" color="textPrimary" style={styles.successTitle}>Check your inbox</Text>
            <Text variant="body" color="textSecondary" style={styles.successBody}>
              If an account exists for that email, a reset link has been sent.
            </Text>
            <Button label="Back to Login" onPress={() => router.back()} variant="primary" size="lg" fullWidth style={{ marginTop: spacing.xl }} />
          </View>
        ) : (
          <View>
            <Text variant="body" color="textSecondary" style={styles.subheading}>
              Enter your email and we'll send a reset link.
            </Text>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Icon icon={Mail} size={16} color={colors.textTertiary} />}
            />
            <Button
              label={loading ? 'Sending…' : 'Send Reset Link'}
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              loading={loading}
              fullWidth
              style={{ marginTop: spacing.xl }}
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
    justifyContent: 'center',
  },
  back: { alignSelf: 'flex-start', marginBottom: spacing.xl },
  heading: { marginBottom: spacing.xl },
  subheading: { marginBottom: spacing.xl },
  successBox: { alignItems: 'center', gap: spacing.md },
  successTitle: { textAlign: 'center', marginTop: spacing.sm },
  successBody: { textAlign: 'center' },
});
