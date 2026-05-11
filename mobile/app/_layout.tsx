import '../global.css';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import {
  MonaSans_400Regular,
  MonaSans_500Medium,
  MonaSans_600SemiBold,
  MonaSans_700Bold,
} from '@expo-google-fonts/mona-sans';
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/stores/authStore';
import { api } from '../src/lib/api';
import { initDB } from '../src/lib/db';
import { ToastProvider } from '../src/components/Toast';
import { ThemeProvider } from '../src/design-system/theme/ThemeProvider';
import { colors } from '../src/design-system/tokens';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/queryClient';
import { routeFromNotificationData } from '../src/lib/notificationRouter';

SplashScreen.preventAutoHideAsync();

// Splash auto-hide fallback per lens 6: if fonts hang, hide the splash
// after 3000ms so the app still launches (with system-default fonts as
// fallback).
const SPLASH_FALLBACK_MS = 3000;

// Show notifications even when the app is in the foreground.
// Without this, push notifications arrived but were silently dropped on
// Android -- the user reported "notifications failing to alert".
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // expo-notifications v0.29 introduced shouldShowBanner/shouldShowList
    // (legacy `shouldShowAlert` still maps but the new fields silence warnings)
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ---- Notification channels (Android) ----------------------------------
//
// A-2 specced 3 channels in app.json `extra.notificationChannels`:
//   active-workout (HIGH), social (DEFAULT), pr-and-streak (HIGH).
// We register all three on first authenticated boot. The legacy single
// 'default' channel is REPLACED by these three.

type ChannelImportanceName = 'MIN' | 'LOW' | 'DEFAULT' | 'HIGH' | 'MAX';
type ChannelVisibilityName = 'PUBLIC' | 'PRIVATE' | 'SECRET';

interface ChannelSpec {
  name: string;
  description?: string;
  importance: ChannelImportanceName;
  sound?: string;
  vibrationPattern?: number[];
  enableLights?: boolean;
  lightColor?: string;
  lockscreenVisibility?: ChannelVisibilityName;
  bypassDnd?: boolean;
}

function importanceFromName(n: ChannelImportanceName): Notifications.AndroidImportance {
  switch (n) {
    case 'MIN':     return Notifications.AndroidImportance.MIN;
    case 'LOW':     return Notifications.AndroidImportance.LOW;
    case 'DEFAULT': return Notifications.AndroidImportance.DEFAULT;
    case 'HIGH':    return Notifications.AndroidImportance.HIGH;
    case 'MAX':     return Notifications.AndroidImportance.MAX;
  }
}

function visibilityFromName(n: ChannelVisibilityName): Notifications.AndroidNotificationVisibility {
  switch (n) {
    case 'PUBLIC':  return Notifications.AndroidNotificationVisibility.PUBLIC;
    case 'PRIVATE': return Notifications.AndroidNotificationVisibility.PRIVATE;
    case 'SECRET':  return Notifications.AndroidNotificationVisibility.SECRET;
  }
}

async function registerNotificationChannels() {
  if (Platform.OS !== 'android') return;
  try {
    const extra: any = (Constants.expoConfig?.extra ?? {}) as any;
    const channels: Record<string, ChannelSpec> | undefined =
      extra.notificationChannels;
    if (!channels || typeof channels !== 'object') return;

    for (const [id, spec] of Object.entries(channels)) {
      const importance = importanceFromName(spec.importance);
      const config: Notifications.NotificationChannelInput = {
        name: spec.name,
        importance,
      };
      if (spec.description) config.description = spec.description;
      if (spec.sound) config.sound = spec.sound;
      if (spec.vibrationPattern) config.vibrationPattern = spec.vibrationPattern;
      if (typeof spec.enableLights === 'boolean') config.enableLights = spec.enableLights;
      if (spec.lightColor) config.lightColor = spec.lightColor;
      if (spec.lockscreenVisibility) {
        config.lockscreenVisibility = visibilityFromName(spec.lockscreenVisibility);
      }
      if (typeof spec.bypassDnd === 'boolean') config.bypassDnd = spec.bypassDnd;

      await Notifications.setNotificationChannelAsync(id, config);
    }
  } catch {
    // Non-critical -- swallow.
  }
}

// Notification deep-link routing now lives in
// `src/lib/notificationRouter.ts` so the cold-start handler in this
// file and the in-app handler in `notifications/index.tsx` share one
// map. Lens 5 P0 unify-router task.

// Silently register push token if permission is already granted.
// Does NOT prompt the user -- that's handled in finish.tsx.
async function registerPushTokenIfGranted() {
  try {
    const perms: any = await Notifications.getPermissionsAsync();
    if (!perms.granted && perms.status !== 'granted') return;
    // Channel registration happens once per boot in registerNotificationChannels()
    // -- we don't need to redeclare a 'default' channel here.
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await api.post('/push-tokens', {
      token: tokenData.data,
      platform: Platform.OS as 'ios' | 'android',
    });
  } catch {
    // Non-critical -- swallow silently
  }
}

export default function RootLayout() {
  const { loadFromStorage, isAuthenticated } = useAuthStore();

  // All fonts load via @expo-google-fonts. These packages ship TTF
  // files that Metro bundles + Android/iOS can render natively. The
  // earlier WOFF2 approach (copied from marketing/public/fonts/) was a
  // dead end: WOFF2 is a web-only format.
  //
  // Token aliases (MonaSans-Regular / MonaSans-Medium / etc.) match
  // the names in design-system/tokens/typography.ts so screens keep
  // referencing fontFamily strings unchanged.
  const [fontsLoaded] = useFonts({
    // Mona Sans -- display + title roles.
    'MonaSans-Regular':  MonaSans_400Regular,
    'MonaSans-Medium':   MonaSans_500Medium,
    'MonaSans-SemiBold': MonaSans_600SemiBold,
    'MonaSans-Bold':     MonaSans_700Bold,
    // IBM Plex Sans Arabic -- AR locale companion.
    'IBMPlexSansArabic-Regular':  IBMPlexSansArabic_400Regular,
    'IBMPlexSansArabic-Medium':   IBMPlexSansArabic_500Medium,
    'IBMPlexSansArabic-SemiBold': IBMPlexSansArabic_600SemiBold,
    'IBMPlexSansArabic-Bold':     IBMPlexSansArabic_700Bold,
    // Barlow -- body face.
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    // JetBrains Mono -- inline numerics.
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    initDB();
    loadFromStorage();
  }, []);

  // Splash auto-hide fallback. If fonts hang past 3000ms, hide the splash
  // anyway so the app launches (system-default fonts as graceful fallback).
  useEffect(() => {
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, SPLASH_FALLBACK_MS);
    return () => clearTimeout(t);
  }, []);

  // Re-register push token on every authenticated app start (token can rotate).
  // Also register the 3 notification channels on first authenticated boot
  // (idempotent on Android; no-op on iOS).
  useEffect(() => {
    if (isAuthenticated) {
      registerNotificationChannels();
      registerPushTokenIfGranted();
    }
  }, [isAuthenticated]);

  // Wire notification taps -> deep links.
  useEffect(() => {
    // Tapped while app was in foreground/background
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const target = routeFromNotificationData(data);
      if (target) router.push(target as any);
    });
    // Cold start tap
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (!response) return;
      const data = response.notification.request.content.data;
      const target = routeFromNotificationData(data);
      if (target) {
        // Defer to allow router to mount
        setTimeout(() => router.push(target as any), 600);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  // ink-950 (warm-shifted, NOT pure black). Founder rule.
                  contentStyle: { backgroundColor: colors.bg },
                }}
              >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </ToastProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
