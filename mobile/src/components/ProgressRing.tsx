import { View } from 'react-native';
import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { colors } from '../theme/tokens';

type Props = {
  progress: number; // 0–1
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
};

export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 8,
  color = colors.brand,
  trackColor = colors.surface3,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const dashOffset = circumference * (1 - clampedProgress);

  const arcPath = Skia.Path.Make();
  arcPath.addArc(
    { x: strokeWidth / 2, y: strokeWidth / 2, width: size - strokeWidth, height: size - strokeWidth },
    -90,
    360 * clampedProgress,
  );

  const trackPath = Skia.Path.Make();
  trackPath.addArc(
    { x: strokeWidth / 2, y: strokeWidth / 2, width: size - strokeWidth, height: size - strokeWidth },
    -90,
    360,
  );

  const trackPaint = Skia.Paint();
  trackPaint.setColor(Skia.Color(trackColor));
  trackPaint.setStyle(1);
  trackPaint.setStrokeWidth(strokeWidth);
  trackPaint.setAntiAlias(true);

  const arcPaint = Skia.Paint();
  arcPaint.setColor(Skia.Color(color));
  arcPaint.setStyle(1);
  arcPaint.setStrokeWidth(strokeWidth);
  arcPaint.setStrokeCap(2);
  arcPaint.setAntiAlias(true);

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ flex: 1 }}>
        <Path path={trackPath} paint={trackPaint} />
        {clampedProgress > 0 && <Path path={arcPath} paint={arcPaint} />}
      </Canvas>
    </View>
  );
}
