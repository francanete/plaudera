"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";

interface IdeaFeatureDetailsProps {
  details: string;
  onDetailsChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  hasChanges: boolean;
}

export function IdeaFeatureDetails({
  details,
  onDetailsChange,
  onSave,
  isSaving,
  hasChanges,
}: IdeaFeatureDetailsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-500">
          Feature Details
        </label>
        <Badge
          variant="outline"
          className="gap-1 border-purple-200 bg-purple-50 text-xs text-purple-600"
        >
          <FileText className="h-3 w-3" />
          Shown on Roadmap
        </Badge>
      </div>
      <Textarea
        value={details}
        onChange={(e) => onDetailsChange(e.target.value)}
        placeholder="Describe the feature specs, scope, and what you're building..."
        className="min-h-[100px] resize-none border-slate-200 focus:border-slate-300 focus:ring-0"
        maxLength={2000}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{details.length}/2000</span>
        {hasChanges && (
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        )}
      </div>
    </div>
  );
}
