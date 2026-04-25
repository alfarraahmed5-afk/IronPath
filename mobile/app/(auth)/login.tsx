import { useState } from 'react';
import {
  View, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Mail, Lock } from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { colors, spacing } from '../../src/theme/tokens';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const res: any = await api.post('/auth/login', { email: email.trim().toLowerCase(), password });
      await login(res.data.user, res.data.access_token, res.data.refresh_token);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Login Failed', err?.error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {/* Wordmark */}
          <Text variant="display2" color="textPrimary" style={styles.wordmark}>IRONPATH</Text>
          <Text variant="body" color="textSecondary" style={styles.tagline}>
            Track your workouts. Beat your gym.
          </Text>

          {/* Fields */}
          <View style={styles.fields}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="your@email.com"
              leftIcon={<Icon icon={Mail} size={16} color={colors.textTertiary} />}
            />
            <View style={{ height: spacing.md }} />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              leftIcon={<Icon icon={Lock} size={16} color={colors.textTertiary} />}
            />
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgot}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text variant="label" color="brand">Forgot password?</Text>
          </TouchableOpacity>

          <Button
            label={loading ? 'Signing in…' : 'Sign In'}
            onPress={handleLogin}
            variant="primary"
            size="lg"
            loading={loading}
            fullWidth
          />

          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.register}>
            <Text variant="body" color="textSecondary">
              New to IronPath?{' '}
              <Text variant="bodyEmphasis" color="brand">Join with invite code</Text>
            </Text>
          </TouchableOpacity>
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
    flex: 1,
    paddingHorizontal: spacing['2xl'],
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
  },
  wordmark: {
    marginBottom: spacing.xs,
    letterSpacing: -1,
  },
  tagline: {
    marginBottom: spacing['3xl'],
  },
  fields: {
    marginBottom: spacing.md,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xl,
  },
  register: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
