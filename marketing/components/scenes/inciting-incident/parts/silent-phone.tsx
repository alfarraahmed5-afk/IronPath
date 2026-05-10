'use client';

// "Before" frame 3 -- a phone home screen with NO notifications, NO big clock.
//
// Earlier iteration showed a giant 11:47 clock face. That collided with the
// stopped-clock card visually (two timepieces, same time, redundant) and gave
// the founder the "signifies nothing" reaction. The 11:47 metaphor now lives
// only on the Schedule card. Here the message is "no signal between sessions"
// -- so we render an empty home screen: status bar, an app grid hinting at a
// dead messaging app (zero badge), and a "No notifications today" caption
// embedded in the device shell. The viewer reads the absence, not the time.
//
// CSS-only -- no image asset -- so the parent's saturation filter still
// reduces it to grey without artifacts.

import { forwardRef } from 'react';

export const SilentPhone = forwardRef<HTMLDivElement>(function SilentPhone(_, ref) {
  // App grid: 8 generic colored squares + a "Messages" tile with NO badge.
  // The point is the missing red dot, so we mark the messages tile explicitly.
  const appTiles = [
    { tone: 'bg-[#2a3340]' }, // muted blue
    { tone: 'bg-[#3a2f3a]' }, // muted plum
    { tone: 'bg-[#33342a]' }, // olive
    { tone: 'bg-[#2f3a35]' }, // forest
    { tone: 'bg-[#3a322a]' }, // tan
    { tone: 'bg-[#2a2f3a]' }, // slate
    { tone: 'bg-[#352a2f]' }, // wine
    { tone: 'bg-[#2a3a3a]' }, // teal
  ];

  return (
    <div ref={ref} aria-hidden className="absolute inset-0 grid place-items-center">
      <div className="relative w-[min(48vw,220px)] aspect-[9/19] rounded-[2.2rem] border border-ink-700 bg-ink-900 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] overflow-hidden">
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 h-5 w-20 rounded-full bg-ink-950 z-10" />
        {/* Status bar */}
        <div className="absolute top-1.5 left-4 right-4 flex items-center justify-between text-[9px] font-mono text-ink-300 z-20">
          <span className="opacity-70">no service</span>
          <span className="opacity-50">5G</span>
        </div>

        {/* Screen body */}
        <div className="absolute inset-x-0 top-12 bottom-16 px-4 flex flex-col">
          {/* Date strip -- intentionally bland; the message is the absence */}
          <div className="text-center mt-3">
            <div className="text-[9px] uppercase tracking-wider text-ink-500">
              today
            </div>
            <div className="font-display text-base text-ink-200 mt-0.5">
              No notifications
            </div>
          </div>

          {/* App grid -- 4×2 of muted tiles. The "Messages" tile (slot 0) has
              a tiny "0" instead of the usual red unread badge. */}
          <div className="mt-5 grid grid-cols-4 gap-2">
            {appTiles.map((tile, i) => (
              <div key={i} className="relative">
                <div
                  className={`aspect-square rounded-[7px] ${tile.tone} border border-ink-800/60`}
                />
                {i === 0 && (
                  <div className="absolute -top-1 -right-1 grid h-3 w-3 place-items-center rounded-full bg-ink-700 text-[7px] font-mono text-ink-400">
                    0
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom-pinned dock with one greyed-out tile -- the signal the
              owner keeps checking and that never lights up. */}
          <div className="mt-auto mb-3 flex justify-center">
            <div className="rounded-[10px] bg-ink-950/60 border border-ink-800 px-2.5 py-1.5">
              <div className="h-5 w-5 rounded-[5px] bg-ink-800/80" />
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 h-1 w-20 rounded-full bg-ink-600/70" />
      </div>
    </div>
  );
});
