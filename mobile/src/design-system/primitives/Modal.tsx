/**
 * RouteModal -- consistent header for screens declared
 * `<Stack.Screen options={{ presentation: 'modal' }}>`.
 *
 * Lens 5 IA spec: any modal-presentation screen (compose workout,
 * edit measurement, settings/* full-screen pages) wraps its body
 * in this component to inherit the canonical Cancel / Title / Save
 * (or close-only) header.
 *
 * Behavior:
 *   - Cancel button: dismisses via `router.back()` if no `onCancel`
 *     handler is supplied; calls `onCancel` otherwise.
 *   - Save button: only rendered if `onSave` is supplied. Disabled +
 *     spinner when `saving` is true.
 *   - When neither onCancel nor onSave is supplied and `closable` is
 *     true, the header renders an X close button on the leading edge.
 *   - Hairline EmberSeam on the bottom of the header, lens 1 + 2
 *     fingerprint.
 *   - SafeAreaInsets.top respected so notch / Dynamic Island never
 *     cuts the title.
 */
import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { Text } from '../../components/Text';
import { Pressable } from '../../components/Pressable';
import { EmberSeam } from './EmberSeam';
import { spacing, colors } from '../../theme/tokens';

export interface RouteModalProps {
  /** Centered title in the header. */
  title?: ReactNode;
  /** Optional left-side action label. Default 'Cancel'. */
  cancelLabel?: string;
  /** Cancel handler. Defaults to router.back(). */
  onCancel?: () => void;
  /** If false, hides the cancel/close affordance. Default true. */
  closable?: boolean;
  /**
   * Save handler. When supplied, a right-side primary action is
   * rendered (label defaults to 'Save'). Omit for read-only modals.
   */
  onSave?: () => void;
  /** Optional save-action label. Default 'Save'. */
  saveLabel?: string;
  /**
   * When true the save button shows a spinner and is non-interactive.
   * Useful for in-flight mutations.
   */
  saving?: boolean;
  /**
   * When true the save button is rendered grayed-out and ignores
   * presses. Use when the form is not yet valid.
   */
  disabled?: boolean;
  /** Inset content body padding. Default `spacing.base` horizontal. */
  contentInset?: number;
  /** Outer style override on the root container. */
  style?: ViewStyle;
  /** Body content. Renders below the header. */
  children?: ReactNode;
}

export function RouteModal({
  title,
  cancelLabel = 'Cancel',
  onCancel,
  closable = true,
  onSave,
  saveLabel = 'Save',
  saving = false,
  disabled = false,
  contentInset = spacing.base,
  style,
  children,
}: RouteModalProps) {
  const insets = useSafeAreaInsets();

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    if (router.canGoBack()) router.back();
  };

  const showCloseIcon = closable && !onCancel && !cancelLabel;
  const saveActive = !!onSave && !saving && !disabled;

  return (
    <View
      style={[styles.root, style]}
      accessibilityViewIsModal
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.side}>
          {closable && (
            showCloseIcon ? (
              <Pressable
                hitSlop={12}
                onPress={handleCancel}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={22} color={colors.textPrimary} />
              </Pressable>
            ) : (
              <Pressable
                hitSlop={12}
                onPress={handleCancel}
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
              >
                <Text variant="bodyEmphasis" color="textSecondary">{cancelLabel}</Text>
              </Pressable>
            )
          )}
        </View>
        <View style={styles.titleWrap} accessibilityRole="header">
          {typeof title === 'string'
            ? <Text variant="title3" numberOfLines={1}>{title}</Text>
            : title}
        </View>
        <View style={[styles.side, styles.sideEnd]}>
          {onSave ? (
            saving ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <Pressable
                hitSlop={12}
                onPress={saveActive ? onSave : undefined}
                accessibilityRole="button"
                accessibilityLabel={saveLabel}
                accessibilityState={{ disabled: !saveActive }}
              >
                <Text
                  variant="bodyEmphasis"
                  color={saveActive ? 'brand' : 'textTertiary'}
                >
                  {saveLabel}
                </Text>
              </Pressable>
            )
          ) : null}
        </View>
      </View>
      <EmberSeam style={{ opacity: 0.5 }} />
      <View style={[styles.body, { paddingHorizontal: contentInset }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.base,
    minHeight: 56,
  },
  side: {
    minWidth: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  sideEnd: {
    justifyContent: 'flex-end',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  body: {
    flex: 1,
    paddingTop: spacing.base,
  },
});
