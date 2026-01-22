"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ChevronUp, Check, X, Loader2 } from "lucide-react";
import type { DuplicateSuggestion, Idea } from "@/lib/db/schema";

type IdeaPreview = Pick<
  Idea,
  "id" | "title" | "description" | "status" | "voteCount" | "createdAt"
>;

type SuggestionWithIdeas = DuplicateSuggestion & {
  sourceIdea: IdeaPreview;
  duplicateIdea: IdeaPreview;
};

interface DuplicatesListProps {
  initialSuggestions: SuggestionWithIdeas[];
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
        void _removed; // Silence unused variable warning
        return rest;
      }
      return { ...prev, [id]: action };
    });
  };

  const handleMerge = async (suggestionId: string, keepIdeaId: string) => {
    setLoading(suggestionId, "merge");

    // Optimistic update - remove from list
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
      // Rollback on error
      setSuggestions(previousSuggestions);
      toast.error("Failed to merge ideas");
    } finally {
      setLoading(suggestionId, null);
    }
  };

  const handleDismiss = async (suggestionId: string) => {
    setLoading(suggestionId, "dismiss");

    // Optimistic update - remove from list
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
      // Rollback on error
      setSuggestions(previousSuggestions);
      toast.error("Failed to dismiss suggestion");
    } finally {
      setLoading(suggestionId, null);
    }
  };

  if (suggestions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Copy className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">No duplicates detected</h3>
          <p className="text-muted-foreground mb-6 max-w-md text-center">
            Our AI scans your ideas daily to find potential duplicates.
            Detection runs at 3 AM UTC for workspaces with 5+ ideas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {suggestions.map((suggestion) => {
        const isLoading = !!loadingStates[suggestion.id];
        const loadingAction = loadingStates[suggestion.id];

        return (
          <Card key={suggestion.id}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Potential Duplicate</CardTitle>
                <Badge variant="secondary">
                  {suggestion.similarity}% similar
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Side-by-side comparison */}
              <div className="grid gap-4 md:grid-cols-2">
                <IdeaCard
                  idea={suggestion.sourceIdea}
                  label="Original"
                  onKeep={() => handleMerge(suggestion.id, suggestion.sourceIdea.id)}
                  isLoading={isLoading}
                  isKeeping={loadingAction === "merge"}
                />
                <IdeaCard
                  idea={suggestion.duplicateIdea}
                  label="Potential Duplicate"
                  onKeep={() => handleMerge(suggestion.id, suggestion.duplicateIdea.id)}
                  isLoading={isLoading}
                  isKeeping={loadingAction === "merge"}
                />
              </div>

              {/* Dismiss button */}
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => handleDismiss(suggestion.id)}
                  disabled={isLoading}
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface IdeaCardProps {
  idea: IdeaPreview;
  label: string;
  onKeep: () => void;
  isLoading: boolean;
  isKeeping: boolean;
}

function IdeaCard({ idea, label, onKeep, isLoading, isKeeping }: IdeaCardProps) {
  return (
    <div className="bg-muted/30 rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium uppercase">
          {label}
        </span>
        <div className="bg-muted flex items-center gap-1 rounded px-2 py-1">
          <ChevronUp className="text-muted-foreground h-3 w-3" />
          <span className="text-sm font-medium">{idea.voteCount}</span>
        </div>
      </div>
      <h4 className="mb-1 font-medium">{idea.title}</h4>
      {idea.description && (
        <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
          {idea.description}
        </p>
      )}
      <div className="mb-3 flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">
          {new Date(idea.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
      <Button
        size="sm"
        className="w-full"
        onClick={onKeep}
        disabled={isLoading}
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
