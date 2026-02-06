"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Lightbulb } from "lucide-react";
import type { Idea, IdeaStatus } from "@/lib/db/schema";
import {
  ALL_IDEA_STATUSES,
  IDEA_STATUS_CONFIG,
} from "@/lib/idea-status-config";
import { IdeaCard, IdeasStatsBar, IdeasToolbar } from "./components";
import type { SortOption } from "./components";

type TabValue = "all" | IdeaStatus;

interface IdeasListProps {
  initialIdeas: Idea[];
  workspaceSlug: string;
  ideasWithDuplicates?: string[];
  defaultCreating?: boolean;
}

export function IdeasList({
  initialIdeas,
  workspaceSlug,
  ideasWithDuplicates = [],
  defaultCreating = false,
}: IdeasListProps) {
  const router = useRouter();
  const [ideas, setIdeas] = useState(initialIdeas);
  const duplicateIdeaIds = new Set(ideasWithDuplicates);
  const [isCreating, setIsCreating] = useState(defaultCreating);
  const [newTitle, setNewTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("votes");

  // Count ideas per status for tab badges
  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: ideas.length };
    for (const status of ALL_IDEA_STATUSES) {
      counts[status] = ideas.filter((idea) => idea.status === status).length;
    }
    return counts;
  }, [ideas]);

  // Filtering pipeline: tab → search → sort
  const displayedIdeas = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();

    return ideas
      .filter((idea) => {
        // Tab filter
        if (activeTab !== "all" && idea.status !== activeTab) return false;
        // Search filter
        if (lowerSearch) {
          const titleMatch = idea.title.toLowerCase().includes(lowerSearch);
          const descMatch = idea.description
            ?.toLowerCase()
            .includes(lowerSearch);
          if (!titleMatch && !descMatch) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest")
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        if (sortBy === "oldest")
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        // Default: most votes
        return b.voteCount - a.voteCount;
      });
  }, [ideas, activeTab, searchTerm, sortBy]);

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
        const ideaWithDate = {
          ...idea,
          createdAt: new Date(idea.createdAt),
        };
        setIdeas([ideaWithDate, ...ideas]);
        setNewTitle("");
        setIsCreating(false);
        router.replace("/dashboard/ideas");
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
      setIdeas(previousIdeas);
      toast.error("Failed to update status");
    }
  };

  // Global empty state (no ideas at all)
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

  // Build context-aware empty state for filtered results
  const renderFilteredEmptyState = () => {
    if (searchTerm) {
      return (
        <div className="border-border bg-card rounded-xl border-2 border-dashed py-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Lightbulb className="h-6 w-6 text-slate-500 dark:text-slate-400" />
          </div>
          <h3 className="text-foreground mb-1 font-semibold">
            No matching ideas
          </h3>
          <p className="text-muted-foreground text-sm">
            Try adjusting your search term
          </p>
        </div>
      );
    }

    const statusConfig =
      activeTab !== "all" ? IDEA_STATUS_CONFIG[activeTab] : null;
    const StatusIcon = statusConfig?.icon ?? Lightbulb;

    const emptyMessages: Record<string, { heading: string; body: string }> = {
      all: {
        heading: "No ideas yet",
        body: "Create your first idea to get started.",
      },
      UNDER_REVIEW: {
        heading: "No ideas under review",
        body: "Ideas submitted by contributors will appear here for review.",
      },
      PUBLISHED: {
        heading: "No published ideas",
        body: "Publish ideas to make them visible on your public board.",
      },
      DECLINED: {
        heading: "No declined ideas",
        body: "Ideas you decline will appear here.",
      },
      MERGED: {
        heading: "No merged ideas",
        body: "Duplicate ideas that have been merged will appear here.",
      },
    };

    const message = emptyMessages[activeTab] ?? emptyMessages.all;

    return (
      <div className="border-border bg-card rounded-xl border-2 border-dashed py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <StatusIcon className="h-6 w-6 text-slate-500 dark:text-slate-400" />
        </div>
        <h3 className="text-foreground mb-1 font-semibold">
          {message.heading}
        </h3>
        <p className="text-muted-foreground text-sm">{message.body}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Creation input (always above everything when active) */}
      {isCreating && (
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
              router.replace("/dashboard/ideas");
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Stats bar */}
      <IdeasStatsBar ideas={ideas} />

      {/* Status filter — dropdown on mobile, tabs on desktop */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
      >
        {/* Mobile: Select dropdown */}
        <div className="block sm:hidden">
          <Select
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TabValue)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({countByStatus.all})</SelectItem>
              {ALL_IDEA_STATUSES.map((status) => {
                const config = IDEA_STATUS_CONFIG[status];
                return (
                  <SelectItem key={status} value={status}>
                    {config.label} ({countByStatus[status]})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Horizontal tabs */}
        <div className="hidden sm:block">
          <TabsList>
            <TabsTrigger value="all">
              All
              <span className="bg-foreground/10 ml-1 rounded-full px-1.5 py-0.5 text-xs tabular-nums">
                {countByStatus.all}
              </span>
            </TabsTrigger>
            {ALL_IDEA_STATUSES.map((status) => {
              const config = IDEA_STATUS_CONFIG[status];
              return (
                <TabsTrigger key={status} value={status}>
                  {config.label}
                  <span className="bg-foreground/10 ml-1 rounded-full px-1.5 py-0.5 text-xs tabular-nums">
                    {countByStatus[status]}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </Tabs>

      {/* Search + sort toolbar */}
      <IdeasToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Ideas list */}
      <div className="space-y-5" role="feed" aria-label="Feature requests">
        {displayedIdeas.length === 0
          ? renderFilteredEmptyState()
          : displayedIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                hasDuplicate={duplicateIdeaIds.has(idea.id)}
                onStatusChange={handleStatusChange}
              />
            ))}
      </div>
    </div>
  );
}
