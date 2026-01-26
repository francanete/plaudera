"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  ChevronUp,
  Lightbulb,
  Copy,
  GitMerge,
  ChevronDown,
  CheckCircle,
  Search,
  XCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Idea, IdeaStatus } from "@/lib/db/schema";
import {
  SELECTABLE_IDEA_STATUSES,
  IDEA_STATUS_CONFIG,
} from "@/lib/idea-status-config";

type ViewMode = "active" | "archive";

interface IdeasListProps {
  initialIdeas: Idea[];
  workspaceSlug: string;
  ideasWithDuplicates?: string[];
}

// Status configuration with semantic colors
const STATUS_STYLES: Record<
  IdeaStatus,
  { bg: string; text: string; iconColor: string }
> = {
  UNDER_REVIEW: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    iconColor: "text-amber-500",
  },
  PUBLISHED: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    iconColor: "text-emerald-500",
  },
  DECLINED: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
    iconColor: "text-red-500",
  },
  MERGED: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    iconColor: "text-slate-500",
  },
};

const STATUS_ICONS: Record<IdeaStatus, typeof CheckCircle> = {
  UNDER_REVIEW: Search,
  PUBLISHED: CheckCircle,
  DECLINED: XCircle,
  MERGED: GitMerge,
};

// Custom dropdown component for status
function StatusBadge({
  status,
  onChange,
  disabled = false,
}: {
  status: IdeaStatus;
  onChange?: (status: IdeaStatus) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const styles = STATUS_STYLES[status];
  const Icon = STATUS_ICONS[status];
  const config = IDEA_STATUS_CONFIG[status];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!disabled) setIsOpen(!isOpen);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelect = (newStatus: IdeaStatus) => {
    onChange?.(newStatus);
    setIsOpen(false);
  };

  if (disabled) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${styles.bg} ${styles.text}`}
      >
        <Icon className={`h-3.5 w-3.5 ${styles.iconColor}`} />
        <span>{config.label}</span>
      </span>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onKeyDown={handleKeyDown}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 ${styles.bg} ${styles.text} focus:ring-primary hover:opacity-80 focus:ring-2 focus:ring-offset-2 focus:outline-none`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Icon className={`h-3.5 w-3.5 ${styles.iconColor}`} />
        <span>{config.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className="border-border bg-popover absolute top-full left-0 z-50 mt-1 w-40 rounded-lg border py-1 shadow-lg"
          role="listbox"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {SELECTABLE_IDEA_STATUSES.map((statusKey) => {
            const itemStyles = STATUS_STYLES[statusKey];
            const ItemIcon = STATUS_ICONS[statusKey];
            const itemConfig = IDEA_STATUS_CONFIG[statusKey];
            return (
              <button
                key={statusKey}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(statusKey);
                }}
                className={`hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${status === statusKey ? "bg-accent" : ""}`}
                role="option"
                aria-selected={status === statusKey}
              >
                <ItemIcon className={`h-4 w-4 ${itemStyles.iconColor}`} />
                <span className={itemStyles.text}>{itemConfig.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Idea card component
function IdeaCard({
  idea,
  hasDuplicate,
  onStatusChange,
}: {
  idea: Idea;
  hasDuplicate: boolean;
  onStatusChange: (ideaId: string, status: IdeaStatus) => void;
}) {
  return (
    <Link href={`/dashboard/ideas/${idea.id}`} className="block">
      <article
        className="group border-border bg-card hover:border-primary/30 flex items-start gap-5 rounded-xl border p-5 transition-all duration-200 hover:shadow-md"
        aria-label={`Feature request: ${idea.title}`}
      >
        {/* Vote Section */}
        <div className="shrink-0">
          <div className="border-border bg-muted/50 group-hover:border-primary/20 group-hover:bg-muted flex h-16 w-14 flex-col items-center justify-center rounded-lg border transition-all duration-150">
            <ChevronUp className="text-muted-foreground group-hover:text-foreground h-4 w-4 transition-colors" />
            <span className="text-foreground text-lg font-semibold">
              {idea.voteCount}
            </span>
            <span className="text-muted-foreground text-xs">votes</span>
          </div>
        </div>

        {/* Content Section */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-foreground truncate text-base font-semibold">
              {idea.title}
            </h3>
            {hasDuplicate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <Copy className="h-3 w-3" />
                      Duplicate?
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Potential duplicate detected. Review in Duplicates page.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {idea.description && (
            <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
              {idea.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <StatusBadge
              status={idea.status}
              onChange={(newStatus) => onStatusChange(idea.id, newStatus)}
              disabled={idea.status === "MERGED"}
            />
            <time
              dateTime={idea.createdAt.toISOString()}
              className="text-muted-foreground text-sm"
            >
              {new Date(idea.createdAt).toLocaleDateString("en-US")}
            </time>
          </div>
        </div>
      </article>
    </Link>
  );
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
