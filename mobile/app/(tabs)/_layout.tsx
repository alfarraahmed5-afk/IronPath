import { Tabs, router } from 'expo-router';
import { Text } from 'react-native';
import { useEffect } from 'react';
import { useAuthStore } from '../../src/stores/authStore';

export default function TabsLayout() {
  // If the user signs out (or their session is wiped by a 401) while inside
  // the tabs, kick them back to login. Without this the Sign Out button looks
  // unresponsive — logout() clears state but the tab stack stays mounted.
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#111', borderTopColor: '#222' },
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#6b7280',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Feed', tabBarLabel: 'Feed' }}
      />
      <Tabs.Screen
        name="workouts"
        options={{ title: 'Workouts', tabBarLabel: 'Workouts' }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{ title: 'Leaderboard', tabBarLabel: 'Leaders' }}
      />
      <Tabs.Screen
        name="trainer"
        options={{ title: 'AI Trainer', tabBarLabel: 'Trainer' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarLabel: 'Profile' }}
      />
    </Tabs>
  );
}
