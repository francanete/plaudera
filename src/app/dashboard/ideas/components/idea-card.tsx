"use client";

import Link from "next/link";
import { ChevronUp, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Idea, IdeaStatus } from "@/lib/db/schema";
import type { ConfidenceResult } from "@/lib/confidence";
import { StatusBadge } from "./status-badge";
import { ConfidenceBadge } from "./confidence-badge";
import { OutlierWarning } from "./outlier-warning";
import {
  ROADMAP_STATUS_CONFIG,
  isOnRoadmap,
} from "@/lib/roadmap-status-config";

export interface IdeaCardProps {
  idea: Idea;
  hasDuplicate: boolean;
  onStatusChange: (ideaId: string, status: IdeaStatus) => void;
  tags?: { id: string; name: string; color: string }[];
  confidence?: ConfidenceResult;
}

export function IdeaCard({
  idea,
  hasDuplicate,
  onStatusChange,
  tags,
  confidence,
}: IdeaCardProps) {
  return (
    <Link
      href={
        isOnRoadmap(idea.roadmapStatus)
          ? `/dashboard/roadmap/${idea.id}`
          : `/dashboard/ideas/${idea.id}`
      }
      className="block"
    >
      <article
        className="group border-border bg-card hover:border-primary/30 flex items-start gap-5 rounded-xl border p-5 transition-all duration-200 hover:shadow-md"
        aria-label={`Feature request: ${idea.title}`}
      >
        {/* Vote Section */}
        <div className="shrink-0">
          <div className="border-border bg-muted/50 group-hover:border-primary/20 group-hover:bg-muted flex h-16 w-14 flex-col items-center justify-center rounded-lg border transition-all duration-150">
            <ChevronUp className="text-muted-foreground group-hover:text-foreground h-4 w-4 transition-colors" />
            <span className="text-foreground text-lg font-semibold">
              {idea.voteCount}
            </span>
            <span className="text-muted-foreground text-xs">votes</span>
          </div>
        </div>

        {/* Content Section */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-foreground truncate text-base font-semibold">
              {idea.title}
            </h3>
            {confidence && (
              <ConfidenceBadge
                label={confidence.label}
                intraScore={confidence.intraScore}
                signalBreakdown={confidence.signalBreakdown}
                size="sm"
              />
            )}
            {confidence?.concentrationWarning && (
              <OutlierWarning warning={confidence.concentrationWarning} />
            )}
            {hasDuplicate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <Copy className="h-3 w-3" />
                      Duplicate?
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Potential duplicate detected. Review in Duplicates page.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {idea.description && (
            <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
              {idea.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <StatusBadge
              status={idea.status}
              onChange={(newStatus) => onStatusChange(idea.id, newStatus)}
              disabled={idea.status === "MERGED"}
            />
            {isOnRoadmap(idea.roadmapStatus) && (
              <Badge
                variant="outline"
                className={
                  ROADMAP_STATUS_CONFIG[idea.roadmapStatus].badgeClassName
                }
              >
                {(() => {
                  const Icon = ROADMAP_STATUS_CONFIG[idea.roadmapStatus].icon;
                  return <Icon className="mr-1 h-3 w-3" />;
                })()}
                {ROADMAP_STATUS_CONFIG[idea.roadmapStatus].shortLabel}
              </Badge>
            )}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
            <time
              dateTime={idea.createdAt.toISOString()}
              className="text-muted-foreground text-sm"
            >
              {new Date(idea.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </div>
        </div>
      </article>
    </Link>
  );
}
