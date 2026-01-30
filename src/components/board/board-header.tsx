"use client";

import { Button } from "@/components/ui/button";
import { AuthStatusPill } from "./auth-status-pill";
import { Plus } from "lucide-react";

interface BoardHeaderProps {
  workspaceName: string;
  workspaceDescription: string | null;
  onSubmitIdea: () => void;
  contributor?: { email: string; id: string } | null;
  onLogout?: () => Promise<void>;
  onLogin?: () => void;
}

export function BoardHeader({
  workspaceName,
  workspaceDescription,
  onSubmitIdea,
  contributor,
  onLogout,
  onLogin,
}: BoardHeaderProps) {
  return (
    <header className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-3">
        {/* Title row */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-white">
            {workspaceName}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <AuthStatusPill
              contributor={contributor}
              onLogin={onLogin}
              onLogout={onLogout}
            />
            <Button
              onClick={onSubmitIdea}
              size="sm"
              className="bg-slate-900 text-sm font-medium shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Submit
            </Button>
          </div>
        </div>

        {/* Description row */}
        {workspaceDescription && (
          <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
            {workspaceDescription}
          </p>
        )}
      </div>
    </header>
  );
}
