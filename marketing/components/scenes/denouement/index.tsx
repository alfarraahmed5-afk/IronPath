// Denouement (~700vh) — closing chapter of the marketing page.
//
// Sequence:
//   1. QuietBeat        (~50vh) — single line, expo.out reveal, tighter
//                                 ember seam. The page exhales.
//   2. CrescendoCTA     (100vh) — full-bleed, near-black, breathing
//                                 crimson CTA that morphs to fill the
//                                 viewport on click before navigating
//                                 to admin signup.
//   3. Footer           (auto)  — quiet credits-roll, NO secondary CTA.
//
// Owned by Team Alpha α4. Imports `MotionRoot` is NOT done here — the
// root wrapper is mounted once at the layout level by β1; every `<m.*>`
// in this subtree relies on that single LazyMotion instance.

import { QuietBeat } from './QuietBeat';
import { CrescendoCTA } from './CrescendoCTA';
import { Footer } from './Footer';

export default function DenouementScene() {
  return (
    <section
      aria-label="Closing"
      className="relative border-t border-ink-900"
    >
      <QuietBeat />
      <CrescendoCTA />
      <Footer />
    </section>
  );
}

// Named exports so other α agents can compose individual beats if they
// need to (e.g. embedding the CTA in a sticky overlay later).
export { QuietBeat, CrescendoCTA, Footer };
