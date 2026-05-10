/**
 * RestTimer -- the rest-timer strip rendered atop the active workout.
 *
 * Lens 6 perf rule: move the per-second countdown to Reanimated shared
 * values on the UI thread so the JS React tree does NOT re-render every
 * second. The store still owns the timer for cross-screen consistency
 * (background sync, finish-screen pause), but the visual second-by-
 * second reads from a SharedValue that is incremented by a worklet
 * frame callback.
 *
 * The shared value is seeded from the store on mount + on store
 * change. Tap adjust buttons mutate the store; the SharedValue
 * follows.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedReaction,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Timer, Plus, Minus } from 'lucide-react-native';
import { Text } from '../../../components/Text';
import { Icon } from '../../../components/Icon';
import { Pressable } from '../../../components/Pressable';
import { useWorkoutStore } from '../../../stores/workoutStore';
import { haptic } from '../../../lib/haptics';
import { colors, spacing, radii } from '../../../theme/tokens';

function formatTime(seconds: number): string {
  'worklet';
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RestTimer() {
  const restTimer = useWorkoutStore((s) => s.restTimer);
  const adjustRestTimer = useWorkoutStore((s) => s.adjustRestTimer);
  const clearRestTimer = useWorkoutStore((s) => s.clearRestTimer);

  // Visible only when the store has a non-null timer.
  if (restTimer === null) return null;

  return <RestTimerInner
    initialSeconds={restTimer}
    onAdjust={adjustRestTimer}
    onClear={clearRestTimer}
  />;
}

function RestTimerInner({
  initialSeconds,
  onAdjust,
  onClear,
}: {
  initialSeconds: number;
  onAdjust: (delta: number) => void;
  onClear: () => void;
}) {
  // SharedValue holds the current displayed seconds. We refresh from
  // the store every time `initialSeconds` changes (adjust buttons,
  // store reset). Between updates, a derived value decrements it via
  // a `withTiming` over its absolute duration.
  const seconds = useSharedValue(initialSeconds);
  const lastInitial = useSharedValue(initialSeconds);

  useEffect(() => {
    // Reset the worklet's source-of-truth whenever the store changes.
    seconds.value = initialSeconds;
    lastInitial.value = initialSeconds;
    // Drive a linear countdown over `initialSeconds * 1000` ms. The
    // worklet decrements until it hits 0; at 0 we fire a JS callback.
    seconds.value = withTiming(0, {
      duration: Math.max(0, initialSeconds * 1000),
      easing: Easing.linear,
    });
    // No cleanup; reassigning `seconds.value` on the next render cancels.
  }, [initialSeconds, seconds, lastInitial]);

  // Display string derived from the shared value -- UI-thread updates.
  const labelText = useDerivedValue(() => {
    'worklet';
    return formatTime(Math.ceil(seconds.value));
  });

  // When the timer hits 0 (rounded), call the haptic + auto-clear.
  // useAnimatedReaction fires the worklet whenever its dep value
  // changes. We compare to a small threshold so we only fire once.
  useAnimatedReaction(
    () => seconds.value <= 0.05,
    (cur, prev) => {
      if (cur && !prev) {
        runOnJS(haptic.timerExpire)();
        runOnJS(onClear)();
      }
    },
  );

  // Render the label via a SharedValue-aware AnimatedText. Reanimated
  // does not have a first-class animated text, so we use
  // `<Animated.Text>` with the `text` prop driven via
  // `useAnimatedProps`. Since `useAnimatedProps` is RNW-only, we use a
  // `useDerivedValue` + a ReactNode reading the shared text via a
  // wrapper component.
  return (
    <View style={styles.restTimer}>
      <Icon icon={Timer} size={16} color={colors.brandText} />
      <Text variant="bodyEmphasis" color="textPrimary" style={{ marginLeft: spacing.sm, flex: 1 }}>
        Rest
      </Text>
      <Pressable
        onPress={() => { haptic.timerAdjust(); onAdjust(-15); }}
        style={styles.restAdjust}
        accessibilityLabel="Subtract 15 seconds"
      >
        <Icon icon={Minus} size={14} color={colors.textSecondary} />
      </Pressable>
      <AnimatedLabel text={labelText} />
      <Pressable
        onPress={() => { haptic.timerAdjust(); onAdjust(15); }}
        style={styles.restAdjust}
        accessibilityLabel="Add 15 seconds"
      >
        <Icon icon={Plus} size={14} color={colors.textSecondary} />
      </Pressable>
      <Pressable
        onPress={() => { haptic.timerSkip(); onClear(); }}
        style={{ marginLeft: spacing.sm }}
        accessibilityLabel="Skip rest"
      >
        <Text variant="caption" color="textTertiary">Skip</Text>
      </Pressable>
    </View>
  );
}

/**
 * AnimatedLabel -- reads a shared text value and renders without
 * causing parent re-renders. We use a simple `useDerivedValue`
 * pattern: register a worklet-side listener that pushes the new
 * label into a `useState` on JS, but we do it via `runOnJS` only
 * when the displayed second changes (not every frame). For a
 * 60-fps loop over 60 seconds, that's 60 runOnJS calls -- 1/sec --
 * matching the legacy `setInterval` but on the UI thread.
 */
function AnimatedLabel({ text }: { text: ReturnType<typeof useDerivedValue<string>> }) {
  const [display, setDisplay] = React.useState(text.value);
  useAnimatedReaction(
    () => text.value,
    (cur, prev) => {
      if (cur !== prev) runOnJS(setDisplay)(cur);
    },
  );
  return (
    <Text variant="numeric" color="brand" style={styles.restTime}>
      {display}
    </Text>
  );
}

const styles = StyleSheet.create({
  restTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.brandGlow,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brandText,
  },
  restAdjust: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
  },
  restTime: { fontSize: 22, lineHeight: 26, minWidth: 64, textAlign: 'center' },
});
