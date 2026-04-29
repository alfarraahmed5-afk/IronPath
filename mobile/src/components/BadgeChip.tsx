import { View, StyleSheet } from 'react-native';
import { Trophy, Medal, Crown, Flame, Swords } from 'lucide-react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { colors, spacing, radii } from '../theme/tokens';

export interface Achievement {
  id?: string;
  badge_type: string;
  badge_label: string;
  badge_color?: string | null;
  metadata?: Record<string, unknown> | null;
}

const ICON_MAP: Record<string, any> = {
  top10_lifts: Trophy,
  top10_volume: Trophy,
  top10_workouts: Crown,
  top10_streak: Flame,
  challenge_winner: Medal,
  duel_winner_streak_5: Swords,
};

type Props = {
  badge: Achievement;
  size?: 'sm' | 'md';
};

export function BadgeChip({ badge, size = 'md' }: Props) {
  const IconComp = ICON_MAP[badge.badge_type] ?? Trophy;
  const accent = badge.badge_color || colors.brand;
  const iconSize = size === 'sm' ? 10 : 14;
  const padX = size === 'sm' ? spacing.xs : spacing.sm;
  const padY = size === 'sm' ? 2 : spacing.xxs;

  return (
    <View style={[
      styles.chip,
      {
        backgroundColor: accent + '22',
        borderColor: accent,
        paddingHorizontal: padX,
        paddingVertical: padY,
      },
    ]}>
      <Icon icon={IconComp} size={iconSize} color={accent} strokeWidth={2.2} />
      <Text
        variant="overline"
        style={{ color: accent, marginLeft: spacing.xxs, fontSize: size === 'sm' ? 9 : 10 }}
      >
        {badge.badge_label}
      </Text>
    </View>
  );
}

// Compact crown-only marker shown next to usernames in lists/feed.
export function BadgeMarker({ badges }: { badges: Achievement[] }) {
  if (!badges || badges.length === 0) return null;
  // Highest-priority badge (gold > silver > brand)
  const top = badges.find(b => b.badge_color === '#FFD700')
    ?? badges.find(b => b.badge_color === '#C0C0C0')
    ?? badges[0];
  const IconComp = ICON_MAP[top.badge_type] ?? Trophy;
  const accent = top.badge_color || colors.brand;
  return (
    <View style={[styles.marker, { backgroundColor: accent + '22' }]}>
      <Icon icon={IconComp} size={10} color={accent} strokeWidth={2.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.full,
  },
  marker: {
    width: 16,
    height: 16,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
});
