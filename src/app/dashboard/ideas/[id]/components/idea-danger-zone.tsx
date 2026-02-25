"use client";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, XCircle, GitMerge, Settings2 } from "lucide-react";
import { useState } from "react";

interface PublishedIdea {
  id: string;
  title: string;
}

interface IdeaDangerZoneProps {
  isMerged: boolean;
  isOnRoadmap: boolean;
  publishedIdeas: PublishedIdea[];
  selectedParentId: string;
  onParentSelect: (id: string) => void;
  onMergeClick: () => void;
  onDeleteClick: () => void;
}

export function IdeaDangerZone({
  isMerged,
  isOnRoadmap,
  publishedIdeas,
  selectedParentId,
  onParentSelect,
  onMergeClick,
  onDeleteClick,
}: IdeaDangerZoneProps) {
  const [isOpen, setIsOpen] = useState(false);

  const showMergeSection =
    !isMerged && !isOnRoadmap && publishedIdeas.length > 0;
  const showDeleteSection = !isOnRoadmap;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="border-border bg-muted/30 hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors">
        <div className="flex items-center gap-2">
          <Settings2 className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground text-sm font-medium">
            Advanced actions
          </span>
        </div>
        <ChevronDown
          className={`text-muted-foreground h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-border bg-background mt-3 space-y-0 rounded-lg border">
          {/* Merge Section - only if not already merged and has other ideas */}
          {showMergeSection && (
            <div className="space-y-3 p-4">
              <div className="space-y-1">
                <span className="text-muted-foreground text-xs font-medium tracking-[0.1em] uppercase">
                  Merge Idea
                </span>
                <p className="text-muted-foreground/70 text-xs">
                  Transfer votes to another idea. This cannot be undone.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={selectedParentId} onValueChange={onParentSelect}>
                  <SelectTrigger className="border-border bg-background hover:bg-muted/50 flex-1">
                    <SelectValue placeholder="Select parent idea..." />
                  </SelectTrigger>
                  <SelectContent>
                    {publishedIdeas.map((publishedIdea) => (
                      <SelectItem
                        key={publishedIdea.id}
                        value={publishedIdea.id}
                      >
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
                  className="shrink-0"
                >
                  <GitMerge className="mr-2 h-4 w-4" />
                  Merge
                </Button>
              </div>
            </div>
          )}

          {/* Separator between merge and delete */}
          {showMergeSection && showDeleteSection && (
            <div className="border-border border-t" />
          )}

          {/* Decline Section - hidden for roadmap ideas */}
          {showDeleteSection && (
            <div className="space-y-3 p-4">
              <div className="space-y-1">
                <span className="text-muted-foreground text-xs font-medium tracking-[0.1em] uppercase">
                  Decline Idea
                </span>
                <p className="text-muted-foreground/70 text-xs">
                  Mark this idea as declined with a rationale. Optionally make
                  it visible on the public Won&apos;t Build page.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={onDeleteClick}
                className="shrink-0"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Decline idea
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
