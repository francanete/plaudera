"use client";

import { useState } from "react";
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
import { Loader2, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";

interface IdeaSubmissionData {
  title: string;
  problemStatement: string;
  description?: string;
  frequencyTag?: string;
  workflowImpact?: string;
  workflowStage?: string;
}

interface IdeaSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: IdeaSubmissionData) => Promise<void>;
}

export function IdeaSubmissionDialog({
  open,
  onOpenChange,
  onSubmit,
}: IdeaSubmissionDialogProps) {
  const [title, setTitle] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [description, setDescription] = useState("");
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [frequencyTag, setFrequencyTag] = useState("");
  const [workflowImpact, setWorkflowImpact] = useState("");
  const [workflowStage, setWorkflowStage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const resetFields = () => {
    setTitle("");
    setProblemStatement("");
    setDescription("");
    setShowMoreDetails(false);
    setFrequencyTag("");
    setWorkflowImpact("");
    setWorkflowStage("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !problemStatement.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      await onSubmit({
        title: title.trim(),
        problemStatement: problemStatement.trim(),
        description: description.trim() || undefined,
        frequencyTag: frequencyTag || undefined,
        workflowImpact: workflowImpact || undefined,
        workflowStage: workflowStage || undefined,
      });
      resetFields();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit idea");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setTimeout(() => {
        resetFields();
      }, 200);
    }
    onOpenChange(isOpen);
  };

  const selectClassName =
    "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Share your feedback
          </DialogTitle>
          <DialogDescription>
            Help us understand what you need and why it matters.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {error && <p className="text-destructive text-sm">{error}</p>}

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
                isSubmitting || !title.trim() || !problemStatement.trim()
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit idea"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
