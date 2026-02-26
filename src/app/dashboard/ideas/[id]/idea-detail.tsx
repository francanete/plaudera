"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Idea, IdeaStatus, RoadmapStatus } from "@/lib/db/schema";
import {
  IdeaHeader,
  IdeaInternalNote,
  IdeaMeta,
  IdeaMergeDialog,
  IdeaMergedChildren,
  IdeaStatusSection,
  IdeaContentTabs,
  IdeaDangerZone,
  MoveToRoadmapForm,
  DuplicateSuggestionAlert,
  RationaleDialog,
  DecisionTimeline,
} from "./components";
import type { DuplicateSuggestionForView } from "./components";
import type { ConfidenceResult } from "@/lib/confidence";
import type { DecisionTimelineEntry } from "@/lib/idea-queries";
import type { DecisionType } from "@/lib/db/schema";
import { ConfidenceBadge, OutlierWarning } from "../components";
import { IdeaClassification } from "./components/idea-classification";
import { IdeaTagPicker } from "./components/idea-tag-picker";
import { isOnRoadmap } from "@/lib/roadmap-status-config";

interface MergedChild {
  id: string;
  title: string;
}

interface PublishedIdea {
  id: string;
  title: string;
}

interface TagInfo {
  id: string;
  name: string;
  color: string;
}

interface IdeaDetailProps {
  idea: Idea;
  mergedChildren?: MergedChild[];
  publishedIdeas?: PublishedIdea[];
  duplicateSuggestions?: DuplicateSuggestionForView[];
  confidence?: ConfidenceResult;
  decisionTimeline?: DecisionTimelineEntry[];
  assignedTags?: TagInfo[];
  workspaceTags?: TagInfo[];
}

