"use client";

import { Calendar, User } from "lucide-react";

interface IdeaMetaProps {
  createdAt: Date;
  authorEmail?: string | null;
}

export function IdeaMeta({ createdAt, authorEmail }: IdeaMetaProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
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
  );
}
