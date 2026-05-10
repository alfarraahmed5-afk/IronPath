/**
 * STUB -- replaced by Team B (B-1) in PR B.
 *
 * Public API contract:
 *   <Card level={1|2|3|4} variant={'solid'|'photo'|'glass'|'receipt'|'live'}>
 *     <Card.Hero>...</Card.Hero>
 *     <Card.Body>...</Card.Body>
 *     <Card.Footer>...</Card.Footer>
 *   </Card>
 *
 * Today: passthrough wrapper over Surface so screens can already
 * import { Card } and ship.
 */
import React, { ReactNode } from 'react';
import { ViewStyle } from 'react-native';
import { Surface } from '../../components/Surface';

export interface CardProps {
  level?: 1 | 2 | 3 | 4;
  variant?: 'solid' | 'photo' | 'glass' | 'receipt' | 'live';
  style?: ViewStyle | ViewStyle[];
  children?: ReactNode;
}

export function Card({ level = 2, style, children }: CardProps) {
  return <Surface level={level} style={style}>{children}</Surface>;
}

Card.Hero = function CardHero({ children }: { children?: ReactNode }) {
  return <>{children}</>;
};
Card.Body = function CardBody({ children }: { children?: ReactNode }) {
  return <>{children}</>;
};
Card.Footer = function CardFooter({ children }: { children?: ReactNode }) {
  return <>{children}</>;
};
