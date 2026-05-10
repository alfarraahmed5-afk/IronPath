/**
 * STUB -- replaced by Team B (B-1) in PR B.
 *
 * 1px hairline + breathing ember gradient + halo. Mobile equivalent of
 * marketing's <EmberSeam />. Lens 1 + 2 own the visual spec.
 *
 * Public API: <EmberSeam vertical={false} intensity={1} color={...} />
 */
import React from 'react';
import { View, ViewStyle } from 'react-native';

export interface EmberSeamProps {
  vertical?: boolean;
  intensity?: number;
  color?: string;
  style?: ViewStyle;
}

export function EmberSeam({ vertical, color = '#C8102E', style }: EmberSeamProps) {
  return (
    <View
      style={[
        vertical
          ? { width: 1, alignSelf: 'stretch' }
          : { height: 1, alignSelf: 'stretch' },
        { backgroundColor: color, opacity: 0.5 },
        style,
      ]}
    />
  );
}
