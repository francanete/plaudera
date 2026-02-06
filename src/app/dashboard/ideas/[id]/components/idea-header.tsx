"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, GitMerge, Map } from "lucide-react";
import type { IdeaStatus, RoadmapStatus } from "@/lib/db/schema";

interface IdeaHeaderProps {
  title: string;
  onTitleChange: (value: string) => void;
  onTitleBlur: () => void;
  isSavingTitle: boolean;
  isMerged: boolean;
  mergedIntoId?: string | null;
  voteCount: number;
  status: IdeaStatus;
  roadmapStatus: RoadmapStatus;
  onMoveToRoadmap: () => void;
}

export function IdeaHeader({
  title,
  onTitleChange,
  onTitleBlur,
  isSavingTitle,
  isMerged,
  mergedIntoId,
  voteCount,
  status,
  roadmapStatus,
  onMoveToRoadmap,
}: IdeaHeaderProps) {
  const showMoveToRoadmap =
    roadmapStatus === "NONE" && status !== "MERGED" && status !== "DECLINED";

  return (
    <div className="space-y-6">
      {/* Contextual Toolbar */}
      <div className="flex items-center justify-between">
        {/* Left: Back navigation */}
        <Link href="/dashboard/ideas" className="group inline-flex">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-2 px-2 transition-colors hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
            <span className="text-sm">Ideas</span>
          </Button>
        </Link>

        {/* Right: Move to Roadmap */}
        {showMoveToRoadmap && (
          <Button
            variant="outline"
            size="sm"
            onClick={onMoveToRoadmap}
            className="gap-1.5"
          >
            <Map className="h-3.5 w-3.5" />
            Move to Roadmap
          </Button>
        )}
      </div>

      {/* Vote Count + Title */}
      <div className="flex items-center gap-4">
        {/* Vote Count + Divider */}
        <div className="flex shrink-0 items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-foreground font-mono text-4xl font-semibold tabular-nums">
              {voteCount}
            </span>
            <span className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
              {voteCount === 1 ? "Vote" : "Votes"}
            </span>
          </div>

          {/* Vertical Separator */}
          <div className="bg-border h-12 w-px" />
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={onTitleBlur}
            disabled={isSavingTitle}
            className="text-foreground placeholder:text-muted-foreground/50 h-auto flex-1 border-transparent bg-transparent px-0 py-0 text-3xl font-semibold tracking-tight hover:border-transparent focus:border-transparent focus:ring-0 sm:text-4xl md:text-5xl"
            placeholder="Idea title"
          />

          {isMerged && mergedIntoId && (
            <Link
              href={`/dashboard/ideas/${mergedIntoId}`}
              className="border-muted bg-muted/50 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary mt-2 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors sm:mt-3"
            >
              <GitMerge className="h-3 w-3" />
              <span>Merged</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
