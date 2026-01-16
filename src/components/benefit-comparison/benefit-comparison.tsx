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
    <section
      ref={ref}
      className={cn(
        "bg-gradient-to-b from-white to-slate-50 py-24 lg:py-32",
        className
      )}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={cn(
            "mb-20 max-w-2xl",
            "transition-all duration-700 ease-out",
            isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          )}
        >
          <h2 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            {header.title}
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            {header.subtitle}
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          {/* Old Way Card */}
          <div
            className={cn(
              "relative",
              "transition-all delay-100 duration-700 ease-out",
              isInView
                ? "translate-y-0 opacity-100"
                : "translate-y-12 opacity-0"
            )}
          >
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-slate-100 to-slate-50" />
            <div className="relative rounded-2xl bg-white p-8 lg:p-10">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <X className="h-5 w-5 text-slate-600" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
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

          {/* Modern Approach Card */}
          <div
            className={cn(
              "relative",
              "transition-all delay-200 duration-700 ease-out",
              isInView
                ? "translate-y-0 opacity-100"
                : "translate-y-12 opacity-0"
            )}
          >
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-emerald-500/20 to-emerald-500/5" />
            <div className="relative rounded-2xl bg-white p-8 shadow-lg shadow-emerald-500/10 lg:p-10">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500">
                  <Check className="h-5 w-5 text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
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
        <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      </div>
      <div>
        <p className="text-[15px] leading-snug font-medium text-slate-900">
          {item.title}
        </p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">
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
        <Check className="h-5 w-5 text-emerald-600" strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[15px] leading-snug font-medium text-slate-900">
          {item.title}
        </p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">
          {item.description}
        </p>
      </div>
    </li>
  );
}
