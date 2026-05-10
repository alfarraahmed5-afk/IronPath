/**
 * Section -- titled section wrapper.
 *
 * Wraps a chunk of content with an optional header row (title +
 * optional eyebrow + optional trailing accessory like "See all").
 * Used on Home, Progress, Profile, etc.
 *
 * Layout per lens 5 IA spec:
 *   [Eyebrow]
 *   Title                          [trailing]
 *   { children }
 *
 * The header row is omitted entirely when neither title nor trailing
 * is provided so callers can reuse the component as a pure spacing
 * shell.
 */
import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { Text } from '../../components/Text';
import { Eyebrow } from './Eyebrow';
import { spacing } from '../../theme/tokens';

export interface SectionProps {
  /** Optional small uppercase eyebrow above the title. */
  eyebrow?: ReactNode;
  /** Section title. Renders as `type.title2`. */
  title?: ReactNode;
  /**
   * Trailing accessory element. Typical use: a "See all" Pressable
   * or a chip filter. Aligned to the end of the title row.
   */
  trailing?: ReactNode;
  /** Optional second-line description below the title. */
  subtitle?: ReactNode;
  /** Inset the section content from the screen edges (default 0). */
  inset?: number;
  /** Vertical gap between header and children (default spacing.md). */
  gap?: number;
  /** Outer container style override. */
  style?: ViewStyle;
  children?: ReactNode;
}

export function Section({
  eyebrow,
  title,
  trailing,
  subtitle,
  inset = 0,
  gap = spacing.md,
  style,
  children,
}: SectionProps) {
  const hasHeader = !!(eyebrow || title || trailing || subtitle);
  return (
    <View style={[styles.root, style, inset ? { paddingHorizontal: inset } : null]}>
      {hasHeader && (
        <View style={[styles.header, { marginBottom: gap }]}>
          {eyebrow ? (
            <View style={styles.eyebrow}>
              {typeof eyebrow === 'string' ? <Eyebrow>{eyebrow}</Eyebrow> : eyebrow}
            </View>
          ) : null}
          <View style={styles.titleRow}>
            <View style={styles.titleWrap}>
              {title ? (
                typeof title === 'string'
                  ? <Text variant="title2">{title}</Text>
                  : title
              ) : null}
              {subtitle ? (
                <View style={{ marginTop: spacing.xxs }}>
                  {typeof subtitle === 'string'
                    ? <Text variant="body" color="textSecondary">{subtitle}</Text>
                    : subtitle}
                </View>
              ) : null}
            </View>
            {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
          </View>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  header: {
    width: '100%',
  },
  eyebrow: {
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  trailing: {
    flexShrink: 0,
  },
});
