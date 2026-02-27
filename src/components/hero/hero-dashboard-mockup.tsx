"use client";

import { ThumbsUp, Sparkles, MessageSquare, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroDashboardMockupProps {
  className?: string;
  isInView?: boolean;
}

const feedbackItems = [
  {
    title: "Dark mode support",
    votes: 47,
    confidence: "Strong",
    confidenceColor:
      "bg-emerald-100 text-emerald-800 border border-emerald-200",
    status: "Under Review",
    statusColor: "bg-amber-100 text-amber-800",
    detail: "12 contributors · Rising velocity · Reported daily",
    comments: 12,
    highlight: true,
    delay: 300,
  },
  {
    title: "Export data to CSV",
    votes: 34,
    confidence: "Emerging",
    confidenceColor: "bg-amber-100 text-amber-800",
    status: "Planned",
    statusColor: "bg-blue-100 text-blue-800",
    detail: "6 contributors · 3 duplicates merged · Major impact",
    comments: 8,
    delay: 400,
  },
  {
    title: "Slack integration",
    votes: 28,
    confidence: "Anecdotal",
    confidenceColor: "bg-slate-100 text-slate-700",
    status: "Under Review",
    statusColor: "bg-amber-100 text-amber-800",
    detail: "⚠ Loud minority: 72% from one domain",
    comments: 5,
    delay: 500,
  },
];

export function HeroDashboardMockup({
  className,
  isInView = true,
}: HeroDashboardMockupProps) {
  return (
    <div
      className={cn(
        "relative w-full max-w-[500px]",
        "rounded-2xl",
        "bg-white",
        "border border-slate-200/80",
        "shadow-2xl shadow-slate-300/40",
        "overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
            <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
            <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          </div>
          <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Feedback Board
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[10px] font-semibold tracking-wider text-emerald-600 uppercase">
            Live
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 md:p-6">
        {/* Stats Row */}
        <div
          className={cn(
            "mb-5 grid grid-cols-3 gap-3",
            "transition-all duration-700 ease-out",
            isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          )}
        >
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">
              Ideas
            </p>
            <p className="text-lg font-bold text-slate-900">128</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-emerald-600 uppercase">
              Decision-ready
            </p>
            <p className="text-lg font-bold text-slate-900">14</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">
              Contributors
            </p>
            <p className="text-lg font-bold text-slate-900">89</p>
          </div>
        </div>

        {/* AI Alert */}
        <div
          className={cn(
            "mb-5 flex items-center justify-between gap-2.5 rounded-lg border border-violet-200 bg-violet-50/70 px-3.5 py-2.5",
            "transition-all delay-200 duration-700 ease-out",
            isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          )}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-500" />
            <p className="text-xs font-semibold text-violet-800">
              Decision ready: 2 ideas reached Strong confidence
            </p>
          </div>
          <span className="shrink-0 rounded-md bg-violet-600 px-2 py-1 text-[10px] font-semibold text-white">
            View rationale
          </span>
        </div>

        {/* Feedback List */}
        <div>
          <p className="mb-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            Prioritized Opportunities
          </p>
          <div className="space-y-2">
            {feedbackItems.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                  "transition-all duration-500 ease-out",
                  item.highlight
                    ? "border-emerald-200 bg-emerald-50/30 shadow-sm shadow-emerald-100/50"
                    : "border-slate-200 bg-white",
                  isInView
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-4 opacity-0"
                )}
                style={{
                  transitionDelay: isInView ? `${item.delay}ms` : "0ms",
                }}
              >
                {/* Vote Button */}
                <div className="flex shrink-0 flex-col items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
                  <ThumbsUp className="h-3 w-3 text-slate-500" />
                  <span className="text-xs font-bold text-slate-800">
                    {item.votes}
                  </span>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {item.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                        item.confidenceColor
                      )}
                    >
                      {item.confidence}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                        item.statusColor
                      )}
                    >
                      {item.status}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                      <MessageSquare className="h-2.5 w-2.5" />
                      {item.comments}
                    </span>
                  </div>
                  {item.detail && (
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {item.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Governance hint */}
          <div
            className={cn(
              "mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2",
              "transition-all delay-700 duration-500 ease-out",
              isInView ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            )}
          >
            <XCircle className="h-3 w-3 shrink-0 text-slate-400" />
            <p className="text-[10px] text-slate-500">
              <span className="font-semibold text-slate-600">Declined:</span>{" "}
              Native mobile app — Out of scope Q1
            </p>
          </div>

          {/* Confidence legend */}
          <p className="mt-3 text-center text-[9px] text-slate-400">
            Confidence = demand strength + source diversity + recency
          </p>
        </div>
      </div>
    </div>
  );
}
