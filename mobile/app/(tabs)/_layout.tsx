/**
 * Tabs layout -- Option B (founder Q1 lock).
 *
 * 5 tabs: Home / Train / Progress / Community / Me.
 *
 * Custom tab bar per lens 1 (icon stroke 1.75 idle -> 2.25 active, label
 * tracking shift, layout pill via Reanimated shared value). Spec authority:
 *   skills/mobile-council/lens-01-motion-designer.md (rows 26-27)
 *   skills/mobile-council/lens-05-information-architect.md (P0 tab map)
 *
 * Notes:
 *   - Renamed routes: (tabs)/index becomes the Home landing (not Feed).
 *   - Feed + Leaderboard absorbed into Community sub-tabs.
 *   - Trainer kept as a file for backwards compat but hidden from the tab
 *     bar -- linked into Train as a sub-route.
 *   - Workouts.tsx is renamed to Train via a thin re-export shim in
 *     train.tsx. Progress + Me are stub-screens until C-1 lands the real
 *     bodies in their slice; tab entries are wired up here so the IA is
 *     stable from this commit forward.
 */
import { Tabs, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View, AccessibilityRole } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  Home as HomeIcon,
  Dumbbell,
  TrendingUp,
  Users,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, spacing, radii } from '../../src/theme/tokens';
import { haptic } from '../../src/lib/haptics';
import { springModal, VERCEL_EASE } from '../../src/design-system/tokens/motion';
import { useReanimatedReduceMotion } from '../../src/design-system/motion/primitives';
import { Text } from '../../src/components/Text';

// Tab definition: order = tab order.
// `name` matches the file name under (tabs)/.
const TABS: ReadonlyArray<{
  name: string;
  label: string;
  icon: LucideIcon;
}> = [
  { name: 'index',     label: 'Home',      icon: HomeIcon  },
  { name: 'train',     label: 'Train',     icon: Dumbbell  },
  { name: 'progress',  label: 'Progress',  icon: TrendingUp },
  { name: 'community', label: 'Community', icon: Users     },
  { name: 'me',        label: 'Me',        icon: User      },
];

const HIDDEN_ROUTES = new Set<string>([
  // Legacy file kept for backwards compat; not shown in tab bar.
  // Trainer collapses into Train as a sub-route.
  'trainer',
  // Legacy profile.tsx file kept as a body for me.tsx re-export until
  // C-1's full Me redesign lands; then this entry can be removed.
  'profile',
]);

const TAB_HEIGHT = 56;
const PILL_PAD = 8;

// ---------------------------------------------------------------------------
// Custom tab bar
// ---------------------------------------------------------------------------

interface TabBarProps {
  state: { index: number; routes: { name: string; key: string }[] };
  descriptors: Record<string, any>;
  navigation: any;
  insetsBottom: number;
}

function CustomTabBar({ state, navigation, insetsBottom }: TabBarProps) {
  // Filter routes to the visible 5 in order; ignore hidden compat routes.
  const visible = useMemo(() => {
    return TABS.map((t) => {
      const route = state.routes.find((r) => r.name === t.name);
      return route ? { ...t, key: route.key } : null;
    }).filter(Boolean) as Array<typeof TABS[number] & { key: string }>;
  }, [state.routes]);

  // The pill slides between tab cells. Shared value 0..(N-1).
  const pillIndex = useSharedValue(0);
  const reduceSv = useReanimatedReduceMotion();

  // Determine the active index among `visible`.
  const activeRouteName = state.routes[state.index]?.name;
  const activeIdx = visible.findIndex((v) => v.name === activeRouteName);

  useEffect(() => {
    if (activeIdx < 0) return;
    if (reduceSv.value) {
      pillIndex.value = withTiming(activeIdx, { duration: 120, easing: VERCEL_EASE });
    } else {
      pillIndex.value = withSpring(activeIdx, springModal);
    }
  }, [activeIdx, pillIndex, reduceSv]);

  const onTabPress = useCallback(
    (routeKey: string, routeName: string, isActive: boolean) => {
      const event = navigation.emit({
        type: 'tabPress',
        target: routeKey,
        canPreventDefault: true,
      });
      if (!isActive && !event.defaultPrevented) {
        haptic.tabSwitch();
        navigation.navigate(routeName);
      } else if (isActive) {
        // Same-tab tap: fire double-tap haptic (lens 8 row 3). Route handles
        // its own scroll-to-top.
        haptic.tabDoubleTap();
      }
    },
    [navigation],
  );

  const onTabLongPress = useCallback(
    (routeKey: string) => {
      haptic.tabLongPress();
      navigation.emit({ type: 'tabLongPress', target: routeKey });
    },
    [navigation],
  );

  // Pill animated style. We compute left as a percentage of total width
  // divided by visible.length, then position within a cell.
  const pillStyle = useAnimatedStyle(() => {
    'worklet';
    const cellWidth = 100 / visible.length;
    const left = pillIndex.value * cellWidth;
    return {
      left: `${left}%`,
      width: `${cellWidth}%`,
    } as any;
  });

  return (
    <View
      style={[
        styles.bar,
        {
          height: TAB_HEIGHT + insetsBottom,
          paddingBottom: insetsBottom,
        },
      ]}
      accessibilityRole={'tablist' as AccessibilityRole}
    >
      <Animated.View pointerEvents="none" style={[styles.pillBase, pillStyle]} />
      {visible.map((t, idx) => {
        const isActive = idx === activeIdx;
        return (
          <TabCell
            key={t.key}
            tab={t}
            isActive={isActive}
            onPress={() => onTabPress(t.key, t.name, isActive)}
            onLongPress={() => onTabLongPress(t.key)}
          />
        );
      })}
    </View>
  );
}

