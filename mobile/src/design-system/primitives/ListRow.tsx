/**
 * ListRow -- list row primitive with leading icon, content, trailing
 * accessory, swipe actions.
 *
 * Lens 8 swipe spec:
 *  - 88pt fixed action width
 *  - Reveal threshold 24pt; commit at 50% of action width OR velocity
 *    >= 400 px/s (~0.4 px/ms)
 *  - haptic.setRevealAction on reveal-cross-threshold (one-shot)
 *  - haptic.setDeleteCommit on commit
 *  - Two-step destruction available via `confirmRequired` (delete is
 *    armed for 2s after first commit)
 *  - VoiceOver: accessibilityActions exposes named actions
 *
 * Reduce-motion: spring-back uses 200ms timing instead of springModal.
 */
import React, { ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, ViewStyle, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Trash2, Pin } from 'lucide-react-native';
import { Pressable } from './Pressable';
import { colors, spacing, radii } from '../../theme/tokens';
import { springModal } from '../tokens/motion';
import { haptic } from '../../lib/haptics';
import { useReanimatedReduceMotion } from '../motion/primitives';

const ACTION_WIDTH = 88;
const REVEAL_THRESHOLD = 24;
const COMMIT_FRACTION = 0.5;
const COMMIT_VELOCITY = 400;

export type ListRowSwipeAction = {
  /** Programmatic name; surfaced in accessibilityActions. */
  name: string;
  /** Visible label. */
  label: string;
  /** Background color. */
  color?: string;
  /** Text/icon color. Default white. */
  fg?: string;
  /** Icon component (lucide). */
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  /** Two-step destructive confirm. */
  confirmRequired?: boolean;
  onPress: () => void;
};

