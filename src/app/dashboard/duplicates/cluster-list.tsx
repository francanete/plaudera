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

type ClusterPair = Cluster["pairs"][0];

interface MergeResult {
  merged: ClusterPair[];
  failed: ClusterPair[];
}

async function mergePairs(
  pairs: ClusterPair[],
  keepIdeaId: string
): Promise<MergeResult> {
  const results = await Promise.allSettled(
    pairs.map(async (pair) => {
      const res = await fetch(`/api/duplicates/${pair.suggestionId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepIdeaId }),
      });
      if (res.ok || res.status === 404) return { pair, success: true };
      const data = await res.json().catch(() => ({}));
      if (data.error?.includes("already been processed")) {
        return { pair, success: true };
      }
      return { pair, success: false };
    })
  );

  const merged: ClusterPair[] = [];
  const failed: ClusterPair[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.success) {
      merged.push(result.value.pair);
    } else if (result.status === "fulfilled") {
      failed.push(result.value.pair);
    } else {
      failed.push(pairs[results.indexOf(result)]);
    }
  }
  return { merged, failed };
}

async function dismissPairs(pairs: ClusterPair[]): Promise<number> {
  const results = await Promise.allSettled(
    pairs.map(async (pair) => {
      const res = await fetch(`/api/duplicates/${pair.suggestionId}/dismiss`, {
        method: "POST",
      });
      if (!res.ok && res.status !== 404) {
        throw new Error(`Failed to dismiss pair ${pair.suggestionId}`);
      }
    })
  );
  const failedCount = results.filter((r) => r.status === "rejected").length;
  return failedCount;
}

function getCluster(clusters: Cluster[], clusterId: string) {
  return clusters.find((c) => c.canonicalId === clusterId);
}

// --- Sub-components ---

interface ClusterIdeaRowProps {
  idea: Cluster["ideas"][0];
  isCanonical: boolean;
  isSelected: boolean;
  isLoading: boolean;
  similarityPercent: number | null;
  onToggleSelection: () => void;
}

function ClusterIdeaRow({
  idea,
  isCanonical,
  isSelected,
  isLoading,
  similarityPercent,
  onToggleSelection,
}: ClusterIdeaRowProps) {
  return (
    <div
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
          onCheckedChange={onToggleSelection}
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
          <p className="truncate text-xs text-slate-500">{idea.description}</p>
        )}
      </div>
      {similarityPercent !== null && (
        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          {similarityPercent}% similar
        </span>
      )}
      {isCanonical && (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
          Keep
        </span>
      )}
    </div>
  );
}

interface ClusterActionsProps {
  selectedCount: number;
  nonCanonicalCount: number;
  isLoading: boolean;
  onDismiss: () => void;
  onMerge: () => void;
}

function ClusterActions({
  selectedCount,
  nonCanonicalCount,
  isLoading,
  onDismiss,
  onMerge,
}: ClusterActionsProps) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3">
      <span className="text-xs text-slate-500">
        {selectedCount > 0
          ? `${selectedCount} of ${nonCanonicalCount} duplicate${nonCanonicalCount > 1 ? "s" : ""} selected`
          : "No duplicates selected"}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onDismiss}
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
          onClick={onMerge}
          disabled={isLoading || selectedCount === 0}
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
  );
}

// --- Main component ---

interface ClusterListProps {
  initialClusters: Cluster[];
}

export function ClusterList({ initialClusters }: ClusterListProps) {
  const [clusters, setClusters] = useState(initialClusters);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(
    new Set(
      initialClusters.length <= 5
        ? initialClusters.map((c) => c.canonicalId)
        : []
    )
  );
  const [loadingClusters, setLoadingClusters] = useState<Set<string>>(
    new Set()
  );
  const [selectedIdeas, setSelectedIdeas] = useState<
    Record<string, Set<string>>
  >(() => {
    const initial: Record<string, Set<string>> = {};
    initialClusters.forEach((cluster) => {
      initial[cluster.canonicalId] = new Set(
        cluster.ideas
          .filter((idea) => idea.id !== cluster.canonicalId)
          .map((idea) => idea.id)
      );
    });
    return initial;
  });

  const toggleExpanded = (clusterId: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(clusterId)) next.delete(clusterId);
      else next.add(clusterId);
      return next;
    });
  };

  const toggleIdeaSelection = (clusterId: string, ideaId: string) => {
    setSelectedIdeas((prev) => {
      const current = new Set(prev[clusterId] ?? []);
      if (current.has(ideaId)) {
        current.delete(ideaId);
      } else {
        current.add(ideaId);
      }
      return { ...prev, [clusterId]: current };
    });
  };

  const toggleSelectAll = (clusterId: string) => {
    const cluster = getCluster(clusters, clusterId);
    if (!cluster) return;
    const nonCanonicalIds = cluster.ideas
      .filter((idea) => idea.id !== cluster.canonicalId)
      .map((idea) => idea.id);
    const currentSelected = selectedIdeas[clusterId] ?? new Set();
    const allSelected = nonCanonicalIds.every((id) => currentSelected.has(id));

    setSelectedIdeas((prev) => ({
      ...prev,
      [clusterId]: allSelected ? new Set() : new Set(nonCanonicalIds),
    }));
  };

  const handleMergeSelected = async (clusterId: string) => {
    const cluster = getCluster(clusters, clusterId);
    if (!cluster) return;

    const selected = selectedIdeas[clusterId] ?? new Set();
    if (selected.size === 0) {
      toast.error("No ideas selected for merge");
      return;
    }

    setLoadingClusters((prev) => new Set(prev).add(clusterId));

    try {
      const pairsToMerge = cluster.pairs.filter((pair) => {
        if (pair.ideaAId === cluster.canonicalId)
          return selected.has(pair.ideaBId);
        if (pair.ideaBId === cluster.canonicalId)
          return selected.has(pair.ideaAId);
        return false;
      });

      const { merged, failed } = await mergePairs(
        pairsToMerge,
        cluster.canonicalId
      );

      if (merged.length === 0) {
        toast.error("Failed to merge any ideas");
        return;
      }

      updateStateAfterMerge(clusterId, cluster, merged);
      showMergeToast(merged.length, failed.length);
    } catch {
      toast.error("Failed to merge ideas");
    } finally {
      setLoadingClusters((prev) => {
        const next = new Set(prev);
        next.delete(clusterId);
        return next;
      });
    }
  };

  const updateStateAfterMerge = (
    clusterId: string,
    cluster: Cluster,
    mergedPairs: ClusterPair[]
  ) => {
    const mergedSuggestionIds = new Set(mergedPairs.map((p) => p.suggestionId));
    const mergedIdeaIds = new Set(
      mergedPairs.map((pair) =>
        pair.ideaAId === cluster.canonicalId ? pair.ideaBId : pair.ideaAId
      )
    );

    const nonCanonicalIds = cluster.ideas
      .filter((i) => i.id !== cluster.canonicalId)
      .map((i) => i.id);
    const allMerged = nonCanonicalIds.every((id) => mergedIdeaIds.has(id));

    if (allMerged) {
      setClusters((prev) => prev.filter((c) => c.canonicalId !== clusterId));
    } else {
      setClusters((prev) =>
        prev.map((c) => {
          if (c.canonicalId !== clusterId) return c;
          return {
            ...c,
            ideas: c.ideas.filter(
              (idea) => idea.id === c.canonicalId || !mergedIdeaIds.has(idea.id)
            ),
            pairs: c.pairs.filter(
              (pair) => !mergedSuggestionIds.has(pair.suggestionId)
            ),
          };
        })
      );
      setSelectedIdeas((prev) => ({
        ...prev,
        [clusterId]: new Set(),
      }));
    }
  };

  const showMergeToast = (mergedCount: number, failedCount: number) => {
    const label = `${mergedCount} idea${mergedCount > 1 ? "s" : ""}`;
    if (failedCount > 0) {
      toast.warning(`Merged ${label}, ${failedCount} failed`);
    } else {
      toast.success(`Merged ${label}`);
    }
  };

  const handleDismissAll = async (clusterId: string) => {
    const cluster = getCluster(clusters, clusterId);
    if (!cluster) return;

    setLoadingClusters((prev) => new Set(prev).add(clusterId));

    try {
      const failedCount = await dismissPairs(cluster.pairs);
      setClusters((prev) => prev.filter((c) => c.canonicalId !== clusterId));

      if (failedCount > 0) {
        toast.warning(
          `Cluster dismissed, but ${failedCount} pair${failedCount > 1 ? "s" : ""} failed`
        );
      } else {
        toast.success("Cluster dismissed");
      }
    } catch {
      toast.error("Failed to dismiss cluster");
    } finally {
      setLoadingClusters((prev) => {
        const next = new Set(prev);
        next.delete(clusterId);
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
      {clusters.map((cluster) => {
        const clusterId = cluster.canonicalId;
        const isExpanded = expandedClusters.has(clusterId);
        const isLoading = loadingClusters.has(clusterId);
        const canonical = cluster.ideas.find(
          (i) => i.id === cluster.canonicalId
        );
        const selected = selectedIdeas[clusterId] ?? new Set();
        const nonCanonicalCount = cluster.ideas.length - 1;
        const allSelected =
          nonCanonicalCount > 0 && selected.size === nonCanonicalCount;

        return (
          <div
            key={clusterId}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            {/* Header */}
            <button
              onClick={() => toggleExpanded(clusterId)}
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
                    onCheckedChange={() => toggleSelectAll(clusterId)}
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
                    const similarityPair = !isCanonical
                      ? cluster.pairs.find(
                          (p) =>
                            (p.ideaAId === idea.id &&
                              p.ideaBId === cluster.canonicalId) ||
                            (p.ideaBId === idea.id &&
                              p.ideaAId === cluster.canonicalId)
                        )
                      : null;
                    const similarityPercent = similarityPair
                      ? Math.round(similarityPair.similarity * 100)
                      : null;

                    return (
                      <ClusterIdeaRow
                        key={idea.id}
                        idea={idea}
                        isCanonical={isCanonical}
                        isSelected={selected.has(idea.id)}
                        isLoading={isLoading}
                        similarityPercent={similarityPercent}
                        onToggleSelection={() =>
                          toggleIdeaSelection(clusterId, idea.id)
                        }
                      />
                    );
                  })}
                </div>

                <ClusterActions
                  selectedCount={selected.size}
                  nonCanonicalCount={nonCanonicalCount}
                  isLoading={isLoading}
                  onDismiss={() => handleDismissAll(clusterId)}
                  onMerge={() => handleMergeSelected(clusterId)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
