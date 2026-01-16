"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import type { TierPricingDisplay, PricingMode } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

interface PricingCardsProps {
  tiers: TierPricingDisplay[];
  mode: PricingMode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature Item Component
// ─────────────────────────────────────────────────────────────────────────────

interface FeatureItemProps {
  text: string;
  featured?: boolean;
}

function FeatureItem({ text, featured = false }: FeatureItemProps) {
  return (
    <li className="group flex items-start gap-3">
      <div
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-200",
          featured
            ? "bg-indigo-500/20 group-hover:bg-indigo-500/30"
            : "bg-indigo-50 group-hover:bg-indigo-100"
        )}
      >
        <Check
          className={cn(
            "h-3 w-3",
            featured ? "text-indigo-300" : "text-indigo-600"
          )}
          strokeWidth={3}
        />
      </div>
      <span
        className={cn(
          "text-[15px] leading-tight font-medium transition-colors duration-200",
          featured
            ? "text-slate-300 group-hover:text-slate-100"
            : "text-slate-600 group-hover:text-slate-900"
        )}
      >
        {text}
      </span>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified Pricing Card Component
// ─────────────────────────────────────────────────────────────────────────────

interface PricingCardProps {
  tier: TierPricingDisplay;
  price: string;
  originalPrice?: string | null;
  period?: string;
  slug: string;
  badge?: string;
  isHighlighted: boolean;
  isLoading: boolean;
  onCheckout: (slug: string) => void;
  isInView: boolean;
  delay?: number;
  isLtd?: boolean;
}

function PricingCard({
  tier,
  price,
  originalPrice,
  period,
  slug,
  badge,
  isHighlighted,
  isLoading,
  onCheckout,
  isInView,
  delay = 0,
  isLtd = false,
}: PricingCardProps) {
  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-visible rounded-2xl transition-all duration-500",
        isHighlighted
          ? "bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl ring-1 ring-white/10"
          : "border border-slate-200/60 bg-white/80 shadow-sm hover:-translate-y-1 hover:shadow-lg",
        isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        isLtd ? "w-full max-w-md" : "w-full sm:w-80"
      )}
      style={{ transitionDelay: isInView ? `${delay}ms` : "0ms" }}
    >
      {/* Badge */}
      {badge && (
        <span className="absolute -top-3 right-4 inline-flex items-center rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          {badge}
        </span>
      )}

      {/* Header / Pricing Section */}
      <div
        className={cn(
          "border-b px-6 py-6 text-center",
          isHighlighted ? "border-white/10" : "border-slate-100",
          isLtd && "px-8 py-8"
        )}
      >
        {/* Tier name - only in subscription mode */}
        {!isLtd && (
          <p
            className={cn(
              "mb-2 text-sm font-semibold tracking-wide uppercase",
              isHighlighted ? "text-indigo-300" : "text-indigo-600"
            )}
          >
            {period === "/year" ? "Annual" : "Monthly"}
          </p>
        )}

        {/* Price display */}
        <div className="flex items-center justify-center gap-2">
          {originalPrice && (
            <span
              className={cn(
                "text-lg font-medium line-through",
                isHighlighted ? "text-slate-500" : "text-slate-400"
              )}
            >
              {originalPrice}
            </span>
          )}
          <span
            className={cn(
              "font-bold tracking-tight",
              isHighlighted ? "text-5xl text-white" : "text-4xl text-slate-900",
              isLtd && "text-5xl"
            )}
          >
            {price}
          </span>
          {period && (
            <span
              className={cn(
                "text-sm",
                isHighlighted ? "text-slate-400" : "text-slate-500"
              )}
            >
              {period}
            </span>
          )}
        </div>

        {/* Description */}
        <p
          className={cn(
            "mt-3 text-sm",
            isHighlighted ? "text-slate-400" : "text-slate-500"
          )}
        >
          {tier.description}
        </p>
      </div>

      {/* Features List */}
      <div className={cn("flex-grow px-6 py-6", isLtd && "px-8 py-8")}>
        <ul className="space-y-3.5">
          {(isLtd ? tier.features : tier.features.slice(0, 5)).map(
            (feature) => (
              <FeatureItem
                key={feature}
                text={feature}
                featured={isHighlighted}
              />
            )
          )}
        </ul>
      </div>

      {/* CTA Button */}
      <div className={cn("px-6 pb-6", isLtd && "px-8 pb-8")}>
        <button
          className={cn(
            "group relative flex w-full items-center justify-center overflow-hidden rounded-xl px-6 py-3.5 font-semibold transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:opacity-50",
            isHighlighted
              ? "bg-white text-slate-900 shadow-lg hover:-translate-y-0.5 hover:shadow-xl focus:ring-white active:translate-y-0"
              : "bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/30 focus:ring-slate-900 active:translate-y-0"
          )}
          onClick={() => onCheckout(slug)}
          disabled={isLoading}
          aria-label={`${tier.cta} for ${price}${period || ""}`}
        >
          <span className="relative z-10">
            {isLoading ? "Loading..." : tier.cta}
          </span>
          <div
            className={cn(
              "absolute inset-0 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0",
              isHighlighted ? "bg-slate-100" : "bg-white/10"
            )}
          />
        </button>

        {/* Guarantee text */}
        {isLtd && (
          <p
            className={cn(
              "mt-4 text-center text-xs font-medium",
              isHighlighted ? "text-slate-500" : "text-slate-400"
            )}
          >
            30-day money-back guarantee
          </p>
        )}
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Pricing Cards Component
// ─────────────────────────────────────────────────────────────────────────────

