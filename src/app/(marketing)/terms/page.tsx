import type { Metadata } from "next";
import { seo, getCanonicalUrl } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { appConfig } from "@/lib/config";
import Link from "next/link";

export const metadata: Metadata = seo.page({
  title: "Terms of Service",
  description: `Terms of Service for ${appConfig.name}. Read our terms and conditions.`,
  path: "/terms",
});

export default function TermsPage() {
  const { legal, name } = appConfig;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: getCanonicalUrl("/") },
          { name: "Terms of Service", url: getCanonicalUrl("/terms") },
        ]}
      />
      <div className="min-h-screen bg-white">
        <header className="border-b border-slate-100 py-12 md:py-16">
          <div className="container mx-auto max-w-3xl px-4">
            <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
              Terms of Service
            </h1>
            <p className="mt-4 text-slate-600">
              Last updated: {legal.lastUpdated}
            </p>
          </div>
        </header>

        <article className="py-12 md:py-16">
          <div className="container mx-auto max-w-3xl space-y-10 px-4">
            {/* Provider */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Service Provider
              </h2>
              <p className="text-slate-600">
                {legal.company.name} (Company No.{" "}
                {legal.company.registrationNumber})<br />
                {legal.company.registeredAddress}
                <br />
                <Link
                  href={legal.company.contactLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Contact Us
                </Link>
              </p>
            </section>

            {/* Agreement */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Agreement
              </h2>
              <p className="text-slate-600">
                By using {name}, you agree to these terms. If you don&apos;t
                agree, please don&apos;t use the service. You must be at least{" "}
                {legal.terms.minimumAge} years old to use {name}.
              </p>
            </section>

            {/* The Service */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                The Service
              </h2>
              <p className="text-slate-600">
                {name} provides software-as-a-service functionality including
                user accounts, AI-powered features, and subscription management.
                We may modify or discontinue features with reasonable notice.
              </p>
            </section>

            {/* Accounts */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Your Account
              </h2>
              <p className="text-slate-600">
                You&apos;re responsible for keeping your account secure and for
                all activity under your account. Notify us immediately if you
                suspect unauthorised access.
              </p>
            </section>

            {/* Payments */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Payments
              </h2>
              <p className="mb-3 text-slate-600">
                Paid plans are billed in advance. You can cancel anytime and
                retain access until the end of your billing period. Refunds are
                handled on a case-by-case basis.
              </p>
              <p className="text-slate-600">
                Lifetime Deal plans are one-time payments granting ongoing
                access as described in the Lifetime Deal Plans section below.
                All prices are in the currency displayed at checkout and include
                applicable taxes where required by law.
              </p>
            </section>

            {/* Lifetime Deal */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Lifetime Deal Plans
              </h2>
              <p className="mb-3 text-slate-600">
                A &ldquo;Lifetime Deal&rdquo; (&ldquo;LTD&rdquo;) grants you
                access to the features included in your plan at the time of
                purchase for the lifetime of the service, with no recurring
                fees. &ldquo;Lifetime&rdquo; means the operational lifetime of{" "}
                {name}, not the lifetime of the purchaser.
              </p>
              <p className="mb-3 text-slate-600">
                LTD plans include all updates, improvements, and bug fixes to
                the features available in your plan tier at the time of
                purchase. However, we reserve the right to introduce new
                products, modules, or substantially new features that are beyond
                the scope of your original plan as separate paid add-ons or
                higher-tier offerings. We will clearly communicate what is
                included and what is not.
              </p>
              <p className="mb-3 text-slate-600">
                We may discontinue the {name} service at any time with at least
                90 days&apos; prior written notice. In the event of permanent
                discontinuation, no refund is owed provided you have had access
                for at least 12 months from the date of purchase.
              </p>
              <p className="text-slate-600">
                LTD plans are non-transferable and limited to one workspace per
                purchase unless otherwise stated. Resale of LTD access is
                prohibited.
              </p>
            </section>

            {/* Fair Use Policy */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Fair Use Policy
              </h2>
              <p className="mb-3 text-slate-600">
                All plans, including Lifetime Deal plans, are subject to a fair
                use policy. {name} is designed for normal business use by
                individuals and teams collecting customer feedback. You agree to
                use the service in a manner consistent with its intended purpose
                and within reasonable usage levels.
              </p>
              <p className="mb-3 text-slate-600">
                Fair use limits apply to resources that incur ongoing
                operational costs to us, including but not limited to: AI
                feature requests, API calls, storage, and email notifications.
                Specific limits are described on your plan page and may be
                updated from time to time with reasonable notice.
              </p>
              <p className="mb-3 text-slate-600">
                Examples of usage that may exceed fair use include, but are not
                limited to:
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-6 text-slate-600">
                <li>
                  Automated or programmatic submissions designed to overwhelm
                  the service
                </li>
                <li>
                  Using the service primarily as a data storage or hosting
                  platform rather than for its intended feedback collection
                  purpose
                </li>
                <li>
                  Sharing account credentials with multiple parties beyond your
                  authorised team
                </li>
                <li>
                  Operating multiple workspaces under separate accounts to
                  circumvent plan limits
                </li>
              </ul>
              <p className="text-slate-600">
                If we determine that your usage materially exceeds fair use, we
                will contact you to discuss your needs. If excessive usage
                continues after notice, we reserve the right to throttle service
                access, require an upgrade to a higher plan, or, as a last
                resort, suspend your account. We will always provide at least 14
                days&apos; written notice before taking any restrictive action.
              </p>
            </section>

            {/* Acceptable Use */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Acceptable Use
              </h2>
              <p className="mb-3 text-slate-600">You agree not to:</p>
              <ul className="list-disc space-y-1 pl-6 text-slate-600">
                <li>Violate any laws or third-party rights</li>
                <li>Upload malicious code or attempt unauthorised access</li>
                <li>Interfere with or disrupt the service</li>
                <li>Use the service for illegal or harmful purposes</li>
                <li>Use AI features to generate illegal or harmful content</li>
              </ul>
            </section>

            {/* Your Content */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Your Content
              </h2>
              <p className="text-slate-600">
                You own your content. We only access it to provide the service.
                We don&apos;t claim ownership or use it for other purposes.
              </p>
            </section>

            {/* AI Features */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                AI Features
              </h2>
              <p className="text-slate-600">
                AI outputs are generated automatically and may contain errors.
                Don&apos;t rely on them for critical decisions without
                verification. Usage is subject to your plan limits.
              </p>
            </section>

            {/* Liability */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Limitation of Liability
              </h2>
              <p className="mb-3 text-slate-600">
                To the maximum extent permitted by law, our total liability is
                limited to the fees you&apos;ve paid us in the 12 months before
                the claim, or £100, whichever is greater.
              </p>
              <p className="mb-3 text-slate-600">
                We are not liable for indirect losses, loss of profits, or loss
                of data (except where required by data protection law).
              </p>
              <p className="text-slate-600">
                <strong className="font-medium">
                  Nothing limits our liability for:
                </strong>{" "}
                death or injury from our negligence, fraud, or anything that
                cannot be excluded by law.
              </p>
            </section>

            {/* Termination */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Termination
              </h2>
              <p className="text-slate-600">
                You can close your account anytime. We may suspend or terminate
                accounts that violate these terms. On termination, your right to
                use the service ends immediately.
              </p>
            </section>

            {/* Law */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Governing Law
              </h2>
              <p className="text-slate-600">
                These terms are governed by the laws of{" "}
                {legal.terms.jurisdiction}. Disputes are subject to the
                exclusive jurisdiction of the courts of{" "}
                {legal.terms.jurisdiction}.
              </p>
            </section>

            {/* Changes */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Changes
              </h2>
              <p className="text-slate-600">
                We may update these terms. Continued use after changes
                constitutes acceptance. For significant changes, we&apos;ll
                notify you by email.
              </p>
            </section>

            {/* Privacy */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Privacy
              </h2>
              <p className="text-slate-600">
                Your use of {name} is also governed by our{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </section>

            {/* Severability */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Severability
              </h2>
              <p className="text-slate-600">
                If any part of these terms is found to be unenforceable, the
                remaining provisions will continue in full force and effect.
              </p>
            </section>

            {/* Entire Agreement */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Entire Agreement
              </h2>
              <p className="text-slate-600">
                These terms, together with our Privacy Policy, constitute the
                entire agreement between you and us regarding {name}.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Contact
              </h2>
              <p className="text-slate-600">
                Questions?{" "}
                <Link
                  href={legal.company.contactLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Contact us
                </Link>
              </p>
            </section>
          </div>
        </article>
      </div>
    </>
  );
}
