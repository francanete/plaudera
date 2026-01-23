"use client";

import { Globe, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SetupMockupProps {
  isInView: boolean;
  delay: number;
}

export function SetupMockup({ isInView, delay }: SetupMockupProps) {
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
      {/* Board URL */}
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-emerald-500" />
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400">acme</span>
            <span className="text-slate-300">.</span>
            <span className="font-medium text-slate-700">plaudera.com</span>
          </div>
          <span
            className={cn(
              "ml-auto rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600",
              "transition-all duration-500",
              isInView ? "scale-100 opacity-100" : "scale-75 opacity-0"
            )}
            style={{ transitionDelay: isInView ? `${delay + 400}ms` : "0ms" }}
          >
            Live
          </span>
        </div>
      </div>

      {/* Board preview */}
      <div className="p-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="h-2.5 w-24 rounded bg-slate-200/80" />
          <div className="h-5 w-14 rounded-md bg-slate-100" />
        </div>
        <div className="space-y-2">
          <div className="h-8 w-full rounded-lg border border-slate-100 bg-slate-50/50" />
          <div className="h-8 w-full rounded-lg border border-slate-100 bg-slate-50/50" />
          <div
            className={cn(
              "h-8 w-full rounded-lg border border-dashed border-slate-200 bg-slate-50/30",
              "transition-all duration-500",
              isInView ? "opacity-100" : "opacity-0"
            )}
            style={{ transitionDelay: isInView ? `${delay + 500}ms` : "0ms" }}
          />
        </div>
      </div>

      {/* Widget badge */}
      <div className="border-t border-slate-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Code2 className="h-3 w-3 text-slate-400" />
          <span className="text-[10px] text-slate-500">Widget embed ready</span>
          <div
            className={cn(
              "ml-auto h-2 w-2 rounded-full bg-emerald-400",
              "transition-all duration-700",
              isInView ? "scale-100 opacity-100" : "scale-0 opacity-0"
            )}
            style={{ transitionDelay: isInView ? `${delay + 600}ms` : "0ms" }}
          />
        </div>
      </div>
    </div>
  );
}
