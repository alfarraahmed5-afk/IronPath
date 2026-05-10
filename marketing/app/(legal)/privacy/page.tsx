import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — IronPath',
  description:
    'How IronPath collects, uses, and protects personal data for gym owners and their members. GDPR + CCPA aligned.',
  alternates: { canonical: '/privacy' },
};

const LAST_UPDATED = 'May 1, 2026';

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 prose-legal">
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-ink-50">
          Privacy Policy
        </h1>
        <p className="mt-2 text-xs uppercase tracking-widest text-ink-400">
          Last updated {LAST_UPDATED}
        </p>
      </header>

      <section className="space-y-4 text-ink-200 leading-relaxed">
        <p>
          IronPath, Inc. (&ldquo;IronPath,&rdquo; &ldquo;we,&rdquo; or
          &ldquo;us&rdquo;) operates software that helps independent gym
          owners run their businesses and helps their members track
          workouts. This Privacy Policy describes what personal data we
          collect, why we collect it, who we share it with, and the rights
          you have to access, correct, export, and delete it.
        </p>
        <p>
          By using IronPath you agree to the practices described here. If
          you do not agree, please do not use the service. We will tell you
          before we make material changes and we will keep an archive of
          previous versions on request.
        </p>
      </section>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        1. Who is the controller
      </h2>
      <p className="text-ink-200 leading-relaxed">
        For data submitted by a gym owner about their gym (lead form, billing
        details, business address), IronPath is the data controller under
        GDPR. For data about members of a gym (name, workout history,
        check-in records), the gym is the controller and IronPath acts as a
        data processor on the gym&apos;s behalf under a Data Processing
        Addendum that is part of the Terms of Service.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        2. What we collect
      </h2>
      <ul className="text-ink-200 leading-relaxed list-disc pl-6 space-y-2">
        <li>
          <strong className="text-ink-50">Account data:</strong> name, email
          address, gym name, hashed password, optional phone number.
        </li>
        <li>
          <strong className="text-ink-50">Billing data:</strong> last four
          digits of your card, billing address, country. Full card numbers
          are handled directly by Stripe and never reach our servers.
        </li>
        <li>
          <strong className="text-ink-50">Member data (processed for the
          gym):</strong> name, email, workout logs, attendance, optional
          body metrics if the gym enables them.
        </li>
        <li>
          <strong className="text-ink-50">Usage data:</strong> pages
          visited, features used, device type, IP address, approximate
          location derived from IP.
        </li>
        <li>
          <strong className="text-ink-50">Support data:</strong> messages
          you send to support, attachments, screenshots you upload.
        </li>
      </ul>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        3. How we use it
      </h2>
      <p className="text-ink-200 leading-relaxed">
        We use personal data to run the service, bill for it, communicate
        with you about it, prevent fraud and abuse, comply with legal
        obligations, and improve the product. We do not sell personal data,
        we do not rent contact lists, and we do not run third-party
        advertising on the service.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        4. Who we share it with
      </h2>
      <p className="text-ink-200 leading-relaxed">
        We share data with subprocessors who need it to deliver the
        service: a database host (Supabase), a payment processor (Stripe),
        an email-delivery provider (Resend), a hosting platform (Vercel),
        and an error-monitoring service (Sentry). Each is bound by a data
        processing agreement and we maintain a current list at
        ironpath.health/subprocessors.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        5. Cookies
      </h2>
      <p className="text-ink-200 leading-relaxed">
        We use a small number of strictly necessary cookies to keep you
        logged in and to remember your preferences. We use first-party
        analytics that does not set cross-site tracking cookies. We do not
        use marketing or advertising cookies.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        6. Your rights (GDPR)
      </h2>
      <p className="text-ink-200 leading-relaxed">
        If you are in the European Economic Area, the UK, or Switzerland,
        you have the right to access the personal data we hold about you,
        correct it if wrong, ask us to delete it, restrict or object to
        processing, port it to another provider, and withdraw consent at
        any time. To exercise any of these rights email
        privacy@ironpath.health and we will respond within 30 days.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        7. Your rights (CCPA / CPRA)
      </h2>
      <p className="text-ink-200 leading-relaxed">
        California residents have the right to know what personal
        information we collect, the right to delete it, the right to
        correct it, the right to opt out of any sale or sharing (we do
        neither), and the right not to be discriminated against for
        exercising those rights. Submit a verifiable request to
        privacy@ironpath.health.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        8. Data retention
      </h2>
      <p className="text-ink-200 leading-relaxed">
        Active account data is retained for as long as the account is
        active. After cancellation we retain a frozen copy for 90 days so
        you can change your mind. After 90 days we delete it from
        production systems and from backups within a further 35 days,
        except where we are required to retain billing records under tax
        law (typically 7 years).
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        9. Security
      </h2>
      <p className="text-ink-200 leading-relaxed">
        Data is encrypted in transit (TLS 1.2+) and at rest (AES-256).
        Production access is restricted to a small number of engineers and
        every action is logged. We run an annual penetration test and
        publish a summary on request.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        10. International transfers
      </h2>
      <p className="text-ink-200 leading-relaxed">
        Our primary data center is in the United States. Where we transfer
        personal data out of the EEA, UK, or Switzerland, we rely on the
        European Commission&apos;s Standard Contractual Clauses and
        equivalent UK and Swiss instruments.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        11. Children
      </h2>
      <p className="text-ink-200 leading-relaxed">
        IronPath is not directed to children under 13. We do not knowingly
        collect personal data from children under 13. If you believe a
        child has provided us with personal data, please contact us and we
        will delete it.
      </p>

      <h2 className="font-display text-xl mt-10 mb-3 text-ink-50">
        12. Contact
      </h2>
      <p className="text-ink-200 leading-relaxed">
        Email <a className="text-brand-400 underline" href="mailto:privacy@ironpath.health">privacy@ironpath.health</a> for any
        privacy question or to exercise any right described above. For data
        protection inquiries from the EEA, you may also contact our
        EU representative at the address listed in our Subprocessors page.
      </p>
    </article>
  );
}
