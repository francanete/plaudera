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
import { TestimonialSection } from "@/components/testimonials/testimonial-section";

export const metadata: Metadata = seo.page({
  title: "Customer Feedback & Idea Management for Product Teams",
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
      <div className="flex flex-col">
        {/* Hero */}
        <HeroSection />

        {/* Features */}
        <FeaturesSection />

        {/* Benefit Comparison */}
        <BenefitComparison />

        {/* Testimonials */}
        <TestimonialSection />

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
              <Link href="/register">Start Collecting Feedback</Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
