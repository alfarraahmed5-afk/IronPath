/**
 * Numeric -- mobile NumberFlow primitive.
 *
 * Renders a number in tabular-nums type. Animates to a new value
 * with a per-digit roll: each digit slot is an absolutely-positioned
 * column showing 0..9 stacked vertically; the column's translateY
 * animates to the target digit's offset over `duration` ms with the
 * Vercel ease curve. Locale-aware grouping. Static fallback under
 * reduce-motion (renders the new value instantly with a 200ms opacity
 * flash).
 *
 * Lens 1 spec, P0 #5. Replaces the marketing site's @number-flow/react
 * for mobile callers.
 *
 * The implementation favors text-only Reanimated (no Skia) for
 * battery + bundle reasons. If a future caller needs sub-pixel
 * fidelity (large hero number rolls during PR celebrate), swap to a
 * Skia variant -- the public API stays.
 */
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { View, Text as RNText, TextStyle, StyleProp, AccessibilityProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { type as typeTokens, colors as colorTokens } from '../../theme/tokens';
import { useTheme } from '../theme/useTheme';

type TypeVariant = keyof typeof typeTokens;
type ColorToken = keyof typeof colorTokens;

export interface NumericProps extends AccessibilityProps {
  /** Numeric value to render. Decimal supported via `format`. */
  value: number;
  /**
   * Render the value as a string. Default formats integers without
   * grouping. Pass a custom formatter for kg, %, k-suffix, etc.
   */
  format?: (v: number) => string;
  /** Animation duration in ms. Default 540 per lens 1 spec. */
  duration?: number;
  /** Type variant token. Default 'numeric'. */
  variant?: TypeVariant;
  /** Override color token. Default 'textPrimary'. */
  color?: ColorToken;
  /** Additional style on the rendered text. */
  style?: StyleProp<TextStyle>;
  /** Force monospace digits (default: variant determines via tokens). */
  tabular?: boolean;
}

/* Internal: split a formatted string into character slots. Digits
 * roll; non-digits (separators, units) stay static. */
function splitSlots(s: string): Array<{ char: string; isDigit: boolean }> {
  return Array.from(s).map(ch => ({ char: ch, isDigit: ch >= '0' && ch <= '9' }));
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const VERCEL_EASE = Easing.bezier(0.32, 0.72, 0, 1);

interface DigitColumnProps {
  digit: number;
  height: number;
  duration: number;
  reduceMotion: boolean;
  textStyle: StyleProp<TextStyle>;
  width: number;
}

function DigitColumn({ digit, height, duration, reduceMotion, textStyle, width }: DigitColumnProps) {
  const offset = useSharedValue(-digit * height);
  const firstRender = useRef(true);

  useEffect(() => {
    const target = -digit * height;
    if (reduceMotion || firstRender.current) {
      offset.value = target;
    } else {
      offset.value = withTiming(target, { duration, easing: VERCEL_EASE });
    }
    firstRender.current = false;
  }, [digit, height, duration, reduceMotion, offset]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return (
    <View
      style={{
        width,
        height,
        overflow: 'hidden',
      }}
      pointerEvents="none"
    >
      <Animated.View style={animStyle}>
        {DIGITS.map(d => (
          <RNText
            key={d}
            style={[textStyle, { height, lineHeight: height, textAlign: 'center', includeFontPadding: false }]}
            allowFontScaling={false}
          >
            {d}
          </RNText>
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * Approximate digit width based on the variant's fontSize. Tabular
 * digits are roughly 0.6 of fontSize; we err high so glyphs don't
 * clip. Caller can override via style.
 */
function approxDigitWidth(variant: TypeVariant): number {
  const t = typeTokens[variant];
  // Numeric variants use BarlowCondensed; condensed ~0.55, regular ~0.62.
  const ratio = String(t.fontFamily).includes('Condensed') ? 0.55 : 0.62;
  return Math.ceil(t.fontSize * ratio);
}

export function Numeric({
  value,
  format,
  duration = 540,
  variant = 'numeric',
  color = 'textPrimary',
  style,
  tabular = true,
  accessibilityLabel,
  ...rest
}: NumericProps) {
  const { reduceMotion } = useTheme();
  const formatted = useMemo(
    () => (format ? format(value) : String(Math.round(value))),
    [format, value],
  );
  const slots = useMemo(() => splitSlots(formatted), [formatted]);

  const variantStyle = typeTokens[variant];
  const lineHeight = (variantStyle.lineHeight ?? variantStyle.fontSize) as number;
  const baseTextStyle: StyleProp<TextStyle> = useMemo(
    () => [
      variantStyle as TextStyle,
      { color: colorTokens[color] },
      tabular ? { fontVariant: ['tabular-nums'] as any } : null,
      style,
    ],
    [variantStyle, color, tabular, style],
  );

  const digitWidth = approxDigitWidth(variant);

  const a11yLabel = accessibilityLabel ?? formatted;

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center' }}
      accessibilityLabel={a11yLabel}
      accessibilityRole="text"
      accessible
      {...rest}
    >
      {slots.map((slot, i) => {
        if (!slot.isDigit) {
          return (
            <RNText
              key={`s-${i}`}
              style={[baseTextStyle, { height: lineHeight, lineHeight, includeFontPadding: false }]}
              allowFontScaling={false}
            >
              {slot.char}
            </RNText>
          );
        }
        return (
          <DigitColumn
            key={`d-${i}`}
            digit={Number(slot.char)}
            height={lineHeight}
            width={digitWidth}
            duration={duration}
            reduceMotion={reduceMotion}
            textStyle={baseTextStyle}
          />
        );
      })}
    </View>
  );
}
