'use client';

// STUB — Team Beta β2 owns the real implementation (port from admin).
// Public API: edge-to-edge 1px ember sweep at z-50.

export function LivePulseStrip() {
  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-50 h-px bg-ink-900 overflow-hidden"
    >
      <div className="h-px w-[8%] bg-brand-500/80 animate-pulse-travel" />
    </div>
  );
}
