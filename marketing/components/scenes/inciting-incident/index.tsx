// Act 2 — Inciting Incident.
//
// Earlier iteration used a GSAP-pinned 200vh scrub that cross-faded three
// "before" frames. The cinematic intent was clear in motion, but at any
// single scroll position the visitor saw exactly ONE artifact (clock OR
// phone OR spreadsheet) with the caption rendering at low opacity mid-
// fade — the artifact in isolation read as "broken iPhone screenshot",
// not as "your gym is silent."
//
// Replaced with a clearer 3-up grid that names each pain point right next
// to its visual. No GSAP, no scroll dependency, reads at any position.
// We keep the cold monochrome filter and the narrative framing.

import { SpreadsheetFragment } from './parts/spreadsheet-fragment';
import { StoppedClock } from './parts/stopped-clock';
import { SilentPhone } from './parts/silent-phone';
import { EmberSeam } from '@/components/primitives/ember-seam';

interface BeforeCard {
  Frame: React.ForwardRefExoticComponent<React.RefAttributes<HTMLDivElement>>;
  eyebrow: string;
  caption: string;
}

const CARDS: BeforeCard[] = [
  {
    Frame: SpreadsheetFragment,
    eyebrow: 'Memberships',
    caption: 'Two hundred rows in Excel. One coach who knows where the truth is.',
  },
  {
    Frame: StoppedClock,
    eyebrow: '11:47am',
    caption: 'You opened at 6. Three people came. The rest, you assume, are coming.',
  },
  {
    Frame: SilentPhone,
    eyebrow: 'No signal',
    caption: "No notifications. No new sign-ups. Members forget you exist between sessions.",
  },
];

export default function IncitingIncidentScene() {
  return (
    <section
      className="relative bg-ink-950"
      aria-label="Inciting incident — what gym ownership looks like before IronPath"
    >
      <div
        className="mx-auto max-w-6xl px-6 py-24 sm:py-32"
        style={{ filter: 'saturate(0.7) brightness(0.92)' }}
      >
        <p className="font-mono text-xs text-ink-400 mb-2 tracking-wider">
          BEFORE
        </p>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-ink-100 mb-4 tracking-tight max-w-2xl">
          What gym ownership looks like at 11:47am.
        </h2>
        <p className="text-ink-300 max-w-xl mb-12 sm:mb-16 leading-relaxed">
          Forty members. One spreadsheet. No signal. The work is real but the
          system is held together by you remembering everything.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {CARDS.map(({ Frame, eyebrow, caption }) => (
            <article
              key={eyebrow}
              className="rounded-lg border border-ink-800 bg-ink-900/50 overflow-hidden flex flex-col"
            >
              <div className="relative h-64 sm:h-72 bg-ink-950">
                <Frame />
              </div>
              <div className="p-5 sm:p-6 flex flex-col gap-2 flex-1">
                <p className="font-mono text-[11px] text-ink-400 tracking-wider">
                  {eyebrow}
                </p>
                <p className="text-sm text-ink-200 leading-relaxed">
                  {caption}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <EmberSeam />
    </section>
  );
}
