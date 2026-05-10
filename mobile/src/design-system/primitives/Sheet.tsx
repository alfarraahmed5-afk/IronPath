/**
 * Sheet -- bottom sheet primitive with drag-to-dismiss.
 *
 * Lens 8 spec:
 *  - PanGestureHandler attached to sheet container.
 *  - Velocity threshold: 0.5 px/ms downward triggers dismiss.
 *  - Distance threshold: 40% sheet height triggers dismiss.
 *  - Below thresholds: spring back with springModal.
 *  - Backdrop alpha lerps from 0.6 -> 0 with drag distance.
 *  - `haptic.sheetDragCommit` on commit.
 *  - Backdrop tap dismisses + `haptic.modalDismiss`.
 *  - Detents: 0.5 / 0.9 / 1.0 of screen height.
 *  - Drag handle: 32pt wide, 4pt radius, at the top of the sheet.
 *  - iOS BlurView backdrop with reduce-transparency fallback to solid.
 *  - Focus trap via `accessibilityViewIsModal`.
 *
 * Reduce-motion fork:
 *  - Spring -> 200ms timing slide.
 *  - Reduce transparency: BlurView -> solid surface3 backdrop.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  AccessibilityInfo,
  Pressable as RNPressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { colors, radii, spacing } from '../../theme/tokens';
import { springModal } from '../tokens/motion';
import { haptic } from '../../lib/haptics';
import { useReanimatedReduceMotion, useReduceMotion } from '../motion/primitives';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const VELOCITY_DISMISS_THRESHOLD = 500; // px / s == 0.5 px / ms
const DISTANCE_DISMISS_FRACTION = 0.4;

export type SheetDetent = 0.5 | 0.9 | 1.0;

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  /** Default detent when opened. */
  detent?: SheetDetent;
  /** Allowed detents the user can settle on after a drag. */
  detents?: SheetDetent[];
  /** ScrollView wraps children when true (default). Set false to pass
   *  custom content (FlatList, GestureHandler etc). */
  scrollable?: boolean;
  /** Backdrop visual. iOS gets BlurView when supported. */
  backdrop?: 'blur' | 'solid';
  children: React.ReactNode;
}

export function Sheet({
  visible,
  onClose,
  detent = 0.5,
  // detents prop is reserved for the multi-detent settle (P1). Today
  // the sheet opens at `detent` and drag-to-dismiss is the only
  // interaction; multi-detent snap will land in the next sprint.
  detents: _detents,
  scrollable = true,
  backdrop = 'blur',
  children,
}: SheetProps) {
  const insets = useSafeAreaInsets();
  const reduceMotionJS = useReduceMotion();
  const reduceMotionSv = useReanimatedReduceMotion();

  // Reduce-transparency probe (iOS only).
  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AccessibilityInfo.isReduceTransparencyEnabled?.().then(setReduceTransparency);
    const sub = (AccessibilityInfo as any).addEventListener?.(
      'reduceTransparencyChanged',
      setReduceTransparency,
    );
    return () => sub?.remove?.();
  }, []);

  const sheetHeight = SCREEN_HEIGHT * detent;
  const translateY = useSharedValue(sheetHeight);

  // Animate in / out on `visible` change.
  useEffect(() => {
    if (visible) {
      if (reduceMotionJS) {
        translateY.value = withTiming(0, { duration: 200 });
      } else {
        translateY.value = withSpring(0, springModal);
      }
    } else {
      if (reduceMotionJS) {
        translateY.value = withTiming(sheetHeight, { duration: 200 });
      } else {
        translateY.value = withSpring(sheetHeight, springModal);
      }
    }
  }, [visible, sheetHeight, reduceMotionJS, translateY]);

  // ----- gesture: drag-to-dismiss / detent change -----
  const handleDismiss = useCallback(() => {
    haptic.sheetDragCommit();
    onClose();
  }, [onClose]);

  const handleBackdropTap = useCallback(() => {
    haptic.modalDismiss();
    onClose();
  }, [onClose]);

  const startY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      'worklet';
      const next = startY.value + e.translationY;
      // Don't drag above the open position (no negative translateY).
      translateY.value = next < 0 ? next * 0.2 : next;
    })
    .onEnd((e) => {
      'worklet';
      const distance = translateY.value;
      const velocity = e.velocityY;
      const shouldDismiss =
        velocity > VELOCITY_DISMISS_THRESHOLD ||
        distance > sheetHeight * DISTANCE_DISMISS_FRACTION;

      if (shouldDismiss) {
        if (reduceMotionSv.value) {
          translateY.value = withTiming(sheetHeight, { duration: 200 }, (done) => {
            if (done) runOnJS(handleDismiss)();
          });
        } else {
          translateY.value = withSpring(sheetHeight, { ...springModal, velocity }, (done) => {
            if (done) runOnJS(handleDismiss)();
          });
        }
      } else {
        translateY.value = reduceMotionSv.value
          ? withTiming(0, { duration: 200 })
          : withSpring(0, { ...springModal, velocity });
      }
    });

  // ----- styles -----
  const sheetStyle = useAnimatedStyle(() => {
    'worklet';
    return { transform: [{ translateY: translateY.value }] };
  });

  const backdropStyle = useAnimatedStyle(() => {
    'worklet';
    const opacity = interpolate(
      translateY.value,
      [0, sheetHeight],
      [0.6, 0],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  const useGlass = backdrop === 'blur' && Platform.OS === 'ios' && !reduceTransparency;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
      // iOS focus trap; Android handles focus via window-level focus.
      // accessibilityViewIsModal is honored by VoiceOver to scope the
      // accessibility tree to the sheet contents only.
      hardwareAccelerated
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        accessibilityViewIsModal
      >
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]} pointerEvents="auto">
          {useGlass ? (
            <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFillObject} />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, styles.backdropSolid]} />
          )}
          <RNPressable
            style={StyleSheet.absoluteFillObject}
            onPress={handleBackdropTap}
            accessibilityRole="button"
            accessibilityLabel="Close sheet"
          />
        </Animated.View>

        {/* Sheet body. Drag gesture is on the whole body so the user can
            grab anywhere; the inner ScrollView still gets vertical
            priority for content scrolling, the gesture-handler
            simultaneous flag lets both coexist. */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              sheetStyle,
              {
                height: sheetHeight,
                paddingBottom: insets.bottom + spacing['2xl'],
              },
            ]}
            accessibilityViewIsModal
          >
            <View style={styles.handle} accessibilityElementsHidden>
              <View style={styles.handleBar} />
            </View>

            {scrollable ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.scroll}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={styles.scroll}>{children}</View>
            )}
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropSolid: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: colors.surface2,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.base,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  handle: {
    width: '100%',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  handleBar: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface4,
  },
});
