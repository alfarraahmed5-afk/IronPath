// Site-routes layout. Wraps every cinematic page in MotionRoot so all client
// motion components inherit LazyMotion + reducedMotion config.

import { MotionRoot } from '@/components/MotionRoot';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <MotionRoot>{children}</MotionRoot>;
}
