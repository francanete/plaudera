"use client";

import { ArrowUp, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockupProps } from "@/lib/features-config";

const timelineEntries = [
  {
    action: "Prioritized",
    target: "Dark mode support",
    status: "Planned",
    statusColor: "bg-blue-100 text-blue-700",
    reason: "Top request from enterprise segment",
    date: "Jan 15",
    icon: ArrowUp,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    delay: 200,
  },
  {
    action: "Declined",
    target: "Desktop app",
    status: "Won't Build",
    statusColor: "bg-slate-100 text-slate-600",
    reason: "Out of scope for v1, revisit in Q3",
    date: "Jan 10",
    icon: XCircle,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
    delay: 400,
  },
  {
    action: "Prioritized",
    target: "CSV export",
    status: "In Progress",
    statusColor: "bg-amber-100 text-amber-700",
    reason: "Strong confidence — 3 duplicate clusters merged",
    date: "Jan 8",
    icon: ArrowUp,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    delay: 600,
  },
];

export function DecisionTimelineMockup({ className, isInView }: MockupProps) {
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
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
            <Clock className="h-3.5 w-3.5 text-slate-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Decision Timeline
            </h3>
            <p className="text-[10px] text-slate-500">
              Every decision, documented
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute top-0 bottom-0 left-3.5 w-px bg-slate-200" />

          <div className="space-y-4">
            {timelineEntries.map((entry, index) => (
              <div
                key={index}
                className={cn(
                  "relative flex gap-3 pl-0",
                  "transition-all duration-600 ease-out",
                  isInView
                    ? "translate-y-0 opacity-100"
                    : "translate-y-4 opacity-0"
                )}
                style={{
                  transitionDelay: isInView ? `${entry.delay}ms` : "0ms",
                }}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    entry.iconBg
                  )}
                >
                  <entry.icon className={cn("h-3.5 w-3.5", entry.iconColor)} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-700">
                      {entry.action}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                        entry.statusColor
                      )}
                    >
                      {entry.status}
                    </span>
                    <span className="ml-auto text-[9px] text-slate-400">
                      {entry.date}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-slate-800">
                    {entry.target}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500 italic">
                    &quot;{entry.reason}&quot;
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
