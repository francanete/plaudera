import type { Metadata } from "next";
import { seo, getCanonicalUrl } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { appConfig } from "@/lib/config";
import Link from "next/link";

export const metadata: Metadata = seo.page({
  title: "Privacy Policy",
  description: `Privacy policy for ${appConfig.name}. How we collect, use, and protect your data under UK GDPR.`,
  path: "/privacy",
});

export default function PrivacyPage() {
  const { legal, name } = appConfig;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: getCanonicalUrl("/") },
          { name: "Privacy Policy", url: getCanonicalUrl("/privacy") },
        ]}
      />
      <div className="min-h-screen bg-white">
        <header className="border-b border-slate-100 py-12 md:py-16">
          <div className="container mx-auto max-w-3xl px-4">
            <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-slate-600">
              Last updated: {legal.lastUpdated}
            </p>
          </div>
        </header>

        <article className="py-12 md:py-16">
          <div className="container mx-auto max-w-3xl space-y-10 px-4">
            {/* Data Controller */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Data Controller
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

            {/* What We Collect */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Information We Collect
              </h2>
              <ul className="list-disc space-y-1 pl-6 text-slate-600">
                <li>Account data (name, email)</li>
                <li>
                  Payment status (via Polar - we don&apos;t store card details)
                </li>
                <li>Usage data (features used, AI token consumption)</li>
                <li>Technical data (IP address, browser, device)</li>
              </ul>
            </section>

            {/* How We Use It */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                How We Use Your Data
              </h2>
              <ul className="list-disc space-y-1 pl-6 text-slate-600">
                <li>Provide and maintain {name}</li>
                <li>Process payments and manage subscriptions</li>
                <li>Send service-related communications</li>
                <li>Improve our services and fix issues</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            {/* Legal Basis */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Legal Basis (UK GDPR)
              </h2>
              <ul className="list-disc space-y-1 pl-6 text-slate-600">
                <li>
                  <strong className="font-medium">Contract:</strong> To provide
                  our service to you
                </li>
                <li>
                  <strong className="font-medium">Legitimate interest:</strong>{" "}
                  Analytics, security, service improvement
                </li>
                <li>
                  <strong className="font-medium">Legal obligation:</strong> Tax
                  records, fraud prevention
                </li>
              </ul>
            </section>

            {/* Third Parties */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Third-Party Services
              </h2>
              <p className="mb-3 text-slate-600">
                We use the following services to operate {name}:
              </p>
              <ul className="list-disc space-y-1 pl-6 text-slate-600">
                {legal.dataHandling.subProcessors.map((processor) => (
                  <li key={processor}>{processor}</li>
                ))}
              </ul>
            </section>

            {/* Data Transfers */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                International Transfers
              </h2>
              <p className="text-slate-600">
                Some services are based outside the UK. We ensure appropriate
                safeguards (Standard Contractual Clauses or adequacy decisions)
                are in place.
              </p>
            </section>

            {/* Retention */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Data Retention
              </h2>
              <p className="text-slate-600">
                We keep your account data while your account is active and for 2
                years after deletion. Legal/tax records are kept for 7 years as
                required by UK law.
              </p>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Your Rights
              </h2>
              <p className="mb-3 text-slate-600">
                Under UK GDPR, you have the right to:
              </p>
              <ul className="list-disc space-y-1 pl-6 text-slate-600">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete your data</li>
                <li>Restrict or object to processing</li>
                <li>Data portability</li>
                <li>Withdraw consent</li>
                <li>Not be subject to automated decision-making</li>
              </ul>
              <p className="mt-3 text-slate-600">
                <Link
                  href={legal.company.contactLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Contact us
                </Link>{" "}
                to exercise these rights.
              </p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Cookies
              </h2>
              <p className="mb-3 text-slate-600">
                We use the following cookies, all necessary for the service to
                function:
              </p>
              <ul className="list-disc space-y-1 pl-6 text-slate-600">
                <li>
                  <strong className="font-medium">
                    Authentication cookies
                  </strong>{" "}
                  - Keep you signed in
                </li>
                <li>
                  <strong className="font-medium">Preference cookies</strong> -
                  Remember your settings (e.g., sidebar state)
                </li>
              </ul>
              <p className="mt-3 text-slate-600">
                We use privacy-friendly analytics that do not use cookies or
                track you across sites.
              </p>
            </section>

            {/* Complaints */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Complaints
              </h2>
              <p className="text-slate-600">
                You have the right to complain to the Information
                Commissioner&apos;s Office (ICO) at{" "}
                <a
                  href="https://ico.org.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  aria-label="ico.org.uk (opens in new tab)"
                >
                  ico.org.uk
                </a>{" "}
                if you&apos;re unhappy with how we handle your data.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Contact
              </h2>
              <p className="text-slate-600">
                Questions about this policy?{" "}
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
