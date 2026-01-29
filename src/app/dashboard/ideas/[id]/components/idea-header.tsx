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
    <div className="space-y-4">
      {/* Back Navigation */}
      <Link href="/dashboard/ideas">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ideas
        </Button>
      </Link>

      {/* Title + Merged Indicator */}
      <div className="space-y-3">
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleBlur}
          disabled={isSavingTitle}
          className="h-auto border-transparent bg-transparent px-0 py-1 text-3xl font-bold text-slate-900 hover:border-slate-200 focus:border-slate-300 focus:ring-0"
          placeholder="Idea title"
        />

        {isMerged && mergedIntoId && (
          <div className="inline-flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <GitMerge className="h-4 w-4" />
            <span>
              This idea was merged into{" "}
              <Link
                href={`/dashboard/ideas/${mergedIntoId}`}
                className="font-medium text-slate-900 hover:underline"
              >
                another idea
              </Link>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
