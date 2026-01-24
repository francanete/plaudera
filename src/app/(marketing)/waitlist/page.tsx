import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/json-ld";
import { FeaturesSection } from "@/components/features/features-section";
import { WaitlistHero } from "@/components/waitlist/waitlist-hero";
import { BenefitComparison } from "@/components/benefit-comparison/benefit-comparison";
import { HowItWorksSection } from "@/components/how-it-works/how-it-works-section";
import { WaitlistCta } from "@/components/waitlist/waitlist-cta";

export const metadata: Metadata = seo.page({
  title: "Join the Waitlist — Be First to Try Plaudera",
  description:
    "Sign up for early access to Plaudera — the customer feedback platform with public boards, embeddable widgets, voting, and AI-powered duplicate detection.",
  path: "/waitlist",
});

export default function WaitlistPage() {
  return (
    <>
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <div className="flex flex-col">
        <WaitlistHero />
        <FeaturesSection />
        <BenefitComparison />
        <HowItWorksSection />
        <WaitlistCta />
      </div>
    </>
  );
}
