"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, Check, X, Loader2, Sparkles, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DuplicateSuggestion, Idea } from "@/lib/db/schema";
import { IDEA_STATUS_CONFIG } from "@/lib/idea-status-config";
import {
  ROADMAP_STATUS_CONFIG,
  isOnRoadmap,
} from "@/lib/roadmap-status-config";

type IdeaPreview = Pick<
  Idea,
  | "id"
  | "title"
  | "description"
  | "status"
  | "roadmapStatus"
  | "voteCount"
  | "createdAt"
>;

type SuggestionWithIdeas = DuplicateSuggestion & {
  sourceIdea: IdeaPreview;
  duplicateIdea: IdeaPreview;
};

interface DuplicatesListProps {
  initialSuggestions: SuggestionWithIdeas[];
}

function getSimilarityBadgeStyles(similarity: number) {
  if (similarity > 90) {
    return "bg-amber-50 text-amber-700 border-amber-100";
  }
  return "bg-blue-50 text-blue-700 border-blue-100";
}

export function DuplicatesList({ initialSuggestions }: DuplicatesListProps) {
  const [suggestions, setSuggestions] =
    useState<SuggestionWithIdeas[]>(initialSuggestions);
  const [loadingStates, setLoadingStates] = useState<Record<string, string>>(
    {}
  );

  const setLoading = (id: string, action: string | null) => {
    setLoadingStates((prev) => {
      if (action === null) {
        const { [id]: _removed, ...rest } = prev;
        void _removed;
        return rest;
      }
      return { ...prev, [id]: action };
    });
  };

  const handleMerge = async (suggestionId: string, keepIdeaId: string) => {
    setLoading(suggestionId, "merge");

    const previousSuggestions = suggestions;
    setSuggestions(suggestions.filter((s) => s.id !== suggestionId));

    try {
      const res = await fetch(`/api/duplicates/${suggestionId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepIdeaId }),
      });

      if (!res.ok) {
        throw new Error("Failed to merge ideas");
      }

      toast.success("Ideas merged successfully");
    } catch {
      setSuggestions(previousSuggestions);
      toast.error("Failed to merge ideas");
    } finally {
      setLoading(suggestionId, null);
    }
  };

  const handleDismiss = async (suggestionId: string) => {
    setLoading(suggestionId, "dismiss");

    const previousSuggestions = suggestions;
    setSuggestions(suggestions.filter((s) => s.id !== suggestionId));

    try {
      const res = await fetch(`/api/duplicates/${suggestionId}/dismiss`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to dismiss suggestion");
      }

      toast.success("Marked as not duplicates");
    } catch {
      setSuggestions(previousSuggestions);
      toast.error("Failed to dismiss suggestion");
    } finally {
      setLoading(suggestionId, null);
    }
  };

  if (suggestions.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
            <Sparkles className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            All clear!
          </h3>
          <p className="max-w-md text-center text-slate-500">
            Our AI scans your ideas daily to find potential duplicates.
            Detection runs at 3 AM UTC for workspaces with 5+ ideas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {suggestions.map((suggestion) => {
        const isLoading = !!loadingStates[suggestion.id];
        const loadingAction = loadingStates[suggestion.id];

        return (
          <div
            key={suggestion.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-semibold text-slate-900">
                Potential Duplicate Detected
              </h3>
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-sm font-medium",
                  getSimilarityBadgeStyles(suggestion.similarity)
                )}
              >
                {suggestion.similarity}% similar
              </span>
            </div>

            {/* Comparison area */}
            <div className="relative p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Vertical divider - only visible on md+ */}
                <div className="absolute inset-y-6 left-1/2 hidden w-px -translate-x-1/2 bg-slate-200 md:block" />

                <IdeaCard
                  idea={suggestion.sourceIdea}
                  type="original"
                  onKeep={() =>
                    handleMerge(suggestion.id, suggestion.sourceIdea.id)
                  }
                  isLoading={isLoading}
                  isKeeping={loadingAction === "merge"}
                  mergeDisabled={isOnRoadmap(
                    suggestion.duplicateIdea.roadmapStatus
                  )}
                />
                <IdeaCard
                  idea={suggestion.duplicateIdea}
                  type="duplicate"
                  onKeep={() =>
                    handleMerge(suggestion.id, suggestion.duplicateIdea.id)
                  }
                  isLoading={isLoading}
                  isKeeping={loadingAction === "merge"}
                  mergeDisabled={isOnRoadmap(
                    suggestion.sourceIdea.roadmapStatus
                  )}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-center border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => handleDismiss(suggestion.id)}
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
                    Not duplicates
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface IdeaCardProps {
  idea: IdeaPreview;
  type: "original" | "duplicate";
  onKeep: () => void;
  isLoading: boolean;
  isKeeping: boolean;
  mergeDisabled: boolean;
}

function IdeaCard({
  idea,
  type,
  onKeep,
  isLoading,
  isKeeping,
  mergeDisabled,
}: IdeaCardProps) {
  const isOriginal = type === "original";

  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        isOriginal
          ? "border-slate-200 bg-white"
          : "border-slate-200 bg-slate-50/50"
      )}
    >
      {/* Header with label and votes */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className={cn(
            "text-[10px] font-medium tracking-wider uppercase",
            isOriginal ? "text-slate-500" : "text-amber-600"
          )}
        >
          {isOriginal ? "Original" : "Potential Duplicate"}
        </span>
        <div className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
          <ArrowUp className="h-3 w-3 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            {idea.voteCount}
          </span>
        </div>
      </div>

      {/* Title */}
      <h4 className="mb-2 font-semibold text-slate-900">
        <Link
          href={
            isOnRoadmap(idea.roadmapStatus)
              ? `/dashboard/roadmap/${idea.id}`
              : `/dashboard/ideas/${idea.id}`
          }
          className="hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {idea.title}
        </Link>
      </h4>

      {/* Description */}
      {idea.description && (
        <p className="mb-3 line-clamp-2 text-sm text-slate-500">
          {idea.description}
        </p>
      )}

      {/* Status badge — roadmap status if on roadmap, idea status otherwise */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs text-slate-400">
          {isOnRoadmap(idea.roadmapStatus) ? "Roadmap" : "Ideas Board"}
        </span>
        {isOnRoadmap(idea.roadmapStatus) ? (
          <Badge
            variant="outline"
            className={ROADMAP_STATUS_CONFIG[idea.roadmapStatus].badgeClassName}
          >
            {(() => {
              const Icon = ROADMAP_STATUS_CONFIG[idea.roadmapStatus].icon;
              return <Icon className="mr-1 h-3 w-3" />;
            })()}
            {ROADMAP_STATUS_CONFIG[idea.roadmapStatus].shortLabel}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className={IDEA_STATUS_CONFIG[idea.status].badgeClassName}
          >
            {(() => {
              const Icon = IDEA_STATUS_CONFIG[idea.status].icon;
              return <Icon className="mr-1 h-3 w-3" />;
            })()}
            {idea.status === "PUBLISHED"
              ? "Published"
              : IDEA_STATUS_CONFIG[idea.status].label}
          </Badge>
        )}
      </div>

      {/* Date with icon */}
      <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
        <Calendar className="h-3 w-3" />
        <span>
          {new Date(idea.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Action button */}
      <Button
        size="sm"
        variant={isOriginal ? "secondary" : "default"}
        className={cn(
          "w-full",
          isOriginal
            ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            : ""
        )}
        onClick={onKeep}
        disabled={isLoading || mergeDisabled}
        title={
          mergeDisabled
            ? "The other idea is on the roadmap and cannot be merged away"
            : undefined
        }
      >
        {isKeeping ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Merging...
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            Keep this one
          </>
        )}
      </Button>
    </div>
  );
}
