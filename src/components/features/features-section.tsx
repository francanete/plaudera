"use client";

import { cn } from "@/lib/utils";
import { FeatureShowcase } from "@/components/features/feature-showcase";
import { homepageFeaturesConfig } from "@/lib/features-config";

interface FeaturesSectionProps {
  className?: string;
}

export function FeaturesSection({ className }: FeaturesSectionProps) {
  const config = homepageFeaturesConfig;

  return (
    <section id={config.id} className={cn("bg-white py-32", className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-24 max-w-2xl">
          <h2 className="mb-4 text-5xl font-semibold tracking-tight text-slate-900">
            {config.header.title}
          </h2>
          <p className="text-lg leading-relaxed text-slate-600">
            {config.header.description}
          </p>
        </div>

        {/* Features Stack */}
        <div className="space-y-32">
          {config.features.map((feature) => (
            <FeatureShowcase key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
