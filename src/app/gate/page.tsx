import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession, getSubscriptionFromRequest } from "@/lib/dal";
import { hasPaidAccess } from "@/lib/subscription";
import { PricingSection } from "@/components/pricing/pricing-section";
import { appConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: `Choose a Plan | ${appConfig.name}`,
  description: "Choose a plan to access your dashboard",
};

const REQUIRE_PAID_ACCESS = appConfig.pricing.requirePaidAccess;

export default async function GatePage() {
  // proxy.ts handles most redirects, these are minimal fallbacks

  // If paid access not required, redirect to dashboard
  if (!REQUIRE_PAID_ACCESS) {
    redirect("/dashboard");
  }

  const session = await getCurrentSession();

  // Require authentication (proxy.ts should have redirected, but fallback)
  if (!session?.user) {
    redirect("/login?redirect=/gate");
  }

  // Check subscription from proxy-injected header (no DB query)
  const subscription = await getSubscriptionFromRequest();
  if (subscription && subscription.plan !== "FREE") {
    // Paid user shouldn't see gate (proxy.ts should have redirected, but fallback)
    redirect("/dashboard");
  }

  // If header missing, fall back to DB check
  if (!subscription) {
    const isPaid = await hasPaidAccess(session.user.id);
    if (isPaid) {
      redirect("/dashboard");
    }
  }

  return <PricingSection />;
}
