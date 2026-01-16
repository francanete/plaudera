"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import type { FeatureDefinition } from "@/lib/features-config";

interface FeatureShowcaseProps {
  feature: FeatureDefinition;
  className?: string;
}

export function FeatureShowcase({ feature, className }: FeatureShowcaseProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useIntersectionObserver(ref, { threshold: 0.2 });

  const isLeft = feature.alignment === "left";
  const MockupComponent = feature.mockup;
  const Icon = feature.icon;

  return (
    <div
      ref={ref}
      className={cn(
        "grid items-center gap-16 lg:grid-cols-2 lg:gap-24",
        isLeft ? "lg:grid-flow-dense" : "",
        className
      )}
    >
      {/* Text Content */}
      <div
        className={cn(
          "space-y-6",
          isLeft ? "lg:col-start-1" : "lg:col-start-2",
          "transition-all duration-700",
          isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        )}
      >
        <Icon className="h-8 w-8 stroke-[1.5] text-slate-900" />

        <h3 className="text-3xl font-semibold tracking-tight text-slate-900">
          {feature.title}
        </h3>

        <p className="text-lg leading-relaxed text-slate-600">
          {feature.description}
        </p>
      </div>

      {/* Visual Mockup */}
      <div
        className={cn(
          "flex items-center justify-center",
          isLeft ? "lg:col-start-2" : "lg:col-start-1 lg:row-start-1",
          "transition-all delay-150 duration-700",
          isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        )}
      >
        <MockupComponent isInView={isInView} />
      </div>
    </div>
  );
}
