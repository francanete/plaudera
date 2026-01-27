"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Lightbulb } from "lucide-react";
import type { Idea, IdeaStatus } from "@/lib/db/schema";
import { IdeaCard } from "./components";

type ViewMode = "active" | "archive";

interface IdeasListProps {
  initialIdeas: Idea[];
  workspaceSlug: string;
  ideasWithDuplicates?: string[];
}

export function IdeasList({
  initialIdeas,
  workspaceSlug,
  ideasWithDuplicates = [],
}: IdeasListProps) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const duplicateIdeaIds = new Set(ideasWithDuplicates);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("active");

  // Filter and sort ideas by view mode
  const filteredIdeas = ideas
    .filter((idea) => {
      if (viewMode === "active") {
        return idea.status === "PUBLISHED" || idea.status === "UNDER_REVIEW";
      }
      return idea.status === "MERGED" || idea.status === "DECLINED";
    })
    .sort((a, b) => {
      if (viewMode === "active") {
        // PUBLISHED first, then UNDER_REVIEW, each sorted by votes (high to low)
        if (a.status === "PUBLISHED" && b.status !== "PUBLISHED") return -1;
        if (a.status !== "PUBLISHED" && b.status === "PUBLISHED") return 1;
      }
      // Within same status group, sort by vote count descending
      return b.voteCount - a.voteCount;
    });

  const handleCreateIdea = async () => {
    if (!newTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (res.ok) {
        const { idea } = await res.json();
        // Convert date string back to Date object (JSON serialization loses Date type)
        const ideaWithDate = {
          ...idea,
          createdAt: new Date(idea.createdAt),
        };
        setIdeas([ideaWithDate, ...ideas]);
        setNewTitle("");
        setIsCreating(false);
        toast.success("Idea created successfully");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to create idea");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.error("Failed to create idea:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreateIdea();
    }
    if (e.key === "Escape") {
      setIsCreating(false);
      setNewTitle("");
    }
  };

  const handleStatusChange = async (ideaId: string, newStatus: IdeaStatus) => {
    const previousIdeas = ideas;
    // Optimistic update
    setIdeas(
      ideas.map((i) => (i.id === ideaId ? { ...i, status: newStatus } : i))
    );

    try {
      const res = await fetch(`/api/ideas/${ideaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      toast.success("Status updated");
    } catch {
      // Rollback on error
      setIdeas(previousIdeas);
      toast.error("Failed to update status");
    }
  };

  // Empty state
  if (ideas.length === 0 && !isCreating) {
    return (
      <div className="border-border bg-card rounded-xl border-2 border-dashed">
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <div className="mb-4 rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
            <Lightbulb className="h-12 w-12 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-foreground mb-2 text-lg font-semibold">
            No ideas yet
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md text-center">
            Start collecting feature requests and feedback from your users.
            Create your first idea to get started.
          </p>
          <Button
            onClick={() => setIsCreating(true)}
            className="bg-foreground text-background hover:bg-foreground/90 gap-2"
          >
            <Plus className="h-4 w-4" />
            Add your first idea
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      {isCreating ? (
        <div className="border-border bg-card flex flex-1 gap-2 rounded-xl border p-4">
          <Input
            placeholder="What's your idea?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1"
          />
          <Button
            onClick={handleCreateIdea}
            disabled={isSubmitting || !newTitle.trim()}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {isSubmitting ? "Adding..." : "Add"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsCreating(false);
              setNewTitle("");
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value as ViewMode)}
          >
            <TabsList className="bg-muted/50 h-10 gap-1 rounded-lg p-1">
              <TabsTrigger
                value="active"
                className="data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground h-8 rounded-md px-4 text-sm font-medium transition-all duration-200 data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent"
              >
                Active
              </TabsTrigger>
              <TabsTrigger
                value="archive"
                className="data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground h-8 rounded-md px-4 text-sm font-medium transition-all duration-200 data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent"
              >
                Archive
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            onClick={() => setIsCreating(true)}
            className="bg-foreground text-background hover:bg-foreground/90 gap-2"
          >
            <Plus className="h-4 w-4" />
            New idea
          </Button>
        </div>
      )}

      {/* Ideas list */}
      <div className="space-y-5" role="feed" aria-label="Feature requests">
        {filteredIdeas.length === 0 ? (
          <div className="border-border bg-card rounded-xl border-2 border-dashed py-12 text-center">
            <Lightbulb className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
            <p className="text-muted-foreground">
              {viewMode === "active"
                ? "No active ideas yet."
                : "No archived ideas."}
            </p>
          </div>
        ) : (
          filteredIdeas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              hasDuplicate={duplicateIdeaIds.has(idea.id)}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </div>

      {/* Public board link */}
      <div className="border-border bg-muted/30 rounded-xl border px-5 py-4">
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium">Public board:</span>{" "}
          <a
            href={`/b/${workspaceSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-muted hover:bg-muted/80 rounded px-2 py-1 font-mono text-xs transition-colors"
          >
            /b/{workspaceSlug}
          </a>
        </p>
      </div>
    </div>
  );
}
