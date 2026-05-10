/**
 * workout/celebrate.tsx -- the cinematic emotional peak. C-1 rewrite
 * per lens 1 + lens 7 P0-2 + founder Q4 + Q7 locks.
 *
 * 5-beat sequence (~3.6s motion budget):
 *  Beat 1 (0 - 600ms)    Hero photo Ken Burns + crimson ember bottom-up
 *                        multiply. Backdrop establishes the moment.
 *  Beat 2 (600 - 1400ms) "New PR" headline + Numeric stat roll on the
 *                        weight x reps line.
 *  Beat 3 (1400 - 2600ms) PR cards stagger up via useListStagger;
 *                        PRBadge stamps in + PRBadgeParticles puff fires.
 *  Beat 4 (2600 - 3200ms) "+X% over previous best" + "Top Y% in your gym"
 *                        social proof callouts.
 *  Beat 5 (3200 - 3600ms) Share-card preview slides up (tappable to
 *                        export via lib/share-card-export.ts).
 *
 * Auto-dismiss:
 *  - 6s base + 1s per extra PR, cap 12s.
 *  - DISABLED entirely if `useScreenReader().isEnabled === true`
 *    (founder Q4 lock; matches the lens 9 rule).
 *
 * Reduce motion:
 *  - All beats collapse to a 200ms crossfade. NumberRoll stays static
 *    via Numeric primitive's internal fork.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable as RNPressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Trophy, Share2 } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Text } from '../../src/components/Text';
import { Button } from '../../src/components/Button';
import { Surface } from '../../src/components/Surface';
import { Icon } from '../../src/components/Icon';
import { Hero } from '../../src/design-system/primitives/Hero';
import { Numeric } from '../../src/design-system/primitives/Numeric';
import { useTheme } from '../../src/design-system/theme/useTheme';
import { useScreenReader } from '../../src/lib/a11y';
import { haptic } from '../../src/lib/haptics';
import { captureShareCardRef, openShareSheet } from '../../src/lib/share-card-export';
import { PRBadge } from '../../src/features/progress/PRBadge';
import { PRBadgeParticles, PRBadgeParticlesHandle } from '../../src/features/progress/PRBadgeParticles';
import { MilestoneToast, MilestoneInfo } from '../../src/features/progress/MilestoneToast';
import { ShareCard } from '../../src/features/progress/ShareCard';
import { colors, spacing, radii } from '../../src/theme/tokens';

const VERCEL_EASE = Easing.bezier(0.32, 0.72, 0, 1);
const BASE_DISMISS_MS = 6000;
const PER_PR_BONUS_MS = 1000;
const DISMISS_CAP_MS = 12000;

interface ParsedPR {
  label: string;
  exercise_name?: string;
  record_type?: string;
  value?: number;
  previous_best?: number | null;
  delta_pct?: number | null;
}

function tryParseStructured(s: string | undefined): ParsedPR[] {
  if (!s) return [];
  try {
    const obj = JSON.parse(decodeURIComponent(s));
    if (Array.isArray(obj)) return obj as ParsedPR[];
  } catch {}
  return [];
}

function parseLegacy(s: string | undefined): ParsedPR[] {
  if (!s) return [];
  return s.split(/\s*\|\s*|,(?=[A-Z])/).map(t => t.trim()).filter(Boolean)
    .map(label => ({ label }));
}

function formatStat(pr: ParsedPR): string {
  if (pr.value != null && pr.record_type) {
    if (pr.record_type === 'one_rep_max' || pr.record_type === 'max_weight') {
      return `${pr.value} kg`;
    }
    return `${pr.value}`;
  }
  return pr.label;
}

export default function CelebrateScreen() {
  const params = useLocalSearchParams<{
    prs?: string;          // legacy joined string fallback
    prs_v2?: string;       // JSON-stringified structured PRs (URI encoded)
    gym_percentile?: string;
    badges_v2?: string;    // JSON-stringified newly_unlocked_badges
    handle?: string;
    gym_name?: string;
  }>();

  const { reduceMotion } = useTheme();
  const { isEnabled: srOn, announce } = useScreenReader();

  // Parse incoming PR data. Prefer structured; fall back to legacy.
  const prs = useMemo<ParsedPR[]>(() => {
    const structured = tryParseStructured(params.prs_v2);
    if (structured.length > 0) return structured;
    return parseLegacy(params.prs);
  }, [params.prs, params.prs_v2]);

  const gymPercentile = useMemo<number | null>(() => {
    if (!params.gym_percentile) return null;
    const v = Number(params.gym_percentile);
    return Number.isFinite(v) ? v : null;
  }, [params.gym_percentile]);

  const newlyUnlocked = useMemo<MilestoneInfo[]>(() => {
    const parsed = tryParseStructured(params.badges_v2 as string | undefined) as unknown as Array<{ badge_key?: string; label?: string }>;
    return (parsed || [])
      .filter((b) => typeof b?.badge_key === 'string')
      .map((b) => ({ badge_key: b.badge_key as string, label: b.label }));
  }, [params.badges_v2]);

  // First PR is the "hero" PR (largest delta or first by default).
  const heroPr = prs[0];
  const restPrs = prs.slice(1);
  const topPercent = gymPercentile != null && gymPercentile >= 0
    ? Math.max(1, Math.round(100 - gymPercentile))
    : null;

  // Compute auto-dismiss timer.
  const dismissMs = useMemo(() => {
    const ms = BASE_DISMISS_MS + Math.max(0, prs.length - 1) * PER_PR_BONUS_MS;
    return Math.min(DISMISS_CAP_MS, ms);
  }, [prs.length]);

  // Per-beat shared values 0..1.
  const beat1 = useSharedValue(0);
  const beat2 = useSharedValue(0);
  const beat3 = useSharedValue(0);
  const beat4 = useSharedValue(0);
  const beat5 = useSharedValue(0);

  const particlesRef = useRef<PRBadgeParticlesHandle>(null);
  const shareRef = useRef<View>(null);
  const [milestoneStack, setMilestoneStack] = useState<MilestoneInfo[]>(newlyUnlocked);
  const [milestoneActive, setMilestoneActive] = useState(newlyUnlocked.length > 0);

  // Drive beats on mount. Reduce-motion fork: all beats snap to 1 over 200ms.
  useEffect(() => {
    if (reduceMotion) {
      beat1.value = withTiming(1, { duration: 200 });
      beat2.value = withTiming(1, { duration: 200 });
      beat3.value = withTiming(1, { duration: 200 });
      beat4.value = withTiming(1, { duration: 200 });
      beat5.value = withTiming(1, { duration: 200 });
      return;
    }
    beat1.value = withTiming(1, { duration: 600, easing: VERCEL_EASE });
    beat2.value = withDelay(600, withTiming(1, { duration: 540, easing: VERCEL_EASE }));
    beat3.value = withDelay(1400, withTiming(1, { duration: 480, easing: VERCEL_EASE }));
    beat4.value = withDelay(2600, withTiming(1, { duration: 480, easing: VERCEL_EASE }));
    beat5.value = withDelay(3200, withTiming(1, { duration: 400, easing: VERCEL_EASE }));
  }, [reduceMotion, beat1, beat2, beat3, beat4, beat5]);

  // Haptic ladder + particle puff. Tied to wall-clock instead of worklets
  // because both APIs are JS-side.
  useEffect(() => {
    if (milestoneActive) return; // suppress until milestone takeover dismisses
    haptic.medium();
    const t1 = setTimeout(() => haptic.light(), 1200); // beat 2 stat lands
    const t2 = setTimeout(() => {
      haptic.prUnlock();
      particlesRef.current?.trigger();
      announce(`Personal record. ${prs.map(formatPrA11y).join('. ')}`);
    }, 1700); // beat 3 badge stamp
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [milestoneActive, prs]);

  // Auto-dismiss. Skip when screen reader is on (Q4 lock).
  useEffect(() => {
    if (milestoneActive) return;
    if (srOn) return;
    const t = setTimeout(() => {
      router.replace('/(tabs)/workouts');
    }, dismissMs);
    return () => clearTimeout(t);
  }, [milestoneActive, srOn, dismissMs]);

  // Empty state -- if no PRs at all (and no badges), bounce.
  useEffect(() => {
    if (prs.length === 0 && newlyUnlocked.length === 0) {
      const t = setTimeout(() => router.replace('/(tabs)/workouts'), 1200);
      return () => clearTimeout(t);
    }
  }, [prs.length, newlyUnlocked.length]);

  const beat1Style = useAnimatedStyle(() => ({ opacity: beat1.value }));
  const beat2Style = useAnimatedStyle(() => ({
    opacity: beat2.value,
    transform: reduceMotion ? [] : [{ translateY: (1 - beat2.value) * 16 }],
  }));
  const beat3Style = useAnimatedStyle(() => ({
    opacity: beat3.value,
    transform: reduceMotion ? [] : [{ translateY: (1 - beat3.value) * 24 }],
  }));
  const beat4Style = useAnimatedStyle(() => ({
    opacity: beat4.value,
    transform: reduceMotion ? [] : [{ translateY: (1 - beat4.value) * 16 }],
  }));
  const beat5Style = useAnimatedStyle(() => ({
    opacity: beat5.value,
    transform: reduceMotion ? [] : [{ translateY: (1 - beat5.value) * 24 }],
  }));

  async function handleShare() {
    if (!shareRef.current) return;
    try {
      haptic.shareExport();
      const uri = await captureShareCardRef(shareRef);
      await openShareSheet(uri);
    } catch {
      haptic.error();
    }
  }

  // No PR + no badge -> early redirect handled above; render nothing
  // while the timer fires.
  if (prs.length === 0 && newlyUnlocked.length === 0) {
    return <View style={styles.root} />;
  }

  const heroStat = heroPr ? formatStat(heroPr) : '';
  const heroExercise = heroPr?.exercise_name ?? heroPr?.label ?? '';
  const deltaCopy = heroPr?.delta_pct != null
    ? `+${heroPr.delta_pct.toFixed(1)}% over your previous best${heroPr.previous_best != null ? ` (${heroPr.previous_best} kg)` : ''}`
    : null;

  return (
    <View style={styles.root}>
      {/* Beat 1: Hero photo + ember backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, beat1Style]}>
        <Hero
          height={1200}
          maskDirection="top"
          maskCoverage={0.55}
          kenBurns={!reduceMotion}
          ember
          closingSeam={false}
          style={styles.heroFill}
        />
      </Animated.View>

      <SafeAreaView style={styles.body} edges={['top', 'bottom']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          accessibilityLabel="PR celebration"
        >
          {/* Beat 2: Headline + stat */}
          <Animated.View style={[styles.beat2, beat2Style]}>
            <Text variant="display3" style={styles.headline}>
              New PR
            </Text>
            <Text variant="title3" color="textSecondary" numberOfLines={2} style={{ textAlign: 'center', marginTop: spacing.xs }}>
              {heroExercise}
            </Text>
            <View style={styles.statRow}>
              <Numeric
                value={heroPr?.value ?? 0}
                variant="display1"
                color="textPrimary"
                format={(v) => (heroPr?.value != null ? `${Math.round(v * 10) / 10}` : '--')}
              />
              <Text variant="title3" color="textSecondary">{(heroPr?.record_type ?? '').toLowerCase().includes('weight') ? 'kg' : ''}</Text>
            </View>
          </Animated.View>

          {/* Beat 3: PR badge stamp + particles */}
          <Animated.View style={[styles.beat3, beat3Style]}>
            <View style={styles.badgeWrap}>
              <PRBadge size={96} icon={Trophy} animateOnMount halo="strong" />
              {/* Particle puff overlays the badge; same dim as the medallion. */}
              <View pointerEvents="none" style={styles.particles}>
                <PRBadgeParticles ref={particlesRef} size={144} />
              </View>
            </View>

            {/* Additional PR cards if 2+ PRs */}
            {restPrs.length > 0 ? (
              <View style={styles.restList}>
                {restPrs.map((pr, i) => (
                  <Surface key={i} level={2} style={styles.prCard}>
                    <View style={styles.prDot} />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1}>
                        {pr.exercise_name ?? pr.label}
                      </Text>
                      <Text variant="caption" color="textSecondary" numberOfLines={1}>
                        {formatStat(pr)}{pr.delta_pct != null ? ` · +${pr.delta_pct.toFixed(1)}%` : ''}
                      </Text>
                    </View>
                  </Surface>
                ))}
              </View>
            ) : null}
          </Animated.View>

          {/* Beat 4: Social proof callouts */}
          <Animated.View style={[styles.beat4, beat4Style]}>
            {deltaCopy ? (
              <Text variant="bodyEmphasis" style={styles.deltaCopy}>{deltaCopy}</Text>
            ) : null}
            {topPercent != null ? (
              <View style={styles.percentilePill} accessibilityLabel={`Top ${topPercent} percent in your gym`}>
                <Text variant="caption" style={styles.percentileText}>Top {topPercent}% in your gym</Text>
              </View>
            ) : null}
          </Animated.View>

          {/* Beat 5: Share-card preview */}
          <Animated.View style={[styles.beat5, beat5Style]}>
            <RNPressable onPress={handleShare} style={styles.sharePreview} accessibilityRole="button" accessibilityLabel="Share PR card">
              <View style={styles.sharePreviewInner}>
                <View style={styles.sharePreviewLeft}>
                  <Text variant="overline" color="textTertiary">SHARE CARD</Text>
                  <Text variant="bodyEmphasis" color="textPrimary" numberOfLines={1}>
                    {heroExercise || 'New PR'}
                  </Text>
                  <Text variant="caption" color="textSecondary" numberOfLines={1}>
                    {heroStat}
                  </Text>
                </View>
                <View style={styles.shareCta}>
                  <Icon icon={Share2} size={16} color={colors.brandText} strokeWidth={1.6} />
                  <Text variant="caption" style={{ color: colors.brandText }}>Share</Text>
                </View>
              </View>
            </RNPressable>
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Done"
            onPress={() => router.replace('/(tabs)/workouts')}
            variant="primary"
            size="lg"
            fullWidth
          />
        </View>
      </SafeAreaView>

      {/* Off-screen share card mount (negative left + 0 opacity). */}
      <View pointerEvents="none" style={styles.offscreenWrap}>
        <ShareCard
          ref={shareRef}
          headline="New PR"
          stat={heroPr ? `${heroPr.value ?? ''} ${(heroPr.record_type ?? '').includes('weight') ? 'kg' : ''}` : ''}
          subhead={deltaCopy ?? undefined}
          handle={params.handle}
          gymName={params.gym_name}
        />
      </View>

      {/* Milestone takeover (sits above the celebrate beats). */}
      <MilestoneToast
        badges={milestoneStack}
        onAllDismissed={() => {
          setMilestoneActive(false);
          setMilestoneStack([]);
        }}
      />
    </View>
  );
}

