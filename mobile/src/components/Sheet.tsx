import { useEffect } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors, radii, spacing } from '../theme/tokens';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type Props = {
  visible: boolean;
  onClose: () => void;
  snapPoint?: number; // 0–1, fraction of screen height
  children: React.ReactNode;
};

export function Sheet({ visible, onClose, snapPoint = 0.6, children }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, { damping: 18, stiffness: 200 });
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[styles.sheet, animStyle, { height: SCREEN_HEIGHT * snapPoint, paddingBottom: insets.bottom + spacing['2xl'] }]}>
          <View style={styles.handle} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: colors.surface2,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.base,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface4,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.base,
  },
});
