"use client";

import { Button } from "@/components/ui/button";
import { AuthStatusPill } from "./auth-status-pill";
import { Plus } from "lucide-react";

interface BoardHeaderProps {
  workspaceName: string;
  onSubmitIdea: () => void;
  contributor?: { email: string; id: string } | null;
  onLogout?: () => Promise<void>;
  onLogin?: () => void;
}

export function BoardHeader({
  workspaceName,
  onSubmitIdea,
  contributor,
  onLogout,
  onLogin,
}: BoardHeaderProps) {
  return (
    <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {workspaceName}
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Vote on features and share your ideas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AuthStatusPill
            contributor={contributor}
            onLogin={onLogin}
            onLogout={onLogout}
          />
          <Button
            onClick={onSubmitIdea}
            className="bg-slate-900 shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Submit Idea
          </Button>
        </div>
      </div>
    </div>
  );
}
