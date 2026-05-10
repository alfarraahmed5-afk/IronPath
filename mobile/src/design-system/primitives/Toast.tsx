/**
 * Toast -- queue-based notification primitive.
 *
 * Lens 5 + 8 + 9 spec:
 *   - Queue (multiple toasts stack vertically with 60ms enter stagger)
 *   - Swipe-up to dismiss (PanGestureHandler)
 *   - Haptic pairing per type via lib/haptics
 *   - accessibilityLiveRegion: 'polite' for info/success/warning,
 *     'assertive' for errors
 *   - Auto-dismiss: 3s default, configurable via show(opts)
 *
 * Public API matches the legacy ToastProvider/useToast import path so
 * call sites that already do `useToast().show("...")` keep working.
 * The new shape adds:
 *   show(message, opts?) where opts = { type, durationMs, haptic? }
 *
 * Backwards-compatible call sites: `show(msg, 'success')` still works
 * because we sniff the second arg.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, StyleSheet, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info } from 'lucide-react-native';
import { Text } from '../../components/Text';
import { colors, spacing, radii, type as typeTokens } from '../../theme/tokens';
import { haptic } from '../../lib/haptics';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastShowOptions {
  type?: ToastType;
  durationMs?: number;
  /** Set to false to suppress the haptic for this toast. Default true. */
  haptic?: boolean;
}

export interface ToastContextValue {
  show: (message: string, optsOrType?: ToastShowOptions | ToastType) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue>({
  show: () => {},
  dismissAll: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

interface QueueItem {
  id: number;
  message: string;
  type: ToastType;
  durationMs: number;
  enteredAt: number;
}

const TYPE_THEME: Record<ToastType, { bg: string; fg: string; icon: any; live: 'polite' | 'assertive' }> = {
  success: { bg: colors.successDim, fg: colors.success,    icon: CheckCircle2, live: 'polite'    },
  warning: { bg: 'rgba(245,158,11,0.18)', fg: colors.warning, icon: AlertTriangle, live: 'polite'    },
  error:   { bg: colors.dangerDim,  fg: colors.danger,     icon: AlertOctagon, live: 'assertive' },
  info:    { bg: colors.surface3,   fg: colors.textPrimary, icon: Info,         live: 'polite'    },
};

const HAPTIC_BY_TYPE: Record<ToastType, () => Promise<void> | void> = {
  success: () => haptic.success(),
  warning: () => haptic.warning(),
  error:   () => haptic.error(),
  info:    () => haptic.light(),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const idCounter = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const removeById = useCallback((id: number) => {
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
    setQueue(q => q.filter(item => item.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current.clear();
    setQueue([]);
  }, []);

  const show = useCallback<ToastContextValue['show']>((message, optsOrType) => {
    const opts: ToastShowOptions =
      typeof optsOrType === 'string' ? { type: optsOrType } : (optsOrType ?? {});
    const type = opts.type ?? 'info';
    const durationMs = opts.durationMs ?? 3000;
    const wantsHaptic = opts.haptic ?? true;

    if (wantsHaptic) {
      try { void HAPTIC_BY_TYPE[type](); } catch { /* haptics may be unavailable on simulator */ }
    }

    // Screen-reader announcement for the live-region semantics on
    // Android 14+: AccessibilityInfo.announceForAccessibility is
    // honored independent of the live-region prop on iOS.
    AccessibilityInfo.announceForAccessibility?.(message);

    const id = ++idCounter.current;
    const item: QueueItem = { id, message, type, durationMs, enteredAt: Date.now() };
    setQueue(q => [...q, item]);
    const timer = setTimeout(() => removeById(id), durationMs);
    timersRef.current.set(id, timer);
  }, [removeById]);

  const ctx = useMemo<ToastContextValue>(() => ({ show, dismissAll }), [show, dismissAll]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <ToastStack queue={queue} onDismiss={removeById} />
    </ToastContext.Provider>
  );
}

interface ToastStackProps {
  queue: QueueItem[];
  onDismiss: (id: number) => void;
}

function ToastStack({ queue, onDismiss }: ToastStackProps) {
  const insets = useSafeAreaInsets();
  if (queue.length === 0) return null;
  return (
    <View
      pointerEvents="box-none"
      style={[styles.stack, { top: insets.top + spacing.sm }]}
    >
      {queue.map((item, idx) => (
        <ToastRow
          key={item.id}
          item={item}
          stackIndex={idx}
          onDismiss={onDismiss}
        />
      ))}
    </View>
  );
}

interface ToastRowProps {
  item: QueueItem;
  stackIndex: number;
  onDismiss: (id: number) => void;
}

function ToastRow({ item, stackIndex, onDismiss }: ToastRowProps) {
  const theme = TYPE_THEME[item.type];
  const Icon = theme.icon;

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);

  // Fire entry animation. 60ms stagger per stack index.
  React.useEffect(() => {
    const delay = stackIndex * 60;
    setTimeout(() => {
      opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      translateY.value = withSpring(0, { stiffness: 380, damping: 32 });
    }, delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = useCallback(() => {
    onDismiss(item.id);
  }, [onDismiss, item.id]);

  // Swipe-up-to-dismiss gesture. Move > 30px upward OR fling-vy < -300 dismisses.
  const swipe = Gesture.Pan()
    .activeOffsetY(-6)
    .onUpdate(e => {
      if (e.translationY < 0) {
        translateY.value = e.translationY;
        // Fade as it drags away.
        opacity.value = Math.max(0.2, 1 + e.translationY / 80);
      }
    })
    .onEnd(e => {
      if (e.translationY < -30 || e.velocityY < -300) {
        translateY.value = withTiming(-80, { duration: 180 });
        opacity.value = withTiming(0, { duration: 180 }, () => {
          runOnJS(dismiss)();
        });
      } else {
        translateY.value = withSpring(0, { stiffness: 380, damping: 32 });
        opacity.value = withTiming(1, { duration: 180 });
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View
        style={[styles.row, { backgroundColor: theme.bg }, animStyle]}
        accessibilityLiveRegion={theme.live}
        accessibilityRole="alert"
        accessible
      >
        <Icon size={18} color={theme.fg} />
        <Text
          variant="bodyEmphasis"
          style={[styles.message, { color: theme.fg }]}
          numberOfLines={3}
        >
          {item.message}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    zIndex: 9999,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  message: {
    ...typeTokens.bodyEmphasis,
    flex: 1,
  },
});
