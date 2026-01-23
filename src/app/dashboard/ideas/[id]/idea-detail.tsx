"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  GitMerge,
  Trash2,
} from "lucide-react";
import type { Idea, IdeaStatus } from "@/lib/db/schema";
import {
  SELECTABLE_IDEA_STATUSES,
  IDEA_STATUS_CONFIG,
} from "@/lib/idea-status-config";

interface MergedChild {
  id: string;
  title: string;
}

interface PublishedIdea {
  id: string;
  title: string;
}

interface IdeaDetailProps {
  idea: Idea;
  mergedChildren?: MergedChild[];
  publishedIdeas?: PublishedIdea[];
}

export function IdeaDetail({
  idea: initialIdea,
  mergedChildren = [],
  publishedIdeas = [],
}: IdeaDetailProps) {
  const router = useRouter();
  const [idea, setIdea] = useState(initialIdea);
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description || "");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Merge state
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [isMerging, setIsMerging] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergedChildrenOpen, setMergedChildrenOpen] = useState(false);

  // Track if description has changed
  const descriptionChanged = description !== (idea.description || "");

  const handleTitleBlur = async () => {
    if (title === idea.title || !title.trim()) {
      setTitle(idea.title); // Reset if empty
      return;
    }

    setIsSavingTitle(true);
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (!res.ok) throw new Error();

      setIdea({ ...idea, title: title.trim() });
      toast.success("Title updated");
    } catch {
      setTitle(idea.title); // Reset on error
      toast.error("Failed to update title");
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleSaveDescription = async () => {
    setIsSavingDescription(true);
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description || null }),
      });

      if (!res.ok) throw new Error();

      setIdea({ ...idea, description: description || null });
      toast.success("Description updated");
    } catch {
      toast.error("Failed to update description");
    } finally {
      setIsSavingDescription(false);
    }
  };

  const handleStatusChange = async (newStatus: IdeaStatus) => {
    const previousStatus = idea.status;
    setIdea({ ...idea, status: newStatus });

    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error();

      toast.success("Status updated");
    } catch {
      setIdea({ ...idea, status: previousStatus });
      toast.error("Failed to update status");
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      toast.success("Idea deleted");
      router.push("/dashboard/ideas");
    } catch {
      toast.error("Failed to delete idea");
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleMergeConfirm = async () => {
    setIsMerging(true);
    try {
      const res = await fetch(`/api/ideas/${idea.id}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentIdeaId: selectedParentId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to merge idea");
      }

      toast.success("Idea merged successfully");
      router.push(`/dashboard/ideas/${selectedParentId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to merge idea"
      );
      setIsMerging(false);
      setShowMergeDialog(false);
    }
  };

  const StatusIcon = IDEA_STATUS_CONFIG[idea.status].icon;
  const selectedParent = publishedIdeas.find((i) => i.id === selectedParentId);

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        href="/dashboard/ideas"
        className="text-muted-foreground hover:text-foreground inline-flex items-center text-sm transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Ideas
      </Link>

      {/* Main content */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          {/* Editable title */}
          <div className="flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              disabled={isSavingTitle}
              className="hover:border-input focus:border-input border-transparent bg-transparent text-2xl font-bold"
              placeholder="Idea title"
            />
          </div>

          {/* Vote count */}
          <div className="bg-muted/50 flex flex-col items-center rounded-lg px-4 py-2">
            <ChevronUp className="text-muted-foreground h-5 w-5" />
            <span className="text-2xl font-bold">{idea.voteCount}</span>
            <span className="text-muted-foreground text-xs">votes</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Merged children display */}
          {mergedChildren.length > 0 && (
            <Collapsible
              open={mergedChildrenOpen}
              onOpenChange={setMergedChildrenOpen}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <GitMerge className="h-4 w-4" />
                  <Badge variant="secondary">
                    {mergedChildren.length} idea
                    {mergedChildren.length > 1 ? "s" : ""} merged into this
                  </Badge>
                  {mergedChildrenOpen ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-1 pl-6">
                {mergedChildren.map((child) => (
                  <Link
                    key={child.id}
                    href={`/dashboard/ideas/${child.id}`}
                    className="text-muted-foreground hover:text-foreground block text-sm transition-colors"
                  >
                    &bull; {child.title}
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Editable description */}
          <div className="space-y-2">
            <label className="text-muted-foreground text-sm font-medium">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={4}
              className="resize-none"
            />
            {descriptionChanged && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveDescription}
                  disabled={isSavingDescription}
                >
                  {isSavingDescription ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>

          <hr className="border-border" />

          {/* Status */}
          <div className="flex items-center gap-4">
            <label className="text-muted-foreground text-sm font-medium">
              Status
            </label>
            {idea.status === "MERGED" ? (
              <Badge variant="secondary" className="gap-1.5">
                <GitMerge className="h-3.5 w-3.5" />
                Merged
              </Badge>
            ) : (
              <Select value={idea.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]">
                  <StatusIcon className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SELECTABLE_IDEA_STATUSES.map((opt) => {
                    const cfg = IDEA_STATUS_CONFIG[opt];
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={opt} value={opt}>
                        <div className="flex items-center">
                          <Icon className="mr-2 h-4 w-4" />
                          {cfg.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          <hr className="border-border" />

          {/* Metadata */}
          <div className="text-muted-foreground space-y-2 text-sm">
            <p>
              <span className="font-medium">Submitted:</span>{" "}
              {new Date(idea.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            {idea.authorEmail && (
              <p>
                <span className="font-medium">By:</span> {idea.authorEmail}
              </p>
            )}
          </div>

          <hr className="border-border" />

          {/* Delete */}
          <div className="flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Idea
            </Button>
          </div>

          {/* Merge section - only show if idea is not already merged */}
          {idea.status !== "MERGED" && publishedIdeas.length > 0 && (
            <>
              <hr className="border-border" />
              <div className="space-y-3">
                <label className="text-muted-foreground text-sm font-medium">
                  Merge This Idea
                </label>
                <p className="text-muted-foreground text-xs">
                  Merge this idea into another published idea. Votes will be
                  transferred to the parent. This action is permanent.
                </p>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedParentId}
                    onValueChange={setSelectedParentId}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select parent idea..." />
                    </SelectTrigger>
                    <SelectContent>
                      {publishedIdeas.map((publishedIdea) => (
                        <SelectItem
                          key={publishedIdea.id}
                          value={publishedIdea.id}
                        >
                          {publishedIdea.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!selectedParentId}
                    onClick={() => setShowMergeDialog(true)}
                  >
                    <GitMerge className="mr-2 h-4 w-4" />
                    Merge
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Idea</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{idea.title}&rdquo;? This
              action cannot be undone and will remove all associated votes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Confirmation Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Idea</DialogTitle>
            <DialogDescription asChild>
              <div className="text-muted-foreground text-sm">
                <p>
                  Are you sure you want to merge &ldquo;{idea.title}&rdquo; into
                  &ldquo;{selectedParent?.title}&rdquo;?
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>All votes will be transferred to the parent idea</li>
                  <li>This idea will be hidden from the public board</li>
                  <li>There is no way to undo this operation</li>
                </ul>
                <p className="mt-2 font-medium">
                  This action cannot be reverted.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMergeDialog(false)}
              disabled={isMerging}
            >
              Cancel
            </Button>
            <Button onClick={handleMergeConfirm} disabled={isMerging}>
              {isMerging ? "Merging..." : "Confirm Merge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
