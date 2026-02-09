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
import { LtdBanner } from "@/components/ltd-banner";

export const metadata: Metadata = seo.page({
  title: "Customer Feedback Tool & Feature Request Board",
  description:
    "Collect, organize, and prioritize customer feedback with public boards, embeddable widgets, voting, and AI-powered duplicate detection.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <SoftwareApplicationJsonLd />
      <LtdBanner />
      <div className="flex flex-col">
        {/* Hero */}
        <HeroSection />

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
              Stop guessing what to build next
            </h2>
            <p className="text-muted-foreground mb-8 text-xl">
              Let your customers tell you. Set up your feedback board in
              minutes.
            </p>
            <Button size="lg" asChild>
              <Link href="/signup">Get lifetime access</Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
