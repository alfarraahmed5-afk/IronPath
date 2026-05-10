/**
 * Off-screen share-card render pipeline.
 *
 * Lens 7 spec, item P0 #65: produce a 1080x1920 PNG of a
 * <ShareCard /> component (Team C-1 owns the component tree) and
 * surface a file URI the caller can hand to expo-sharing or the
 * IG-Stories deep link.
 *
 * Implementation strategy:
 *   - Pure JS-side wrapper around `react-native-view-shot` v4 (already
 *     installed). The wrapper accepts a ref + dimensions and calls
 *     `captureRef` with `format: 'png'` and `result: 'tmpfile'`.
 *   - Callers mount the share-card subtree in a hidden absolutely-
 *     positioned <View> sized to 1080x1920 with `pointer-events:'none'`
 *     and `opacity:0`, capture it via the ref, then unmount.
 *   - The captured file lives in the OS cache directory; expo-sharing
 *     accepts that URI directly. No copy needed.
 *
 * Caller pattern (Team C-1 implements the host screen):
 *
 *   const ref = useRef(null);
 *   <View style={offscreen}><ShareCard ref={ref} ... /></View>;
 *   const uri = await captureShareCardRef(ref, { width: 1080, height: 1920 });
 *   await openShareSheet(uri);
 *
 * The ref-based variant is the primary entry point. The component-
 * based variant `captureShareCard` is provided for ergonomics but
 * defers to the same capture mechanism.
 */
import { Platform, Linking } from 'react-native';
import { captureRef, CaptureOptions as ViewShotCaptureOptions } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export interface ShareCardDimensions {
  width: number;
  height: number;
}

export interface CaptureOptions extends ShareCardDimensions {
  format?: 'png' | 'jpg';
  quality?: number;
}

const DEFAULT_OPTS: Required<Pick<CaptureOptions, 'width' | 'height' | 'format' | 'quality'>> = {
  width: 1080,
  height: 1920,
  format: 'png',
  quality: 1,
};

/**
 * Capture a mounted ref to a tmp file. Returns a `file://` URI on
 * iOS/Android. Throws on failure (caller decides whether to swallow
 * for analytics or surface a toast).
 */
export async function captureShareCardRef(
  ref: any,
  opts: Partial<CaptureOptions> = {},
): Promise<string> {
  const merged = { ...DEFAULT_OPTS, ...opts };
  const captureOpts: ViewShotCaptureOptions = {
    format: merged.format,
    quality: merged.quality,
    width: merged.width,
    height: merged.height,
    result: 'tmpfile',
  };
  const uri = await captureRef(ref, captureOpts);
  return uri;
}

/**
 * Convenience wrapper named to match the slice spec
 * `captureShareCard(component, dimensions)`. The implementation defers
 * to the ref-based variant -- the caller still has to mount the
 * component off-screen and forward a ref. The signature is preserved
 * so screens can call it positionally.
 *
 * Returns the file URI. Throws on capture failure.
 */
export async function captureShareCard(
  ref: any,
  dimensions: ShareCardDimensions = { width: 1080, height: 1920 },
): Promise<string> {
  return captureShareCardRef(ref, dimensions);
}

/**
 * Open the system share sheet for a captured share-card URI.
 * Uses `expo-sharing` so the dialog is native on both platforms.
 *
 * Returns true on a completed share dialog, false if sharing isn't
 * available (rare on real devices, common in simulators).
 */
export async function openShareSheet(uri: string): Promise<boolean> {
  const available = await Sharing.isAvailableAsync();
  if (!available) return false;
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    dialogTitle: 'Share your workout',
    UTI: 'public.png',
  });
  return true;
}

/**
 * IG-Stories deep link. Falls back to the system share sheet when IG
 * isn't installed. Source-application id is the Apple App ID per
 * Instagram's deep-link contract; backgroundImage is a `data:` URI or
 * a known scheme (here: file:// captured by view-shot).
 *
 * Reference: https://developers.facebook.com/docs/instagram/sharing-to-stories/
 *
 * IG only accepts file:// on iOS via the document-interaction route;
 * Android accepts the file URI directly. We try the deep link first;
 * if the open returns falsy or IG isn't installed, we fall back to
 * the system sheet.
 */
export async function shareToInstagramStoriesOrFallback(uri: string): Promise<boolean> {
  const sourceApplication = 'com.ironpath.mobile';
  const igUrl =
    Platform.OS === 'ios'
      ? `instagram-stories://share?source_application=${encodeURIComponent(sourceApplication)}`
      : `instagram-stories://share?source_application=${encodeURIComponent(sourceApplication)}&backgroundImage=${encodeURIComponent(uri)}`;

  try {
    const supported = await Linking.canOpenURL(igUrl);
    if (supported) {
      await Linking.openURL(igUrl);
      return true;
    }
  } catch {
    // fall through to system sheet
  }
  return openShareSheet(uri);
}
