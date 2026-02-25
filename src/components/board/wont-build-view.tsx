"use client";

import { Ban } from "lucide-react";

interface WontBuildIdea {
  id: string;
  title: string;
  description: string | null;
  wontBuildReason: string | null;
  updatedAt: Date | string;
}

interface WontBuildViewProps {
  ideas: WontBuildIdea[];
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function WontBuildView({ ideas }: WontBuildViewProps) {
  if (ideas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Ban className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">
          Nothing here yet
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          No ideas have been declined with a public reason.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3 pt-6">
      {ideas.map((idea) => (
        <div
          key={idea.id}
          className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {idea.title}
            </h3>

            {idea.description && (
              <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                {idea.description}
              </p>
            )}

            {idea.wontBuildReason && (
              <div className="mt-3 rounded-lg border border-red-100 bg-red-50/50 px-3.5 py-2.5 dark:border-red-900/50 dark:bg-red-950/20">
                <p className="text-sm leading-relaxed text-red-800 dark:text-red-300">
                  {idea.wontBuildReason}
                </p>
              </div>
            )}

            <p className="text-xs text-slate-400 dark:text-slate-500">
              Decided {formatDate(idea.updatedAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
