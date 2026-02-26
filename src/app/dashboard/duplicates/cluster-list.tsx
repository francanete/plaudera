"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronDown,
  ChevronRight,
  ArrowUp,
  Loader2,
  Merge,
  X,
  Sparkles,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Cluster } from "./page";

interface ClusterListProps {
  initialClusters: Cluster[];
}

export function ClusterList({ initialClusters }: ClusterListProps) {
  const [clusters, setClusters] = useState(initialClusters);
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(
    new Set(initialClusters.length <= 5 ? initialClusters.map((_, i) => i) : [])
  );
  const [loadingClusters, setLoadingClusters] = useState<Set<number>>(
    new Set()
  );
  // Track which non-canonical ideas are selected for merge per cluster index
  const [selectedIdeas, setSelectedIdeas] = useState<
    Record<number, Set<string>>
  >(() => {
    const initial: Record<number, Set<string>> = {};
    initialClusters.forEach((cluster, index) => {
      initial[index] = new Set(
        cluster.ideas
          .filter((idea) => idea.id !== cluster.canonicalId)
          .map((idea) => idea.id)
      );
    });
    return initial;
  });

  const toggleExpanded = (index: number) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleIdeaSelection = (clusterIndex: number, ideaId: string) => {
    setSelectedIdeas((prev) => {
      const current = new Set(prev[clusterIndex] ?? []);
      if (current.has(ideaId)) {
        current.delete(ideaId);
      } else {
        current.add(ideaId);
      }
      return { ...prev, [clusterIndex]: current };
    });
  };

  const toggleSelectAll = (clusterIndex: number) => {
    const cluster = clusters[clusterIndex];
    if (!cluster) return;
    const nonCanonicalIds = cluster.ideas
      .filter((idea) => idea.id !== cluster.canonicalId)
      .map((idea) => idea.id);
    const currentSelected = selectedIdeas[clusterIndex] ?? new Set();
    const allSelected = nonCanonicalIds.every((id) => currentSelected.has(id));

    setSelectedIdeas((prev) => ({
      ...prev,
      [clusterIndex]: allSelected ? new Set() : new Set(nonCanonicalIds),
    }));
  };

  const handleMergeSelected = async (clusterIndex: number) => {
    const cluster = clusters[clusterIndex];
    if (!cluster) return;

    const selected = selectedIdeas[clusterIndex] ?? new Set();
    if (selected.size === 0) {
      toast.error("No ideas selected for merge");
      return;
    }

    setLoadingClusters((prev) => new Set(prev).add(clusterIndex));

    try {
      // Only merge pairs where at least one idea (non-canonical) is selected
      const pairsToMerge = cluster.pairs.filter((pair) => {
        const otherIdea =
          pair.ideaAId === cluster.canonicalId ? pair.ideaBId : pair.ideaAId;
        return selected.has(otherIdea);
      });

      for (const pair of pairsToMerge) {
        try {
          const res = await fetch(
            `/api/duplicates/${pair.suggestionId}/merge`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ keepIdeaId: cluster.canonicalId }),
            }
          );
          if (!res.ok && res.status !== 404) {
            const data = await res.json().catch(() => ({}));
            if (data.error?.includes("already been processed")) continue;
            console.error(`Failed to merge pair ${pair.suggestionId}:`, data);
          }
        } catch {
          // Continue with remaining pairs
        }
      }

      const nonCanonicalIds = cluster.ideas
        .filter((i) => i.id !== cluster.canonicalId)
        .map((i) => i.id);
      const allMerged = nonCanonicalIds.every((id) => selected.has(id));

      if (allMerged) {
        // Entire cluster resolved
        setClusters((prev) => prev.filter((_, i) => i !== clusterIndex));
      } else {
        // Remove merged ideas from cluster
        setClusters((prev) =>
          prev.map((c, i) => {
            if (i !== clusterIndex) return c;
            return {
              ...c,
              ideas: c.ideas.filter(
                (idea) => idea.id === c.canonicalId || !selected.has(idea.id)
              ),
              pairs: c.pairs.filter((pair) => !pairsToMerge.includes(pair)),
            };
          })
        );
        setSelectedIdeas((prev) => ({
          ...prev,
          [clusterIndex]: new Set(),
        }));
      }

      toast.success(
        `Merged ${selected.size} idea${selected.size > 1 ? "s" : ""}`
      );
    } catch {
      toast.error("Failed to merge ideas");
    } finally {
      setLoadingClusters((prev) => {
        const next = new Set(prev);
        next.delete(clusterIndex);
        return next;
      });
    }
  };

  const handleDismissAll = async (clusterIndex: number) => {
    const cluster = clusters[clusterIndex];
    if (!cluster) return;

    setLoadingClusters((prev) => new Set(prev).add(clusterIndex));

    try {
      for (const pair of cluster.pairs) {
        try {
          const res = await fetch(
            `/api/duplicates/${pair.suggestionId}/dismiss`,
            { method: "POST" }
          );
          if (!res.ok && res.status !== 404) {
            console.error(`Failed to dismiss pair ${pair.suggestionId}`);
          }
        } catch {
          // Continue
        }
      }

      setClusters((prev) => prev.filter((_, i) => i !== clusterIndex));
      toast.success("Cluster dismissed");
    } catch {
      toast.error("Failed to dismiss cluster");
    } finally {
      setLoadingClusters((prev) => {
        const next = new Set(prev);
        next.delete(clusterIndex);
        return next;
      });
    }
  };

  if (clusters.length === 0) {
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
    <div className="space-y-4">
      {clusters.map((cluster, index) => {
        const isExpanded = expandedClusters.has(index);
        const isLoading = loadingClusters.has(index);
        const canonical = cluster.ideas.find(
          (i) => i.id === cluster.canonicalId
        );
        const selected = selectedIdeas[index] ?? new Set();
        const nonCanonicalCount = cluster.ideas.length - 1;
        const allSelected =
          nonCanonicalCount > 0 && selected.size === nonCanonicalCount;

        return (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            {/* Header */}
            <button
              onClick={() => toggleExpanded(index)}
              className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
              disabled={isLoading}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
                <div>
                  <span className="font-medium text-slate-900">
                    {cluster.ideas.length} related ideas
                  </span>
                  {canonical && (
                    <span className="text-muted-foreground ml-2 text-sm">
                      - {canonical.title}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selected.size > 0 && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    {selected.size} selected
                  </span>
                )}
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  {cluster.pairs.length} pairs
                </span>
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-slate-100">
                {/* Select all toggle */}
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/30 px-5 py-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => toggleSelectAll(index)}
                    disabled={isLoading}
                  />
                  <span className="text-xs text-slate-500">
                    {allSelected ? "Deselect all" : "Select all"} duplicates for
                    merge
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {cluster.ideas.map((idea) => {
                    const isCanonical = idea.id === cluster.canonicalId;
                    const isSelected = selected.has(idea.id);
                    return (
                      <div
                        key={idea.id}
                        className={cn(
                          "flex items-center gap-4 px-5 py-3",
                          isCanonical && "bg-indigo-50/50",
                          !isCanonical && isSelected && "bg-amber-50/30"
                        )}
                      >
                        {isCanonical ? (
                          <div className="flex h-4 w-4 items-center justify-center">
                            <Crown className="h-4 w-4 text-indigo-500" />
                          </div>
                        ) : (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() =>
                              toggleIdeaSelection(index, idea.id)
                            }
                            disabled={isLoading}
                          />
                        )}
                        <div className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                          <ArrowUp className="h-3 w-3 text-slate-500" />
                          <span className="text-sm font-medium text-slate-700">
                            {idea.voteCount}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {idea.title}
                          </p>
                          {idea.description && (
                            <p className="truncate text-xs text-slate-500">
                              {idea.description}
                            </p>
                          )}
                        </div>
                        {isCanonical && (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            Keep
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3">
                  <span className="text-xs text-slate-500">
                    {selected.size > 0
                      ? `${selected.size} of ${nonCanonicalCount} duplicate${nonCanonicalCount > 1 ? "s" : ""} selected`
                      : "No duplicates selected"}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDismissAll(index)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Dismiss All
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleMergeSelected(index)}
                      disabled={isLoading || selected.size === 0}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Merge className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Merge Selected
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
