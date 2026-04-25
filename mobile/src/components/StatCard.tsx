import { View, StyleSheet, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { Text } from './Text';
import { Surface } from './Surface';
import { Icon } from './Icon';
import { colors, spacing, radii } from '../theme/tokens';

type StatCardVariant = 'default' | 'brand' | 'success';

type Props = {
  label: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  variant?: StatCardVariant;
  compact?: boolean;
};

const borderColors: Record<StatCardVariant, string> = {
  default: 'transparent',
  brand:   colors.brand,
  success: colors.success,
};

export function StatCard({ label, value, unit, icon, variant = 'default', compact = false }: Props) {
  return (
    <Surface
      level={2}
      style={[
        styles.card as ViewStyle,
        compact ? styles.compact as ViewStyle : undefined,
        { borderColor: borderColors[variant], borderWidth: variant !== 'default' ? 1 : 0 } as ViewStyle,
      ]}
    >
      {icon && (
        <View style={styles.iconRow}>
          <Icon icon={icon} size={16} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.valueRow}>
        <Text
          variant={compact ? 'numeric' : 'display3'}
          color={variant === 'brand' ? 'brand' : variant === 'success' ? 'success' : 'textPrimary'}
          style={{ lineHeight: compact ? 28 : 40 }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
        {unit ? (
          <Text variant="caption" color="textTertiary" style={styles.unit}>{unit}</Text>
        ) : null}
      </View>
      <Text variant="overline" color="textTertiary">{label}</Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.base,
    minWidth: 90,
  },
  compact: {
    padding: spacing.md,
  },
  iconRow: {
    marginBottom: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginBottom: spacing.xxs,
  },
  unit: {
    marginBottom: 4,
  },
});
