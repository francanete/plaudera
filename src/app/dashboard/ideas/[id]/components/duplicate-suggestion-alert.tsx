"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUp, Loader2, GitMerge, X } from "lucide-react";
import { IDEA_STATUS_CONFIG } from "@/lib/idea-status-config";
import {
  ROADMAP_STATUS_CONFIG,
  isOnRoadmap,
} from "@/lib/roadmap-status-config";
import { Badge } from "@/components/ui/badge";
import type { IdeaStatus, RoadmapStatus } from "@/lib/db/schema";

export interface DuplicateSuggestionForView {
  suggestionId: string;
  similarity: number;
  otherIdea: {
    id: string;
    title: string;
    description: string | null;
    status: IdeaStatus;
    roadmapStatus: RoadmapStatus;
    voteCount: number;
    createdAt: Date;
  };
}

function getSimilarityBadgeStyles(similarity: number) {
  if (similarity > 90) {
    return "bg-amber-50 text-amber-700 border-amber-100";
  }
  return "bg-blue-50 text-blue-700 border-blue-100";
}

interface DuplicateSuggestionAlertProps {
  suggestions: DuplicateSuggestionForView[];
  loadingStates: Record<string, string>;
  onMerge: (suggestionId: string, keepIdeaId: string) => void;
  onDismiss: (suggestionId: string) => void;
}

export function DuplicateSuggestionAlert({
  suggestions,
  loadingStates,
  onMerge,
  onDismiss,
}: DuplicateSuggestionAlertProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-4">
      {suggestions.map((suggestion) => {
        const { otherIdea } = suggestion;
        const isLoading = !!loadingStates[suggestion.suggestionId];
        const loadingAction = loadingStates[suggestion.suggestionId];
        const otherIdeaHref = isOnRoadmap(otherIdea.roadmapStatus)
          ? `/dashboard/roadmap/${otherIdea.id}`
          : `/dashboard/ideas/${otherIdea.id}`;

        return (
          <div
            key={suggestion.suggestionId}
            className="rounded-xl border border-amber-200 bg-amber-50/50"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-amber-200/60 px-5 py-3">
              <h4 className="text-sm font-semibold text-amber-800">
                Potential Duplicate
              </h4>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  getSimilarityBadgeStyles(suggestion.similarity)
                )}
              >
                {suggestion.similarity}% similar
              </span>
            </div>

            {/* Other idea preview */}
            <div className="px-5 py-4">
              <div className="mb-2 flex items-center justify-between">
                <Link
                  href={otherIdeaHref}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {otherIdea.title}
                </Link>
                <div className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5">
                  <ArrowUp className="h-3 w-3 text-slate-500" />
                  <span className="text-xs font-medium text-slate-700">
                    {otherIdea.voteCount}
                  </span>
                </div>
              </div>

              {otherIdea.description && (
                <p className="mb-3 line-clamp-2 text-sm text-slate-500">
                  {otherIdea.description}
                </p>
              )}

              {/* Status badge */}
              <div className="mb-4">
                {isOnRoadmap(otherIdea.roadmapStatus) ? (
                  <Badge
                    variant="outline"
                    className={
                      ROADMAP_STATUS_CONFIG[otherIdea.roadmapStatus]
                        .badgeClassName
                    }
                  >
                    {(() => {
                      const Icon =
                        ROADMAP_STATUS_CONFIG[otherIdea.roadmapStatus].icon;
                      return <Icon className="mr-1 h-3 w-3" />;
                    })()}
                    {ROADMAP_STATUS_CONFIG[otherIdea.roadmapStatus].shortLabel}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className={
                      IDEA_STATUS_CONFIG[otherIdea.status].badgeClassName
                    }
                  >
                    {(() => {
                      const Icon = IDEA_STATUS_CONFIG[otherIdea.status].icon;
                      return <Icon className="mr-1 h-3 w-3" />;
                    })()}
                    {otherIdea.status === "PUBLISHED"
                      ? "Published"
                      : IDEA_STATUS_CONFIG[otherIdea.status].label}
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  size="sm"
                  onClick={() => onMerge(suggestion.suggestionId, otherIdea.id)}
                  disabled={isLoading}
                >
                  {loadingAction === "merge" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Merging...
                    </>
                  ) : (
                    <>
                      <GitMerge className="mr-2 h-4 w-4" />
                      Merge into &ldquo;
                      {otherIdea.title.length > 30
                        ? otherIdea.title.slice(0, 30) + "..."
                        : otherIdea.title}
                      &rdquo;
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDismiss(suggestion.suggestionId)}
                  disabled={isLoading}
                  className="border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  {loadingAction === "dismiss" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Dismissing...
                    </>
                  ) : (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Dismiss
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
