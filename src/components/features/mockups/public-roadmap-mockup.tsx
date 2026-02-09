"use client";

import { Clock, Rocket, CheckCircle2, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockupProps } from "@/lib/features-config";

const columns = [
  {
    title: "Planned",
    icon: Clock,
    headerBg: "bg-blue-50",
    headerText: "text-blue-700",
    headerBorder: "border-blue-200",
    iconColor: "text-blue-500",
    delay: 200,
    ideas: [
      { title: "Dark mode support", votes: 24 },
      { title: "API access", votes: 18 },
    ],
  },
  {
    title: "In Progress",
    icon: Rocket,
    headerBg: "bg-amber-50",
    headerText: "text-amber-700",
    headerBorder: "border-amber-200",
    iconColor: "text-amber-500",
    delay: 350,
    ideas: [{ title: "CSV export", votes: 31 }],
  },
  {
    title: "Released",
    icon: CheckCircle2,
    headerBg: "bg-green-50",
    headerText: "text-green-700",
    headerBorder: "border-green-200",
    iconColor: "text-green-500",
    delay: 500,
    ideas: [
      { title: "Email notifications", votes: 42 },
      { title: "Custom branding", votes: 27 },
    ],
  },
];

export function PublicRoadmapMockup({ className, isInView }: MockupProps) {
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
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Product Roadmap
          </h3>
          <p className="text-[10px] text-slate-500">5 ideas across 3 stages</p>
        </div>
        <span
          className={cn(
            "rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600",
            "transition-all delay-100 duration-500",
            isInView ? "scale-100 opacity-100" : "scale-75 opacity-0"
          )}
        >
          Public
        </span>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-3 gap-2 p-3">
        {columns.map((column) => (
          <div
            key={column.title}
            className={cn(
              "transition-all duration-600 ease-out",
              isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}
            style={{
              transitionDelay: isInView ? `${column.delay}ms` : "0ms",
            }}
          >
            {/* Column Header */}
            <div
              className={cn(
                "mb-2 flex items-center gap-1 rounded-md border px-2 py-1.5",
                column.headerBg,
                column.headerBorder
              )}
            >
              <column.icon className={cn("h-3 w-3", column.iconColor)} />
              <span
                className={cn("text-[10px] font-semibold", column.headerText)}
              >
                {column.title}
              </span>
            </div>

            {/* Idea Cards */}
            <div className="space-y-1.5">
              {column.ideas.map((idea, ideaIndex) => (
                <div
                  key={idea.title}
                  className={cn(
                    "rounded-md border border-slate-100 bg-slate-50/50 p-2",
                    "transition-all duration-500 ease-out",
                    isInView
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-0"
                  )}
                  style={{
                    transitionDelay: isInView
                      ? `${column.delay + 150 + ideaIndex * 100}ms`
                      : "0ms",
                  }}
                >
                  <p className="text-[10px] leading-tight font-medium text-slate-700">
                    {idea.title}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1 text-slate-400">
                    <ThumbsUp className="h-2.5 w-2.5" />
                    <span className="text-[9px] font-medium">{idea.votes}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
