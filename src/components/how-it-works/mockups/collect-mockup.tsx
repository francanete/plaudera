"use client";

import { ThumbsUp, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollectMockupProps {
  isInView: boolean;
  delay: number;
}

const ideas = [
  { title: "Dark mode support", votes: 24, isNew: false },
  { title: "API access", votes: 18, isNew: false },
  { title: "Mobile app", votes: 12, isNew: true },
];

export function CollectMockup({ isInView, delay }: CollectMockupProps) {
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
        <span className="text-xs font-semibold text-slate-700">
          Feature Requests
        </span>
        <div
          className={cn(
            "flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1",
            "transition-all duration-500",
            isInView ? "scale-100 opacity-100" : "scale-90 opacity-0"
          )}
          style={{ transitionDelay: isInView ? `${delay + 300}ms` : "0ms" }}
        >
          <Plus className="h-2.5 w-2.5 text-white" />
          <span className="text-[9px] font-medium text-white">New Idea</span>
        </div>
      </div>

      {/* Ideas with votes */}
      <div className="space-y-1.5 p-3">
        {ideas.map((idea, index) => (
          <div
            key={idea.title}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border border-slate-100 px-3 py-2",
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
            {/* Vote button */}
            <div
              className={cn(
                "flex shrink-0 flex-col items-center gap-0.5 rounded border px-1.5 py-1",
                index === 0
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-slate-50"
              )}
            >
              <ThumbsUp
                className={cn(
                  "h-2.5 w-2.5",
                  index === 0 ? "text-blue-600" : "text-slate-400"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  index === 0 ? "text-blue-700" : "text-slate-600"
                )}
              >
                {idea.votes}
              </span>
            </div>

            {/* Title */}
            <span className="flex-1 truncate text-xs font-medium text-slate-700">
              {idea.title}
            </span>

            {/* New badge */}
            {idea.isNew && (
              <span
                className={cn(
                  "shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-600",
                  "transition-all duration-500",
                  isInView ? "scale-100 opacity-100" : "scale-0 opacity-0"
                )}
                style={{
                  transitionDelay: isInView ? `${delay + 600}ms` : "0ms",
                }}
              >
                New
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Activity indicator */}
      <div className="border-t border-slate-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            <div className="h-4 w-4 rounded-full border border-white bg-blue-200" />
            <div className="h-4 w-4 rounded-full border border-white bg-emerald-200" />
            <div className="h-4 w-4 rounded-full border border-white bg-amber-200" />
          </div>
          <span className="text-[10px] text-slate-400">3 users voting now</span>
        </div>
      </div>
    </div>
  );
}
