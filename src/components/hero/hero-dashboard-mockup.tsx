"use client";

import { ThumbsUp, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroDashboardMockupProps {
  className?: string;
  isInView?: boolean;
}

const feedbackItems = [
  {
    title: "Dark mode support",
    votes: 47,
    status: "Under Review",
    statusColor: "bg-amber-100 text-amber-700",
    comments: 12,
    delay: 300,
  },
  {
    title: "Export data to CSV",
    votes: 34,
    status: "Planned",
    statusColor: "bg-blue-100 text-blue-700",
    comments: 8,
    delay: 400,
  },
  {
    title: "Slack integration",
    votes: 28,
    status: "Under Review",
    statusColor: "bg-amber-100 text-amber-700",
    comments: 5,
    delay: 500,
  },
  {
    title: "Mobile app notifications",
    votes: 21,
    status: "New",
    statusColor: "bg-slate-100 text-slate-600",
    comments: 3,
    delay: 600,
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
        "rounded-xl",
        "bg-white",
        "border border-slate-200",
        "shadow-2xl shadow-slate-200/50",
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
          <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
            Feedback Board
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-2 py-1">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
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
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
            <p className="text-[10px] font-medium text-slate-400 uppercase">Ideas</p>
            <p className="text-lg font-semibold text-slate-900">128</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
            <p className="text-[10px] font-medium text-slate-400 uppercase">Votes</p>
            <p className="text-lg font-semibold text-slate-900">1.2k</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
            <p className="text-[10px] font-medium text-slate-400 uppercase">Contributors</p>
            <p className="text-lg font-semibold text-slate-900">89</p>
          </div>
        </div>

        {/* AI Duplicate Alert */}
        <div
          className={cn(
            "mb-5 flex items-center gap-2.5 rounded-lg border border-violet-100 bg-violet-50/60 px-3.5 py-2.5",
            "transition-all delay-200 duration-700 ease-out",
            isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          )}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-500" />
          <p className="text-xs font-medium text-violet-700">
            AI detected 3 duplicate ideas — <span className="underline underline-offset-2">Review</span>
          </p>
        </div>

        {/* Feedback List */}
        <div>
          <p className="mb-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Top Ideas
          </p>
          <div className="space-y-2">
            {feedbackItems.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5",
                  "transition-all duration-500 ease-out",
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
                  <span className="text-xs font-semibold text-slate-700">{item.votes}</span>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {item.title}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold", item.statusColor)}>
                      {item.status}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                      <MessageSquare className="h-2.5 w-2.5" />
                      {item.comments}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
