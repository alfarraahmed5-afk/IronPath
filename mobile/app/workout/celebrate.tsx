import { useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { Text } from '../../src/components/Text';
import { Button } from '../../src/components/Button';
import { Surface } from '../../src/components/Surface';
import { Icon } from '../../src/components/Icon';
import { haptic } from '../../src/lib/haptics';
import { colors, spacing, radii } from '../../src/theme/tokens';

const AUTO_DISMISS_MS = 6000;

export default function CelebrateScreen() {
  const { prs } = useLocalSearchParams<{ prs: string }>();
  // Robust split: backend joins with " | "; tolerate legacy ",".
  const prList = prs
    ? String(prs).split(/\s*\|\s*|,(?=[A-Z])/).map(s => s.trim()).filter(Boolean)
    : [];

  useEffect(() => {
    haptic.success();
    const timer = setTimeout(() => {
      router.replace('/(tabs)/workouts');
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.root}>
      {/* Hero — fixed region */}
      <View style={styles.hero}>
        <View style={styles.trophyHalo}>
          <Icon icon={Trophy} size={72} color={colors.success} strokeWidth={1.5} />
        </View>
        <Text variant="display3" color="textPrimary" style={styles.headline}>
          Workout saved
        </Text>
        {prList.length > 0 && (
          <Text variant="overline" color="textTertiary" style={styles.prCount}>
            {prList.length} new personal record{prList.length === 1 ? '' : 's'}
          </Text>
        )}
      </View>

      {/* PR list — scrollable so 1 PR or 30 both render gracefully */}
      {prList.length > 0 && (
        <ScrollView
          style={styles.prScroll}
          contentContainerStyle={styles.prScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {prList.map((pr, i) => (
            <Surface key={i} level={2} style={styles.prChip}>
              <View style={styles.prDot} />
              <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={2} style={{ flex: 1 }}>
                {pr}
              </Text>
            </Surface>
          ))}
        </ScrollView>
      )}

      {/* Sticky bottom action */}
      <View style={styles.footer}>
        <Button
          label="Done"
          onPress={() => router.replace('/(tabs)/workouts')}
          variant="primary"
          size="lg"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: {
    alignItems: 'center',
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  trophyHalo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.successDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  headline: { textAlign: 'center', marginBottom: spacing.sm },
  prCount: { textAlign: 'center' },
  prScroll: { flex: 1 },
  prScrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  prChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand + '40',
    backgroundColor: colors.brandGlow,
    borderRadius: radii.md,
  },
  prDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.brand,
    marginRight: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
