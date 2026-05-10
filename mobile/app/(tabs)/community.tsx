/**
 * Community tab -- hosts Feed / Boards / Challenges sub-tabs.
 *
 * Option B IA per lens 5: this tab absorbs the legacy Feed + Leaderboard
 * tabs. Feed sub-tab consumes `features/feed/Feed`; Boards sub-tab
 * consumes `features/leaderboard/Boards`; Challenges sub-tab consumes
 * `features/community/Challenges`.
 */
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell } from 'lucide-react-native';
import Feed from '../../src/features/feed/Feed';
import Boards from '../../src/features/leaderboard/Boards';
import Challenges from '../../src/features/community/Challenges';
import { Text } from '../../src/components/Text';
import { colors, spacing, radii } from '../../src/theme/tokens';
import { haptic } from '../../src/lib/haptics';

type SubTab = 'Feed' | 'Boards' | 'Challenges';

const SUB_TABS: SubTab[] = ['Feed', 'Boards', 'Challenges'];

export default function CommunityScreen() {
  const [activeSub, setActiveSub] = useState<SubTab>('Feed');

  function renderBody() {
    switch (activeSub) {
      case 'Feed':       return <Feed />;
      case 'Boards':     return <Boards />;
      case 'Challenges': return <Challenges />;
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <Text variant="title2" color="textPrimary">Community</Text>
        <TouchableOpacity
          onPress={() => router.push('/notifications' as any)}
          style={styles.bellBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Notifications"
        >
          <Bell size={20} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Sub-tabs */}
      <View style={styles.subRow}>
        {SUB_TABS.map((sub) => (
          <TouchableOpacity
            key={sub}
            onPress={() => {
              if (sub !== activeSub) {
                haptic.segmentChange();
                setActiveSub(sub);
              }
            }}
            style={[
              styles.subPill,
              { backgroundColor: activeSub === sub ? colors.brand : colors.surface2 },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeSub === sub }}
          >
            <Text variant="label" color={activeSub === sub ? 'textOnBrand' : 'textSecondary'}>
              {sub}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>{renderBody()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  subPill: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
});
