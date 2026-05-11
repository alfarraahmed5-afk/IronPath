/**
 * ShareCard -- off-screen 1080x1920 layout rendered for export via
 * react-native-view-shot per lib/share-card-export.ts.
 *
 * Lens 7 P0-7 spec:
 *   - Photo asset full-bleed (B&W gym macro recommended).
 *   - Brand-crimson ember bottom-up multiply at ~60% opacity.
 *   - LinearGradient dark-from-bottom mask for legibility.
 *   - Headline (display3 crimson), stat block (display1 white),
 *     subhead (body white), footer band with gym name + handle +
 *     IronPath wordmark.
 *
 * Caller mounts the card in an off-screen <View> with negative left
 * offset + opacity 0, captures via captureShareCardRef, then unmounts.
 */
import React, { forwardRef, ReactNode } from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/tokens';

export interface ShareCardProps {
  /** Title line, e.g. "New PR" or "March 2026". */
  headline: string;
  /** Big stat, e.g. "102.5 kg x 5". */
  stat: string;
  /** Subline, e.g. "+5.2% over my previous best". */
  subhead?: string;
  /** Photo URI -- bundled require() or remote URI. */
  photoSource?: { uri: string } | number;
  /** Footer text -- gym name overline. */
  gymName?: string;
  /** Footer @username (without leading @). */
  handle?: string;
  /** Optional extra children below the stat. */
  children?: ReactNode;
}

export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(
  { headline, stat, subhead, photoSource, gymName, handle, children },
  ref,
) {
  return (
    <View ref={ref} style={styles.root} collapsable={false}>
      {photoSource ? (
        <ExpoImage
          source={photoSource}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={0}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
      )}
      <LinearGradient
        colors={['rgba(10,10,11,0.20)', 'rgba(10,10,11,0.90)']}
        locations={[0.35, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(200,16,46,0)', 'rgba(200,16,46,0.60)']}
        start={{ x: 0.5, y: 0.4 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Headline (top-third) */}
      <View style={styles.headlineWrap}>
        <RNText style={styles.headline} allowFontScaling={false}>{headline}</RNText>
      </View>

      {/* Stat block (mid) */}
      <View style={styles.statWrap}>
        <RNText style={styles.stat} allowFontScaling={false}>{stat}</RNText>
        {subhead ? (
          <RNText style={styles.subhead} allowFontScaling={false}>{subhead}</RNText>
        ) : null}
        {children}
      </View>

      {/* Footer band */}
      <View style={styles.footer}>
        <View style={styles.footerInner}>
          {gymName ? (
            <RNText style={styles.gymName} allowFontScaling={false}>{gymName.toUpperCase()}</RNText>
          ) : null}
          {handle ? (
            <RNText style={styles.handle} allowFontScaling={false}>@{handle}</RNText>
          ) : null}
        </View>
        <View style={styles.wordmark}>
          <View style={styles.crimsonDot} />
          <RNText style={styles.wordmarkText} allowFontScaling={false}>IronPath</RNText>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    width: 1080,
    height: 1920,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  headlineWrap: {
    position: 'absolute',
    top: 240,
    left: 80,
    right: 80,
  },
  headline: {
    fontSize: 160,
    fontWeight: '800',
    color: '#C8102E',
    letterSpacing: -2,
    lineHeight: 168,
  },
  statWrap: {
    position: 'absolute',
    top: 880,
    left: 80,
    right: 80,
    gap: 24,
  },
  stat: {
    fontSize: 132,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 140,
  },
  subhead: {
    fontSize: 48,
    fontWeight: '500',
    color: '#F5F5F7',
    opacity: 0.92,
  },
  footer: {
    position: 'absolute',
    left: 80,
    right: 80,
    bottom: 96,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  footerInner: { flexDirection: 'column', gap: 12 },
  gymName: {
    fontSize: 28,
    fontWeight: '600',
    color: '#A1A1AA',
    letterSpacing: 2,
  },
  handle: {
    fontSize: 44,
    fontWeight: '600',
    color: '#F5F5F7',
  },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  crimsonDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#C8102E' },
  wordmarkText: { fontSize: 44, fontWeight: '700', color: '#FFFFFF' },
});
