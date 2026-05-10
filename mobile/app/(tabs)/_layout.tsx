import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Newspaper, Dumbbell, Trophy, Sparkles, User, LineChart, UserCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/authStore';
import { TabBarIcon } from '../../src/components/TabBarIcon';
import { colors } from '../../src/theme/tokens';

export default function TabsLayout() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  // On Android, gesture/button navigation bars aren't always reflected in
  // insets.bottom. Add a safe minimum so icons are never clipped.
  const bottomInset = Platform.OS === 'android'
    ? Math.max(insets.bottom, 12)
    : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface1,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 56 + bottomInset,
          paddingBottom: bottomInset + 4,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: 'Barlow_500Medium',
          fontSize: 10,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused }) => <TabBarIcon icon={Newspaper} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          tabBarIcon: ({ focused }) => <TabBarIcon icon={Dumbbell} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ focused }) => <TabBarIcon icon={Trophy} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="trainer"
        options={{
          title: 'Trainer',
          tabBarIcon: ({ focused }) => <TabBarIcon icon={Sparkles} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabBarIcon icon={User} focused={focused} />,
          // C-1 followup: legacy profile is retained while C-2 reconciles
          // the full Option B tab restructure. C-2's _layout.tsx will hide
          // or remove this entry; me.tsx + progress.tsx are the new homes.
          href: null,
        }}
      />
      {/* C-1 -- new Progress tab (founder Q1 Option B). C-2 will fold
          this into the full _layout restructure; the additive entries
          let founder side-load smoke-test the screen before the
          tab-bar overhaul merges. */}
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ focused }) => <TabBarIcon icon={LineChart} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ focused }) => <TabBarIcon icon={UserCircle2} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
