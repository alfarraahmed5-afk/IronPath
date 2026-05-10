'use client';

// EmberCanvasBootstrap — the public mount point that the cold-open scene
// imports. Three responsibilities:
//
//   1. SSR-safe device-tier check. Tier C → permanent null; nothing else
//      runs. No GL context, no chunk download, no idle-callback handler.
//   2. Defer the heavy chunk until the browser is idle (rIC w/ 1500ms
//      timeout). This guarantees the canvas can never compete with LCP for
//      main-thread time on slow devices.
//   3. Dynamic-import `EmberCanvasReal` so OGL + shaders land in a separate
//      chunk. The initial-page cost of mounting the bootstrap is just this
//      file (a few hundred bytes after gz).
//
// The `visible` prop is forwarded to the real canvas, which handles the
// opacity crossfade itself (DOM-direct, not via React re-render).

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { getDeviceTier, type DeviceTier } from './device-tier';

const EmberCanvasReal = dynamic(
  () =>
    import('@/components/canvas/ember-canvas-real').then((m) => ({
      default: m.EmberCanvasReal,
    })),
  { ssr: false },
);

export interface EmberCanvasBootstrapProps {
  className?: string;
  visible?: boolean;
}

type WindowWithIdle = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export default function EmberCanvasBootstrap({
  className,
  visible,
}: EmberCanvasBootstrapProps) {
  // Resolve tier once on mount. Server render path returns 'C' from the
  // helper, so the first client render also computes and we get a stable
  // post-hydration value.
  const [tier, setTier] = useState<DeviceTier | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTier(getDeviceTier());
  }, []);

  useEffect(() => {
    if (tier === null || tier === 'C') return;

    const w = window as WindowWithIdle;
    let handle: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (typeof w.requestIdleCallback === 'function') {
      handle = w.requestIdleCallback(() => setReady(true), { timeout: 1500 });
    } else {
      // Safari: no rIC. Fall back to a macrotask after a small delay so we
      // still land after first paint without blocking it.
      timer = setTimeout(() => setReady(true), 200);
    }

    return () => {
      if (handle !== null && typeof w.cancelIdleCallback === 'function') {
        w.cancelIdleCallback(handle);
      }
      if (timer) clearTimeout(timer);
    };
  }, [tier]);

  // Tier C devices: nothing, ever. Poster carries the hero on its own.
  if (tier === 'C') return null;
  // Tier resolved but idle slot hasn't fired yet → still nothing rendered.
  if (!ready || tier === null) return null;

  return <EmberCanvasReal className={className} visible={visible} tier={tier} />;
}
