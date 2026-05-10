/**
 * Login -- cinematic rewrite per lens 1 + lens 2.
 *
 * Visual stack:
 *  - Photo hero at the top via Hero primitive (Logan Weaver barbell
 *    macro `photo-1583454110551-21f2fa2afe61`; ships as
 *    `assets/photos/login-barbell.jpg` via MANIFEST.md). Ken Burns
 *    scale 1 -> 1.04 over 12s; 8% bottom-up ember multiply baked into
 *    the Hero primitive.
 *  - Logomark first-visit animation tracked in expo-secure-store key
 *    `login.logomark.played.v1` (mirrors marketing's
 *    `motion.svg` first-visit-only behavior).
 *  - Magnetic primary button via design-system Button.
 *  - Lowercase voice copy: "open the gym" headline + "email" /
 *    "password" labels + "sign in".
 *  - Reduce-motion fork: Hero primitive handles Ken Burns disable.
 *
 * Founder rules respected:
 *  - No em dashes.
 *  - No mailto / Cal.com / Mindbody / Glofox.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Mail, Lock } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';
import { Text } from '../../src/components/Text';
import { Input } from '../../src/components/Input';
import { Icon } from '../../src/components/Icon';
import { Hero } from '../../src/design-system/primitives/Hero';
import { Button } from '../../src/design-system/primitives/Button';
import { Pressable } from '../../src/design-system/primitives/Pressable';
import { useToast } from '../../src/design-system/primitives/Toast';
import { colors, spacing } from '../../src/theme/tokens';
import { useReduceMotion } from '../../src/design-system/motion/primitives';
import { VERCEL_EASE } from '../../src/design-system/tokens/motion';

const LOGOMARK_PLAYED_KEY = 'login.logomark.played.v1';

// Login hero photo. Ships as a JPEG until D-2's AVIF pipeline lands.
// MANIFEST.md tracks the source URL + license + attribution.
const LOGIN_HERO: { uri: string } | undefined = undefined; // expo-image renders blurhash when source is undefined
const LOGIN_HERO_BLURHASH = 'L13Im5xu00WB?wt7~qWBxujsR%t7';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [firstVisit, setFirstVisit] = useState(false);
  const { login } = useAuthStore();
  const toast = useToast();
  const reduceMotion = useReduceMotion();

  // Logomark first-visit motion. Read once on mount; persist after play.
  useEffect(() => {
    SecureStore.getItemAsync(LOGOMARK_PLAYED_KEY)
      .then((v) => setFirstVisit(v !== '1'))
      .catch(() => setFirstVisit(false));
  }, []);

  // Animate logomark in once. Shared values drive opacity + translateY.
  const logoOpacity = useSharedValue(firstVisit ? 0 : 1);
  const logoTy = useSharedValue(firstVisit ? 8 : 0);

  useEffect(() => {
    if (!firstVisit || reduceMotion) {
      logoOpacity.value = 1;
      logoTy.value = 0;
      return;
    }
    logoOpacity.value = withDelay(120, withTiming(1, { duration: 360, easing: VERCEL_EASE }));
    logoTy.value = withDelay(
      120,
      withTiming(0, { duration: 360, easing: Easing.bezier(0.32, 0.72, 0, 1) }),
    );
    SecureStore.setItemAsync(LOGOMARK_PLAYED_KEY, '1').catch(() => {});
  }, [firstVisit, reduceMotion, logoOpacity, logoTy]);

  const logoStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: logoOpacity.value,
      transform: [{ translateY: logoTy.value }],
    };
  });

  async function handleLogin() {
    if (!email.trim() || !password) {
      toast.show('enter your email and password.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res: any = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      await login(res.data.user, res.data.access_token, res.data.refresh_token);
      router.replace('/(tabs)');
    } catch (err: any) {
      toast.show(err?.error?.message || 'sign-in failed. try again.', 'error');
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
        {/* Hero photo band */}
        <Hero
          source={LOGIN_HERO}
          blurhash={LOGIN_HERO_BLURHASH}
          height={280}
          maskCoverage={0.7}
          ember
        >
          <View style={styles.heroBody}>
            <Animated.View style={logoStyle}>
              <Text variant="overline" color="brand" style={styles.brandMark}>
                IRONPATH
              </Text>
              <Text variant="display2" color="textPrimary" style={styles.headline}>
                open the gym.
              </Text>
            </Animated.View>
          </View>
        </Hero>

        <View style={styles.container}>
          {/* Fields */}
          <View style={styles.fields}>
            <Input
              label="email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@gym.com"
              leftIcon={<Icon icon={Mail} size={16} color={colors.textTertiary} />}
            />
            <View style={{ height: spacing.md }} />
            <Input
              label="password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="********"
              leftIcon={<Icon icon={Lock} size={16} color={colors.textTertiary} />}
            />
          </View>

          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            haptic="rowTap"
            accessibilityLabel="Forgot password"
            style={styles.forgot}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text variant="label" color="brand">forgot password?</Text>
          </Pressable>

          <Button
            label={loading ? 'signing in...' : 'sign in'}
            onPress={handleLogin}
            variant="primary"
            size="lg"
            loading={loading}
            fullWidth
            magnetic
          />

          <Pressable
            onPress={() => router.push('/(auth)/register')}
            haptic="rowTap"
            accessibilityLabel="Join with invite code"
            style={styles.register}
          >
            <Text variant="body" color="textSecondary">
              new to ironpath?{' '}
              <Text variant="bodyEmphasis" color="brand">join with invite code</Text>
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
    paddingTop: spacing.xl,
    paddingBottom: spacing['3xl'],
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
