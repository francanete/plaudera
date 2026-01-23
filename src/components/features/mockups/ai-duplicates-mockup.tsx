"use client";

import { Sparkles, ArrowRightLeft, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockupProps } from "@/lib/features-config";

const duplicatePairs = [
  {
    original: "Dark mode support",
    duplicate: "Add night theme option",
    similarity: 92,
    delay: 200,
  },
  {
    original: "Export data to CSV",
    duplicate: "Download reports as spreadsheet",
    similarity: 78,
    delay: 400,
  },
];

export function AiDuplicatesMockup({ className, isInView }: MockupProps) {
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
            <Sparkles className="h-3.5 w-3.5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              AI Suggestions
            </h3>
            <p className="text-[10px] text-slate-500">2 potential duplicates</p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700",
            "transition-all delay-100 duration-500",
            isInView ? "scale-100 opacity-100" : "scale-75 opacity-0"
          )}
        >
          Review
        </span>
      </div>

      {/* Duplicate Pairs */}
      <div className="space-y-3 p-4">
        {duplicatePairs.map((pair, index) => (
          <div
            key={index}
            className={cn(
              "rounded-lg border border-slate-100 p-3",
              "transition-all duration-600 ease-out",
              isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}
            style={{
              transitionDelay: isInView ? `${pair.delay}ms` : "0ms",
            }}
          >
            {/* Similarity Badge */}
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ArrowRightLeft className="h-3 w-3 text-violet-500" />
                <span className="text-[10px] font-medium text-violet-700">
                  {pair.similarity}% similar
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-400 transition-all duration-1000 ease-out"
                  style={{
                    width: isInView ? `${pair.similarity}%` : "0%",
                    transitionDelay: `${pair.delay + 200}ms`,
                  }}
                />
              </div>
            </div>

            {/* Pair Cards */}
            <div className="mb-2.5 grid grid-cols-2 gap-2">
              <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                <p className="text-[9px] font-medium text-slate-400 uppercase">
                  Original
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-800">
                  {pair.original}
                </p>
              </div>
              <div className="rounded-md border border-violet-100 bg-violet-50/50 px-2.5 py-2">
                <p className="text-[9px] font-medium text-violet-400 uppercase">
                  Duplicate
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-800">
                  {pair.duplicate}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button className="flex flex-1 items-center justify-center gap-1 rounded-md bg-violet-600 px-2 py-1.5 text-[10px] font-medium text-white">
                <Check className="h-2.5 w-2.5" />
                Merge
              </button>
              <button className="flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-medium text-slate-600">
                <X className="h-2.5 w-2.5" />
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
