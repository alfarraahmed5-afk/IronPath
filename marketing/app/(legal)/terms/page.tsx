import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — IronPath',
  description:
    'The Terms of Service that govern your use of IronPath, including the trial, billing, acceptable use, and termination.',
  alternates: { canonical: '/terms' },
};

const LAST_UPDATED = 'May 1, 2026';

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-ink-50">
          Terms of Service
        </h1>
        <p className="mt-2 text-xs uppercase tracking-widest text-ink-400">
          Last updated {LAST_UPDATED}
        </p>
      </header>

      <section className="space-y-4 text-ink-200 leading-relaxed">
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) are a contract
          between IronPath, Inc. (&ldquo;IronPath,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us&rdquo;) and the customer that creates an account
          (&ldquo;Customer,&rdquo; &ldquo;you&rdquo;). By creating an
          account or using the service, you agree to these Terms. If you
          are entering into these Terms on behalf of a business, you
          represent that you have authority to bind that business.
        </p>
      </section>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        1. The service
      </h2>
      <p className="text-ink-200 leading-relaxed">
        IronPath provides software-as-a-service tools for independent gym
        operators to manage members, schedule classes, publish workouts,
        and accept payments. The service is delivered over the public
        internet and accessed through a web console at
        console.ironpath.health and through native mobile apps published
        under your gym&apos;s brand.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        2. Trial
      </h2>
      <p className="text-ink-200 leading-relaxed">
        New accounts may use the service for a 30-day trial without paying
        and without entering a payment card. The trial automatically ends
        after 30 days. If you have not added a payment card by then, your
        workspace is paused: members cannot check in, but your data is
        preserved for 90 days so you can resume by adding a card. After
        90 days the workspace and its data are permanently deleted.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        3. Fees and billing
      </h2>
      <p className="text-ink-200 leading-relaxed">
        Subscription fees are charged monthly in advance through Stripe.
        Pricing is shown on the public pricing page at the time you
        subscribe and is fixed for the duration of your billing cycle.
        Fees are non-refundable except where required by law. We may
        change pricing for new billing cycles with at least 30 days&apos;
        notice; if you do not accept the change, you may cancel before it
        takes effect. Sales tax is added where required.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        4. Your data
      </h2>
      <p className="text-ink-200 leading-relaxed">
        You own all data you submit to the service, including member
        records, workout content, and business records (&ldquo;Customer
        Data&rdquo;). You grant IronPath a limited license to host,
        process, transmit, and display Customer Data solely to provide
        the service. We will not access Customer Data except to deliver,
        secure, or troubleshoot the service, or as required by law. You
        may export Customer Data at any time as CSV or JSON.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        5. Acceptable use
      </h2>
      <p className="text-ink-200 leading-relaxed">
        You agree not to use the service to send spam, distribute malware,
        infringe intellectual property rights, harass any person, attempt
        to access another customer&apos;s data, reverse-engineer or
        scrape the service, or build a competing product using IronPath
        as the development platform. We may suspend or terminate accounts
        that violate this section after notice except where the violation
        poses an immediate threat.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        6. Service level
      </h2>
      <p className="text-ink-200 leading-relaxed">
        We target 99.9% monthly uptime, measured by external monitoring,
        excluding scheduled maintenance announced at least 48 hours in
        advance. If we miss the target in any month we will credit the
        following month&apos;s invoice on request, prorated to the
        downtime. The status page is at status.ironpath.health.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        7. Termination
      </h2>
      <p className="text-ink-200 leading-relaxed">
        You may cancel at any time from the billing page. Cancellation
        takes effect at the end of the current billing cycle and you
        will not be charged again. We may terminate for material breach
        on 30 days&apos; notice if the breach is not cured, or
        immediately for non-payment after 14 days, illegality, or
        repeated violations of the Acceptable Use section. On
        termination, Customer Data is preserved for 90 days for export
        and then deleted from production systems and backups in
        accordance with the Privacy Policy.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        8. Warranties and disclaimers
      </h2>
      <p className="text-ink-200 leading-relaxed">
        The service is provided &ldquo;as is&rdquo; and &ldquo;as
        available.&rdquo; We disclaim all warranties to the maximum extent
        permitted by law, including the implied warranties of
        merchantability, fitness for a particular purpose, and
        non-infringement. We do not warrant that the service will be
        uninterrupted or error-free.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        9. Limitation of liability
      </h2>
      <p className="text-ink-200 leading-relaxed">
        To the maximum extent permitted by law, IronPath&apos;s total
        liability for any claim arising out of these Terms is limited to
        the fees you paid in the twelve months preceding the event giving
        rise to the claim. We are not liable for indirect, incidental,
        special, consequential, or punitive damages, or for lost profits,
        revenue, goodwill, or data, even if advised of the possibility.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        10. Indemnification
      </h2>
      <p className="text-ink-200 leading-relaxed">
        You will defend and indemnify IronPath against any third-party
        claim arising from Customer Data, your use of the service in
        violation of these Terms, or your violation of applicable law.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        11. Governing law
      </h2>
      <p className="text-ink-200 leading-relaxed">
        These Terms are governed by the laws of the State of Delaware,
        without regard to its conflict-of-law principles. The exclusive
        venue for any dispute is the state and federal courts located in
        Wilmington, Delaware, and each party consents to that
        jurisdiction.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        12. Changes
      </h2>
      <p className="text-ink-200 leading-relaxed">
        We may update these Terms from time to time. If we make material
        changes we will give at least 30 days&apos; notice by email and
        in-product banner. Continued use of the service after the
        effective date constitutes acceptance.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        13. Contact
      </h2>
      <p className="text-ink-200 leading-relaxed">
        Questions about these Terms can be sent to
        <a className="text-brand-400 underline" href="mailto:legal@ironpath.health"> legal@ironpath.health</a>.
      </p>
    </article>
  );
}
