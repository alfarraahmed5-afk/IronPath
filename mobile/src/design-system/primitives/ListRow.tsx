/**
 * STUB -- replaced by Team B (B-1) in PR B.
 *
 * List row primitive with leading icon, content, trailing accessory,
 * swipe actions (lens 8 spec). Public API:
 *   <ListRow leading={...} title="..." subtitle="..." trailing={...}
 *            onPress={fn} swipeActions={[{label, color, onPress}]} />
 */
import React, { ReactNode } from 'react';
import { View, ViewStyle, Pressable } from 'react-native';

export interface ListRowProps {
  leading?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  swipeActions?: Array<{ label: string; color: string; onPress: () => void }>;
  style?: ViewStyle;
}

export function ListRow({
  leading, title, subtitle, trailing, onPress, onLongPress, style,
}: ListRowProps) {
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {leading}
        <View style={{ flex: 1 }}>
          {title}
          {subtitle}
        </View>
        {trailing}
      </View>
    </Pressable>
  );
}
