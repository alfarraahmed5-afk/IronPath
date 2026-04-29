import '../global.css';
import { useEffect } from 'react';
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
  if (data.workout_id && (t === 'like' || t === 'comment' || t === 'pr' || t === 'mention' || !t)) {
    return `/workouts/${data.workout_id}`;
  }
  if (data.duel_id) return `/duels/${data.duel_id}`;
  if (data.challenge_id) return `/challenges/${data.challenge_id}`;
  if (data.actor_user_id && /follow/.test(t)) return `/users/${data.actor_user_id}`;
  return null;
}

export default function RootLayout() {
  const { loadFromStorage } = useAuthStore();

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
