/**
 * Legacy component barrel. Cinematic-overhaul migration bridge.
 *
 * This file re-exports the original primitives that lived under
 * `mobile/src/components/` for ~2 years. During the cinematic overhaul
 * (PR A) the canonical home moves to `mobile/src/design-system/primitives/`.
 *
 * To avoid a big-bang import-path migration, this barrel ALSO re-exports
 * the new design-system primitives so screens that import via the legacy
 * path keep compiling. The new design-system primitives win on name
 * collision (e.g. Card, Hero, ListRow, Tile, Numeric, Eyebrow, Section,
 * EmberSeam, LivePulseStrip, RouteModal) -- they live below the legacy
 * exports so the JS module spec re-export overwrites the earlier name.
 *
 * When PR B/C lands real implementations of every primitive, the legacy
 * directory can be deleted and consumers will pick up the new shapes
 * transparently.
 */

// Legacy primitives (some are upgraded in design-system/primitives below).
export { Avatar } from './Avatar';
export { Button } from './Button';
export { EmptyState } from './EmptyState';
export { Header } from './Header';
export { Icon } from './Icon';
export { Input } from './Input';
export { Pressable } from './Pressable';
export { ProgressRing } from './ProgressRing';
export { Sheet } from './Sheet';
export { Skeleton } from './Skeleton';
export { StatCard } from './StatCard';
export { Surface } from './Surface';
export { TabBarIcon } from './TabBarIcon';
export { Text } from './Text';
export { ToastProvider, useToast } from './Toast';

// New design-system primitives. Re-exporting here means any consumer
// that historically did `import { Card } from '@/components'` (or the
// relative form) automatically picks up the new implementation in
// `mobile/src/design-system/primitives/`.
//
// Names that already existed in the legacy barrel above (Avatar, Button,
// Skeleton, Pressable, Sheet, ToastProvider, useToast) are not re-exported
// from design-system here -- the legacy implementation stays load-bearing
// until Team B finishes rewriting them in PR B. Once PR B lands, swap
// each legacy line above for its design-system counterpart.
export {
  Card,
  Hero,
  ListRow,
  Tile,
  Numeric,
  Eyebrow,
  Section,
  EmberSeam,
  LivePulseStrip,
  RouteModal,
} from '../design-system/primitives';
