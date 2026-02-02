"use client";

import { ThumbsUp } from "lucide-react";
import type { RoadmapStatus } from "@/lib/db/schema";
import { ROADMAP_STATUS_CONFIG } from "@/lib/roadmap-status-config";
import { cn } from "@/lib/utils";

export interface RoadmapIdeaCardData {
  id: string;
  title: string;
  roadmapStatus: RoadmapStatus;
  publicUpdate: string | null;
  voteCount: number;
}

interface RoadmapIdeaCardProps {
  idea: RoadmapIdeaCardData;
}

export function RoadmapIdeaCard({ idea }: RoadmapIdeaCardProps) {
  const config = ROADMAP_STATUS_CONFIG[idea.roadmapStatus];
  const StatusIcon = config.icon;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 transition-all duration-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      {/* Vote count + Title */}
      <div className="mb-2 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
          <ThumbsUp className="h-3 w-3 text-slate-500 dark:text-slate-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {idea.voteCount}
          </span>
        </div>
        <h3 className="line-clamp-2 text-sm leading-tight font-medium text-slate-900 dark:text-white">
          {idea.title}
        </h3>
      </div>

      {/* Public Update Preview */}
      {idea.publicUpdate && (
        <p className="mb-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
          {idea.publicUpdate}
        </p>
      )}

      {/* Status Badge */}
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
          config.badgeClassName
        )}
      >
        <StatusIcon className="h-3 w-3" />
        {config.shortLabel}
      </span>
    </article>
  );
}
