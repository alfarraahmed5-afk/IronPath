/**
 * Eyebrow -- overline label primitive.
 *
 * Tiny uppercase tracking-loose label used above section titles, hero
 * subtitles, and sheet headers. Consumes `type.overline` from tokens
 * (Mona Sans / Barlow Medium, 11px, 1.0 letter-spacing, uppercase).
 *
 * The `tone` prop maps to a semantic token color so the component is
 * brand-bound without screens hard-coding hex values.
 */
import React, { ReactNode } from 'react';
import { TextStyle, AccessibilityProps } from 'react-native';
import { Text } from '../../components/Text';
import { colors } from '../../theme/tokens';

export interface EyebrowProps extends AccessibilityProps {
  children: ReactNode;
  tone?: 'tertiary' | 'secondary' | 'brand' | 'success' | 'danger' | 'warning';
  style?: TextStyle;
}

const TONE_TO_COLOR: Record<NonNullable<EyebrowProps['tone']>, keyof typeof colors> = {
  tertiary:  'textTertiary',
  secondary: 'textSecondary',
  brand:     'brand',
  success:   'success',
  danger:    'danger',
  warning:   'warning',
};

export function Eyebrow({
  children,
  tone = 'tertiary',
  style,
  accessibilityRole = 'header',
  ...accessibility
}: EyebrowProps) {
  const colorKey = TONE_TO_COLOR[tone];
  return (
    <Text
      variant="overline"
      color={colorKey}
      style={style}
      accessibilityRole={accessibilityRole}
      {...accessibility}
    >
      {children}
    </Text>
  );
}