export function PricingCards({ tiers, mode }: PricingCardsProps) {
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();

  const ref = React.useRef<HTMLElement>(null);
  const isInView = useIntersectionObserver(ref, {
    threshold: 0.1,
    triggerOnce: true,
  });

  async function handleCheckout(slug: string) {
    if (!session) {
      router.push(`/login?redirect=/pricing`);
      return;
    }

    setLoadingSlug(slug);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      if (!data.url) {
        throw new Error("No checkout URL received");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Checkout error:", err);
      setError("Failed to start checkout. Please try again.");
      setLoadingSlug(null);
    }
  }

  const isLtdMode = mode === "ltd";

  return (
    <section
      ref={ref}
      className="relative bg-gradient-to-b from-slate-50 to-white py-16 sm:py-24 lg:py-32"
    >
      {/* Subtle dot pattern background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
            opacity: 0.4,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          className={cn(
            "mx-auto mb-16 max-w-3xl text-center lg:mb-20",
            "transition-all duration-700 ease-out",
            isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          )}
        >
          {/* Badge */}
          <div
            className={cn(
              "mb-6 inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-600",
              "transition-all delay-100 duration-500",
              isInView ? "opacity-100" : "opacity-0"
            )}
          >
            <span className="mr-2 flex h-2 w-2 rounded-full bg-indigo-600" />
            {isLtdMode ? "Limited Time Offer" : "Simple Pricing"}
          </div>

          {/* Headline */}
          <h2
            className={cn(
              "mb-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-6xl",
              "transition-all delay-150 duration-700",
              isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}
          >
            {isLtdMode ? "Get Lifetime Access" : "Choose Your Plan"}
          </h2>

          {/* Subheadline */}
          <p
            className={cn(
              "mx-auto max-w-2xl text-lg leading-relaxed text-slate-600 lg:text-xl",
              "transition-all delay-200 duration-700",
              isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}
          >
            {isLtdMode
              ? "Pay once, use forever. No recurring fees."
              : "Choose monthly flexibility or save with annual billing."}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-8 rounded-xl bg-red-50 p-4 text-center text-red-600">
            {error}
          </div>
        )}

        {/* Pricing cards */}
        {tiers.map((tier, tierIndex) => (
          <div key={tier.tier} className="space-y-8">
            {/* Tier header - only show in subscription mode with multiple tiers */}
            {!isLtdMode && tiers.length > 1 && (
              <div
                className={cn(
                  "text-center",
                  "transition-all duration-500",
                  isInView
                    ? "translate-y-0 opacity-100"
                    : "translate-y-4 opacity-0"
                )}
                style={{
                  transitionDelay: isInView
                    ? `${300 + tierIndex * 100}ms`
                    : "0ms",
                }}
              >
                <h3 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  {tier.name}
                </h3>
              </div>
            )}

            {/* Cards container */}
            <div className="flex items-stretch justify-center gap-6 max-sm:flex-col max-sm:items-center lg:gap-8">
              {isLtdMode ? (
                <PricingCard
                  tier={tier}
                  price={tier.ltdPrice}
                  originalPrice={tier.originalLtdPrice}
                  slug={tier.ltdSlug}
                  badge="One-time payment"
                  isHighlighted={true}
                  isLoading={loadingSlug === tier.ltdSlug}
                  onCheckout={handleCheckout}
                  isInView={isInView}
                  delay={400}
                  isLtd={true}
                />
              ) : (
                <>
                  {/* Monthly card */}
                  <PricingCard
                    tier={tier}
                    price={tier.monthlyPrice}
                    originalPrice={tier.originalMonthlyPrice}
                    period="/month"
                    slug={tier.monthlySlug}
                    isHighlighted={false}
                    isLoading={loadingSlug === tier.monthlySlug}
                    onCheckout={handleCheckout}
                    isInView={isInView}
                    delay={400 + tierIndex * 200}
                  />

                  {/* Annual card - highlighted */}
                  <PricingCard
                    tier={tier}
                    price={tier.annualPrice}
                    originalPrice={tier.originalAnnualPrice}
                    period="/year"
                    slug={tier.annualSlug}
                    badge={
                      tier.annualSavings
                        ? `Save ${tier.annualSavings}`
                        : "Best Value"
                    }
                    isHighlighted={true}
                    isLoading={loadingSlug === tier.annualSlug}
                    onCheckout={handleCheckout}
                    isInView={isInView}
                    delay={500 + tierIndex * 200}
                  />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
