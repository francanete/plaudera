"use client";

import { TrendingUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrioritizeMockupProps {
  isInView: boolean;
  delay: number;
}

const insights = [
  { feature: "Dark mode", votes: 24, growth: "+8 this week" },
  { feature: "API access", votes: 18, growth: "+5 this week" },
  { feature: "Mobile app", votes: 12, growth: "+3 this week" },
];

export function PrioritizeMockup({ isInView, delay }: PrioritizeMockupProps) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl",
        "border border-slate-200/60 bg-white",
        "shadow-lg shadow-slate-200/40",
        "transition-all duration-600 ease-out",
        isInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      )}
      style={{ transitionDelay: isInView ? `${delay + 100}ms` : "0ms" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs font-semibold text-slate-700">
            Top Opportunities
          </span>
        </div>
      </div>

      {/* Priority list */}
      <div className="p-3">
        <div className="space-y-2">
          {insights.map((item, index) => (
            <div
              key={item.feature}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2",
                index === 0
                  ? "border border-emerald-100 bg-emerald-50/50"
                  : "border border-slate-100 bg-slate-50/30",
                "transition-all duration-500 ease-out",
                isInView
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-3 opacity-0"
              )}
              style={{
                transitionDelay: isInView
                  ? `${delay + 200 + index * 120}ms`
                  : "0ms",
              }}
            >
              {/* Rank */}
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  index === 0
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-600"
                )}
              >
                {index + 1}
              </span>

              {/* Feature info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-800">
                  {item.feature}
                </p>
                <p className="text-[10px] text-slate-400">{item.votes} votes</p>
              </div>

              {/* Growth */}
              <span
                className={cn(
                  "shrink-0 text-[9px] font-medium text-emerald-600",
                  "transition-all duration-500",
                  isInView ? "opacity-100" : "opacity-0"
                )}
                style={{
                  transitionDelay: isInView
                    ? `${delay + 500 + index * 100}ms`
                    : "0ms",
                }}
              >
                {item.growth}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action */}
      <div className="border-t border-slate-100 px-4 py-2.5">
        <div
          className={cn(
            "flex items-center justify-between",
            "transition-all duration-500",
            isInView ? "opacity-100" : "opacity-0"
          )}
          style={{ transitionDelay: isInView ? `${delay + 700}ms` : "0ms" }}
        >
          <span className="text-[10px] font-medium text-slate-500">
            Clear priority: Dark mode
          </span>
          <div className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
            <span>Build</span>
            <ArrowRight className="h-2.5 w-2.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
