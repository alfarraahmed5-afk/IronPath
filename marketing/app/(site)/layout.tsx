// Site-routes layout. Wraps every cinematic page in MotionRoot so all client
// motion components inherit LazyMotion + reducedMotion config.
//
// CairoBanner is mounted here so it shows across every site route (it
// hides itself on /eg via the usePathname check inside the component).

import { MotionRoot } from '@/components/MotionRoot';
import { CairoBanner } from '@/components/CairoBanner';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionRoot>
      <CairoBanner />
      {children}
    </MotionRoot>
  );
}
