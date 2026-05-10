// /for-gyms — long-form value-prop page for independent gym owners.
// RSC, ISR every hour. Roughly 650 words of editorial body covering the
// pain points the cinematic landing only alludes to.

import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: 'For independent gym owners',
  description:
    'Why IronPath is built for the operator running 80–300 members on coffee and willpower. Flat pricing, a member app that actually opens, and a tablet UX that respects your front-desk staff.',
  path: '/for-gyms',
});

const ADMIN_SIGNUP = 'https://admin.ironpath.health/signup';

export default function ForGymsPage() {
  return (
    <main className="bg-ink-950 text-ink-50 min-h-screen">
      <nav className="border-b border-ink-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-base tracking-tight text-ink-100 hover:text-ink-50 transition-colors"
          >
            IronPath
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/pricing" className="text-ink-300 hover:text-ink-50 transition-colors">
              Pricing
            </Link>
            <Link href="/blog" className="text-ink-300 hover:text-ink-50 transition-colors">
              Blog
            </Link>
            <a
              href={`${ADMIN_SIGNUP}?tier=growth`}
              className="rounded-md bg-brand-500 text-white px-3 py-1.5 hover:bg-brand-450 transition-colors"
            >
              Start trial
            </a>
          </div>
        </div>
      </nav>

      <article className="mx-auto max-w-2xl px-4 sm:px-6 pt-16 sm:pt-24 pb-20">
        <header className="mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-3">
            For independent gym owners
          </p>
          <h1 className="font-display text-4xl sm:text-6xl tracking-tight text-ink-50 mb-5">
            Built for the gym you actually run.
          </h1>
          <p className="text-lg text-ink-300 leading-relaxed">
            Not the chain you compete with. Not the franchise you used to
            work for. The 80&ndash;300-member gym you got into business to
            run, currently operating on{' '}
            <span className="text-brand-400">coffee and willpower</span>.
          </p>
        </header>

        <section className="mb-12">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink-50 mb-4">
            Software that gets out of the way.
          </h2>
          <p className="font-sans text-ink-200 leading-relaxed mb-5">
            The dominant gym software on the market today was built for chain
            operators with 14 staff and a regional manager. It assumes you
            have someone whose job is to keep the software working. You
            don&rsquo;t. You have you, your two coaches, and a front-desk
            person who quit last month and hasn&rsquo;t been replaced.
          </p>
          <p className="font-sans text-ink-200 leading-relaxed mb-5">
            IronPath is the opposite of that. The tablet UI at the front desk
            is three taps to check someone in. The owner app on your phone
            shows you who&rsquo;s drifting and who you should call this week
            &mdash; not a dashboard with 40 widgets, just{' '}
            <span className="text-brand-400">five names</span> and a reason.
            The member app opens to today&rsquo;s workout, not a marketing
            carousel.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink-50 mb-4">
            Pricing that doesn&rsquo;t punish you for growing.
          </h2>
          <p className="font-sans text-ink-200 leading-relaxed mb-5">
            Per-member pricing is a tax on success. The plan that works at 80
            members is the wrong plan at 180, and crossing the threshold
            doubles your bill in a month you weren&rsquo;t expecting it. We
            refuse to play that game. IronPath is{' '}
            <span className="text-brand-400">flat</span>: $49 / $99 / $199 a
            month for tiers that scale with feature need, not headcount. Go
            from 80 to 800 members on the entry tier; the bill is still $49.
          </p>
          <p className="font-sans text-ink-200 leading-relaxed mb-5">
            We also don&rsquo;t take a cut of your member billing. Stripe
            charges its standard processing fee directly to you. We are a
            software vendor, not a payment middleman dressed up as one.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink-50 mb-4">
            A member app you&rsquo;re proud of.
          </h2>
          <p className="font-sans text-ink-200 leading-relaxed mb-5">
            Your members&rsquo; phones are the most valuable real estate in
            your business. Most gym apps treat that real estate like a
            billboard &mdash; push notifications about challenges,
            referral programs, dopamine drips. IronPath&rsquo;s member app
            opens to today&rsquo;s workout. That&rsquo;s it. They tap, they
            log, they leave. Retention isn&rsquo;t built on engagement
            metrics. It&rsquo;s built on{' '}
            <span className="text-brand-400">actually getting workouts in</span>.
          </p>
          <p className="font-sans text-ink-200 leading-relaxed mb-5">
            And the app is yours. Custom branding on Growth and Unlimited
            puts your logo, color, and gym name in front of your members
            every time they open it &mdash; not ours.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink-50 mb-4">
            Predict churn before it happens.
          </h2>
          <p className="font-sans text-ink-200 leading-relaxed mb-5">
            The single highest-leverage thing the owner app does is tell you
            who&rsquo;s about to cancel before they know they&rsquo;re about
            to cancel. Members drift in a predictable pattern: weekly
            attendance drops 30%, then 60%, then they ghost. The IronPath
            churn dashboard surfaces those drifters at week one, not week
            four. A two-minute check-in call from you keeps roughly half of
            them on the books. We&rsquo;ve watched gyms recover{' '}
            <span className="text-brand-400">$1,400&ndash;$3,000</span> a
            month doing exactly that.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink-50 mb-4">
            Try it for 30 days. No card.
          </h2>
          <p className="font-sans text-ink-200 leading-relaxed mb-6">
            Import your members from a Mindbody or Glofox CSV in the first
            10 minutes. Run your gym on it for a month. If by day 30 it
            hasn&rsquo;t made your week measurably easier, the trial just
            ends &mdash; we never auto-bill a card you didn&rsquo;t enter.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`${ADMIN_SIGNUP}?tier=growth`}
              className="inline-flex items-center gap-2 rounded-md bg-brand-500 text-white px-5 py-2.5 text-sm font-medium hover:bg-brand-450 transition-colors"
            >
              Start free trial
            </a>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-md border border-ink-700 text-ink-100 px-5 py-2.5 text-sm font-medium hover:border-ink-600 transition-colors"
            >
              See pricing
            </Link>
          </div>
        </section>
      </article>

      <footer className="border-t border-ink-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-400">
          <p>&copy; {new Date().getFullYear()} IronPath, Inc.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-ink-200 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink-200 transition-colors">
              Terms
            </Link>
            <Link href="/blog" className="hover:text-ink-200 transition-colors">
              Blog
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
