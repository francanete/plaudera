"use client";

import { Button } from "@/components/ui/button";
import { AuthStatusPill } from "./auth-status-pill";
import { Plus, Lightbulb, Map, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export type BoardView = "ideas" | "roadmap";

interface BoardHeaderProps {
  workspaceName: string;
  workspaceDescription: string | null;
  onSubmitIdea: () => void;
  contributor?: { email: string; id: string } | null;
  onLogout?: () => Promise<void>;
  onLogin?: () => void;
  activeView?: BoardView;
  onViewChange?: (view: BoardView) => void;
}

export function BoardHeader({
  workspaceName,
  workspaceDescription,
  onSubmitIdea,
  contributor,
  onLogout,
  onLogin,
  activeView = "ideas",
  onViewChange,
}: BoardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md dark:bg-slate-900/80">
      {/* Main Header Row */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex h-16 items-center justify-between px-4 sm:h-[72px] sm:px-6">
          {/* Left: Brand */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
              <span className="text-sm font-bold">
                {workspaceName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                {workspaceName}
              </h1>
              {workspaceDescription && (
                <p className="hidden truncate text-xs text-slate-500 sm:block dark:text-slate-400">
                  {workspaceDescription}
                </p>
              )}
            </div>
          </div>

          {/* Center: Navigation Tabs (Desktop only) */}
          {onViewChange && (
            <nav className="hidden items-center rounded-lg border border-slate-200/60 bg-slate-100 p-1 md:flex dark:border-slate-700/50 dark:bg-slate-800/50">
              <button
                onClick={() => onViewChange("ideas")}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150",
                  activeView === "ideas"
                    ? "border border-slate-200/80 bg-white text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    : "border border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                <Lightbulb
                  className={cn(
                    "h-4 w-4",
                    activeView === "ideas"
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                  )}
                />
                Ideas
              </button>
              <button
                onClick={() => onViewChange("roadmap")}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150",
                  activeView === "roadmap"
                    ? "border border-slate-200/80 bg-white text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    : "border border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                <Map
                  className={cn(
                    "h-4 w-4",
                    activeView === "roadmap"
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                  )}
                />
                Roadmap
              </button>
            </nav>
          )}

          {/* Right: Actions */}
          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
            {/* Mobile: Icon-only sign in (when not authenticated) */}
            {!contributor && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogin}
                className="h-8 w-8 p-0 sm:hidden"
                aria-label="Sign in to vote"
              >
                <Mail className="h-4 w-4" />
              </Button>
            )}

            {/* Desktop: Full auth status pill */}
            <div className="hidden sm:block">
              <AuthStatusPill
                contributor={contributor}
                onLogin={onLogin}
                onLogout={onLogout}
              />
            </div>

            {/* Mobile: Show auth pill only when authenticated */}
            {contributor && (
              <div className="sm:hidden">
                <AuthStatusPill
                  contributor={contributor}
                  onLogin={onLogin}
                  onLogout={onLogout}
                />
              </div>
            )}

            <Button
              onClick={onSubmitIdea}
              size="sm"
              className="bg-slate-900 text-sm font-medium shadow-md shadow-slate-900/5 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:shadow-none dark:hover:bg-white"
            >
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Submit</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Tabs */}
      {onViewChange && (
        <div className="border-b border-slate-200 md:hidden dark:border-slate-700">
          <nav className="flex items-center gap-1 p-2">
            <button
              onClick={() => onViewChange("ideas")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                activeView === "ideas"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              )}
            >
              <Lightbulb className="h-4 w-4" />
              Ideas
            </button>
            <button
              onClick={() => onViewChange("roadmap")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                activeView === "roadmap"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              )}
            >
              <Map className="h-4 w-4" />
              Roadmap
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