export function IdeaDetail({
  idea: initialIdea,
  mergedChildren = [],
  publishedIdeas = [],
  duplicateSuggestions: initialDupSuggestions = [],
  confidence,
  decisionTimeline: initialTimeline = [],
  assignedTags = [],
  workspaceTags = [],
}: IdeaDetailProps) {
  const router = useRouter();
  const [idea, setIdea] = useState(initialIdea);
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description || "");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  // Rationale dialog state (for governed transitions)
  const [rationaleDialog, setRationaleDialog] = useState<{
    open: boolean;
    decisionType: DecisionType;
    transitionLabel: string;
    pendingStatus?: IdeaStatus;
    showWontBuildReason?: boolean;
  }>({
    open: false,
    decisionType: "declined",
    transitionLabel: "",
  });
  const [isSubmittingRationale, setIsSubmittingRationale] = useState(false);

  // Decision timeline state
  const [timeline, setTimeline] = useState(initialTimeline);

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

  // Problem statement state
  const [problemStatement, setProblemStatement] = useState(
    idea.problemStatement || ""
  );
  const [isSavingProblemStatement, setIsSavingProblemStatement] =
    useState(false);

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
  const problemStatementChanged =
    problemStatement !== (idea.problemStatement || "");
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

  const handleSaveProblemStatement = async () => {
    setIsSavingProblemStatement(true);
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemStatement: problemStatement || null }),
      });
      if (!res.ok) throw new Error();
      setIdea((prev) => ({
        ...prev,
        problemStatement: problemStatement || null,
      }));
      toast.success("Problem statement updated");
    } catch {
      toast.error("Failed to update problem statement");
    } finally {
      setIsSavingProblemStatement(false);
    }
  };

  const handleSaveClassification = async (
    field: string,
    value: string | null
  ) => {
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
      setIdea((prev) => ({ ...prev, [field]: value }));
      toast.success("Classification updated");
    } catch {
      toast.error("Failed to update classification");
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
    // Intercept DECLINED — requires rationale dialog
    if (newStatus === "DECLINED") {
      setRationaleDialog({
        open: true,
        decisionType: "declined",
        transitionLabel: "Decline Idea",
        pendingStatus: "DECLINED",
        showWontBuildReason: true,
      });
      return;
    }

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

  const handleRationaleConfirm = async (
    rationale: string,
    isPublic: boolean,
    wontBuildReason?: string
  ) => {
    setIsSubmittingRationale(true);

    const body: Record<string, unknown> = {
      rationale,
      isPublicRationale: isPublic,
    };

    if (rationaleDialog.pendingStatus) {
      body.status = rationaleDialog.pendingStatus;
    }

    if (wontBuildReason) {
      body.wontBuildReason = wontBuildReason;
    }

    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update");
      }

      const { idea: updatedIdea } = await res.json();

      if (rationaleDialog.pendingStatus === "DECLINED") {
        toast.success("Idea declined");
        router.push("/dashboard/ideas");
        return;
      }

      setIdea((prev) => ({ ...prev, ...updatedIdea }));

      // Refresh timeline
      const timelineRes = await fetch(
        `/api/ideas/${idea.id}/decision-timeline`
      );
      if (timelineRes.ok) {
        const data = await timelineRes.json();
        setTimeline(data.entries);
      }

      toast.success("Decision recorded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save decision"
      );
    } finally {
      setIsSubmittingRationale(false);
      setRationaleDialog((prev) => ({ ...prev, open: false }));
    }
  };

  const handleMoveToRoadmap = async (
    roadmapStatus: RoadmapStatus,
    featureDetails: string,
    rationale: string
  ) => {
    setIsMovingToRoadmap(true);
    try {
      const body: Record<string, string> = { roadmapStatus, rationale };
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

  const handleDeclineClick = () => {
    setRationaleDialog({
      open: true,
      decisionType: "declined",
      transitionLabel: "Decline Idea",
      pendingStatus: "DECLINED",
      showWontBuildReason: true,
    });
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

      {/* Confidence Score */}
      {confidence && (
        <div className="flex items-center gap-2">
          <ConfidenceBadge
            label={confidence.label}
            intraScore={confidence.intraScore}
            signalBreakdown={confidence.signalBreakdown}
            size="md"
          />
          {confidence.concentrationWarning && (
            <OutlierWarning warning={confidence.concentrationWarning} />
          )}
        </div>
      )}

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
        problemStatement={problemStatement}
        onProblemStatementChange={setProblemStatement}
        onSaveProblemStatement={handleSaveProblemStatement}
        isSavingProblemStatement={isSavingProblemStatement}
        hasProblemStatementChanges={problemStatementChanged}
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

      {/* Classification */}
      <IdeaClassification
        frequencyTag={idea.frequencyTag}
        workflowImpact={idea.workflowImpact}
        workflowStage={idea.workflowStage}
        onSave={handleSaveClassification}
      />

      {/* Tags */}
      <IdeaTagPicker
        ideaId={idea.id}
        assignedTags={assignedTags}
        workspaceTags={workspaceTags}
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

      {/* Decision Timeline */}
      {timeline.length > 0 && <DecisionTimeline entries={timeline} />}

      {/* Advanced Actions: Collapsible section for merge/decline */}
      <IdeaDangerZone
        isMerged={idea.status === "MERGED"}
        isOnRoadmap={idea.roadmapStatus !== "NONE"}
        publishedIdeas={publishedIdeas}
        selectedParentId={selectedParentId}
        onParentSelect={setSelectedParentId}
        onMergeClick={() => setShowMergeDialog(true)}
        onDeclineClick={handleDeclineClick}
      />

      {/* Dialogs */}
      <RationaleDialog
        open={rationaleDialog.open}
        onOpenChange={(open) =>
          setRationaleDialog((prev) => ({ ...prev, open }))
        }
        decisionType={rationaleDialog.decisionType}
        transitionLabel={rationaleDialog.transitionLabel}
        onConfirm={handleRationaleConfirm}
        isSubmitting={isSubmittingRationale}
        showWontBuildReason={rationaleDialog.showWontBuildReason}
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
