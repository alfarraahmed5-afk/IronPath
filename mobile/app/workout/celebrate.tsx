import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { Text } from '../../src/components/Text';
import { Button } from '../../src/components/Button';
import { haptic } from '../../src/lib/haptics';
import { colors, spacing, radii } from '../../src/theme/tokens';

export default function CelebrateScreen() {
  const { prs } = useLocalSearchParams<{ prs: string }>();
  const prList = prs ? prs.split(',').filter(Boolean) : [];

  useEffect(() => {
    haptic.success();
    const timer = setTimeout(() => {
      router.replace('/(tabs)/workouts');
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.root}>
      <Trophy size={80} color={colors.success} strokeWidth={1.5} />

      <Text variant="display3" color="textPrimary" style={styles.headline}>Workout saved</Text>

      {prList.length > 0 && (
        <View style={styles.prSection}>
          <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.md }}>
            New Personal Records
          </Text>
          <View style={styles.prChips}>
            {prList.map((pr, i) => (
              <View key={i} style={styles.prChip}>
                <Text variant="label" color="brand">{pr}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Button
        label="Done"
        onPress={() => router.replace('/(tabs)/workouts')}
        variant="primary"
        size="lg"
        style={{ marginTop: spacing['3xl'] }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  headline: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  prSection: { alignItems: 'center', width: '100%' },
  prChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  prChip: {
    backgroundColor: colors.brandGlow,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radii.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
});
