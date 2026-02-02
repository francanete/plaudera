"use client";

import { ThumbsUp } from "lucide-react";
import type { RoadmapStatus } from "@/lib/db/schema";

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
          {idea.publicUpdate && (
            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {idea.publicUpdate}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
