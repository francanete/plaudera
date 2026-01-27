"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface IdeaDescriptionProps {
  description: string;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  hasChanges: boolean;
}

export function IdeaDescription({
  description,
  onDescriptionChange,
  onSave,
  isSaving,
  hasChanges,
}: IdeaDescriptionProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-500">Description</label>
      <Textarea
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="Add a description..."
        className="min-h-[160px] resize-none border-slate-200 focus:border-slate-300 focus:ring-0"
      />
      {hasChanges && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}
