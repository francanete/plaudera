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
import {
  GitMerge,
  ChevronDown,
  Clock,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
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
  NONE: "text-gray-400",
  PLANNED: "text-blue-500",
  IN_PROGRESS: "text-indigo-500",
  RELEASED: "text-emerald-500",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusColor(status: RoadmapStatus): string {
  switch (status) {
    case "PLANNED":
      return "#2563eb";
    case "IN_PROGRESS":
      return "#6366f1";
    case "RELEASED":
      return "#10b981";
    default:
      return "#6b7280";
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
    <div className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
        {/* Vote Count Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-700">
              {voteCount} {voteCount === 1 ? "vote" : "votes"}
            </span>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Dropdown */}
          {status === "MERGED" ? (
            <Badge
              variant="secondary"
              className="gap-1.5 border-gray-200 bg-gray-100 px-3 py-1.5 text-gray-700"
            >
              <GitMerge className="h-3.5 w-3.5" />
              Merged
            </Badge>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="group inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-left transition-all hover:border-gray-300 hover:shadow-sm">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${statusColors.bg}`}
                  >
                    <StatusIcon className={`h-3 w-3 ${statusColors.text}`} />
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {IDEA_STATUS_CONFIG[status].label}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
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
              <button className="group inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-left transition-all hover:border-gray-300 hover:shadow-sm">
                <RoadmapIcon className={`h-4 w-4 ${roadmapIconColor}`} />
                <span className="text-sm font-medium text-gray-700">
                  {ROADMAP_STATUS_CONFIG[roadmapStatus].label}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
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

          {/* History Link */}
          {roadmapHistory.length > 0 && (
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <CollapsibleTrigger asChild>
                <button className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900">
                  <ChevronRight
                    className={`h-4 w-4 transition-transform duration-200 ${
                      historyOpen ? "rotate-90" : ""
                    }`}
                  />
                  <Clock className="h-4 w-4" />
                  <span>History ({roadmapHistory.length})</span>
                </button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </div>
      </div>

      {/* Collapsible History Content */}
      {roadmapHistory.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleContent>
            <div className="space-y-2 border-l-2 border-gray-200 pl-4">
              {roadmapHistory.map((change) => {
                const toConfig = ROADMAP_STATUS_CONFIG[change.toStatus];
                return (
                  <div
                    key={change.id}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <span>Moved to</span>
                    <span
                      className="font-medium"
                      style={{ color: getStatusColor(change.toStatus) }}
                    >
                      {toConfig.label}
                    </span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-400">
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
