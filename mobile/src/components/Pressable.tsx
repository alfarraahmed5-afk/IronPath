import { Pressable as RNPressable, PressableProps, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { haptic } from '../lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

type Props = PressableProps & {
  hapticType?: 'light' | 'medium' | 'select' | 'none';
  scaleOnPress?: boolean;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
  accessibilityLabel: string;
};

export function Pressable({
  hapticType = 'light',
  scaleOnPress = true,
  onPress,
  style,
  children,
  hitSlop,
  accessibilityLabel,
  disabled,
  ...rest
}: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        if (scaleOnPress) {
          scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
        }
        if (hapticType !== 'none' && !disabled) {
          haptic[hapticType]?.();
        }
      }}
      onPressOut={() => {
        if (scaleOnPress) {
          scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }
      }}
      onPress={onPress}
      hitSlop={hitSlop ?? { top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      style={[animStyle, style as ViewStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
