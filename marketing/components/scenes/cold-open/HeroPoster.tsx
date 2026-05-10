// HeroPoster — the LCP element for the entire site.
//
// Hard rules (per performance lens):
//   1. AVIF source, `priority` + `fetchPriority="high"` → preload header.
//   2. `sizes="100vw"` + `fill` so the browser picks the right image size
//      from the responsive ladder.
//   3. Empty alt — the image is decorative; the <h1> carries the meaning.
//      A descriptive alt would force AT users to hear "image of two hands
//      caked in chalk" before the headline copy, which is noise.
//   4. B&W treatment via CSS `filter` (free GPU compositing — no second
//      asset, no JS). Calibrated by creative-director lens to read close
//      to the printed reference: grayscale + a hint of contrast pop.
//   5. A 40% left-edge fade-to-transparent gradient gives the headline
//      contrast room without darkening the whole image (which would dull
//      the chalk highlights and kill the cinematic quality).
//
// We do NOT lazy-load this image. It is the LCP. Don't add `loading="lazy"`.

import Image from 'next/image';

export interface HeroPosterProps {
  className?: string;
}

export function HeroPoster({ className = '' }: HeroPosterProps) {
  return (
    <div
      aria-hidden
      className={`absolute inset-0 overflow-hidden ${className}`}
    >
      <Image
        src="/hero/poster.avif"
        alt=""
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        quality={85}
        // B&W cinematic treatment. `brightness(0.9)` keeps mid-tones from
        // crushing the headline; `contrast(1.1)` adds a subtle pop so the
        // chalk highlights still read as light against deep ink.
        style={{
          objectFit: 'cover',
          objectPosition: 'center right',
          filter: 'grayscale(100%) contrast(1.1) brightness(0.9)',
        }}
      />
      {/* Left-edge negative-space mask so the headline can breathe.
          0% solid ink → 40% transparent → fully transparent at 70%. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(10,10,11,0.92) 0%, rgba(10,10,11,0.65) 35%, rgba(10,10,11,0.15) 65%, rgba(10,10,11,0) 85%)',
        }}
      />
      {/* Bottom vignette so the ember-seam reads against any chalk dust. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-40"
        style={{
          background:
            'linear-gradient(180deg, rgba(10,10,11,0) 0%, rgba(10,10,11,0.85) 100%)',
        }}
      />
    </div>
  );
}
