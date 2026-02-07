"use client";

import { X, ArrowLeft, ThumbsUp, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROADMAP_STATUS_CONFIG } from "@/lib/roadmap-status-config";
import type { RoadmapIdeaCardData } from "./roadmap-idea-card";

interface RoadmapDetailPanelProps {
  idea: RoadmapIdeaCardData;
  onClose: () => void;
}

export function RoadmapDetailPanel({ idea, onClose }: RoadmapDetailPanelProps) {
  const config = ROADMAP_STATUS_CONFIG[idea.roadmapStatus];
  const Icon = config.icon;
  const displayText = idea.featureDetails ?? idea.description;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        {/* Mobile: back arrow, Desktop: X button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 sm:hidden"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-slate-500 sm:block dark:text-slate-400">
          Details
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="hidden h-8 w-8 p-0 sm:flex"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Status + Votes row */}
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={config.badgeClassName}>
            <Icon className="mr-1 h-3 w-3" />
            {config.shortLabel}
          </Badge>
          <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
            <ThumbsUp className="h-3.5 w-3.5" />
            <span className="text-xs font-medium tabular-nums">
              {idea.voteCount}
            </span>
          </div>
        </div>

        {/* Title */}
        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
          {idea.title}
        </h2>

        {/* Description / Feature Details */}
        {displayText && (
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-400">
            {displayText}
          </p>
        )}

        {/* Team Update */}
        {idea.showPublicUpdateOnRoadmap && idea.publicUpdate && (
          <div className="mt-5 rounded-lg border border-blue-200/60 bg-blue-50/40 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-blue-500 uppercase">
              <Megaphone className="h-3 w-3" />
              Team Update
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-line text-blue-700 dark:text-blue-300">
              {idea.publicUpdate}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
