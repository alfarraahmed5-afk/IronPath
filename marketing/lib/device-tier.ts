// Device-tier classification for the ember-canvas WebGL layer.
//
// Three tiers, mapped to canvas budgets:
//   A — desktop / high-end mobile. Full 500 particles at native DPR.
//   B — mid-range mobile. 150 particles at half DPR.
//   C — low-memory / low-core / data-saver. NO canvas at all (return null).
//
// SSR safe: returns 'C' on the server so nothing tries to render before the
// browser hydration phase tells us what we actually have.
//
// We deliberately under-promise: if the browser doesn't expose deviceMemory
// (Safari) we assume 4 GB and check cores instead. saveData = always C.

export type DeviceTier = 'A' | 'B' | 'C';

interface NetworkInformation {
  saveData?: boolean;
}

type ExtendedNavigator = Navigator & {
  deviceMemory?: number;
  connection?: NetworkInformation;
};

export function getDeviceTier(): DeviceTier {
  if (typeof window === 'undefined') return 'C';

  const nav = navigator as ExtendedNavigator;

  // Honor Save-Data preemptively — never burn battery / radio for fluff.
  if (nav.connection?.saveData) return 'C';

  const memory = nav.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  // Floor: anything with <2 GB RAM or <2 cores gets nothing.
  if (memory < 2 || cores < 2) return 'C';

  // Mobile mid-tier: trim to half-DPR + smaller particle count.
  if (isMobile && (memory < 4 || cores < 4)) return 'B';

  return 'A';
}
