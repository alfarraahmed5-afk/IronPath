/**
 * Design-system primitives. Cinematic overhaul foundation.
 *
 * Existing primitives in `mobile/src/components/` are re-exported here
 * for one cycle so screens can already migrate imports while Teams B
 * land real implementations.
 */
export { Card } from './Card';
export type { CardProps, CardVariant, CardLevel } from './Card';
export { Hero } from './Hero';
export type { HeroProps } from './Hero';
export { ListRow, deleteAction, pinAction } from './ListRow';
export type { ListRowProps, ListRowSwipeAction } from './ListRow';
export { Tile } from './Tile';
export type { TileProps, TileSize } from './Tile';
export type { EmberSeamProps } from './EmberSeam';
export type { IronPressableProps } from './Pressable';
export { Numeric } from './Numeric';
export { Eyebrow } from './Eyebrow';
export { Section } from './Section';
export { EmberSeam } from './EmberSeam';
export { LivePulseStrip } from './LivePulseStrip';
export { RouteModal } from './Modal';
export { Sheet } from './Sheet';
export type { SheetDetent, SheetProps } from './Sheet';
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';
export { Pressable } from './Pressable';
export { Avatar } from './Avatar';
export { Skeleton } from './Skeleton';
export { ToastProvider, useToast } from './Toast';

// Re-exports of legacy primitives so consumers can pick a single
// import path. Team B may upgrade these in place.
export { BadgeChip } from '../../components/BadgeChip';
export { Calendar } from '../../components/Calendar';
export { EmptyState } from '../../components/EmptyState';
export { Header } from '../../components/Header';
export { Icon } from '../../components/Icon';
export { Input } from '../../components/Input';
export { LineChart } from '../../components/LineChart';
export { ProgressRing } from '../../components/ProgressRing';
export { StatCard } from '../../components/StatCard';
export { Surface } from '../../components/Surface';
export { TabBarIcon } from '../../components/TabBarIcon';
export { Text } from '../../components/Text';
