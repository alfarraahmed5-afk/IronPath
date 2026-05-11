/**
 * Pre-built programs -- fixes the lens 5 P0 dead link.
 *
 * Today `routines/index.tsx:96` pushes to `/routines/prebuilt` but the
 * file did not exist; Expo Router 404'd. This file ships an honest
 * landing page with 3 curated programs (Strong 5x5, Push/Pull/Legs,
 * Upper/Lower).
 *
 * Each card is informational only in v1; tapping "Use this program"
 * will eventually copy the program into the user's routines (BE work).
 * For now we drop them in the standard create flow with prefilled name
 * + a tag so the user understands the program is theirs to customize.
 */
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Dumbbell, Layers, Activity } from 'lucide-react-native';
import { Header } from '../../src/components/Header';
import { Text } from '../../src/components/Text';
import { Card } from '../../src/design-system/primitives/Card';
import { Button } from '../../src/design-system/primitives/Button';
import { Icon } from '../../src/components/Icon';
import { Section } from '../../src/design-system/primitives/Section';
import { colors, spacing, radii } from '../../src/theme/tokens';

interface Program {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  highlights: string[];
  bestFor: string;
  starterName: string;
}

const PROGRAMS: Program[] = [
  {
    id: 'strong_5x5',
    title: 'Strong 5x5',
    subtitle: '3 days a week. Linear progression on the big lifts.',
    icon: Dumbbell,
    highlights: [
      'Squat / bench / row on day A.',
      'Squat / press / deadlift on day B.',
      '5 sets of 5. Add 2.5 kg every workout that you complete.',
    ],
    bestFor: 'Beginners and intermediates building a base.',
    starterName: 'Strong 5x5 (A)',
  },
  {
    id: 'ppl',
    title: 'Push, Pull, Legs',
    subtitle: '6 days a week. Higher volume, body-part split.',
    icon: Layers,
    highlights: [
      'Push: chest, shoulders, triceps.',
      'Pull: back, biceps, rear delts.',
      'Legs: quads, hamstrings, glutes, calves.',
    ],
    bestFor: 'Intermediates with time to lift 6 days a week.',
    starterName: 'PPL -- Push',
  },
  {
    id: 'upper_lower',
    title: 'Upper / Lower',
    subtitle: '4 days a week. Balanced volume and recovery.',
    icon: Activity,
    highlights: [
      'Upper A + Lower A early in the week.',
      'Upper B + Lower B later in the week.',
      'Heavy compound + accessory volume on each day.',
    ],
    bestFor: 'Anyone who wants 4 strong sessions per week.',
    starterName: 'Upper / Lower -- Upper A',
  },
];

export default function PrebuiltScreen() {
  const router = useRouter();

  function handleStart(p: Program) {
    // Bootstrap: take the user into create with a suggested name so
    // they customize the program. Full "copy a curated routine"
    // requires a backend ticket; this is the honest v1 hand-off.
    router.push({
      pathname: '/routines/create',
      params: { suggestedName: p.starterName, source: p.id },
    } as any);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="Pre-Built Programs" back />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={styles.intro}>
          <Text variant="title2" color="textPrimary">Three programs to start with.</Text>
          <Text variant="body" color="textSecondary" style={{ marginTop: spacing.xs }}>
            Each program is a starting template. Customize sets, reps, and exercises after you import.
          </Text>
        </View>

        {PROGRAMS.map((p) => (
          <View key={p.id} style={styles.cardWrap}>
            <Card level={2} variant="solid">
              <Card.Body>
                <View style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <Icon icon={p.icon} size={18} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="title3" color="textPrimary">{p.title}</Text>
                    <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                      {p.subtitle}
                    </Text>
                  </View>
                </View>

                <Section title="What it looks like">
                  {p.highlights.map((line, idx) => (
                    <View key={idx} style={styles.bulletRow}>
                      <View style={styles.bulletDot} />
                      <Text variant="body" color="textSecondary" style={{ flex: 1 }}>{line}</Text>
                    </View>
                  ))}
                </Section>

                <Section title="Best for">
                  <Text variant="body" color="textSecondary">{p.bestFor}</Text>
                </Section>

                <View style={{ marginTop: spacing.md }}>
                  <Button
                    label="Use this program"
                    onPress={() => handleStart(p)}
                    variant="primary"
                    size="md"
                    fullWidth
                  />
                </View>
              </Card.Body>
            </Card>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  intro: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  cardWrap: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.brandGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand,
    marginTop: 8,
  },
});