interface TabCellProps {
  tab: typeof TABS[number];
  isActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function TabCell({ tab, isActive, onPress, onLongPress }: TabCellProps) {
  // Drive icon stroke + label tracking from a single 0..1 progress
  // shared value bound to active state.
  const progress = useSharedValue(isActive ? 1 : 0);
  const reduceSv = useReanimatedReduceMotion();

  useEffect(() => {
    if (reduceSv.value) {
      progress.value = withTiming(isActive ? 1 : 0, { duration: 120, easing: VERCEL_EASE });
    } else {
      progress.value = withSpring(isActive ? 1 : 0, springModal);
    }
  }, [isActive, progress, reduceSv]);

  // Icon scale + opacity nudges; stroke width handled on the icon component.
  const iconStyle = useAnimatedStyle(() => {
    'worklet';
    const scale = interpolate(progress.value, [0, 1], [1, 1.04], Extrapolation.CLAMP);
    return {
      transform: [{ scale }],
    };
  });

  // Stroke + tint computed on JS thread (lucide stroke is a prop, not
  // animatable through the worklet); we just toggle on active.
  const strokeWidth = isActive ? 2.25 : 1.75;
  const tint = isActive ? colors.textPrimary : colors.textTertiary;
  const Icon = tab.icon;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={tab.label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.cell}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <Animated.View style={iconStyle}>
        <Icon size={20} color={tint} strokeWidth={strokeWidth} />
      </Animated.View>
      <Text
        variant="overline"
        color={isActive ? 'textPrimary' : 'textTertiary'}
        style={[
          styles.label,
          isActive ? styles.labelActive : null,
        ]}
        numberOfLines={1}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  // On Android, gesture/button navigation bars aren't always reflected in
  // insets.bottom. Keep a safe minimum.
  const bottomInset =
    Platform.OS === 'android' ? Math.max(insets.bottom, 12) : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => (
        <CustomTabBar
          state={props.state as any}
          descriptors={props.descriptors as any}
          navigation={props.navigation as any}
          insetsBottom={bottomInset}
        />
      )}
    >
      <Tabs.Screen name="index"     options={{ title: 'Home'      }} />
      <Tabs.Screen name="train"     options={{ title: 'Train'     }} />
      <Tabs.Screen name="progress"  options={{ title: 'Progress'  }} />
      <Tabs.Screen name="community" options={{ title: 'Community' }} />
      <Tabs.Screen name="me"        options={{ title: 'Me'        }} />
      {/* Legacy / hidden routes -- kept for backwards compat. */}
      {Array.from(HIDDEN_ROUTES).map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ href: null }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface1,
    borderTopColor: colors.borderSubtle,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  pillBase: {
    position: 'absolute',
    top: PILL_PAD,
    bottom: undefined,
    height: TAB_HEIGHT - PILL_PAD * 2,
    backgroundColor: colors.brandGlow,
    borderRadius: radii.full,
    marginHorizontal: 4,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 48,
    paddingVertical: 6,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  labelActive: {
    letterSpacing: -0.1,
    fontFamily: 'Barlow_600SemiBold',
  },
});
