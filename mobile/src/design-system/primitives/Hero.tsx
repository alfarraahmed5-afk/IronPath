/**
 * STUB -- replaced by Team B (B-1) in PR B.
 *
 * Photo-hero band with gradient mask + ember overlay. Public API:
 *   <Hero source={...} height={280} maskDirection="left|top|right|bottom" />
 */
import React from 'react';
import { View, ViewStyle } from 'react-native';

export interface HeroProps {
  source?: { uri: string } | number;
  height?: number;
  maskDirection?: 'left' | 'top' | 'right' | 'bottom';
  ember?: boolean;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function Hero({ height = 280, style, children }: HeroProps) {
  return <View style={[{ height }, style]}>{children}</View>;
}
