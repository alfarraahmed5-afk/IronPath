'use client';

// "Before" frame 1 -- a dim, blurry abstract spreadsheet. Intentionally NOT a
// real screenshot: the cinematic point is the *feeling* of staring into a grid
// of numbers that mean nothing. Pure CSS/SVG so it has zero asset weight and
// inherits the scene's monochrome saturation filter.

import { forwardRef } from 'react';

export const SpreadsheetFragment = forwardRef<HTMLDivElement>(function SpreadsheetFragment(_, ref) {
  // Build a 12-col x 14-row faint grid with random-looking glyph fragments.
  // The values are static so SSR === CSR -- no hydration mismatch.
  const cols = 12;
  const rows = 14;
  const cells = Array.from({ length: cols * rows }, (_, i) => i);
  // Deterministic pseudo-numbers so the grid feels like data without being one.
  const value = (i: number) => {
    const seed = (i * 9301 + 49297) % 233280;
    const r = seed / 233280;
    if (r < 0.18) return '';
    if (r < 0.32) return Math.floor(r * 1000).toString();
    if (r < 0.55) return `$${(r * 800).toFixed(0)}`;
    if (r < 0.72) return `${(r * 100).toFixed(1)}%`;
    return Math.floor(r * 9999).toString();
  };

  return (
    <div
      ref={ref}
      aria-hidden
      className="absolute inset-0 grid place-items-center"
    >
      <div
        className="relative w-[min(92vw,720px)] aspect-[12/9] overflow-hidden rounded-md border border-ink-800/60"
        style={{ filter: 'blur(0.6px)' }}
      >
        {/* Header row -- column letters, the way every owner-built tracker looks */}
        <div
          className="absolute inset-x-0 top-0 grid border-b border-ink-800/70 bg-ink-900/60 text-[9px] font-mono text-ink-500"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="px-1 py-1 text-center">
              {String.fromCharCode(65 + c)}
            </div>
          ))}
        </div>
        {/* Body grid */}
        <div
          className="absolute inset-x-0 top-[18px] bottom-0 grid text-[9px] font-mono text-ink-400/70"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {cells.map((i) => (
            <div
              key={i}
              className="border-r border-b border-ink-800/40 px-1 py-0.5 truncate"
            >
              {value(i)}
            </div>
          ))}
        </div>
        {/* Vignette so the edges feel haunted, not framed */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(10,10,11,0.85)_100%)]" />
      </div>
    </div>
  );
});
