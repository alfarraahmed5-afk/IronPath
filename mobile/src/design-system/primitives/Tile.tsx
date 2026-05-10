/**
 * STUB -- replaced by Team B (B-1) in PR B.
 *
 * Grid tile primitive. Public API: <Tile size={'sm'|'md'|'lg'} />
 */
import React, { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';

export interface TileProps {
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  children?: ReactNode;
}

export function Tile({ style, children }: TileProps) {
  return <View style={style}>{children}</View>;
}
