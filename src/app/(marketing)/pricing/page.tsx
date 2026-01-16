import type { Metadata } from "next";
import { PricingSection } from "@/components/pricing/pricing-section";
import { seo } from "@/lib/seo";
import { SoftwareApplicationJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = seo.page({
  title: "Pricing",
  description: "Simple, transparent pricing for teams of all sizes",
  path: "/pricing",
});

// Revalidate prices every hour (matches cache TTL)
export const revalidate = 3600;

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const showSubscriptionMessage = params.reason === "no_subscription";

  return (
    <>
      <SoftwareApplicationJsonLd />
      {showSubscriptionMessage && (
        <div className="container mx-auto px-4 pt-12 sm:pt-24">
          <div className="mx-auto max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-800 dark:bg-amber-950">
            <p className="text-amber-800 dark:text-amber-200">
              Choose a plan to access the dashboard.
            </p>
          </div>
        </div>
      )}
      <PricingSection />
    </>
  );
}
