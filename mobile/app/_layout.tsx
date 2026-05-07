import '../global.css';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
  BarlowCondensed_900Black,
} from '@expo-google-fonts/barlow-condensed';
import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/stores/authStore';
import { api } from '../src/lib/api';
import { initDB } from '../src/lib/db';
import { ToastProvider } from '../src/components/Toast';

SplashScreen.preventAutoHideAsync();

// Show notifications even when the app is in the foreground.
// Without this, push notifications arrived but were silently dropped on
// Android — the user reported "notifications failing to alert".
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

// Deep-link helper used by notification taps.
function routeFromNotificationData(data: any): string | null {
  if (!data || typeof data !== 'object') return null;
  const t = String(data.type || '');
  // Comments and mentions belong to the feed (comments live in a feed-tab modal,
  // not on the workout detail screen).
  if (data.workout_id && (t === 'comment' || t === 'mention')) {
    return '/(tabs)/index';
  }
  // Likes and PRs navigate to the specific workout for context.
  if (data.workout_id && (t === 'like' || t === 'pr' || !t)) {
    return `/workouts/${data.workout_id}`;
  }
  if (data.duel_id) return `/duels/${data.duel_id}`;
  if (data.challenge_id) return `/challenges/${data.challenge_id}`;
  if (data.actor_user_id && /follow/.test(t)) return `/users/${data.actor_user_id}`;
  return null;
}

// Silently register push token if permission is already granted.
// Does NOT prompt the user — that's handled in finish.tsx.
async function registerPushTokenIfGranted() {
  try {
    const perms: any = await Notifications.getPermissionsAsync();
    if (!perms.granted && perms.status !== 'granted') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await api.post('/push-tokens', {
      token: tokenData.data,
      platform: Platform.OS as 'ios' | 'android',
    });
  } catch {
    // Non-critical — swallow silently
  }
}

export default function RootLayout() {
  const { loadFromStorage, isAuthenticated } = useAuthStore();

  const [fontsLoaded] = useFonts({
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    BarlowCondensed_900Black,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    initDB();
    loadFromStorage();
  }, []);

  // Re-register push token on every authenticated app start (token can rotate).
  useEffect(() => {
    if (isAuthenticated) {
      registerPushTokenIfGranted();
    }
  }, [isAuthenticated]);

  // Wire notification taps → deep links.
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
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
