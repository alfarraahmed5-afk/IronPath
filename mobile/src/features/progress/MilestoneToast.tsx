/**
 * MilestoneToast -- full-screen takeover when a badge unlocks.
 *
 * Lens 7 P0-6 spec:
 *   - Covers the active screen with a dark-photo backdrop + ember.
 *   - Hex medallion stamps in via PRBadge.
 *   - Headline + voice copy line per badge type (mapped below).
 *   - "Add to showcase" + "Share" + "Continue" CTAs.
 *   - 4-second auto-dismiss by default. Founder Q4 lock: auto-
 *     dismiss DISABLED when screen reader is on. Multiple stacked
 *     badges play sequentially.
 *
 * The mapping covers the 14 legacy badges PLUS the 7 new streak-
 * tier badges from migration 052.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Trophy, Crown, Star, Flame } from 'lucide-react-native';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Hero } from '../../design-system/primitives/Hero';
import { useTheme } from '../../design-system/theme/useTheme';
import { useScreenReader } from '../../lib/a11y';
import { haptic } from '../../lib/haptics';
import { spacing, colors } from '../../theme/tokens';
import { PRBadge } from './PRBadge';

const DISMISS_MS = 4000;

export interface MilestoneInfo {
  badge_key: string;
  // Optional override label (otherwise mapped below).
  label?: string;
}

const BADGE_COPY: Record<string, { title: string; line: string; icon: typeof Trophy; color?: string }> = {
  // Legacy keys
  first_rep:     { title: 'First Rep',     line: 'Welcome under the bar.',                    icon: Star },
  ten_strong:    { title: '10 Strong',     line: '10 workouts in the books. The iron club.', icon: Trophy },
  half_century:  { title: 'Half Century',  line: '50 workouts. The grind shows up.',         icon: Trophy },
  century:       { title: 'Century',       line: '100 workouts. The century mark.',           icon: Crown },
  iron_month:    { title: 'Iron Month',    line: '30 days, no missed week.',                  icon: Flame, color: '#FF7A3D' },
  iron_quarter:  { title: 'Iron Quarter',  line: '90 days, no missed week.',                  icon: Flame, color: '#FF7A3D' },
  pr_machine:    { title: 'PR Machine',    line: '5 PRs in a single workout.',                icon: Trophy },
  heavy_lifter:  { title: 'Heavy Lifter',  line: 'First 4-plate lift.',                       icon: Trophy },
  consistent:    { title: 'Consistent',    line: '30-day consistency.',                       icon: Star },
  early_bird:    { title: 'Early Bird',    line: '10 workouts before 7am.',                   icon: Star },
  night_owl:     { title: 'Night Owl',     line: '10 workouts after 9pm.',                    icon: Star },
  gym_legend:    { title: 'Gym Legend',    line: '500 workouts. Built in stone.',             icon: Crown },
  top10_lifts:   { title: 'Top 10 Lifts',  line: 'Top 10 in your gym this month.',            icon: Trophy },
  top10_volume:  { title: 'Top 10 Volume', line: 'Top 10 volume in your gym.',                icon: Trophy },
  top10_workouts:{ title: 'Top 10 Sessions', line: 'Top 10 sessions logged this month.',     icon: Trophy },
  top10_streak: { title: 'Top 10 Streak',  line: 'Top 10 longest streak this month.',         icon: Flame, color: '#FF7A3D' },
  challenge_winner: { title: 'Challenge Winner', line: 'Won the challenge.',                  icon: Crown },
  duel_winner_streak_5: { title: '5-Duel Streak', line: 'Won 5 duels in a row.',              icon: Crown },
  // New streak-tier ladder (migration 052)
  iron_streak_2w: { title: '2 Week Streak',  line: 'Two full weeks. Lock it in.',             icon: Flame, color: '#FF7A3D' },
  iron_streak_1m: { title: '1 Month Streak', line: 'A full month of showing up.',             icon: Flame, color: '#FF7A3D' },
  iron_streak_3m: { title: '3 Month Streak', line: 'A quarter under the bar.',                icon: Flame, color: '#FF7A3D' },
  iron_streak_6m: { title: '6 Month Streak', line: 'Half a year. Built in.',                  icon: Flame, color: '#FF7A3D' },
  iron_streak_1y: { title: '1 Year Streak',  line: 'One whole year. This is who you are.',    icon: Flame, color: '#FF7A3D' },
  iron_streak_2y: { title: '2 Year Streak',  line: 'Two years. Iron stitched in.',            icon: Flame, color: '#FF7A3D' },
  iron_streak_5y: { title: '5 Year Streak',  line: 'Five years. The room knows your name.',   icon: Flame, color: '#FF7A3D' },
};

const FALLBACK_COPY = { title: 'Badge Unlocked', line: 'Nice work.', icon: Trophy, color: undefined };

export interface MilestoneToastProps {
  /** Stack of badges to celebrate in sequence. Empty = nothing renders. */
  badges: MilestoneInfo[];
  /** Optional hero photo (per-tier override possible). */
  photoSource?: { uri: string } | number;
  /** Fired after all badges in the stack are dismissed. */
  onAllDismissed: () => void;
  /** Fired when the user taps Share on the current badge. */
  onShare?: (badge: MilestoneInfo) => void;
}

export function MilestoneToast({ badges, photoSource, onAllDismissed, onShare }: MilestoneToastProps) {
  const { isEnabled: screenReaderOn, announce } = useScreenReader();
  const [index, setIndex] = useState(0);
  const visible = badges.length > 0 && index < badges.length;
  const current = visible ? badges[index] : null;
  const copy = current ? (BADGE_COPY[current.badge_key] ?? FALLBACK_COPY) : FALLBACK_COPY;

  const advance = useCallback(() => {
    if (index + 1 >= badges.length) {
      onAllDismissed();
    } else {
      setIndex(i => i + 1);
    }
  }, [badges.length, index, onAllDismissed]);

  // Fire haptic + announce on each badge.
  useEffect(() => {
    if (!visible || !current) return;
    haptic.milestoneUnlock();
    announce(`${copy.title}. ${copy.line}`);
  }, [visible, current?.badge_key]);

  // Auto-dismiss timer -- DISABLED when screen reader is on (Q4 lock).
  useEffect(() => {
    if (!visible) return;
    if (screenReaderOn) return;
    const t = setTimeout(advance, DISMISS_MS);
    return () => clearTimeout(t);
  }, [visible, current?.badge_key, screenReaderOn, advance]);

  if (!visible || !current) return null;

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <View style={styles.backdrop}>
        <Hero
          source={photoSource}
          height={1200}
          maskDirection="top"
          maskCoverage={0.6}
          kenBurns={!screenReaderOn}
          closingSeam={false}
          ember
          style={styles.heroFill}
        />
        <View style={styles.center}>
          <PRBadge
            size={120}
            icon={copy.icon}
            halo="strong"
            color={copy.color ?? colors.brandDisplay}
          />
          <View style={styles.copyBlock}>
            <Text variant="display3" color="textPrimary" style={styles.title}>
              {current.label ?? copy.title}
            </Text>
            <Text variant="body" color="textSecondary" style={styles.line}>
              {copy.line}
            </Text>
          </View>
        </View>
        <View style={styles.footer}>
          {onShare ? (
            <Button
              label="Share"
              variant="secondary"
              size="md"
              onPress={() => onShare(current)}
              style={{ flex: 1 }}
            />
          ) : null}
          <Button
            label="Continue"
            variant="primary"
            size="md"
            onPress={advance}
            style={{ flex: 1 }}
          />
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
