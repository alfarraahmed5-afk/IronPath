/**
 * STUB -- replaced by Team B (B-2) in PR B.
 *
 * Overline label primitive. Public API: <Eyebrow>UPPERCASE</Eyebrow>
 */
import React, { ReactNode } from 'react';
import { Text } from '../../components/Text';

export function Eyebrow({ children, color = 'textTertiary' }: { children: ReactNode; color?: any }) {
  return <Text variant="overline" color={color}>{children}</Text>;
}
