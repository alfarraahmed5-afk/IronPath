import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
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
