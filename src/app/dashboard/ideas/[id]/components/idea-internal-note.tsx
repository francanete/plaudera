"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Tag } from "lucide-react";

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
    <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Indigo Accent Bar - visible on md+ screens */}
      <div className="hidden w-1.5 self-stretch bg-indigo-500 md:block" />

      <div className="flex-1 space-y-3 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-indigo-500" />
            <label className="text-base font-semibold text-gray-900">
              Internal Note
            </label>
            <Badge
              variant="outline"
              className="gap-1 border-gray-200 bg-gray-50 text-xs text-gray-500"
            >
              <Lock className="h-3 w-3" />
              Private
            </Badge>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500">
          Only visible to you — never shown publicly on your board or roadmap.
        </p>

        {/* Textarea with inline character counter */}
        <div className="relative">
          <Textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Add private notes, reminders, or internal context..."
            className="min-h-[100px] resize-none border-gray-200 bg-white pb-6 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            maxLength={2000}
          />
          {/* Character counter inside textarea */}
          <span className="pointer-events-none absolute right-3 bottom-2 text-xs text-gray-400">
            {note.length}/2000
          </span>
        </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
