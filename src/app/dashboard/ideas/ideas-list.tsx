"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  ChevronUp,
  Lightbulb,
  Clock,
  CheckCircle,
  XCircle,
  PlayCircle,
  Search,
} from "lucide-react";
import type { Idea, IdeaStatus } from "@/lib/db/schema";

interface IdeasListProps {
  initialIdeas: Idea[];
  workspaceSlug: string;
}

const statusConfig: Record<
  IdeaStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Clock }
> = {
  NEW: { label: "New", variant: "default", icon: Lightbulb },
  UNDER_REVIEW: { label: "Under Review", variant: "secondary", icon: Search },
  PLANNED: { label: "Planned", variant: "outline", icon: Clock },
  IN_PROGRESS: { label: "In Progress", variant: "secondary", icon: PlayCircle },
  DONE: { label: "Done", variant: "default", icon: CheckCircle },
  DECLINED: { label: "Declined", variant: "destructive", icon: XCircle },
};

export function IdeasList({ initialIdeas, workspaceSlug }: IdeasListProps) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      }
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

  if (ideas.length === 0 && !isCreating) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No ideas yet</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Start collecting feature requests and feedback from your users.
            Create your first idea to get started.
          </p>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add your first idea
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create new idea */}
      {isCreating ? (
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Input
                placeholder="What's your idea?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <Button onClick={handleCreateIdea} disabled={isSubmitting || !newTitle.trim()}>
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
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New idea
        </Button>
      )}

      {/* Ideas list */}
      <div className="space-y-3">
        {ideas.map((idea) => {
          const status = statusConfig[idea.status];
          const StatusIcon = status.icon;

          return (
            <Card key={idea.id} className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 py-4">
                {/* Vote count */}
                <div className="flex flex-col items-center min-w-[60px] py-2 px-3 rounded-lg bg-muted/50">
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-semibold">{idea.voteCount}</span>
                  <span className="text-xs text-muted-foreground">votes</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{idea.title}</h3>
                  {idea.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {idea.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={status.variant} className="text-xs">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(idea.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Public board link */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Public board:</span>{" "}
            <code className="bg-muted px-2 py-1 rounded text-xs">
              /b/{workspaceSlug}
            </code>
            <span className="ml-2">(Coming soon)</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