export interface ListRowProps {
  leading?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Left-swipe (trailing) actions, revealed by swiping the row left.
   *  Only one supported in v1 (Delete or Pin). */
  rightActions?: ListRowSwipeAction[];
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
  onLongPress,
  rightActions,
  accessibilityLabel,
  style,
}: ListRowProps) {
  const tx = useSharedValue(0);
  const reduceSv = useReanimatedReduceMotion();
  const armedConfirmRef = useRef<NodeJS.Timeout | null>(null);
  const [armedAction, setArmedAction] = useState<string | null>(null);
  const revealedRef = useRef(false);

  const action = rightActions?.[0];
  const totalActionWidth = action ? ACTION_WIDTH : 0;

  const fireRevealHaptic = useCallback(() => {
    haptic.setRevealAction();
  }, []);

  const fireCommit = useCallback(
    (a: ListRowSwipeAction) => {
      // Two-step confirm: arm the action; on second tap (or second
      // swipe), invoke. Otherwise the row springs back after 2s.
      if (a.confirmRequired) {
        if (armedAction === a.name) {
          haptic.setDeleteCommit();
          a.onPress();
          setArmedAction(null);
          tx.value = withSpring(0, springModal);
          return;
        }
        haptic.setRevealAction();
        setArmedAction(a.name);
        if (armedConfirmRef.current) clearTimeout(armedConfirmRef.current);
        armedConfirmRef.current = setTimeout(() => {
          setArmedAction(null);
          tx.value = withSpring(0, springModal);
        }, 2000);
        // Hold the row in revealed state until the user taps again.
        tx.value = withSpring(-totalActionWidth, springModal);
        return;
      }
      haptic.setDeleteCommit();
      a.onPress();
      tx.value = withSpring(0, springModal);
    },
    [armedAction, tx, totalActionWidth],
  );

  // Pan gesture for swipe-to-reveal.
  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-8, 8])
    .onUpdate((e) => {
      'worklet';
      // Allow leftward drag only; clamp at 1.4x action width.
      const next = Math.min(0, Math.max(-totalActionWidth * 1.4, e.translationX));
      tx.value = next;
      // One-shot haptic when the user crosses the reveal threshold.
      if (!revealedRef.current && Math.abs(next) > REVEAL_THRESHOLD) {
        revealedRef.current = true;
        runOnJS(fireRevealHaptic)();
      }
    })
    .onEnd((e) => {
      'worklet';
      const distance = Math.abs(tx.value);
      const velocity = -e.velocityX;
      const shouldCommit =
        distance > totalActionWidth * COMMIT_FRACTION ||
        velocity > COMMIT_VELOCITY;

      if (shouldCommit && action) {
        runOnJS(fireCommit)(action);
      } else {
        if (reduceSv.value) {
          tx.value = withTiming(0, { duration: 200 });
        } else {
          tx.value = withSpring(0, springModal);
        }
        runOnJS(setRevealed)(false);
      }
    });

  function setRevealed(v: boolean) {
    revealedRef.current = v;
  }

  const rowStyle = useAnimatedStyle(() => {
    'worklet';
    return { transform: [{ translateX: tx.value }] };
  });

  // Accessibility actions mirror swipe actions for VoiceOver/TalkBack.
  const a11yActions = useMemo(() => {
    if (!rightActions?.length) return undefined;
    return rightActions.map((a) => ({ name: a.name, label: a.label }));
  }, [rightActions]);

  const handleA11yAction = useCallback(
    (e: { nativeEvent: { actionName: string } }) => {
      const a = rightActions?.find((x) => x.name === e.nativeEvent.actionName);
      if (a) a.onPress();
    },
    [rightActions],
  );

  const a11yLabel = accessibilityLabel ?? (typeof title === 'string' ? title : 'List item');

  const Inner = (
    <View style={[styles.row, style]}>
      {leading ? <View style={styles.leadingSlot}>{leading}</View> : null}
      <View style={styles.contentSlot}>
        {typeof title === 'string' ? (
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        ) : title}
        {typeof subtitle === 'string' ? (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        ) : subtitle}
      </View>
      {trailing ? <View style={styles.trailingSlot}>{trailing}</View> : null}
    </View>
  );

  // Swipe-action layer renders behind the row; row translates to reveal.
  return (
    <View style={styles.swipeContainer} accessible accessibilityLabel={a11yLabel}
      accessibilityActions={a11yActions} onAccessibilityAction={handleA11yAction}>
      {action ? (
        <View style={[styles.actionLayer, { width: ACTION_WIDTH, backgroundColor: action.color ?? colors.danger }]}>
          {action.icon ? <action.icon size={18} color={action.fg ?? '#fff'} /> : <Trash2 size={18} color={action.fg ?? '#fff'} />}
          <Text style={[styles.actionLabel, { color: action.fg ?? '#fff' }]}>
            {armedAction === action.name ? 'Tap again' : action.label}
          </Text>
        </View>
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.foreground, rowStyle]}>
          {onPress || onLongPress ? (
            <Pressable
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityLabel={a11yLabel}
              haptic="rowTap"
              style={styles.pressableInner}
            >
              {Inner}
            </Pressable>
          ) : (
            Inner
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// Convenience preset: destructive delete action.
export function deleteAction(onPress: () => void, opts?: { confirmRequired?: boolean }): ListRowSwipeAction {
  return {
    name: 'delete',
    label: 'Delete',
    color: colors.danger,
    icon: Trash2,
    confirmRequired: opts?.confirmRequired ?? false,
    onPress,
  };
}

// Convenience preset: pin (right-swipe).
export function pinAction(onPress: () => void): ListRowSwipeAction {
  return {
    name: 'pin',
    label: 'Pin',
    color: colors.brandGlow,
    fg: colors.brand,
    icon: Pin,
    onPress,
  };
}

const styles = StyleSheet.create({
  swipeContainer: {
    overflow: 'hidden',
    backgroundColor: colors.surface1,
  },
  actionLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 12,
    marginTop: 4,
  },
  foreground: {
    backgroundColor: colors.surface1,
  },
  pressableInner: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  leadingSlot: {
    marginRight: spacing.md,
  },
  contentSlot: {
    flex: 1,
  },
  trailingSlot: {
    marginLeft: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 15,
    lineHeight: 22,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: 'Barlow_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
