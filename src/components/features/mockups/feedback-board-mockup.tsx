"use client";

import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockupProps } from "@/lib/features-config";

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
            Submit Feedback
          </h3>
          <p className="mt-0.5 text-[10px] text-slate-500">acme.plaudera.com</p>
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

      {/* Problem-first Form */}
      <div className="p-4">
        <div className="space-y-3">
          {/* Problem field */}
          <div
            className={cn(
              "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5",
              "transition-all delay-200 duration-500",
              isInView ? "opacity-100" : "opacity-0"
            )}
          >
            <p className="text-[10px] font-medium text-slate-400">
              What problem does this solve?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-700">
              I have to manually export each report one at a time, which takes
              20+ minutes every week.
            </p>
          </div>

          {/* Frequency + Impact row */}
          <div
            className={cn(
              "grid grid-cols-2 gap-2",
              "transition-all delay-350 duration-500",
              isInView ? "opacity-100" : "opacity-0"
            )}
          >
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-medium text-slate-400">
                How often?
              </p>
              <div className="mt-1.5 flex gap-1">
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
                  Rarely
                </span>
                <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-medium text-white">
                  Weekly
                </span>
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
                  Daily
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-medium text-slate-400">Impact?</p>
              <div className="mt-1.5 flex gap-1">
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
                  Low
                </span>
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
                  Medium
                </span>
                <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-medium text-white">
                  High
                </span>
              </div>
            </div>
          </div>

          {/* Title field */}
          <div
            className={cn(
              "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5",
              "transition-all delay-450 duration-500",
              isInView ? "opacity-100" : "opacity-0"
            )}
          >
            <p className="text-[10px] font-medium text-slate-400">
              Suggested solution (optional)
            </p>
            <p className="mt-1 text-xs text-slate-700">
              Bulk export with date range filters
            </p>
          </div>

          {/* Submit */}
          <div
            className={cn(
              "flex justify-end",
              "transition-all delay-550 duration-500",
              isInView ? "opacity-100" : "opacity-0"
            )}
          >
            <div className="flex items-center gap-1 rounded-md bg-slate-900 px-3 py-2">
              <Send className="h-3 w-3 text-white" />
              <span className="text-[10px] font-medium text-white">Submit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
