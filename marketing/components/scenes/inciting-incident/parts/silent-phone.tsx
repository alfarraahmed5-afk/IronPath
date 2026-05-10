'use client';

// "Before" frame 3 -- a phone showing a clean home screen with NO notifications.
// The owner checked. There's nothing there. CSS-rendered phone shell so we
// don't ship an image; the saturation filter on the parent reduces it to grey
// regardless.

import { forwardRef } from 'react';

export const SilentPhone = forwardRef<HTMLDivElement>(function SilentPhone(_, ref) {
  return (
    <div ref={ref} aria-hidden className="absolute inset-0 grid place-items-center">
      <div className="relative w-[min(48vw,240px)] aspect-[9/19] rounded-[2.2rem] border border-ink-700 bg-ink-900 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] overflow-hidden">
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 h-5 w-20 rounded-full bg-ink-950 z-10" />
        {/* Status bar */}
        <div className="absolute top-1.5 left-4 right-4 flex items-center justify-between text-[9px] font-mono text-ink-300 z-20">
          <span>11:47</span>
          <span className="opacity-50">5G</span>
        </div>
        {/* Screen body -- empty */}
        <div className="absolute inset-x-0 top-12 bottom-16 px-5 flex flex-col">
          {/* Big clock */}
          <div className="text-center mt-4">
            <div className="font-display text-5xl tracking-tight text-ink-100">11:47</div>
            <div className="text-[10px] text-ink-400 mt-1">Sunday, May 5</div>
          </div>
          {/* "No new notifications" */}
          <div className="mt-auto mb-6 text-center">
            <div className="text-[10px] text-ink-500 italic">No notifications</div>
          </div>
        </div>
        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 h-1 w-20 rounded-full bg-ink-600/70" />
      </div>
    </div>
  );
});
