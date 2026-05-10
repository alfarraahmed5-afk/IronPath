/**
 * STUB -- replaced by Team B (B-2) in PR B.
 *
 * Mobile NumberFlow primitive. Reanimated digit-roll on value change.
 * Public API: <Numeric value={123.45} format={(v) => `${v} kg`} />
 *
 * Today: renders the formatted value as plain Text (no animation) so
 * screens can already import + ship.
 */
import React from 'react';
import { Text } from 'react-native';

export interface NumericProps {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  style?: any;
}

export function Numeric({ value, format = (v) => String(v), style }: NumericProps) {
  return <Text style={style}>{format(value)}</Text>;
}
