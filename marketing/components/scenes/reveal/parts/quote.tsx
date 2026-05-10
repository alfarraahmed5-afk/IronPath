'use client';

// One quote, no carousel. The brief is explicit: the moment after the drop
// should feel like a single declarative statement from a real owner, not a
// rotating wall of testimonials.

import { LazyMotion, domAnimation, m } from 'framer-motion';
import { useTranslations } from 'next-intl';

export function Quote() {
  const t = useTranslations('scenes.reveal.quote');
  return (
    <LazyMotion features={domAnimation}>
      <m.figure
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
        className="max-w-2xl mx-auto text-center"
      >
        <blockquote
          data-font-display
          className="font-display text-xl sm:text-2xl md:text-3xl text-ink-100 tracking-tight leading-snug"
        >
          &ldquo;{t('body')}&rdquo;
        </blockquote>
        <figcaption className="mt-4 text-xs font-mono text-ink-400">
          {t('attribution')}
        </figcaption>
      </m.figure>
    </LazyMotion>
  );
}
