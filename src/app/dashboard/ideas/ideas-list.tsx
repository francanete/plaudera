"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  ChevronUp,
  Lightbulb,
  Clock,
  CheckCircle,
  XCircle,
  PlayCircle,
  Search,
  AlertCircle,
} from "lucide-react";
import type { Idea, IdeaStatus } from "@/lib/db/schema";

interface IdeasListProps {
  initialIdeas: Idea[];
  workspaceSlug: string;
  initialStatusFilter?: IdeaStatus;
}

const statusConfig: Record<
  IdeaStatus,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    icon: typeof Clock;
  }
> = {
  PENDING: { label: "Pending Review", variant: "outline", icon: AlertCircle },
  NEW: { label: "New", variant: "default", icon: Lightbulb },
  UNDER_REVIEW: { label: "Under Review", variant: "secondary", icon: Search },
  PLANNED: { label: "Planned", variant: "outline", icon: Clock },
  IN_PROGRESS: { label: "In Progress", variant: "secondary", icon: PlayCircle },
  DONE: { label: "Done", variant: "default", icon: CheckCircle },
  DECLINED: { label: "Declined", variant: "destructive", icon: XCircle },
};

export function IdeasList({
  initialIdeas,
  workspaceSlug,
  initialStatusFilter,
}: IdeasListProps) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | "ALL">(
    initialStatusFilter || "ALL"
  );

  // Filter ideas by status
  const filteredIdeas =
    statusFilter === "ALL"
      ? ideas
      : ideas.filter((idea) => idea.status === statusFilter);

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
        setIdeas([idea, ...ideas]);
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

  // Status options for the dropdown
  const statusOptions: IdeaStatus[] = [
    "PENDING",
    "NEW",
    "UNDER_REVIEW",
    "PLANNED",
    "IN_PROGRESS",
    "DONE",
    "DECLINED",
  ];

  // Render filter dropdown
  const FilterDropdown = () => (
    <Select
      value={statusFilter}
      onValueChange={(value) => setStatusFilter(value as IdeaStatus | "ALL")}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All statuses</SelectItem>
        {statusOptions.map((opt) => {
          const cfg = statusConfig[opt];
          const Icon = cfg.icon;
          return (
            <SelectItem key={opt} value={opt}>
              <div className="flex items-center">
                <Icon className="mr-2 h-3 w-3" />
                {cfg.label}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );

  if (ideas.length === 0 && !isCreating) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Lightbulb className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">No ideas yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md text-center">
            Start collecting feature requests and feedback from your users.
            Create your first idea to get started.
          </p>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add your first idea
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center justify-between gap-4">
        {/* Create new idea */}
        {isCreating ? (
          <Card className="flex-1">
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <Input
                  placeholder="What's your idea?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <Button
                  onClick={handleCreateIdea}
                  disabled={isSubmitting || !newTitle.trim()}
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
            </CardContent>
          </Card>
        ) : (
          <>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New idea
            </Button>
            <FilterDropdown />
          </>
        )}
      </div>

      {/* Ideas list */}
      <div className="space-y-3">
        {filteredIdeas.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No ideas with {statusFilter !== "ALL" ? `"${statusConfig[statusFilter].label}"` : ""} status.
              </p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => setStatusFilter("ALL")}
              >
                Show all ideas
              </Button>
            </CardContent>
          </Card>
        )}
        {filteredIdeas.map((idea) => {
          const status = statusConfig[idea.status];
          const StatusIcon = status.icon;

          return (
            <Link key={idea.id} href={`/dashboard/ideas/${idea.id}`}>
              <Card className="hover:border-primary/50 cursor-pointer transition-colors">
                <CardContent className="flex items-center gap-4 py-4">
                  {/* Vote count */}
                  <div className="bg-muted/50 flex min-w-[60px] flex-col items-center rounded-lg px-3 py-2">
                    <ChevronUp className="text-muted-foreground h-4 w-4" />
                    <span className="text-lg font-semibold">
                      {idea.voteCount}
                    </span>
                    <span className="text-muted-foreground text-xs">votes</span>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium">{idea.title}</h3>
                    {idea.description && (
                      <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
                        {idea.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {/* Status dropdown - stop propagation to prevent navigation */}
                      <div
                        onClick={(e) => e.preventDefault()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Select
                          value={idea.status}
                          onValueChange={(value) =>
                            handleStatusChange(idea.id, value as IdeaStatus)
                          }
                        >
                          <SelectTrigger className="h-7 w-[140px] text-xs">
                            <StatusIcon className="mr-1 h-3 w-3" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((opt) => {
                              const cfg = statusConfig[opt];
                              const Icon = cfg.icon;
                              return (
                                <SelectItem key={opt} value={opt}>
                                  <div className="flex items-center">
                                    <Icon className="mr-2 h-3 w-3" />
                                    {cfg.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {new Date(idea.createdAt).toLocaleDateString("en-US")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Public board link */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <p className="text-muted-foreground text-sm">
            <span className="font-medium">Public board:</span>{" "}
            <a
              href={`/b/${workspaceSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-muted hover:bg-muted/80 rounded px-2 py-1 font-mono text-xs transition-colors"
            >
              /b/{workspaceSlug}
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
