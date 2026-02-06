"use client";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GitMerge, ChevronDown } from "lucide-react";
import type { IdeaStatus, RoadmapStatus } from "@/lib/db/schema";
import {
  SELECTABLE_IDEA_STATUSES,
  IDEA_STATUS_CONFIG,
} from "@/lib/idea-status-config";

interface IdeaStatusSectionProps {
  status: IdeaStatus;
  roadmapStatus: RoadmapStatus;
  onStatusChange: (status: IdeaStatus) => void;
}

// Color mappings for status icons
const STATUS_ICON_COLORS: Record<IdeaStatus, { bg: string; text: string }> = {
  UNDER_REVIEW: { bg: "bg-blue-100", text: "text-blue-600" },
  PUBLISHED: { bg: "bg-emerald-100", text: "text-emerald-600" },
  DECLINED: { bg: "bg-red-100", text: "text-red-600" },
  MERGED: { bg: "bg-purple-100", text: "text-purple-600" },
};

export function IdeaStatusSection({
  status,
  roadmapStatus,
  onStatusChange,
}: IdeaStatusSectionProps) {
  const isOnRoadmap = roadmapStatus !== "NONE";
  const StatusIcon = IDEA_STATUS_CONFIG[status].icon;
  const statusColors = STATUS_ICON_COLORS[status];

  // Filter out DECLINED when the idea is on the roadmap
  const selectableStatuses = isOnRoadmap
    ? SELECTABLE_IDEA_STATUSES.filter((s) => s !== "DECLINED")
    : SELECTABLE_IDEA_STATUSES;

  return (
    <div className="space-y-4">
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
              {selectableStatuses.map((opt) => {
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
      </div>
    </div>
  );
}
