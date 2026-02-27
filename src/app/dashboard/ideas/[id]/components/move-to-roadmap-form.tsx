"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { RoadmapStatus } from "@/lib/db/schema";
import {
  VISIBLE_ROADMAP_STATUSES,
  ROADMAP_STATUS_CONFIG,
} from "@/lib/roadmap-status-config";
import { MoveToRoadmapConfirmDialog } from "./move-to-roadmap-confirm-dialog";

interface MoveToRoadmapFormProps {
  ideaTitle: string;
  ideaDescription: string | null;
  onConfirm: (
    roadmapStatus: RoadmapStatus,
    featureDetails: string,
    rationale: string
  ) => void;
  onCancel: () => void;
  isMoving: boolean;
}

export function MoveToRoadmapForm({
  ideaTitle,
  ideaDescription,
  onConfirm,
  onCancel,
  isMoving,
}: MoveToRoadmapFormProps) {
  const [selectedStatus, setSelectedStatus] =
    useState<RoadmapStatus>("PLANNED");
  const [featureSpecs, setFeatureSpecs] = useState("");
  const [rationale, setRationale] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleConfirm = () => {
    onConfirm(selectedStatus, featureSpecs, rationale);
  };

  return (
    <div className="max-w-2xl space-y-8 py-8">
      {/* Back / Cancel */}
      <button
        onClick={onCancel}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to idea
      </button>

      {/* Title */}
      <div>
        <h1 className="text-foreground text-2xl font-semibold">
          Move to Roadmap
        </h1>
        <p className="text-muted-foreground mt-1 text-base">
          &ldquo;{ideaTitle}&rdquo;
        </p>
      </div>

      {/* Roadmap status selector */}
      <div className="space-y-3">
        <label className="text-foreground text-sm font-medium">
          Roadmap status
        </label>
        <div className="flex flex-wrap gap-3">
          {VISIBLE_ROADMAP_STATUSES.map((status) => {
            const config = ROADMAP_STATUS_CONFIG[status];
            const Icon = config.icon;
            const isSelected = selectedStatus === status;

            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  isSelected
                    ? "border-foreground bg-foreground/5 text-foreground ring-foreground/20 ring-1"
                    : "border-border bg-background text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${isSelected ? "" : "opacity-60"}`} />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feature details */}
      <div className="space-y-3">
        <label className="text-foreground text-sm font-medium">
          Feature details{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>

        <Textarea
          value={featureSpecs}
          onChange={(e) => setFeatureSpecs(e.target.value)}
          placeholder="Describe the feature specs, scope, and what you're building..."
          className="min-h-[160px] resize-none"
          maxLength={2000}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFeatureSpecs(ideaDescription || "")}
              disabled={!ideaDescription}
            >
              Use contributor description
            </Button>
          </div>
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {featureSpecs.length}/2000
          </span>
        </div>

        <p className="text-muted-foreground text-xs">
          If you don&apos;t add feature details, the contributor&apos;s original
          description will be shown on the public roadmap.
        </p>
      </div>

      {/* Rationale (required for governance) */}
      <div className="space-y-3">
        <label className="text-foreground text-sm font-medium">
          Why now? <span className="text-destructive">*</span>
        </label>
        <Textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Why are you prioritizing this idea now?"
          className="min-h-[80px] resize-none"
          maxLength={2000}
        />
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {rationale.length}/2000
        </span>
      </div>

      {/* Confirm button */}
      <div className="border-border flex justify-end border-t pt-6">
        <Button
          onClick={() => setShowConfirmDialog(true)}
          disabled={!rationale.trim()}
          className="bg-foreground text-background hover:bg-foreground/90"
        >
          Move to Roadmap
        </Button>
      </div>

      {/* Irreversibility confirmation dialog */}
      <MoveToRoadmapConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleConfirm}
        isMoving={isMoving}
      />
    </div>
  );
}
