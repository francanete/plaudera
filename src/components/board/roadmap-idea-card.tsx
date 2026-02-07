"use client";

import { ThumbsUp, Megaphone } from "lucide-react";
import { ExpandableText } from "@/components/ui/expandable-text";
import type { RoadmapStatus } from "@/lib/db/schema";

export interface RoadmapIdeaCardData {
  id: string;
  title: string;
  description: string | null;
  roadmapStatus: RoadmapStatus;
  featureDetails: string | null;
  publicUpdate: string | null;
  showPublicUpdateOnRoadmap: boolean;
  voteCount: number;
}

interface RoadmapIdeaCardProps {
  idea: RoadmapIdeaCardData;
}

export function RoadmapIdeaCard({ idea }: RoadmapIdeaCardProps) {
  return (
    <article className="group flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
      <h3 className="text-sm font-medium text-slate-900 dark:text-white">
        {idea.title}
      </h3>

      {(idea.featureDetails || idea.description) && (
        <ExpandableText maxLines={3} className="mt-1.5">
          <p className="text-xs leading-relaxed whitespace-pre-line text-slate-500 dark:text-slate-400">
            {idea.featureDetails ?? idea.description}
          </p>
        </ExpandableText>
      )}

      {/* Public Update (shown when workspace owner enables the toggle) */}
      {idea.showPublicUpdateOnRoadmap && idea.publicUpdate && (
        <div className="mt-3 rounded-md border border-blue-200/60 bg-blue-50/40 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-blue-500 uppercase">
            <Megaphone className="h-3 w-3" />
            Team Update
          </p>
          <ExpandableText maxLines={2}>
            <p className="text-xs leading-relaxed whitespace-pre-line text-blue-700 dark:text-blue-300">
              {idea.publicUpdate}
            </p>
          </ExpandableText>
        </div>
      )}

      {/* Compact vote count footer */}
      <div className="mt-auto flex items-center gap-1.5 pt-3 text-slate-400 dark:text-slate-500">
        <ThumbsUp className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{idea.voteCount}</span>
      </div>
    </article>
  );
}
