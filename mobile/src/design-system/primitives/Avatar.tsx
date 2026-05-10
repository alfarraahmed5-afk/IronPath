/**
 * Avatar -- user avatar primitive with monogram fallback.
 *
 * Lens 2 spec: on photo load failure (or no avatar URL), render the
 * user's initials in MonaSans Medium on an `ink-200` background with
 * a thin crimson stroke. expo-image with blurhash placeholder used
 * for the photo path; transition softens the swap-in.
 *
 * Sizes: 24, 32, 40, 48, 56, 80, 120 -- the canonical stops feeds
 * lens 5 IA decisions on dense lists vs hero avatars.
 */
import React, { useState } from 'react';
import { View, Text as RNText, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { colors, radii } from '../../theme/tokens';

export type AvatarSize = 24 | 32 | 40 | 48 | 56 | 80 | 120;

export interface AvatarProps {
  /**
   * Username -- used for the monogram fallback. Required because
   * even when an avatarUrl is provided, the fallback path needs an
   * initial.
   */
  username: string;
  /** Optional remote avatar URL. */
  avatarUrl?: string | null;
  /** Display name -- preferred over username for the monogram char. */
  displayName?: string | null;
  /** Visual size token. Defaults 40. */
  size?: AvatarSize;
  /** Optional outer style override. */
  style?: ViewStyle;
}

const FONT_SIZES: Record<AvatarSize, number> = {
  24:  10,
  32:  12,
  40:  14,
  48:  16,
  56:  20,
  80:  28,
  120: 42,
};

const STROKE_WIDTHS: Record<AvatarSize, number> = {
  24:  0.75,
  32:  1,
  40:  1,
  48:  1.25,
  56:  1.25,
  80:  1.5,
  120: 1.75,
};

/**
 * The "ink-200" background per lens 2: a warm-shifted dark surface
 * tone consistent with the new ink scale. We hard-code the value
 * here (lens 2's locked palette is on Team A's slice; once tokens.ts
 * exposes the named token, swap this to colors.ink200).
 */
const MONOGRAM_BG = '#16161A';

/**
 * Brand crimson stroke. The lens 2 spec calls this "thin crimson
 * stroke around the monogram circle"; we read from colors.brand so
 * Team A's recolor flows through.
 */
function getMonogramChar(opts: { username: string; displayName?: string | null }): string {
  const source = (opts.displayName?.trim() || opts.username || '').trim();
  if (!source) return '?';
  // First letter of first word; fall back to first character.
  const first = source.split(/\s+/)[0]?.charAt(0) ?? source.charAt(0);
  return first.toUpperCase();
}

export function Avatar({
  username,
  avatarUrl,
  displayName,
  size = 40,
  style,
}: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const showPhoto = !!avatarUrl && !errored;

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: radii.full,
  };

  if (showPhoto) {
    return (
      <View
        style={[containerStyle, style]}
        accessibilityRole="image"
        accessibilityLabel={`${displayName || username}'s avatar`}
      >
        <Image
          source={{ uri: avatarUrl! }}
          style={[
            { width: size, height: size, borderRadius: radii.full },
          ]}
          contentFit="cover"
          cachePolicy="memory-disk"
          placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1Ex@@or[Q6.' }}
          transition={200}
          onError={() => setErrored(true)}
        />
      </View>
    );
  }

  const initial = getMonogramChar({ username, displayName });
  const fontSize = FONT_SIZES[size];
  const strokeWidth = STROKE_WIDTHS[size];

  return (
    <View
      style={[
        styles.monogram,
        containerStyle,
        {
          backgroundColor: MONOGRAM_BG,
          borderColor: colors.brand,
          borderWidth: strokeWidth,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`${displayName || username}'s avatar`}
    >
      <RNText
        style={[
          styles.initial,
          {
            fontSize,
            lineHeight: fontSize * 1.05,
            color: colors.textPrimary,
          },
        ]}
        allowFontScaling={false}
      >
        {initial}
      </RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  monogram: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    // Mona Sans Medium is the lens-2-spec'd font for the monogram.
    // Falls back to Barlow Medium until A-1 lands the Mona import in
    // PR A. Either way, tabular-style for one-char rendering doesn't
    // matter -- this is a single glyph.
    fontFamily: 'Barlow_500Medium',
    fontWeight: '500',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
