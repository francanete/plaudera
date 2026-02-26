"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

  const toggleExpanded = (index: number) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleMergeAll = async (clusterIndex: number) => {
    const cluster = clusters[clusterIndex];
    if (!cluster) return;

    setLoadingClusters((prev) => new Set(prev).add(clusterIndex));

    try {
      // Merge all non-canonical ideas into canonical, using the suggestion pairs
      for (const pair of cluster.pairs) {
        const keepId = cluster.canonicalId;
        try {
          const res = await fetch(
            `/api/duplicates/${pair.suggestionId}/merge`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ keepIdeaId: keepId }),
            }
          );
          // 404 = already processed (auto-dismissed by a previous merge in the chain)
          if (!res.ok && res.status !== 404) {
            const data = await res.json().catch(() => ({}));
            // Skip already-processed suggestions
            if (data.error?.includes("already been processed")) continue;
            console.error(`Failed to merge pair ${pair.suggestionId}:`, data);
          }
        } catch {
          // Continue with remaining pairs
        }
      }

      setClusters((prev) => prev.filter((_, i) => i !== clusterIndex));
      toast.success(
        `Merged ${cluster.ideas.length - 1} ideas into "${cluster.ideas.find((i) => i.id === cluster.canonicalId)?.title}"`
      );
    } catch {
      toast.error("Failed to merge cluster");
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
            No clusters found
          </h3>
          <p className="max-w-md text-center text-slate-500">
            When multiple duplicate pairs are connected, they form clusters for
            bulk review.
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
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  {cluster.pairs.length} pairs
                </span>
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-slate-100">
                <div className="divide-y divide-slate-100">
                  {cluster.ideas.map((idea) => {
                    const isCanonical = idea.id === cluster.canonicalId;
                    return (
                      <div
                        key={idea.id}
                        className={cn(
                          "flex items-center gap-4 px-5 py-3",
                          isCanonical && "bg-indigo-50/50"
                        )}
                      >
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
                          <span className="flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            <Crown className="h-3 w-3" />
                            Keep
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
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
                    Ignore Cluster
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleMergeAll(index)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Merge className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Merge All into Canonical
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
