"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitMerge } from "lucide-react";

interface PublishedIdea {
  id: string;
  title: string;
}

interface IdeaMergeSectionProps {
  publishedIdeas: PublishedIdea[];
  selectedParentId: string;
  onParentSelect: (id: string) => void;
  onMergeClick: () => void;
}

export function IdeaMergeSection({
  publishedIdeas,
  selectedParentId,
  onParentSelect,
  onMergeClick,
}: IdeaMergeSectionProps) {
  if (publishedIdeas.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-500">
        Merge This Idea
      </label>
      <p className="text-xs text-slate-500">
        Merge this idea into another published idea. Votes will be transferred
        to the parent. This action is permanent.
      </p>
      <div className="flex items-center gap-2">
        <Select value={selectedParentId} onValueChange={onParentSelect}>
          <SelectTrigger className="flex-1 border-slate-200 bg-white hover:bg-slate-50">
            <SelectValue placeholder="Select parent idea..." />
          </SelectTrigger>
          <SelectContent>
            {publishedIdeas.map((publishedIdea) => (
              <SelectItem key={publishedIdea.id} value={publishedIdea.id}>
                {publishedIdea.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={!selectedParentId}
          onClick={onMergeClick}
          className="border-slate-200 hover:bg-slate-50"
        >
          <GitMerge className="mr-2 h-4 w-4" />
          Merge
        </Button>
      </div>
    </div>
  );
}
