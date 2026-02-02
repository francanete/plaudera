"use client";

import { VoteButton } from "./vote-button";
import type { IdeaStatus, RoadmapStatus } from "@/lib/db/schema";
import { IDEA_STATUS_CONFIG } from "@/lib/idea-status-config";
import {
  ROADMAP_STATUS_CONFIG,
  isOnRoadmap,
} from "@/lib/roadmap-status-config";
import { cn } from "@/lib/utils";

export interface IdeaCardData {
  id: string;
  title: string;
  description: string | null;
  status: IdeaStatus;
  roadmapStatus: RoadmapStatus;
  publicUpdate: string | null;
  voteCount: number;
  hasVoted: boolean;
  createdAt: Date | string;
  isOwn?: boolean;
}

interface IdeaCardProps {
  idea: IdeaCardData;
  isAuthenticated: boolean;
  onVote: (ideaId: string) => Promise<{ voted: boolean; voteCount: number }>;
  onRequireAuth: () => void;
}

export function IdeaCard({
  idea,
  isAuthenticated,
  onVote,
  onRequireAuth,
}: IdeaCardProps) {
  const statusConfig = IDEA_STATUS_CONFIG[idea.status];
  const StatusIcon = statusConfig.icon;
  const isOwnPending = idea.isOwn && idea.status === "UNDER_REVIEW";

  return (
    <article
      className={cn(
        "flex gap-4 rounded-xl border bg-white p-5 transition-all duration-200 hover:shadow-md dark:bg-slate-800",
        isOwnPending
          ? "border-amber-200 bg-gradient-to-r from-amber-50/50 to-white dark:border-amber-700 dark:from-amber-950/30 dark:to-slate-800"
          : "border-slate-200 dark:border-slate-700"
      )}
    >
      <VoteButton
        ideaId={idea.id}
        voteCount={idea.voteCount}
        hasVoted={idea.hasVoted}
        isAuthenticated={isAuthenticated}
        onVote={onVote}
        onRequireAuth={onRequireAuth}
      />

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-start gap-3">
          <h3 className="text-base leading-tight font-medium text-slate-900 dark:text-white">
            {idea.title}
          </h3>
          {isOwnPending && (
            <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
              Your submission
            </span>
          )}
        </div>

        {idea.description && (
          <p className="mb-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
            {idea.description}
          </p>
        )}

        {/* Public Update */}
        {idea.publicUpdate && (
          <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
            <p className="mb-1 text-xs font-medium tracking-wide text-blue-600 uppercase dark:text-blue-400">
              Update
            </p>
            <p className="line-clamp-2">{idea.publicUpdate}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              statusConfig.badgeClassName
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {statusConfig.label}
          </span>
          {isOnRoadmap(idea.roadmapStatus) && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                ROADMAP_STATUS_CONFIG[idea.roadmapStatus].badgeClassName
              )}
            >
              {(() => {
                const RoadmapIcon =
                  ROADMAP_STATUS_CONFIG[idea.roadmapStatus].icon;
                return <RoadmapIcon className="h-3.5 w-3.5" />;
              })()}
              {ROADMAP_STATUS_CONFIG[idea.roadmapStatus].shortLabel}
            </span>
          )}
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {new Date(idea.createdAt).toLocaleDateString("en-US")}
          </span>
        </div>
      </div>
    </article>
  );
}
