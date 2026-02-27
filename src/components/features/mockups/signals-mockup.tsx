"use client";

import {
  ThumbsUp,
  Users,
  TrendingUp,
  Clock,
  Layers,
  FileText,
  Repeat,
  Zap,
  GitMerge,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockupProps } from "@/lib/features-config";
import { signalsSectionConfig } from "@/lib/signals-section-config";
import type { LucideIcon } from "lucide-react";

const signalIcons: LucideIcon[] = [
  ThumbsUp,
  Users,
  Clock,
  TrendingUp,
  Layers,
  FileText,
  Repeat,
  Zap,
  GitMerge,
];

export function SignalsMockup({ className, isInView }: MockupProps) {
  return (
    <div
      className={cn(
        "w-full max-w-sm overflow-hidden rounded-xl",
        "bg-white",
        "border border-slate-200/60",
        "shadow-xl shadow-slate-200/50",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
            <BarChart3 className="h-3.5 w-3.5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Confidence Score
            </h3>
            <p className="text-[10px] text-slate-500">9 weighted signals</p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700",
            "transition-all delay-100 duration-500",
            isInView ? "scale-100 opacity-100" : "scale-75 opacity-0"
          )}
        >
          Strong
        </span>
      </div>

      {/* Idea Card */}
      <div className="p-4">
        <div
          className={cn(
            "mb-4 rounded-lg border border-slate-100 bg-slate-50/50 p-3",
            "transition-all delay-200 duration-600 ease-out",
            isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          )}
        >
          <p className="text-sm font-medium text-slate-800">
            Dark mode support
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Score: 82 / 100 — based on multi-signal analysis
          </p>
        </div>

        {/* Signal Breakdown */}
        <p className="mb-2.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Signal Breakdown
        </p>
        <div className="space-y-2">
          {signalsSectionConfig.signals.map((signal, index) => {
            const Icon = signalIcons[index];
            return (
              <div
                key={signal.name}
                className={cn(
                  "flex items-center gap-2.5",
                  "transition-all duration-500 ease-out",
                  isInView
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-4 opacity-0"
                )}
                style={{
                  transitionDelay: isInView ? `${300 + index * 80}ms` : "0ms",
                }}
              >
                <Icon className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="w-24 text-[10px] font-medium text-slate-600">
                  {signal.name}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-violet-400 transition-all duration-1000 ease-out"
                    style={{
                      width: isInView ? `${signal.exampleValue}%` : "0%",
                      transitionDelay: `${400 + index * 80}ms`,
                    }}
                  />
                </div>
                <span className="w-8 text-right text-[10px] font-medium text-slate-400">
                  {signal.weight}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Concentration Warning */}
        <div
          className={cn(
            "mt-4 flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2",
            "transition-all duration-500",
            isInView ? "opacity-100" : "opacity-0"
          )}
          style={{ transitionDelay: isInView ? "1000ms" : "0ms" }}
        >
          <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
          <span className="text-[10px] text-amber-700">
            Loud minority detected: 72% from acme.com
          </span>
        </div>
      </div>
    </div>
  );
}
