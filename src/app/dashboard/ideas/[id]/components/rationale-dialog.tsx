"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DecisionType } from "@/lib/db/schema";

const RATIONALE_TEMPLATES: Partial<Record<DecisionType, string[]>> = {
  declined: [
    "This doesn't align with our current product direction.",
    "We've explored this but the cost/complexity is too high for the benefit.",
    "This is already possible with the existing feature set.",
    "Low demand relative to other priorities.",
  ],
  prioritized: [
    "High demand from multiple customers.",
    "Aligns with our Q-level OKR for this quarter.",
    "Removes a critical blocker for key accounts.",
    "Quick win with high impact.",
  ],
  deprioritized: [
    "Reprioritized due to shifting business needs.",
    "Blocked by a technical dependency that needs to be resolved first.",
    "Reallocating resources to a higher-impact initiative.",
  ],
};

interface RationaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decisionType: DecisionType;
  transitionLabel: string;
  onConfirm: (
    rationale: string,
    isPublic: boolean,
    wontBuildReason?: string
  ) => void;
  isSubmitting: boolean;
  showWontBuildReason?: boolean;
}

export function RationaleDialog({
  open,
  onOpenChange,
  decisionType,
  transitionLabel,
  onConfirm,
  isSubmitting,
  showWontBuildReason = false,
}: RationaleDialogProps) {
  const [rationale, setRationale] = useState("");
  const [isPublic, setIsPublic] = useState(decisionType === "declined");
  const [wontBuildReason, setWontBuildReason] = useState("");

  const templates = RATIONALE_TEMPLATES[decisionType] ?? [];

  const handleConfirm = () => {
    onConfirm(
      rationale.trim(),
      isPublic,
      showWontBuildReason ? wontBuildReason.trim() || undefined : undefined
    );
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setRationale("");
      setIsPublic(decisionType === "declined");
      setWontBuildReason("");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{transitionLabel}</DialogTitle>
          <DialogDescription>
            Explain your reasoning for this decision. This creates an audit
            trail for your team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Rationale text */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Rationale <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Why are you making this change?"
              className="min-h-24 resize-none"
              maxLength={2000}
            />
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              {rationale.length}/2000
            </span>
          </div>

          {/* Suggested templates */}
          {templates.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-muted-foreground text-xs font-medium">
                Suggestions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((template) => (
                  <button
                    key={template}
                    type="button"
                    onClick={() => setRationale(template)}
                    className="border-border bg-muted/50 hover:bg-muted text-muted-foreground rounded-md border px-2 py-1 text-xs transition-colors"
                  >
                    {template.length > 50
                      ? template.slice(0, 50) + "..."
                      : template}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Won't Build public reason (only for DECLINED) */}
          {showWontBuildReason && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Public reason (Won&apos;t Build)
              </label>
              <Textarea
                value={wontBuildReason}
                onChange={(e) => setWontBuildReason(e.target.value)}
                placeholder="Brief explanation shown publicly on the Won't Build page (optional)"
                className="min-h-16 resize-none"
                maxLength={2000}
              />
              <p className="text-muted-foreground text-xs">
                If provided, this idea will appear on the public Won&apos;t
                Build page with this reason.
              </p>
            </div>
          )}

          {/* Make public checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="is-public"
              checked={isPublic}
              onCheckedChange={(checked) => setIsPublic(checked === true)}
            />
            <label htmlFor="is-public" className="text-sm">
              Make rationale visible to public visitors
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !rationale.trim()}
          >
            {isSubmitting ? "Saving..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
