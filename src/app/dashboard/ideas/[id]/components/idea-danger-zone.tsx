"use client";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AlertTriangle, ChevronDown, Trash2 } from "lucide-react";
import { useState } from "react";
import { IdeaMergeSection } from "./idea-merge-section";

interface PublishedIdea {
  id: string;
  title: string;
}

interface IdeaDangerZoneProps {
  isMerged: boolean;
  publishedIdeas: PublishedIdea[];
  selectedParentId: string;
  onParentSelect: (id: string) => void;
  onMergeClick: () => void;
  onDeleteClick: () => void;
}

export function IdeaDangerZone({
  isMerged,
  publishedIdeas,
  selectedParentId,
  onParentSelect,
  onMergeClick,
  onDeleteClick,
}: IdeaDangerZoneProps) {
  const [isOpen, setIsOpen] = useState(false);

  const showMergeSection = !isMerged && publishedIdeas.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-red-200 bg-red-50/50 px-4 py-3 text-left transition-colors hover:bg-red-50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-sm font-medium text-red-600">Danger Zone</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-red-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-3 space-y-6 rounded-lg border border-red-200 bg-white p-4">
          <p className="text-xs text-slate-500">
            Actions in this section are destructive and may be irreversible.
            Please proceed with caution.
          </p>

          {/* Merge Section - only if not already merged and has other ideas */}
          {showMergeSection && (
            <IdeaMergeSection
              publishedIdeas={publishedIdeas}
              selectedParentId={selectedParentId}
              onParentSelect={onParentSelect}
              onMergeClick={onMergeClick}
            />
          )}

          {/* Delete Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-500">
              Delete Idea
            </label>
            <p className="text-xs text-slate-500">
              Permanently delete this idea and all associated data. This action
              cannot be undone.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteClick}
              className="shrink-0"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Idea
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
