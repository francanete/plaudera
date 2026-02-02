"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Globe } from "lucide-react";

interface IdeaPublicUpdateProps {
  update: string;
  onUpdateChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  hasChanges: boolean;
}

export function IdeaPublicUpdate({
  update,
  onUpdateChange,
  onSave,
  isSaving,
  hasChanges,
}: IdeaPublicUpdateProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-500">
          Public Update
        </label>
        <Badge
          variant="outline"
          className="gap-1 border-blue-200 bg-blue-50 text-xs text-blue-600"
        >
          <Globe className="h-3 w-3" />
          Visible to all
        </Badge>
      </div>
      <Textarea
        value={update}
        onChange={(e) => onUpdateChange(e.target.value)}
        placeholder="Share progress or updates with your users..."
        className="min-h-[100px] resize-none border-slate-200 focus:border-slate-300 focus:ring-0"
        maxLength={1000}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{update.length}/1000</span>
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
