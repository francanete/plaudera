"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  MessageCircleQuestion,
  ArrowUp,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IdeaSubmissionData {
  title: string;
  problemStatement: string;
  description?: string;
  frequencyTag?: string;
  workflowImpact?: string;
  workflowStage?: string;
}

export interface SubmitResult {
  ideaId: string;
}

interface SimilarIdeaSuggestion {
  ideaId: string;
  title: string;
  voteCount: number;
  similarity: number;
}

type SubmissionType = "idea" | "poll";

interface IdeaSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: IdeaSubmissionData) => Promise<SubmitResult | void>;
  workspaceId?: string;
  activePoll?: { id: string; question: string } | null;
  onPollResponse?: (response: string) => Promise<void>;
  defaultType?: SubmissionType;
  onVoteForIdea?: (ideaId: string) => Promise<void>;
}

export function IdeaSubmissionDialog({
  open,
  onOpenChange,
  onSubmit,
  workspaceId,
  activePoll,
  onPollResponse,
  defaultType,
  onVoteForIdea,
}: IdeaSubmissionDialogProps) {
  const [submissionType, setSubmissionType] = useState<SubmissionType>(
    defaultType ?? "idea"
  );

  useEffect(() => {
    if (defaultType) setSubmissionType(defaultType);
  }, [defaultType]);

  const [title, setTitle] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [description, setDescription] = useState("");
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [frequencyTag, setFrequencyTag] = useState("");
  const [workflowImpact, setWorkflowImpact] = useState("");
  const [workflowStage, setWorkflowStage] = useState("");
  const [pollResponse, setPollResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [similarIdeas, setSimilarIdeas] = useState<SimilarIdeaSuggestion[]>([]);
  const [showSimilarPanel, setShowSimilarPanel] = useState(false);
  const [isCheckingSimilar, setIsCheckingSimilar] = useState(false);
  const [submittedIdeaId, setSubmittedIdeaId] = useState<string | null>(null);

  const hasPoll = activePoll && onPollResponse;

  const resetFields = useCallback(() => {
    setTitle("");
    setProblemStatement("");
    setDescription("");
    setShowMoreDetails(false);
    setFrequencyTag("");
    setWorkflowImpact("");
    setWorkflowStage("");
    setPollResponse("");
    setError("");
    setSimilarIdeas([]);
    setShowSimilarPanel(false);
    setIsCheckingSimilar(false);
    setSubmittedIdeaId(null);
    if (!defaultType) {
      setSubmissionType("idea");
    }
  }, [defaultType]);

  const pollForSimilarIdeas = useCallback(
    async (ideaId: string, wsId: string) => {
      setIsCheckingSimilar(true);
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise((r) => setTimeout(r, 1000));
        try {
          const res = await fetch(
            `/api/public/${wsId}/ideas/${ideaId}/similar`
          );
          if (!res.ok) continue;
          const data = await res.json();
          if (data.status === "ready") {
            if (data.similarIdeas?.length > 0) {
              setSimilarIdeas(data.similarIdeas);
              setShowSimilarPanel(true);
              setIsCheckingSimilar(false);
              return;
            }
            // No similar ideas found — close the dialog
            setIsCheckingSimilar(false);
            resetFields();
            onOpenChange(false);
            return;
          }
          if (data.status === "failed") break;
        } catch {
          // continue retrying
        }
      }
      // Exhausted retries or failed — close the dialog since the idea was already created
      setIsCheckingSimilar(false);
      resetFields();
      onOpenChange(false);
    },
    [resetFields, onOpenChange]
  );

  const handleRecordDedupeEvent = useCallback(
    async (
      eventType: "accepted" | "dismissed",
      relatedIdeaId: string,
      similarity?: number
    ) => {
      if (!workspaceId || !submittedIdeaId) return;
      fetch(
        `/api/public/${workspaceId}/ideas/${submittedIdeaId}/dedupe-event`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType, relatedIdeaId, similarity }),
        }
      ).catch(() => {});
    },
    [workspaceId, submittedIdeaId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isCheckingSimilar) return;

    // Validate before setting loading state
    if (submissionType === "poll" && hasPoll) {
      if (!pollResponse.trim()) return;
    } else {
      if (!title.trim() || !problemStatement.trim()) return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (submissionType === "poll" && hasPoll) {
        await onPollResponse(pollResponse.trim());
        resetFields();
        onOpenChange(false);
      } else {
        const result = await onSubmit({
          title: title.trim(),
          problemStatement: problemStatement.trim(),
          description: description.trim() || undefined,
          frequencyTag: frequencyTag || undefined,
          workflowImpact: workflowImpact || undefined,
          workflowStage: workflowStage || undefined,
        });

        // If we got an ideaId back and have workspace context, check for similar ideas
        if (result?.ideaId && workspaceId) {
          setSubmittedIdeaId(result.ideaId);
          pollForSimilarIdeas(result.ideaId, workspaceId);
          // Don't close yet — wait for similar ideas check
        } else {
          resetFields();
          onOpenChange(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Record dismiss for any shown similar ideas
      if (showSimilarPanel) {
        similarIdeas.forEach((s) =>
          handleRecordDedupeEvent("dismissed", s.ideaId, s.similarity)
        );
      }
      setTimeout(() => {
        resetFields();
      }, 200);
    }
    onOpenChange(isOpen);
  };

  const handleKeepMyIdea = () => {
    similarIdeas.forEach((s) =>
      handleRecordDedupeEvent("dismissed", s.ideaId, s.similarity)
    );
    resetFields();
    onOpenChange(false);
  };

  const handleVoteOnSimilar = async (similar: SimilarIdeaSuggestion) => {
    handleRecordDedupeEvent("accepted", similar.ideaId, similar.similarity);
    if (onVoteForIdea) {
      await onVoteForIdea(similar.ideaId);
    }
    resetFields();
    onOpenChange(false);
  };

  const selectClassName =
    "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {submissionType === "poll" ? (
              <MessageCircleQuestion className="h-5 w-5" />
            ) : (
              <Lightbulb className="h-5 w-5" />
            )}
            Share your feedback
          </DialogTitle>
          <DialogDescription>
            {submissionType === "poll"
              ? "Answer a quick question from the team."
              : "Help us understand what you need and why it matters."}
          </DialogDescription>
        </DialogHeader>

        {/* Type selector — only shown when there's an active poll */}
        {hasPoll && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSubmissionType("idea")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                submissionType === "idea"
                  ? "border-primary bg-primary/5 text-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              <Lightbulb className="h-4 w-4" />
              Feature idea
            </button>
            <button
              type="button"
              onClick={() => setSubmissionType("poll")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                submissionType === "poll"
                  ? "border-primary bg-primary/5 text-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              <MessageCircleQuestion className="h-4 w-4" />
              Quick feedback
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {submissionType === "poll" && hasPoll ? (
            /* Poll response form */
            <>
              <div className="bg-muted/50 rounded-lg border p-3">
                <p className="text-sm font-medium">{activePoll.question}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pollResponse">Your answer</Label>
                <Textarea
                  id="pollResponse"
                  placeholder="Share your thoughts..."
                  value={pollResponse}
                  onChange={(e) => setPollResponse(e.target.value)}
                  maxLength={700}
                  rows={3}
                  required
                  autoFocus
                />
                <p className="text-muted-foreground text-right text-xs">
                  {pollResponse.length}/700
                </p>
              </div>
            </>
          ) : (
            /* Idea submission form */
            <>
              <div className="space-y-2">
                <Label htmlFor="title">What are you trying to achieve? *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Export reports to PDF"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="problemStatement">
                  What problem does this solve? *
                </Label>
                <Textarea
                  id="problemStatement"
                  placeholder="Describe the issue you're facing or the workflow that's broken..."
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  required
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowMoreDetails(!showMoreDetails)}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm font-medium transition-colors"
                >
                  Add more details
                  {showMoreDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showMoreDetails && (
                  <div className="mt-3 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description">Additional details</Label>
                      <Textarea
                        id="description"
                        placeholder="Any extra context, examples, or links..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={2000}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="frequencyTag" className="text-xs">
                          How often?
                        </Label>
                        <select
                          id="frequencyTag"
                          value={frequencyTag}
                          onChange={(e) => setFrequencyTag(e.target.value)}
                          className={selectClassName}
                        >
                          <option value="">Select...</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="rarely">Rarely</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="workflowImpact" className="text-xs">
                          Impact level
                        </Label>
                        <select
                          id="workflowImpact"
                          value={workflowImpact}
                          onChange={(e) => setWorkflowImpact(e.target.value)}
                          className={selectClassName}
                        >
                          <option value="">Select...</option>
                          <option value="blocker">Blocker</option>
                          <option value="major">Major inconvenience</option>
                          <option value="minor">Minor issue</option>
                          <option value="nice_to_have">Nice to have</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="workflowStage" className="text-xs">
                          Workflow area
                        </Label>
                        <select
                          id="workflowStage"
                          value={workflowStage}
                          onChange={(e) => setWorkflowStage(e.target.value)}
                          className={selectClassName}
                        >
                          <option value="">Select...</option>
                          <option value="onboarding">Onboarding</option>
                          <option value="setup">Setup</option>
                          <option value="daily_workflow">Daily workflow</option>
                          <option value="billing">Billing</option>
                          <option value="reporting">Reporting</option>
                          <option value="integrations">Integrations</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          {!showSimilarPanel && !isCheckingSimilar && (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  (submissionType === "poll"
                    ? !pollResponse.trim()
                    : !title.trim() || !problemStatement.trim())
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : submissionType === "poll" ? (
                  "Send feedback"
                ) : (
                  "Submit idea"
                )}
              </Button>
            </div>
          )}
        </form>

        {/* Checking for similar ideas */}
        {isCheckingSimilar && !showSimilarPanel && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            <Search className="h-4 w-4 animate-pulse" />
            Checking for similar ideas...
          </div>
        )}

        {/* Similar ideas panel */}
        {showSimilarPanel && similarIdeas.length > 0 && (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Did you mean one of these?
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Similar ideas already exist. Vote on one instead of creating a
                duplicate.
              </p>
            </div>

            <div className="space-y-2">
              {similarIdeas.map((similar) => (
                <div
                  key={similar.ideaId}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {similar.title}
                    </p>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-0.5">
                        <ArrowUp className="h-3 w-3" />
                        {similar.voteCount}
                      </span>
                      <span>{similar.similarity}% similar</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleVoteOnSimilar(similar)}
                  >
                    Vote on this
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleKeepMyIdea}>
                Keep my idea
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
