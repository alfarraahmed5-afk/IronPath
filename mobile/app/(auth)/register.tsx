/**
 * Register -- cinematic treatment matching login.tsx.
 *
 * Two-step state machine: invite code -> account details. The
 * returning-operator greeting "welcome to <gym_name>" appears after
 * the invite code validates.
 *
 * Visual stack:
 *  - Hero band per lens 2 (chalk-hands photo via Hero primitive).
 *  - Magnetic primary CTA.
 *  - Lowercase voice copy throughout.
 *  - No em dashes.
 *  - Toast (not Alert) on error.
 */
import React, { useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Input } from '../../src/components/Input';
import { Hero } from '../../src/design-system/primitives/Hero';
import { Button } from '../../src/design-system/primitives/Button';
import { Pressable } from '../../src/design-system/primitives/Pressable';
import { useToast } from '../../src/design-system/primitives/Toast';
import { colors, spacing } from '../../src/theme/tokens';

const REGISTER_HERO_BLURHASH = 'L37LfgMx00R*?wt7~qWBxujsR%t7';

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
  const toast = useToast();

  async function validateInvite() {
    if (!inviteCode.trim()) {
      toast.show({ tone: 'error', text: 'enter your invite code.' });
      return;
    }
    setLoading(true);
    try {
      const res: any = await api.get(`/gyms/validate-invite/${inviteCode.trim().toUpperCase()}`);
      setGymInfo(res.data);
      setStep('details');
    } catch {
      toast.show({ tone: 'error', text: 'code not found. check with your gym.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!email.trim() || !password || !username.trim()) {
      toast.show({ tone: 'error', text: 'fill in email, username, and password.' });
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
        toast.show({
          tone: 'error',
          text: fields.map((f: any) => `${f.field}: ${f.message}`).join('\n'),
        });
      } else {
        toast.show({ tone: 'error', text: err?.error?.message || 'sign-up failed. try again.' });
      }
    } finally {
      setLoading(false);
    }
  }

  const headline = step === 'invite' ? 'join the gym.' : `welcome to ${gymInfo?.gym_name ?? 'your gym'}.`;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Hero source={undefined} blurhash={REGISTER_HERO_BLURHASH} height={260} maskCoverage={0.7} ember>
          <View style={styles.heroBody}>
            <Text variant="overline" color="brand" style={styles.brandMark}>
              IRONPATH
            </Text>
            <Text variant="display2" color="textPrimary" style={styles.headline}>
              {headline}
            </Text>
          </View>
        </Hero>

        <View style={styles.container}>
          <Pressable
            onPress={() => (step === 'details' ? setStep('invite') : router.back())}
            haptic="rowTap"
            accessibilityLabel="Back"
            style={styles.back}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={16} color={colors.brand} strokeWidth={2} />
            <Text variant="label" color="brand" style={{ marginLeft: 4 }}>back</Text>
          </Pressable>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            {(['invite', 'details'] as const).map((s, i) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      step === s || (step === 'details' && i === 0) ? colors.brand : colors.surface3,
                  },
                ]}
              />
            ))}
          </View>

          {step === 'invite' ? (
            <View style={styles.section}>
              <Text variant="body" color="textSecondary" style={styles.subheading}>
                enter the invite code from your gym.
              </Text>
              <Input
                label="invite code"
                value={inviteCode}
                onChangeText={(v) => setInviteCode(v.toUpperCase())}
                autoCapitalize="characters"
                maxLength={10}
                placeholder="XXXXXXXXXX"
                style={{ fontFamily: 'JetBrainsMono_500Medium', letterSpacing: 4, fontSize: 18 }}
              />
              <View style={{ height: spacing.xl }} />
              <Button
                label={loading ? 'checking...' : 'continue'}
                onPress={validateInvite}
                variant="primary"
                size="lg"
                loading={loading}
                fullWidth
                magnetic
              />
            </View>
          ) : (
            <View style={styles.section}>
              <Text variant="body" color="textSecondary" style={styles.subheading}>
                tell us who you are. you can change any of this later in settings.
              </Text>

              <Input label="full name" value={fullName} onChangeText={setFullName} placeholder="your name" />
              <View style={{ height: spacing.md }} />
              <Input
                label="username *"
                value={username}
                onChangeText={(v) => setUsername(v.toLowerCase())}
                placeholder="yourhandle"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={{ height: spacing.md }} />
              <Input
                label="email *"
                value={email}
                onChangeText={setEmail}
                placeholder="you@gym.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={{ height: spacing.md }} />
              <Input
                label="password *"
                value={password}
                onChangeText={setPassword}
                placeholder="min. 8 characters"
                secureTextEntry
              />
              <View style={{ height: spacing.xl }} />
              <Button
                label={loading ? 'creating account...' : 'create account'}
                onPress={handleRegister}
                variant="primary"
                size="lg"
                loading={loading}
                fullWidth
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
    marginBottom: spacing.lg,
  },
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
