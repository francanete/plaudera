"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { howItWorksConfig } from "@/lib/how-it-works-config";
import { SetupMockup } from "./mockups/setup-mockup";
import { CollectMockup } from "./mockups/collect-mockup";
import { PrioritizeMockup } from "./mockups/prioritize-mockup";

interface HowItWorksSectionProps {
  className?: string;
}

export function HowItWorksSection({ className }: HowItWorksSectionProps) {
  const ref = React.useRef<HTMLElement>(null);
  const isInView = useIntersectionObserver(ref, {
    threshold: 0.1,
    triggerOnce: true,
  });

  const { header, steps } = howItWorksConfig;

  const mockups = [
    <SetupMockup key="setup" isInView={isInView} delay={200} />,
    <CollectMockup key="collect" isInView={isInView} delay={350} />,
    <PrioritizeMockup key="prioritize" isInView={isInView} delay={500} />,
  ];

  return (
    <section ref={ref} className={cn("bg-slate-50 py-24 lg:py-32", className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={cn(
            "mb-16 max-w-2xl md:mb-20",
            "transition-all duration-700 ease-out",
            isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          )}
        >
          <h2 className="mb-5 text-4xl leading-tight font-semibold tracking-tight text-slate-900 md:text-5xl">
            {header.title}
          </h2>
          <p className="text-lg leading-relaxed text-slate-600 md:text-xl">
            {header.subtitle}
          </p>
        </div>

        {/* Steps with mockups */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="flex flex-col">
              {/* Mockup */}
              <div className="mb-6">{mockups[index]}</div>

              {/* Step number + text */}
              <div
                className={cn(
                  "transition-all duration-600 ease-out",
                  isInView
                    ? "translate-y-0 opacity-100"
                    : "translate-y-4 opacity-0"
                )}
                style={{
                  transitionDelay: isInView ? `${300 + index * 150}ms` : "0ms",
                }}
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    {step.number}
                  </span>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {step.title}
                  </h3>
                </div>
                <p className="pl-10 text-sm leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
