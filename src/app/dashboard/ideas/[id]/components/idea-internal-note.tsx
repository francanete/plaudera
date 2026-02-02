"use client";

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
    <div className="border-muted-foreground/25 bg-muted/20 relative rounded-lg border border-dashed p-4">
      {/* Corner Lock Icon */}
      <div className="bg-background ring-border absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full shadow-sm ring-1">
        <Lock className="text-muted-foreground h-3 w-3" />
      </div>

      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-[0.15em] uppercase">
            Internal Note
          </span>
          <span className="text-muted-foreground/60 text-xs">· Private</span>
        </div>

        {/* Minimal Textarea */}
        <Textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Add private notes, reminders, or internal context..."
          className="placeholder:text-muted-foreground/40 min-h-[80px] resize-none border-0 bg-transparent px-0 shadow-none focus:ring-0 focus-visible:ring-0"
          maxLength={2000}
        />

        {/* Footer with Character Count and Save */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground/60 font-mono text-xs tabular-nums">
            {note.length}/2000
          </span>

          {/* Animated Save Button */}
          <div
            className={`transition-all duration-200 ${
              hasChanges
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0"
            }`}
          >
            <Button
              size="sm"
              variant="secondary"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save note"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
