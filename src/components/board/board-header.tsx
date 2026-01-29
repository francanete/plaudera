"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, User, LogOut, ChevronDown } from "lucide-react";

interface BoardHeaderProps {
  workspaceName: string;
  onSubmitIdea: () => void;
  contributor?: { email: string; id: string } | null;
  onLogout?: () => Promise<void>;
}

export function BoardHeader({
  workspaceName,
  onSubmitIdea,
  contributor,
  onLogout,
}: BoardHeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!onLogout || isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

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
        <div className="flex items-center gap-2">
          {contributor && onLogout && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="max-w-[200px] border-slate-200 dark:border-slate-600"
                >
                  <User className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{contributor.email}</span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Signed in as
                </div>
                <div className="max-w-[200px] truncate px-2 py-1 text-sm font-medium">
                  {contributor.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? "Signing out..." : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
