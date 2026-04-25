import { View, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { colors } from '../theme/tokens';

type Props = {
  icon: LucideIcon;
  focused: boolean;
  size?: number;
};

export function TabBarIcon({ icon: Lucide, focused, size = 24 }: Props) {
  const color = focused ? colors.brand : colors.textTertiary;

  return (
    <View style={styles.container}>
      <Lucide size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
      {focused && <View style={styles.dot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand,
  },
});
