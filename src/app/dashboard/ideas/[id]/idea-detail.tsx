"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Idea, IdeaStatus } from "@/lib/db/schema";
import {
  IdeaHeader,
  IdeaVoteBox,
  IdeaStatus as IdeaStatusSelector,
  IdeaDescription,
  IdeaMeta,
  IdeaMergeSection,
  IdeaDeleteDialog,
  IdeaMergeDialog,
  IdeaMergedChildren,
} from "./components";

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

  const selectedParent = publishedIdeas.find((i) => i.id === selectedParentId);

  return (
    <div className="space-y-8">
      {/* Header: Back nav + Title + Merged indicator */}
      <IdeaHeader
        title={title}
        onTitleChange={setTitle}
        onTitleBlur={handleTitleBlur}
        isSavingTitle={isSavingTitle}
        isMerged={idea.status === "MERGED"}
        mergedIntoId={idea.mergedIntoId}
      />

      {/* Main Card */}
      <Card className="border-slate-200/60 shadow-sm">
        <div className="space-y-8 p-6">
          {/* Title row with Vote Box */}
          <div className="flex items-start gap-6">
            <div className="flex-1 space-y-4">
              {/* Merged children collapsible */}
              <IdeaMergedChildren
                items={mergedChildren}
                isOpen={mergedChildrenOpen}
                onOpenChange={setMergedChildrenOpen}
              />
            </div>
            <IdeaVoteBox voteCount={idea.voteCount} />
          </div>

          {/* Description */}
          <IdeaDescription
            description={description}
            onDescriptionChange={setDescription}
            onSave={handleSaveDescription}
            isSaving={isSavingDescription}
            hasChanges={descriptionChanged}
          />

          <Separator className="bg-slate-100" />

          {/* Status */}
          <IdeaStatusSelector
            status={idea.status}
            onStatusChange={handleStatusChange}
          />

          <Separator className="bg-slate-100" />

          {/* Meta + Delete */}
          <IdeaMeta
            createdAt={idea.createdAt}
            authorEmail={idea.authorEmail}
            onDeleteClick={() => setShowDeleteDialog(true)}
          />

          {/* Merge section - only show if idea is not already merged */}
          {idea.status !== "MERGED" && publishedIdeas.length > 0 && (
            <>
              <Separator className="bg-slate-100" />
              <IdeaMergeSection
                publishedIdeas={publishedIdeas}
                selectedParentId={selectedParentId}
                onParentSelect={setSelectedParentId}
                onMergeClick={() => setShowMergeDialog(true)}
              />
            </>
          )}
        </div>
      </Card>

      {/* Dialogs */}
      <IdeaDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        ideaTitle={idea.title}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      <IdeaMergeDialog
        open={showMergeDialog}
        onOpenChange={setShowMergeDialog}
        sourceTitle={idea.title}
        targetTitle={selectedParent?.title || ""}
        onConfirm={handleMergeConfirm}
        isMerging={isMerging}
      />
    </div>
  );
}
