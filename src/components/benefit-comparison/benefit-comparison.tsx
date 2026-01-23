"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import {
  benefitComparisonConfig,
  type ComparisonItem,
} from "@/lib/benefit-comparison-config";

interface BenefitComparisonProps {
  className?: string;
}

export function BenefitComparison({ className }: BenefitComparisonProps) {
  const ref = React.useRef<HTMLElement>(null);
  const isInView = useIntersectionObserver(ref, {
    threshold: 0.1,
    triggerOnce: true,
  });

  const { header, oldWay, modernApproach } = benefitComparisonConfig;

  return (
    <section ref={ref} className={cn("bg-white py-24 lg:py-32", className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={cn(
            "mb-16 max-w-3xl md:mb-20",
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

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-2">
          {/* Without Plaudera Card */}
          <div
            className={cn(
              "group relative",
              "transition-all delay-100 duration-700 ease-out",
              isInView
                ? "translate-y-0 opacity-100"
                : "translate-y-12 opacity-0"
            )}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-rose-50/50 to-rose-50/30" />
            <div className="relative h-full rounded-2xl border border-rose-100/80 bg-white/60 p-8 backdrop-blur-sm transition-all duration-200 hover:border-rose-200/80 hover:shadow-sm md:p-10">
              {/* Card Header */}
              <div className="mb-8 flex items-center gap-3 border-b border-slate-100 pb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                  <X className="h-5 w-5 text-rose-500" strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {oldWay.label}
                </h3>
              </div>

              <ul className="space-y-6">
                {oldWay.items.map((item, index) => (
                  <OldWayItem
                    key={item.title}
                    item={item}
                    isInView={isInView}
                    delay={index * 75}
                  />
                ))}
              </ul>
            </div>
          </div>

          {/* With Plaudera Card */}
          <div
            className={cn(
              "group relative",
              "transition-all delay-200 duration-700 ease-out",
              isInView
                ? "translate-y-0 opacity-100"
                : "translate-y-12 opacity-0"
            )}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-emerald-50/50 to-emerald-50/30" />
            <div className="relative h-full rounded-2xl border border-emerald-100/80 bg-white/60 p-8 backdrop-blur-sm transition-all duration-200 hover:border-emerald-200/80 hover:shadow-sm md:p-10">
              {/* Card Header */}
              <div className="mb-8 flex items-center gap-3 border-b border-slate-100 pb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <Check
                    className="h-5 w-5 text-emerald-600"
                    strokeWidth={2.5}
                  />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {modernApproach.label}
                </h3>
              </div>

              <ul className="space-y-6">
                {modernApproach.items.map((item, index) => (
                  <ModernApproachItem
                    key={item.title}
                    item={item}
                    isInView={isInView}
                    delay={index * 75}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface ItemProps {
  item: ComparisonItem;
  isInView: boolean;
  delay: number;
}

function OldWayItem({ item, isInView, delay }: ItemProps) {
  return (
    <li
      className={cn(
        "flex gap-4",
        "transition-all duration-500 ease-out",
        isInView ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"
      )}
      style={{ transitionDelay: isInView ? `${300 + delay}ms` : "0ms" }}
    >
      <div className="mt-0.5 flex-shrink-0">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50">
          <X className="h-3.5 w-3.5 text-rose-400" strokeWidth={2.5} />
        </div>
      </div>
      <div>
        <h4 className="mb-1 text-base font-medium text-slate-900">
          {item.title}
        </h4>
        <p className="text-sm leading-relaxed text-slate-500">
          {item.description}
        </p>
      </div>
    </li>
  );
}

function ModernApproachItem({ item, isInView, delay }: ItemProps) {
  return (
    <li
      className={cn(
        "flex gap-4",
        "transition-all duration-500 ease-out",
        isInView ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"
      )}
      style={{ transitionDelay: isInView ? `${400 + delay}ms` : "0ms" }}
    >
      <div className="mt-0.5 flex-shrink-0">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
          <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />
        </div>
      </div>
      <div>
        <h4 className="mb-1 text-base font-medium text-slate-900">
          {item.title}
        </h4>
        <p className="text-sm leading-relaxed text-slate-500">
          {item.description}
        </p>
      </div>
    </li>
  );
}
