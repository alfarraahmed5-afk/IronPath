/**
 * GoalCelebrate -- full-screen takeover when a goal completes. Lens
 * 7 P2-5 elevated to v1 by founder Q3.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Modal, StatusBar } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Hero } from '../../design-system/primitives/Hero';
import { useTheme } from '../../design-system/theme/useTheme';
import { useScreenReader } from '../../lib/a11y';
import { haptic } from '../../lib/haptics';
import { spacing, colors } from '../../theme/tokens';
import { PRBadge } from '../progress/PRBadge';
import { Goal } from './types';

export interface GoalCelebrateProps {
  visible: boolean;
  goal: Goal | null;
  exerciseName?: string | null;
  onDismiss: () => void;
  onShare?: () => void;
}

const HOLD_MS = 5000;

export function GoalCelebrate({ visible, goal, exerciseName, onDismiss, onShare }: GoalCelebrateProps) {
  const { isEnabled: srOn, announce } = useScreenReader();

  useEffect(() => {
    if (!visible || !goal) return;
    haptic.milestoneUnlock();
    announce('Goal complete.');
  }, [visible, goal?.id]);

  useEffect(() => {
    if (!visible) return;
    if (srOn) return;
    const t = setTimeout(onDismiss, HOLD_MS);
    return () => clearTimeout(t);
  }, [visible, srOn, onDismiss]);

  if (!visible || !goal) return null;

  let copy = '';
  switch (goal.goal_type) {
    case 'target_weight':
      copy = `${exerciseName ?? 'Lift'}: ${goal.target_value} ${goal.target_unit}`;
      break;
    case 'consistency':
      copy = `${goal.target_value} sessions/week, sustained.`;
      break;
    case 'bodyweight':
      copy = `Bodyweight: ${goal.target_value} ${goal.target_unit}`;
      break;
  }

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <View style={styles.backdrop}>
        <Hero
          height={1200}
          maskDirection="top"
          maskCoverage={0.6}
          kenBurns={!srOn}
          closingSeam={false}
          style={styles.heroFill}
        />
        <View style={styles.center}>
          <PRBadge size={120} icon={Trophy} halo="strong" />
          <View style={styles.copyBlock}>
            <Text variant="display3" color="textPrimary" style={styles.title}>
              Goal hit
            </Text>
            <Text variant="body" color="textSecondary" style={styles.line}>
              {copy}
            </Text>
          </View>
        </View>
        <View style={styles.footer}>
          {onShare ? (
            <Button label="Share" variant="secondary" size="md" onPress={onShare} style={{ flex: 1 }} />
          ) : null}
          <Button label="Continue" variant="primary" size="md" onPress={onDismiss} style={{ flex: 1 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000' },
  heroFill: { ...StyleSheet.absoluteFillObject as any, height: '100%' as any },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  copyBlock: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  title: { textAlign: 'center' },
  line: { textAlign: 'center', maxWidth: 320 },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.md,
  },
});
