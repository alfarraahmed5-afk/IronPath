/**
 * Legacy Sheet -- shim re-exporting the design-system Sheet.
 *
 * The drag-to-dismiss rewrite lives at
 * `mobile/src/design-system/primitives/Sheet.tsx`; this shim keeps the
 * legacy import path resolving. Old `snapPoint` callers pass it via
 * the `detent` prop on the new API.
 */
import React from 'react';
import { Sheet as DSSheet, type SheetProps as DSSheetProps, type SheetDetent } from '../design-system/primitives/Sheet';

// Backwards-compatible API: legacy used `snapPoint?: number` (a 0-1
// fraction). The new API uses `detent: 0.5 | 0.9 | 1.0`. We coerce
// any legacy fractional value down to the closest allowed detent.
type LegacyProps = Omit<DSSheetProps, 'detent'> & {
  snapPoint?: number;
  detent?: SheetDetent;
};

export function Sheet({ snapPoint, detent, ...rest }: LegacyProps) {
  const resolved: SheetDetent = detent ?? coerceSnap(snapPoint);
  return <DSSheet detent={resolved} {...rest} />;
}

function coerceSnap(snap: number | undefined): SheetDetent {
  if (snap == null) return 0.5;
  if (snap >= 0.95) return 1.0;
  if (snap >= 0.7)  return 0.9;
  return 0.5;
}

export type { SheetDetent, SheetProps } from '../design-system/primitives/Sheet';
