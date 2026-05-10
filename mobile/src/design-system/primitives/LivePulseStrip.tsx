/**
 * STUB -- replaced by Team B (B-2) in PR B.
 *
 * Ember sliver sweep at the top of live surfaces. Mobile equivalent of
 * marketing's <LivePulseStrip />. Honors useReducedMotion.
 */
import React from 'react';
import { View, ViewStyle } from 'react-native';

export interface LivePulseStripProps {
  style?: ViewStyle;
}

export function LivePulseStrip({ style }: LivePulseStripProps) {
  return <View style={[{ height: 1 }, style]} />;
}
