import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { colors, spacing } from '../theme/tokens';

type Props = {
  title: string;
  back?: boolean;
  large?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
};

export function Header({ title, back = false, large = false, right, onBack }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
      <View style={styles.row}>
        {back ? (
          <TouchableOpacity
            onPress={onBack ?? (() => router.back())}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={22} color={colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}

        <Text
          variant={large ? 'title1' : 'title2'}
          color="textPrimary"
          numberOfLines={1}
          style={styles.title}
        >
          {title}
        </Text>

        <View style={styles.right}>
          {right ?? null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface1,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 36,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  right: {
    minWidth: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
