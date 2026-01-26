"use client";

import { Button } from "@/components/ui/button";
import { Calendar, User, Trash2 } from "lucide-react";

interface IdeaMetaProps {
  createdAt: Date;
  authorEmail?: string | null;
  onDeleteClick: () => void;
}

export function IdeaMeta({
  createdAt,
  authorEmail,
  onDeleteClick,
}: IdeaMetaProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex items-start justify-between">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="h-4 w-4" />
            <span>Submitted</span>
          </div>
          <p className="pl-6 font-medium text-slate-900">{formattedDate}</p>
        </div>

        {authorEmail && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <User className="h-4 w-4" />
              <span>Author</span>
            </div>
            <p className="pl-6 font-medium text-slate-900">{authorEmail}</p>
          </div>
        )}
      </div>

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
  );
}
