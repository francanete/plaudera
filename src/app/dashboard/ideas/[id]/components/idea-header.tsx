"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, GitMerge } from "lucide-react";

interface IdeaHeaderProps {
  title: string;
  onTitleChange: (value: string) => void;
  onTitleBlur: () => void;
  isSavingTitle: boolean;
  isMerged: boolean;
  mergedIntoId?: string | null;
}

export function IdeaHeader({
  title,
  onTitleChange,
  onTitleBlur,
  isSavingTitle,
  isMerged,
  mergedIntoId,
}: IdeaHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Back Navigation with micro-interaction */}
      <Link href="/dashboard/ideas" className="group inline-flex">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground gap-2 px-2 transition-colors hover:bg-transparent"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
          <span className="text-sm">Back to Ideas</span>
        </Button>
      </Link>

      {/* Title + Merged Indicator */}
      <div className="flex flex-wrap items-start gap-3">
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
  );
}
