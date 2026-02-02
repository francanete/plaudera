"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ROADMAP_STATUS_CONFIG } from "@/lib/roadmap-status-config";
import type { RoadmapStatus } from "@/lib/db/schema";

interface StatusChange {
  id: string;
  fromStatus: RoadmapStatus;
  toStatus: RoadmapStatus;
  changedAt: string;
}

interface IdeaRoadmapHistoryProps {
  changes: StatusChange[];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function IdeaRoadmapHistory({ changes }: IdeaRoadmapHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (changes.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto gap-2 p-0 text-sm text-slate-500 hover:bg-transparent hover:text-slate-700"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <History className="h-4 w-4" />
          <span>Roadmap History ({changes.length})</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="space-y-2 border-l-2 border-slate-200 pl-4">
          {changes.map((change) => {
            const toConfig = ROADMAP_STATUS_CONFIG[change.toStatus];
            return (
              <div
                key={change.id}
                className="flex items-center gap-2 text-sm text-slate-600"
              >
                <span>Moved to</span>
                <span
                  className="font-medium"
                  style={{ color: getStatusColor(change.toStatus) }}
                >
                  {toConfig.label}
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-400">
                  {formatDate(change.changedAt)}
                </span>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function getStatusColor(status: RoadmapStatus): string {
  switch (status) {
    case "PLANNED":
      return "#2563eb"; // blue-600
    case "IN_PROGRESS":
      return "#d97706"; // amber-600
    case "RELEASED":
      return "#16a34a"; // green-600
    default:
      return "#64748b"; // slate-500
  }
}
