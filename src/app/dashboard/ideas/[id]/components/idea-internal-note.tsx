"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lock } from "lucide-react";

interface IdeaInternalNoteProps {
  note: string;
  onNoteChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  hasChanges: boolean;
}

export function IdeaInternalNote({
  note,
  onNoteChange,
  onSave,
  isSaving,
  hasChanges,
}: IdeaInternalNoteProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-500">
          Internal Note
        </label>
        <Badge
          variant="outline"
          className="gap-1 border-slate-300 bg-slate-50 text-xs text-slate-500"
        >
          <Lock className="h-3 w-3" />
          Private
        </Badge>
      </div>
      <Textarea
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="Add private notes (only visible to you)..."
        className="min-h-[100px] resize-none border-slate-200 focus:border-slate-300 focus:ring-0"
        maxLength={2000}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{note.length}/2000</span>
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
