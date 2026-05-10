import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'IronPath — Run your gym, not software';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0A0A0B',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#FAFAFB',
        }}
      >
        <div
          style={{
            fontSize: 168,
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}
        >
          IRONPATH
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 32,
            color: '#A1A1AA',
            letterSpacing: '-0.01em',
          }}
        >
          Run your gym, not software.
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background:
              'linear-gradient(90deg, transparent 0%, #C8102E 50%, transparent 100%)',
          }}
        />
      </div>
    ),
    size,
  );
}
