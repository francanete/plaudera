"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { signalsSectionConfig } from "@/lib/signals-section-config";
import { SignalsMockup } from "@/components/features/mockups/signals-mockup";

export function SignalsSection() {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useIntersectionObserver(ref, { threshold: 0.2 });

  return (
    <section className="py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div
          ref={ref}
          className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24"
        >
          {/* Text Content */}
          <div
            className={cn(
              "space-y-6",
              "transition-all duration-700",
              isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}
          >
            <span className="inline-block rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
              {signalsSectionConfig.badge}
            </span>

            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {signalsSectionConfig.title}
            </h2>

            <p className="text-lg leading-relaxed text-slate-600">
              {signalsSectionConfig.description}
            </p>
          </div>

          {/* Visual Mockup */}
          <div
            className={cn(
              "flex items-center justify-center",
              "transition-all delay-150 duration-700",
              isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}
          >
            <SignalsMockup isInView={isInView} />
          </div>
        </div>
      </div>
    </section>
  );
}
