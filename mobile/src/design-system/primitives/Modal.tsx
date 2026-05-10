/**
 * STUB -- replaced by Team B (B-2) in PR B.
 *
 * Route-modal wrapper with consistent header (Cancel / Title / Save).
 * Used by screens declared with `<Stack.Screen options={{ presentation:
 * 'modal' }}>`.
 *
 * Public API:
 *   <RouteModal title="..." onCancel={fn} onSave={fn} saving={bool}>
 *     {children}
 *   </RouteModal>
 */
import React, { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';

export interface RouteModalProps {
  title?: string;
  onCancel?: () => void;
  onSave?: () => void;
  saving?: boolean;
  style?: ViewStyle;
  children?: ReactNode;
}

export function RouteModal({ children, style }: RouteModalProps) {
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
}
