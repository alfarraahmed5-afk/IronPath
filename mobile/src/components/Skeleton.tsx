import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors, radii } from '../theme/tokens';

type Props = {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
};

export function Skeleton({ width, height, borderRadius = radii.sm, style }: Props) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.8, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        animStyle,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.surface3,
        },
        style,
      ]}
    />
  );
}
