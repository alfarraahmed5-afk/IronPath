import { View, ViewStyle, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';

type Props = {
  level?: 1 | 2 | 3 | 4;
  padded?: boolean;
  rounded?: keyof typeof radii;
  style?: (ViewStyle | undefined | null | false)[] | ViewStyle;
  children: React.ReactNode;
};

const bgMap = {
  1: colors.surface1,
  2: colors.surface2,
  3: colors.surface3,
  4: colors.surface4,
};

export function Surface({ level = 2, padded = false, rounded = 'lg', style, children }: Props) {
  return (
    <View
      style={[
        {
          backgroundColor: bgMap[level],
          borderRadius: radii[rounded],
          padding: padded ? spacing.base : undefined,
        },
        ...(Array.isArray(style) ? style : style ? [style] : []),
      ]}
    >
      {children}
    </View>
  );
}
