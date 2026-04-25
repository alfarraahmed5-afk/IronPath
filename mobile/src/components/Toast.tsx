import { createContext, useContext, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, type as typeTokens } from '../theme/tokens';

type ToastType = 'success' | 'error' | 'info';

type ToastState = {
  message: string;
  type: ToastType;
  visible: boolean;
};

type ToastContextType = {
  show: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const typeColors: Record<ToastType, { bg: string; text: string }> = {
  success: { bg: colors.successDim, text: colors.success },
  error:   { bg: colors.dangerDim,  text: colors.danger },
  info:    { bg: colors.surface3,   text: colors.textPrimary },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', visible: false });
  const opacity = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const hide = useCallback(() => {
    opacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 200);
  }, []);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type, visible: true });
    opacity.value = withTiming(1, { duration: 200 });
    timerRef.current = setTimeout(hide, 3000);
  }, [hide]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            animStyle,
            {
              top: insets.top + spacing.sm,
              backgroundColor: typeColors[toast.type].bg,
            },
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.message, { color: typeColors[toast.type].text }]}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    borderRadius: radii.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    zIndex: 9999,
  },
  message: {
    ...typeTokens.bodyEmphasis,
    textAlign: 'center',
  },
});
