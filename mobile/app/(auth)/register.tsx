import { useState } from 'react';
import {
  View, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity, StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { colors, spacing, radii } from '../../src/theme/tokens';

export default function RegisterScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const [gymInfo, setGymInfo] = useState<{ gym_id: string; gym_name: string } | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [step, setStep] = useState<'invite' | 'details'>('invite');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  async function validateInvite() {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter your invite code.');
      return;
    }
    setLoading(true);
    try {
      const res: any = await api.get(`/gyms/validate-invite/${inviteCode.trim().toUpperCase()}`);
      setGymInfo(res.data);
      setStep('details');
    } catch {
      Alert.alert('Invalid Code', 'Invite code not found. Check with your gym.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!email.trim() || !password || !username.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      const res: any = await api.post('/auth/register', {
        invite_code: inviteCode.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        password,
        username: username.trim(),
        full_name: fullName.trim() || undefined,
      });
      await login(res.data.user, res.data.access_token, res.data.refresh_token);
      router.replace('/(tabs)');
    } catch (err: any) {
      const fields = err?.error?.fields;
      if (fields?.length) {
        Alert.alert('Registration Failed', fields.map((f: any) => `${f.field}: ${f.message}`).join('\n'));
      } else {
        Alert.alert('Registration Failed', err?.error?.message || 'Please try again.');
      }
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
          <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="label" color="brand">← Back</Text>
          </TouchableOpacity>

          <Text variant="title1" color="textPrimary" style={styles.heading}>Join IronPath</Text>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            {(['invite', 'details'] as const).map((s, i) => (
              <View
                key={s}
                style={[styles.stepDot, { backgroundColor: step === s || (step === 'details' && i === 0) ? colors.brand : colors.surface3 }]}
              />
            ))}
          </View>

          {step === 'invite' ? (
            <View style={styles.section}>
              <Text variant="body" color="textSecondary" style={styles.subheading}>
                Enter the invite code from your gym
              </Text>
              <Input
                label="Invite Code"
                value={inviteCode}
                onChangeText={v => setInviteCode(v.toUpperCase())}
                autoCapitalize="characters"
                maxLength={10}
                placeholder="XXXXXXXXXX"
                style={{ fontFamily: 'JetBrainsMono_500Medium', letterSpacing: 4, fontSize: 18 }}
              />
              <View style={{ height: spacing.xl }} />
              <Button
                label={loading ? 'Checking…' : 'Continue'}
                onPress={validateInvite}
                variant="primary"
                size="lg"
                loading={loading}
                fullWidth
              />
            </View>
          ) : (
            <View style={styles.section}>
              <Text variant="body" color="textSecondary" style={styles.subheading}>
                Joining <Text variant="bodyEmphasis" color="brand">{gymInfo?.gym_name}</Text>
              </Text>

              <Input label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Your name" />
              <View style={{ height: spacing.md }} />
              <Input
                label="Username *"
                value={username}
                onChangeText={v => setUsername(v.toLowerCase())}
                placeholder="yourhandle"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={{ height: spacing.md }} />
              <Input
                label="Email *"
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={{ height: spacing.md }} />
              <Input
                label="Password *"
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 characters"
                secureTextEntry
              />
              <View style={{ height: spacing.xl }} />
              <Button
                label={loading ? 'Creating account…' : 'Create Account'}
                onPress={handleRegister}
                variant="primary"
                size="lg"
                loading={loading}
                fullWidth
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
  container: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
    justifyContent: 'center',
  },
  back: { alignSelf: 'flex-start', marginBottom: spacing.xl },
  heading: { marginBottom: spacing.md },
  stepRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.xl,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subheading: { marginBottom: spacing.xl },
  section: {},
});
