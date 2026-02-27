import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { seo } from "@/lib/seo";
import {
  OrganizationJsonLd,
  WebSiteJsonLd,
  SoftwareApplicationJsonLd,
} from "@/components/seo/json-ld";
import { FeaturesSection } from "@/components/features/features-section";
import { HeroSection } from "@/components/hero/hero-section";
import { BenefitComparison } from "@/components/benefit-comparison/benefit-comparison";
import { PricingSection } from "@/components/pricing/pricing-section";
import { HowItWorksSection } from "@/components/how-it-works/how-it-works-section";
import { SignalsSection } from "@/components/signals/signals-section";

export const metadata: Metadata = seo.page({
  title: "Feedback Intelligence for SaaS Teams — Know What to Build | Plaudera",
  description:
    "Your users are telling you what to build. Are you listening to the right ones? Plaudera scores demand confidence so you ship what matters — with public boards, widgets, and AI intelligence.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <SoftwareApplicationJsonLd />
      <div className="flex flex-col">
        {/* Hero */}
        <HeroSection />

        {/* Feedback Signals */}
        <SignalsSection />

        {/* Features */}
        <FeaturesSection />

        {/* Benefit Comparison */}
        <BenefitComparison />

        {/* How It Works */}
        <HowItWorksSection />

        {/* Testimonials - uncomment when real testimonials are available */}
        {/* <TestimonialSection /> */}

        {/* Pricing */}
        <PricingSection />

        {/* CTA */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center md:px-6">
            <h2 className="mb-4 text-3xl font-bold">
              Your next product decision shouldn&apos;t be a coin flip.
            </h2>
            <p className="text-muted-foreground mb-8 text-xl">
              Start your free 5-day trial. Set up in under 5 minutes. Cancel
              anytime.
            </p>
            <Button size="lg" asChild>
              <Link href="/signup">Start your free trial</Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
