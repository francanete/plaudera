"use client";

import { useState } from "react";
import { Clock, ChevronRight, MessageSquare, Eye } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { DecisionTimelineEntry } from "@/lib/idea-queries";

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const DECISION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  prioritized: {
    label: "Prioritized",
    color: "text-green-600 dark:text-green-400",
  },
  deprioritized: {
    label: "Deprioritized",
    color: "text-amber-600 dark:text-amber-400",
  },
  declined: {
    label: "Declined",
    color: "text-red-600 dark:text-red-400",
  },
  status_progression: {
    label: "Progressed",
    color: "text-blue-600 dark:text-blue-400",
  },
  status_reversal: {
    label: "Reversed",
    color: "text-amber-600 dark:text-amber-400",
  },
};

interface DecisionTimelineProps {
  entries: DecisionTimelineEntry[];
}

export function DecisionTimeline({ entries }: DecisionTimelineProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (entries.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors">
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              isOpen ? "rotate-90" : ""
            }`}
          />
          <Clock className="h-3.5 w-3.5" />
          <span>
            Decision history{" "}
            <span className="font-mono text-xs tabular-nums">
              ({entries.length})
            </span>
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-border mt-3 ml-1 space-y-0 border-l pl-4">
          {entries.map((entry) => {
            const typeConfig = entry.decisionType
              ? DECISION_TYPE_LABELS[entry.decisionType]
              : null;

            return (
              <div key={entry.id} className="relative py-3">
                <div className="bg-border absolute top-4 -left-4.25 h-2 w-2 rounded-full" />

                <div className="flex items-center gap-2">
                  {typeConfig && (
                    <span className={`text-sm font-medium ${typeConfig.color}`}>
                      {typeConfig.label}
                    </span>
                  )}
                  <span className="text-muted-foreground text-xs">
                    {entry.fromStatus} &rarr; {entry.toStatus}
                  </span>
                  {entry.isPublic && (
                    <Eye className="text-muted-foreground h-3 w-3" />
                  )}
                </div>

                {entry.rationale && (
                  <div className="mt-1 flex items-start gap-1.5">
                    <MessageSquare className="text-muted-foreground mt-0.5 h-3 w-3 shrink-0" />
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {entry.rationale}
                    </p>
                  </div>
                )}

                <div className="text-muted-foreground/60 mt-1 flex items-center gap-2 text-xs">
                  <span className="font-mono tabular-nums">
                    {formatDate(entry.createdAt)}
                  </span>
                  {entry.userName && <span>by {entry.userName}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
