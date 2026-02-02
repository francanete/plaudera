"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { GitMerge, ChevronDown, Clock, ChevronRight } from "lucide-react";
import type { IdeaStatus, RoadmapStatus } from "@/lib/db/schema";
import {
  SELECTABLE_IDEA_STATUSES,
  IDEA_STATUS_CONFIG,
} from "@/lib/idea-status-config";
import {
  ALL_ROADMAP_STATUSES,
  ROADMAP_STATUS_CONFIG,
} from "@/lib/roadmap-status-config";

interface StatusChange {
  id: string;
  fromStatus: RoadmapStatus;
  toStatus: RoadmapStatus;
  changedAt: string;
}

interface IdeaStatusSectionProps {
  status: IdeaStatus;
  roadmapStatus: RoadmapStatus;
  voteCount: number;
  onStatusChange: (status: IdeaStatus) => void;
  onRoadmapStatusChange: (status: RoadmapStatus) => void;
  roadmapHistory: StatusChange[];
}

// Color mappings for status icons
const STATUS_ICON_COLORS: Record<IdeaStatus, { bg: string; text: string }> = {
  UNDER_REVIEW: { bg: "bg-blue-100", text: "text-blue-600" },
  PUBLISHED: { bg: "bg-emerald-100", text: "text-emerald-600" },
  DECLINED: { bg: "bg-red-100", text: "text-red-600" },
  MERGED: { bg: "bg-purple-100", text: "text-purple-600" },
};

const ROADMAP_ICON_COLORS: Record<RoadmapStatus, string> = {
  NONE: "text-muted-foreground",
  PLANNED: "text-blue-500",
  IN_PROGRESS: "text-indigo-500",
  RELEASED: "text-emerald-500",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getStatusColor(status: RoadmapStatus): string {
  switch (status) {
    case "PLANNED":
      return "text-blue-600";
    case "IN_PROGRESS":
      return "text-indigo-600";
    case "RELEASED":
      return "text-emerald-600";
    default:
      return "text-muted-foreground";
  }
}

export function IdeaStatusSection({
  status,
  roadmapStatus,
  voteCount,
  onStatusChange,
  onRoadmapStatusChange,
  roadmapHistory,
}: IdeaStatusSectionProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const StatusIcon = IDEA_STATUS_CONFIG[status].icon;
  const statusColors = STATUS_ICON_COLORS[status];
  const RoadmapIcon = ROADMAP_STATUS_CONFIG[roadmapStatus].icon;
  const roadmapIconColor = ROADMAP_ICON_COLORS[roadmapStatus];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        {/* Vote Count as Visual Anchor */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-foreground font-mono text-4xl font-semibold tabular-nums">
              {voteCount}
            </span>
            <span className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
              {voteCount === 1 ? "Vote" : "Votes"}
            </span>
          </div>

          {/* Vertical Separator */}
          <div className="bg-border hidden h-12 w-px sm:block" />
        </div>

        {/* Status Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Dropdown */}
          {status === "MERGED" ? (
            <Badge
              variant="secondary"
              className="bg-muted text-muted-foreground gap-1.5 rounded-full border-0 px-3 py-1.5"
            >
              <GitMerge className="h-3.5 w-3.5" />
              Merged
            </Badge>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="group border-border bg-background hover:border-muted-foreground/30 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-all hover:shadow-sm">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${statusColors.bg}`}
                  >
                    <StatusIcon className={`h-3 w-3 ${statusColors.text}`} />
                  </span>
                  <span className="text-foreground text-sm font-medium">
                    {IDEA_STATUS_CONFIG[status].label}
                  </span>
                  <ChevronDown className="text-muted-foreground h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[160px]">
                {SELECTABLE_IDEA_STATUSES.map((opt) => {
                  const cfg = IDEA_STATUS_CONFIG[opt];
                  const Icon = cfg.icon;
                  const colors = STATUS_ICON_COLORS[opt];
                  return (
                    <DropdownMenuItem
                      key={opt}
                      onClick={() => onStatusChange(opt)}
                      className="gap-2"
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full ${colors.bg}`}
                      >
                        <Icon className={`h-3 w-3 ${colors.text}`} />
                      </span>
                      <span>{cfg.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Roadmap Status Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="group border-border bg-background hover:border-muted-foreground/30 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-all hover:shadow-sm">
                <RoadmapIcon className={`h-4 w-4 ${roadmapIconColor}`} />
                <span className="text-foreground text-sm font-medium">
                  {ROADMAP_STATUS_CONFIG[roadmapStatus].label}
                </span>
                <ChevronDown className="text-muted-foreground h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              {ALL_ROADMAP_STATUSES.map((opt) => {
                const cfg = ROADMAP_STATUS_CONFIG[opt];
                const Icon = cfg.icon;
                const iconColor = ROADMAP_ICON_COLORS[opt];
                return (
                  <DropdownMenuItem
                    key={opt}
                    onClick={() => onRoadmapStatusChange(opt)}
                    className="gap-2"
                  >
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                    <span>{cfg.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* History Toggle */}
          {roadmapHistory.length > 0 && (
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <CollapsibleTrigger asChild>
                <button className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors">
                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      historyOpen ? "rotate-90" : ""
                    }`}
                  />
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-mono text-xs tabular-nums">
                    {roadmapHistory.length}
                  </span>
                </button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </div>
      </div>

      {/* Timeline History */}
      {roadmapHistory.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleContent>
            <div className="border-border ml-1 space-y-0 border-l pl-4">
              {roadmapHistory.map((change, index) => {
                const toConfig = ROADMAP_STATUS_CONFIG[change.toStatus];
                const isLast = index === roadmapHistory.length - 1;
                return (
                  <div
                    key={change.id}
                    className={`relative flex items-center gap-3 py-2 ${
                      !isLast ? "" : ""
                    }`}
                  >
                    {/* Timeline dot */}
                    <div className="bg-border absolute -left-[17px] h-2 w-2 rounded-full" />
                    <span
                      className={`text-sm font-medium ${getStatusColor(change.toStatus)}`}
                    >
                      {toConfig.label}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs tabular-nums">
                      {formatDate(change.changedAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
