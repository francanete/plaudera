"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { WaitlistForm } from "./waitlist-form";

interface WaitlistCtaProps {
  className?: string;
}

export function WaitlistCta({ className }: WaitlistCtaProps) {
  const ref = React.useRef<HTMLElement>(null);
  const isInView = useIntersectionObserver(ref, {
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <section ref={ref} className={cn("py-24", className)}>
      <div
        className={cn(
          "container mx-auto px-4 text-center md:px-6",
          "transition-all duration-700",
          isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        )}
      >
        <h2 className="mb-4 text-3xl font-bold text-slate-900">
          Be the first to know when we launch
        </h2>
        <p className="text-muted-foreground mb-8 text-xl">
          Join the waitlist and get early access to Plaudera. No spam, just a
          heads-up when we&apos;re ready.
        </p>
        <div className="flex justify-center">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
