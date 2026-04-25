import { useState } from 'react';
import { TextInput, TextInputProps, View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, type as typeTokens } from '../theme/tokens';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export function Input({ label, error, leftIcon, rightIcon, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.wrapper,
          focused && styles.focused,
          error ? styles.error : null,
        ]}
      >
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textTertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typeTokens.overline,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    minHeight: 48,
  },
  focused: {
    borderColor: colors.brand,
  },
  error: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Barlow_400Regular',
    paddingVertical: spacing.md,
  },
  icon: {
    marginRight: spacing.sm,
  },
  errorText: {
    ...typeTokens.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