function formatPrA11y(pr: ParsedPR): string {
  if (pr.value != null && pr.exercise_name && (pr.record_type ?? '').includes('weight')) {
    return `${pr.exercise_name}, ${pr.value} kilograms`;
  }
  return pr.label;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  heroFill: { ...StyleSheet.absoluteFillObject as any, height: '100%' as any },
  body: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing['2xl'],
    gap: spacing.xl,
  },
  beat2: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  headline: {
    color: colors.brandDisplay,
    textAlign: 'center',
    letterSpacing: -1,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: spacing.md,
  },
  beat3: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  badgeWrap: {
    width: 144,
    height: 144,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particles: {
    position: 'absolute',
    width: 144,
    height: 144,
  },
  restList: { width: '100%', gap: spacing.sm },
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brandGlow,
    backgroundColor: 'rgba(17,17,20,0.78)',
  },
  prDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brandDisplay,
  },
  beat4: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  deltaCopy: {
    color: colors.brandText,
    textAlign: 'center',
  },
  percentilePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.brandGlow,
    borderWidth: 1,
    borderColor: colors.brandText,
  },
  percentileText: {
    color: colors.brandText,
    fontWeight: '600',
  },
  beat5: { alignItems: 'stretch' },
  sharePreview: {
    backgroundColor: 'rgba(17,17,20,0.86)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
  },
  sharePreviewInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sharePreviewLeft: { flex: 1, gap: 2 },
  shareCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.brandText,
  },
  footer: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  offscreenWrap: {
    position: 'absolute',
    left: -10000,
    top: 0,
    width: 1080,
    height: 1920,
    opacity: 0,
  },
});
