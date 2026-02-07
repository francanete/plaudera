"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Idea, IdeaStatus, RoadmapStatus } from "@/lib/db/schema";
import {
  IdeaHeader,
  IdeaInternalNote,
  IdeaMeta,
  IdeaDeleteDialog,
  IdeaMergeDialog,
  IdeaMergedChildren,
  IdeaStatusSection,
  IdeaContentTabs,
  IdeaDangerZone,
  MoveToRoadmapForm,
  DuplicateSuggestionAlert,
} from "./components";
import type { DuplicateSuggestionForView } from "./components";
import { isOnRoadmap } from "@/lib/roadmap-status-config";

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
  duplicateSuggestions?: DuplicateSuggestionForView[];
}

export function IdeaDetail({
  idea: initialIdea,
  mergedChildren = [],
  publishedIdeas = [],
  duplicateSuggestions: initialDupSuggestions = [],
}: IdeaDetailProps) {
  const router = useRouter();
  const [idea, setIdea] = useState(initialIdea);
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description || "");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Duplicate suggestion state
  const [dupSuggestions, setDupSuggestions] = useState(initialDupSuggestions);
  const [dupLoadingStates, setDupLoadingStates] = useState<
    Record<string, string>
  >({});
  const [pendingDupMerge, setPendingDupMerge] = useState<{
    suggestionId: string;
    keepIdeaId: string;
    keepIdeaTitle: string;
  } | null>(null);
  const [isDupMerging, setIsDupMerging] = useState(false);

  // Roadmap fields state
  const [internalNote, setInternalNote] = useState(idea.internalNote || "");
  const [publicUpdate, setPublicUpdate] = useState(idea.publicUpdate || "");
  const [isSavingInternalNote, setIsSavingInternalNote] = useState(false);
  const [isSavingPublicUpdate, setIsSavingPublicUpdate] = useState(false);

  // Move to roadmap state
  const [showMoveToRoadmapForm, setShowMoveToRoadmapForm] = useState(false);
  const [isMovingToRoadmap, setIsMovingToRoadmap] = useState(false);

  // Merge state
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [isMerging, setIsMerging] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergedChildrenOpen, setMergedChildrenOpen] = useState(false);

  // Track if fields have changed
  const descriptionChanged = description !== (idea.description || "");
  const internalNoteChanged = internalNote !== (idea.internalNote || "");
  const publicUpdateChanged = publicUpdate !== (idea.publicUpdate || "");

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

      setIdea((prev) => ({ ...prev, title: title.trim() }));
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

      setIdea((prev) => ({ ...prev, description: description || null }));
      toast.success("Description updated");
    } catch {
      toast.error("Failed to update description");
    } finally {
      setIsSavingDescription(false);
    }
  };

  const handleStatusChange = async (newStatus: IdeaStatus) => {
    const previousStatus = idea.status;

    setIdea((prev) => ({ ...prev, status: newStatus }));

    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error();

      toast.success("Status updated");
    } catch {
      setIdea((prev) => ({ ...prev, status: previousStatus }));
      toast.error("Failed to update status");
    }
  };

  const handleMoveToRoadmap = async (
    roadmapStatus: RoadmapStatus,
    featureDetails: string
  ) => {
    setIsMovingToRoadmap(true);
    try {
      const body: Record<string, string> = { roadmapStatus };
      if (featureDetails) {
        body.featureDetails = featureDetails;
      }

      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error();

      toast.success("Idea moved to roadmap");
      router.push(`/dashboard/roadmap/${idea.id}`);
    } catch {
      toast.error("Failed to move idea to roadmap");
      setIsMovingToRoadmap(false);
    }
  };

  const handleSaveInternalNote = async () => {
    setIsSavingInternalNote(true);
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNote: internalNote || null }),
      });

      if (!res.ok) throw new Error();

      setIdea((prev) => ({ ...prev, internalNote: internalNote || null }));
      toast.success("Internal note saved");
    } catch {
      toast.error("Failed to save internal note");
    } finally {
      setIsSavingInternalNote(false);
    }
  };

  const handleSavePublicUpdate = async () => {
    setIsSavingPublicUpdate(true);
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicUpdate: publicUpdate || null }),
      });

      if (!res.ok) throw new Error();

      setIdea((prev) => ({ ...prev, publicUpdate: publicUpdate || null }));
      toast.success("Public update saved");
    } catch {
      toast.error("Failed to save public update");
    } finally {
      setIsSavingPublicUpdate(false);
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

  // Duplicate suggestion handlers
  const handleDupMergeClick = (suggestionId: string, keepIdeaId: string) => {
    const suggestion = dupSuggestions.find(
      (s) => s.suggestionId === suggestionId
    );
    if (!suggestion) return;
    setPendingDupMerge({
      suggestionId,
      keepIdeaId,
      keepIdeaTitle: suggestion.otherIdea.title,
    });
  };

  const handleDupMergeConfirm = async () => {
    if (!pendingDupMerge) return;
    setIsDupMerging(true);

    try {
      const res = await fetch(
        `/api/duplicates/${pendingDupMerge.suggestionId}/merge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keepIdeaId: pendingDupMerge.keepIdeaId }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to merge ideas");
      }

      toast.success("Ideas merged successfully");

      const otherIdea = dupSuggestions.find(
        (s) => s.suggestionId === pendingDupMerge.suggestionId
      )?.otherIdea;

      if (otherIdea && isOnRoadmap(otherIdea.roadmapStatus)) {
        router.push(`/dashboard/roadmap/${otherIdea.id}`);
      } else {
        router.push(`/dashboard/ideas/${pendingDupMerge.keepIdeaId}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to merge ideas"
      );
      setIsDupMerging(false);
      setPendingDupMerge(null);
    }
  };

  const handleDupDismiss = async (suggestionId: string) => {
    setDupLoadingStates((prev) => ({ ...prev, [suggestionId]: "dismiss" }));

    const previousSuggestions = dupSuggestions;
    setDupSuggestions(
      dupSuggestions.filter((s) => s.suggestionId !== suggestionId)
    );

    try {
      const res = await fetch(`/api/duplicates/${suggestionId}/dismiss`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to dismiss suggestion");
      }

      toast.success("Marked as not a duplicate");
    } catch {
      setDupSuggestions(previousSuggestions);
      toast.error("Failed to dismiss suggestion");
    } finally {
      setDupLoadingStates((prev) => {
        const { [suggestionId]: _removed, ...rest } = prev;
        void _removed;
        return rest;
      });
    }
  };

  const selectedParent = publishedIdeas.find((i) => i.id === selectedParentId);

  if (showMoveToRoadmapForm) {
    return (
      <MoveToRoadmapForm
        ideaTitle={idea.title}
        ideaDescription={idea.description}
        onConfirm={handleMoveToRoadmap}
        onCancel={() => setShowMoveToRoadmapForm(false)}
        isMoving={isMovingToRoadmap}
      />
    );
  }

  return (
    <div className="space-y-10">
      {/* Header: Back nav + Title + Merged indicator */}
      <IdeaHeader
        title={title}
        onTitleChange={setTitle}
        onTitleBlur={handleTitleBlur}
        isSavingTitle={isSavingTitle}
        isMerged={idea.status === "MERGED"}
        mergedIntoId={idea.mergedIntoId}
        voteCount={idea.voteCount}
        status={idea.status}
        roadmapStatus={idea.roadmapStatus}
        onMoveToRoadmap={() => setShowMoveToRoadmapForm(true)}
      />

      {/* Status & Visibility Row */}
      <IdeaStatusSection
        status={idea.status}
        roadmapStatus={idea.roadmapStatus}
        onStatusChange={handleStatusChange}
      />

      {/* Duplicate Suggestion Alert */}
      {dupSuggestions.length > 0 && (
        <DuplicateSuggestionAlert
          suggestions={dupSuggestions}
          loadingStates={dupLoadingStates}
          onMerge={handleDupMergeClick}
          onDismiss={handleDupDismiss}
        />
      )}

      {/* Merged Children (if any) */}
      {mergedChildren.length > 0 && (
        <IdeaMergedChildren
          items={mergedChildren}
          isOpen={mergedChildrenOpen}
          onOpenChange={setMergedChildrenOpen}
        />
      )}

      {/* Content Area: Tabs */}
      <IdeaContentTabs
        description={description}
        onDescriptionChange={setDescription}
        onSaveDescription={handleSaveDescription}
        isSavingDescription={isSavingDescription}
        hasDescriptionChanges={descriptionChanged}
        publicUpdate={publicUpdate}
        onPublicUpdateChange={setPublicUpdate}
        onSavePublicUpdate={handleSavePublicUpdate}
        isSavingPublicUpdate={isSavingPublicUpdate}
        hasPublicUpdateChanges={publicUpdateChanged}
      />

      {/* Internal Note (Private zone - visually distinct with dashed border) */}
      <IdeaInternalNote
        note={internalNote}
        onNoteChange={setInternalNote}
        onSave={handleSaveInternalNote}
        isSaving={isSavingInternalNote}
        hasChanges={internalNoteChanged}
      />

      {/* Meta: Created date & Author - horizontal strip */}
      <IdeaMeta createdAt={idea.createdAt} authorEmail={idea.authorEmail} />

      {/* Advanced Actions: Collapsible section for merge/delete */}
      <IdeaDangerZone
        isMerged={idea.status === "MERGED"}
        isOnRoadmap={idea.roadmapStatus !== "NONE"}
        publishedIdeas={publishedIdeas}
        selectedParentId={selectedParentId}
        onParentSelect={setSelectedParentId}
        onMergeClick={() => setShowMergeDialog(true)}
        onDeleteClick={() => setShowDeleteDialog(true)}
      />

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

      {/* Duplicate suggestion merge dialog */}
      <IdeaMergeDialog
        open={!!pendingDupMerge}
        onOpenChange={(open) => {
          if (!open) setPendingDupMerge(null);
        }}
        sourceTitle={idea.title}
        targetTitle={pendingDupMerge?.keepIdeaTitle || ""}
        onConfirm={handleDupMergeConfirm}
        isMerging={isDupMerging}
      />
    </div>
  );
}
