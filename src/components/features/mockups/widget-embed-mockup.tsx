"use client";

import { MessageSquarePlus, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockupProps } from "@/lib/features-config";

export function WidgetEmbedMockup({ className, isInView }: MockupProps) {
  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      {/* Simulated Website Background */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        {/* Fake browser chrome */}
        <div className="mb-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-2 w-2 rounded-full bg-slate-200" />
            <div className="h-2 w-2 rounded-full bg-slate-200" />
            <div className="h-2 w-2 rounded-full bg-slate-200" />
          </div>
          <div className="h-4 flex-1 rounded-full bg-slate-200/80" />
        </div>

        {/* Fake page content */}
        <div className="space-y-2">
          <div className="h-3 w-3/4 rounded bg-slate-200/60" />
          <div className="h-3 w-full rounded bg-slate-200/60" />
          <div className="h-3 w-2/3 rounded bg-slate-200/60" />
          <div className="mt-4 h-20 w-full rounded-lg bg-slate-200/40" />
          <div className="h-3 w-5/6 rounded bg-slate-200/60" />
          <div className="h-3 w-4/5 rounded bg-slate-200/60" />
        </div>

        {/* Widget Popup */}
        <div
          className={cn(
            "absolute right-6 bottom-16 w-64",
            "rounded-xl border border-slate-200 bg-white",
            "shadow-2xl shadow-slate-900/10",
            "overflow-hidden",
            "transition-all duration-700 ease-out",
            isInView
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-4 scale-95 opacity-0"
          )}
        >
          {/* Widget Header */}
          <div className="border-b border-slate-100 bg-slate-900 px-4 py-3">
            <p className="text-xs font-semibold text-white">
              Share your feedback
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              What would you like to see next?
            </p>
          </div>

          {/* Widget Form */}
          <div className="p-3.5">
            <div
              className={cn(
                "mb-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2",
                "transition-all delay-300 duration-500",
                isInView ? "opacity-100" : "opacity-0"
              )}
            >
              <p className="text-[10px] font-medium text-slate-400">Title</p>
              <p className="mt-0.5 text-xs text-slate-700">
                Keyboard shortcuts for common actions
              </p>
            </div>
            <div
              className={cn(
                "mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2",
                "transition-all delay-400 duration-500",
                isInView ? "opacity-100" : "opacity-0"
              )}
            >
              <p className="text-[10px] font-medium text-slate-400">Details</p>
              <p className="mt-0.5 text-xs text-slate-700">
                Would love Cmd+K style...
              </p>
            </div>
            <div
              className={cn(
                "flex items-center justify-between",
                "transition-all delay-500 duration-500",
                isInView ? "opacity-100" : "opacity-0"
              )}
            >
              <span className="text-[10px] text-slate-400">
                Powered by Plaudera
              </span>
              <div className="flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5">
                <Send className="h-2.5 w-2.5 text-white" />
                <span className="text-[10px] font-medium text-white">
                  Submit
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Trigger Button */}
        <div
          className={cn(
            "absolute right-6 bottom-4",
            "flex h-10 w-10 items-center justify-center rounded-full",
            "bg-slate-900 shadow-lg shadow-slate-900/30",
            "transition-all delay-100 duration-500",
            isInView ? "scale-100 opacity-100" : "scale-0 opacity-0"
          )}
        >
          <MessageSquarePlus className="h-4 w-4 text-white" />
        </div>
      </div>
    </div>
  );
}
