"use client";

import { useState, useEffect } from "react";
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

interface StatusChange {
  id: string;
  fromStatus: RoadmapStatus;
  toStatus: RoadmapStatus;
  changedAt: string;
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

  // Roadmap fields state
  const [internalNote, setInternalNote] = useState(idea.internalNote || "");
  const [publicUpdate, setPublicUpdate] = useState(idea.publicUpdate || "");
  const [featureDetails, setFeatureDetails] = useState(
    idea.featureDetails || ""
  );
  const [isSavingInternalNote, setIsSavingInternalNote] = useState(false);
  const [isSavingPublicUpdate, setIsSavingPublicUpdate] = useState(false);
  const [isSavingFeatureDetails, setIsSavingFeatureDetails] = useState(false);
  const [roadmapHistory, setRoadmapHistory] = useState<StatusChange[]>([]);

  // Merge state
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [isMerging, setIsMerging] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergedChildrenOpen, setMergedChildrenOpen] = useState(false);

  // Track if fields have changed
  const descriptionChanged = description !== (idea.description || "");
  const internalNoteChanged = internalNote !== (idea.internalNote || "");
  const publicUpdateChanged = publicUpdate !== (idea.publicUpdate || "");
  const featureDetailsChanged = featureDetails !== (idea.featureDetails || "");

  // Fetch roadmap history on mount
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/ideas/${idea.id}/roadmap-history`);
        if (res.ok) {
          const data = await res.json();
          setRoadmapHistory(data.changes);
        }
      } catch {
        // Silently fail - history is not critical
      }
    }
    fetchHistory();
  }, [idea.id]);

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
    const previousRoadmapStatus = idea.roadmapStatus;

    // Optimistically update - also reset roadmap status if declining
    const updatedIdea = { ...idea, status: newStatus };
    if (newStatus === "DECLINED" && idea.roadmapStatus !== "NONE") {
      updatedIdea.roadmapStatus = "NONE";
    }
    setIdea(updatedIdea);

    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error();

      // Refresh history if roadmap status changed
      if (newStatus === "DECLINED" && previousRoadmapStatus !== "NONE") {
        const historyRes = await fetch(`/api/ideas/${idea.id}/roadmap-history`);
        if (historyRes.ok) {
          const data = await historyRes.json();
          setRoadmapHistory(data.changes);
        }
      }

      toast.success("Status updated");
    } catch {
      setIdea({
        ...idea,
        status: previousStatus,
        roadmapStatus: previousRoadmapStatus,
      });
      toast.error("Failed to update status");
    }
  };

  const handleRoadmapStatusChange = async (newStatus: RoadmapStatus) => {
    const previousStatus = idea.roadmapStatus;
    setIdea({ ...idea, roadmapStatus: newStatus });

    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roadmapStatus: newStatus }),
      });

      if (!res.ok) throw new Error();

      // Refresh history
      const historyRes = await fetch(`/api/ideas/${idea.id}/roadmap-history`);
      if (historyRes.ok) {
        const data = await historyRes.json();
        setRoadmapHistory(data.changes);
      }

      toast.success("Roadmap status updated");
    } catch {
      setIdea({ ...idea, roadmapStatus: previousStatus });
      toast.error("Failed to update roadmap status");
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

      setIdea({ ...idea, internalNote: internalNote || null });
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

      setIdea({ ...idea, publicUpdate: publicUpdate || null });
      toast.success("Public update saved");
    } catch {
      toast.error("Failed to save public update");
    } finally {
      setIsSavingPublicUpdate(false);
    }
  };

  const handleSaveFeatureDetails = async () => {
    setIsSavingFeatureDetails(true);
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureDetails: featureDetails || null }),
      });

      if (!res.ok) throw new Error();

      setIdea({ ...idea, featureDetails: featureDetails || null });
      toast.success("Feature details saved");
    } catch {
      toast.error("Failed to save feature details");
    } finally {
      setIsSavingFeatureDetails(false);
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
    <div className="max-w-5xl space-y-10 py-8">
      {/* Header: Back nav + Title + Merged indicator */}
      <IdeaHeader
        title={title}
        onTitleChange={setTitle}
        onTitleBlur={handleTitleBlur}
        isSavingTitle={isSavingTitle}
        isMerged={idea.status === "MERGED"}
        mergedIntoId={idea.mergedIntoId}
      />

      {/* Status & Visibility Row */}
      <IdeaStatusSection
        status={idea.status}
        roadmapStatus={idea.roadmapStatus}
        voteCount={idea.voteCount}
        onStatusChange={handleStatusChange}
        onRoadmapStatusChange={handleRoadmapStatusChange}
        roadmapHistory={roadmapHistory}
      />

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
        featureDetails={featureDetails}
        onFeatureDetailsChange={setFeatureDetails}
        onSaveFeatureDetails={handleSaveFeatureDetails}
        isSavingFeatureDetails={isSavingFeatureDetails}
        hasFeatureDetailsChanges={featureDetailsChanged}
        roadmapStatus={idea.roadmapStatus}
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
    </div>
  );
}
