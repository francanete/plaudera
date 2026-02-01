"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HeroDashboardMockup } from "./hero-dashboard-mockup";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

interface HeroSectionProps {
  className?: string;
}

export function HeroSection({ className }: HeroSectionProps) {
  const ref = React.useRef<HTMLElement>(null);
  const isInView = useIntersectionObserver(ref, {
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <section
      ref={ref}
      className={cn(
        "relative overflow-hidden bg-white",
        "flex min-h-[calc(100vh-4rem)] items-center",
        "py-16 md:py-20 lg:py-24",
        className
      )}
    >
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(#e2e8f0 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
            opacity: 0.4,
          }}
        />
        <div className="absolute inset-0 bg-linear-to-b from-white via-transparent to-white" />
      </div>

      <div className="container mx-auto px-4 md:px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24">
          {/* Left Column: Content */}
          <div
            className={cn(
              "max-w-2xl",
              "transition-all duration-1000 ease-out",
              isInView
                ? "translate-y-0 opacity-100"
                : "translate-y-12 opacity-0"
            )}
          >
            {/* Announcement Badge */}
            <div
              className={cn(
                "mb-8 inline-flex items-center gap-2 rounded-full",
                "border border-slate-200 bg-slate-50",
                "px-3 py-1 pr-4",
                "transition-all delay-100 duration-700",
                isInView ? "opacity-100" : "opacity-0"
              )}
            >
              <span className="flex h-5 items-center gap-1 rounded-full bg-slate-900 px-2 text-[10px] font-bold text-white uppercase">
                <Sparkles className="h-2.5 w-2.5" />
                New
              </span>
              <span className="text-sm font-medium text-slate-600">
                AI duplicate detection
              </span>
              <ChevronRight className="h-3 w-3 text-slate-400" />
            </div>

            {/* Headline */}
            <h1 className="mb-8 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Stop guessing.
              <br />
              <span className="text-slate-400">
                Start building what users actually want.
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className={cn(
                "mb-10 max-w-lg text-lg leading-relaxed text-slate-600 md:text-xl",
                "transition-all delay-200 duration-700",
                isInView
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              )}
            >
              Collect feature requests in one place. Let users vote on
              priorities. Ship the ideas that matter most — with AI handling the
              duplicates.
            </p>

            {/* CTAs */}
            <div
              className={cn(
                "flex flex-wrap items-center gap-4",
                "transition-all delay-300 duration-700",
                isInView
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              )}
            >
              <Button
                size="lg"
                asChild
                className="h-12 rounded-full bg-slate-900 px-8 text-base font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/30"
              >
                <Link href="/signup">
                  Start free trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="ghost"
                asChild
                className="h-12 rounded-full px-8 text-base font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                <Link href="/pricing">See Pricing</Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div
              className={cn(
                "mt-12 flex flex-wrap items-center gap-6 text-sm font-medium text-slate-500",
                "transition-all delay-500 duration-700",
                isInView
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              )}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-slate-400" />
                <span>Start free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-slate-400" />
                <span>Setup in 5 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-slate-400" />
                <span>No code needed</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual */}
          <div
            className={cn(
              "relative flex items-center justify-center lg:justify-end",
              "transition-all delay-200 duration-1000 ease-out",
              isInView
                ? "translate-y-0 opacity-100"
                : "translate-y-16 opacity-0"
            )}
          >
            {/* Abstract Background Shapes */}
            <div className="absolute -top-12 -right-12 h-125 w-125 rounded-full bg-slate-50 opacity-50 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 h-100 w-100 rounded-full bg-slate-100 opacity-50 blur-3xl" />

            <HeroDashboardMockup
              className="relative z-10"
              isInView={isInView}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
