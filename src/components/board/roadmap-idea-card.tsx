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
    <article className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
      {/* Vote Button + Content Row */}
      <div className="flex items-start gap-4">
        {/* Vote Button */}
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-900">
          <ThumbsUp className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {idea.voteCount}
          </span>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {idea.title}
          </h3>
          {(idea.featureDetails || idea.description) && (
            <ExpandableText maxLines={2} className="mt-1">
              <p className="text-sm leading-relaxed whitespace-pre-line text-slate-500 dark:text-slate-400">
                {idea.featureDetails ?? idea.description}
              </p>
            </ExpandableText>
          )}

          {/* Public Update (shown when workspace owner enables the toggle) */}
          {idea.showPublicUpdateOnRoadmap && idea.publicUpdate && (
            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium tracking-wide text-blue-600 uppercase dark:text-blue-400">
                <Megaphone className="h-3.5 w-3.5" />
                Team Update
              </p>
              <ExpandableText maxLines={2}>
                <p className="whitespace-pre-line">{idea.publicUpdate}</p>
              </ExpandableText>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
