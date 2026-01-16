import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/lib/config";
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
  title: "Build Your SaaS Faster Than Ever",
  description:
    "A modern, production-ready SaaS boilerplate with authentication, payments, AI integration, and everything you need to launch.",
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
        <section className="py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-16 text-center">
              <h2 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Choose the plan that fits your needs. No hidden fees.
              </p>
            </div>
            <PricingSection />
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center md:px-6">
            <h2 className="mb-4 text-3xl font-bold">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-8 text-xl">
              Join thousands of developers building with {appConfig.name}.
            </p>
            <Button size="lg" asChild>
              <Link href="/register">Start Building Today</Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
