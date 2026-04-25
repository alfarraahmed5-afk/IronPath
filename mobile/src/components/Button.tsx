import { ActivityIndicator, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing, type as typeTokens } from '../theme/tokens';
import { haptic } from '../lib/haptics';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

const variantStyles: Record<ButtonVariant, { bg: string; text: string; borderColor?: string }> = {
  primary:     { bg: colors.brand,         text: colors.textOnBrand },
  secondary:   { bg: colors.surface3,      text: colors.textPrimary },
  ghost:       { bg: 'transparent',        text: colors.textPrimary },
  destructive: { bg: colors.dangerDim,     text: colors.danger },
};

const sizeStyles: Record<ButtonSize, { paddingH: number; paddingV: number; fontSize: number; minHeight: number }> = {
  sm: { paddingH: spacing.md,   paddingV: spacing.sm,   fontSize: 13, minHeight: 36 },
  md: { paddingH: spacing.lg,   paddingV: spacing.md,   fontSize: 15, minHeight: 44 },
  lg: { paddingH: spacing.xl,   paddingV: spacing.base, fontSize: 16, minHeight: 52 },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: Props) {
  const vs = variantStyles[variant];
  const ss = sizeStyles[size];
  const isDisabled = disabled || loading;

  function handlePress() {
    if (variant === 'primary' || variant === 'destructive') {
      haptic.light();
    }
    onPress();
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.base,
        {
          backgroundColor: vs.bg,
          paddingHorizontal: ss.paddingH,
          paddingVertical: ss.paddingV,
          minHeight: ss.minHeight,
          opacity: isDisabled ? 0.4 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.text} />
      ) : (
        <Text style={[styles.label, { fontSize: ss.fontSize, color: vs.text }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: {
    fontFamily: 'Barlow_600SemiBold',
  },
});
