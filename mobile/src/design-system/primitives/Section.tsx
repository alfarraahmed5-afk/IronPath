/**
 * STUB -- replaced by Team B (B-2) in PR B.
 *
 * Titled section wrapper. Public API:
 *   <Section title="..." trailing={...}>{children}</Section>
 */
import React, { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';

export interface SectionProps {
  title?: ReactNode;
  trailing?: ReactNode;
  style?: ViewStyle;
  children?: ReactNode;
}

export function Section({ children, style }: SectionProps) {
  return <View style={style}>{children}</View>;
}
