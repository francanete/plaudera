"use client";

import { ThumbsUp, MessageSquare, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockupProps } from "@/lib/features-config";

const boardIdeas = [
  {
    title: "API access for integrations",
    votes: 62,
    status: "Planned",
    statusColor: "bg-blue-100 text-blue-700",
    comments: 18,
    voted: true,
    delay: 0,
  },
  {
    title: "Slack notifications on new ideas",
    votes: 41,
    status: "Under Review",
    statusColor: "bg-amber-100 text-amber-700",
    comments: 9,
    voted: false,
    delay: 150,
  },
  {
    title: "Custom branding for boards",
    votes: 35,
    status: "New",
    statusColor: "bg-slate-100 text-slate-600",
    comments: 6,
    voted: false,
    delay: 300,
  },
  {
    title: "Bulk export feedback data",
    votes: 27,
    status: "New",
    statusColor: "bg-slate-100 text-slate-600",
    comments: 4,
    voted: false,
    delay: 450,
  },
];

export function FeedbackBoardMockup({ className, isInView }: MockupProps) {
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
      {/* Board Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Feature Requests
          </h3>
          <p className="mt-0.5 text-[10px] text-slate-500">acme.plaudera.com</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
          <ArrowUpDown className="h-3 w-3 text-slate-500" />
          <span className="text-[10px] font-medium text-slate-600">
            Top Voted
          </span>
        </div>
      </div>

      {/* Ideas List */}
      <div className="p-3">
        <div className="space-y-2">
          {boardIdeas.map((idea, index) => (
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
                transitionDelay: isInView ? `${idea.delay}ms` : "0ms",
              }}
            >
              {/* Vote Button */}
              <div
                className={cn(
                  "flex shrink-0 flex-col items-center gap-0.5 rounded border px-2 py-1.5",
                  idea.voted
                    ? "border-blue-200 bg-blue-50"
                    : "border-slate-200 bg-slate-50"
                )}
              >
                <ThumbsUp
                  className={cn(
                    "h-3 w-3",
                    idea.voted ? "text-blue-600" : "text-slate-400"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-semibold",
                    idea.voted ? "text-blue-700" : "text-slate-700"
                  )}
                >
                  {idea.votes}
                </span>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {idea.title}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                      idea.statusColor
                    )}
                  >
                    {idea.status}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                    <MessageSquare className="h-2.5 w-2.5" />
                    {idea.comments}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
