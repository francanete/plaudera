"use client";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GitMerge, ChevronDown, Map } from "lucide-react";
import type { IdeaStatus } from "@/lib/db/schema";
import {
  SELECTABLE_IDEA_STATUSES,
  IDEA_STATUS_CONFIG,
} from "@/lib/idea-status-config";

interface IdeaStatusSectionProps {
  status: IdeaStatus;
  voteCount: number;
  onStatusChange: (status: IdeaStatus) => void;
  onMoveToRoadmap: () => void;
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
  voteCount,
  onStatusChange,
  onMoveToRoadmap,
}: IdeaStatusSectionProps) {
  const StatusIcon = IDEA_STATUS_CONFIG[status].icon;
  const statusColors = STATUS_ICON_COLORS[status];

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

          {/* Move to Roadmap button — only shows for non-roadmap ideas */}
          <button
            onClick={onMoveToRoadmap}
            className="border-border bg-background hover:border-muted-foreground/30 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all hover:shadow-sm"
          >
            <Map className="text-muted-foreground h-4 w-4" />
            <span className="text-foreground">Move to Roadmap</span>
          </button>
        </div>
      </div>
    </div>
  );
}
