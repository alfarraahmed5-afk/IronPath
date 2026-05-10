/**
 * FriendSparkline -- "You and {friend} both trained Tuesday" with a
 * 7-cell mini grid overlay. Lens 7 P1-3.
 *
 * Privacy: only friends the user already follows. No global discovery.
 * Defaults to opt-in by reading a per-user setting (the parent supplies).
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../../components/Text';
import { Surface } from '../../components/Surface';
import { Avatar } from '../../design-system/primitives/Avatar';
import { Pressable } from '../../design-system/primitives/Pressable';
import { colors, spacing, radii } from '../../theme/tokens';

export interface FriendSparklineDay {
  /** YYYY-MM-DD */
  date: string;
  meTrained: boolean;
  friendTrained: boolean;
}

export interface FriendSparklineProps {
  friendName: string;
  friendHandle?: string;
  friendAvatarUrl?: string;
  /** 7-day window, oldest first. */
  days: FriendSparklineDay[];
  /** Caption -- e.g. "@ali pulled 1.5x your volume this week." */
  caption?: string;
  onPress?: () => void;
}

export function FriendSparkline({
  friendName,
  friendHandle,
  friendAvatarUrl,
  days,
  caption,
  onPress,
}: FriendSparklineProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      accessibilityLabel={`${friendName}, friend training summary`}
    >
      <View style={styles.headerRow}>
        <Avatar
          avatarUrl={friendAvatarUrl}
          username={friendHandle ?? friendName}
          displayName={friendName}
          size={40}
        />
        <View style={{ flex: 1 }}>
          <Text variant="bodyEmphasis" color="textPrimary">{friendName}</Text>
          {friendHandle ? (
            <Text variant="caption" color="textTertiary">@{friendHandle}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.grid}>
        {days.slice(-7).map((d, i) => {
          const overlap = d.meTrained && d.friendTrained;
          return (
            <View key={d.date + i} style={styles.col}>
              <View
                style={[
                  styles.cell,
                  d.meTrained ? styles.cellOn : styles.cellOff,
                ]}
              />
              <View
                style={[
                  styles.cell,
                  d.friendTrained ? styles.cellOn : styles.cellOff,
                  overlap ? styles.cellOverlap : null,
                ]}
              />
            </View>
          );
        })}
      </View>
      {caption ? (
        <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.sm }}>
          {caption}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.base,
    borderRadius: radii.lg,
    backgroundColor: colors.surface2,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  grid: { flexDirection: 'row', gap: 4, marginTop: spacing.xs },
  col: { flex: 1, gap: 4 },
  cell: { height: 14, borderRadius: 3 },
  cellOn: { backgroundColor: colors.brandText },
  cellOff: { backgroundColor: colors.surface3 },
  cellOverlap: {
    borderWidth: 1,
    borderColor: colors.brandFocus,
  },
});
