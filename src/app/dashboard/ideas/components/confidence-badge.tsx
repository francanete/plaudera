"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ConfidenceLabel, SignalBreakdown } from "@/lib/confidence";

const LABEL_CONFIG: Record<
  ConfidenceLabel,
  { text: string; shortText: string; className: string }
> = {
  strong: {
    text: "Strong Signal",
    shortText: "Strong",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  emerging: {
    text: "Emerging Signal",
    shortText: "Emerging",
    className:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  },
  anecdotal: {
    text: "Anecdotal",
    shortText: "Anecdotal",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
};

interface ConfidenceBadgeProps {
  label: ConfidenceLabel;
  intraScore: number;
  signalBreakdown?: SignalBreakdown;
  size?: "sm" | "md";
}

function BreakdownRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function ConfidenceBadge({
  label,
  intraScore,
  signalBreakdown,
  size = "sm",
}: ConfidenceBadgeProps) {
  const config = LABEL_CONFIG[label];
  const displayText = size === "sm" ? config.shortText : config.text;

  const badge = (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {displayText}
      {size === "md" && <span className="opacity-60">({intraScore})</span>}
    </span>
  );

  if (!signalBreakdown) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="w-56 p-3" side="bottom">
          <p className="mb-2 text-xs font-semibold">
            Signal breakdown (score: {intraScore})
          </p>
          <div className="space-y-1 text-xs">
            <BreakdownRow
              label="Organic votes"
              value={(signalBreakdown.organicVotes * 100).toFixed(0)}
            />
            <BreakdownRow
              label="Contributors"
              value={(signalBreakdown.contributors * 100).toFixed(0)}
            />
            <BreakdownRow
              label="Recency"
              value={(signalBreakdown.recency * 100).toFixed(0)}
            />
            <BreakdownRow
              label="Velocity"
              value={(signalBreakdown.ageVelocity * 100).toFixed(0)}
            />
            <BreakdownRow
              label="Dupe cluster"
              value={(signalBreakdown.dupeStrength * 100).toFixed(0)}
            />
            <BreakdownRow
              label="Richness"
              value={(signalBreakdown.richness * 100).toFixed(0)}
            />
            <BreakdownRow
              label="Frequency"
              value={(signalBreakdown.frequency * 100).toFixed(0)}
            />
            <BreakdownRow
              label="Impact"
              value={(signalBreakdown.impact * 100).toFixed(0)}
            />
            <BreakdownRow
              label="Inherited"
              value={(signalBreakdown.inheritedVotes * 100).toFixed(0)}
            />
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
