"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Check, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthStatusPillProps {
  contributor?: { email: string; id: string } | null;
  onLogin?: () => void;
  onLogout?: () => Promise<void>;
}

export function AuthStatusPill({
  contributor,
  onLogin,
  onLogout,
}: AuthStatusPillProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    if (!onLogout || isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
      setIsDropdownOpen(false);
    }
  };

  // Logged out state - Sign in pill
  if (!contributor) {
    return (
      <button
        onClick={onLogin}
        aria-label="Sign in to vote on ideas"
        className={cn(
          "group relative flex items-center gap-2 rounded-full px-4 py-2",
          "border border-slate-200 bg-white/80 backdrop-blur-sm",
          "text-sm font-medium text-slate-600",
          "transition-all duration-200 ease-out",
          "hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-sm",
          "focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:outline-none",
          "dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300",
          "dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-white"
        )}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 transition-colors group-hover:bg-slate-200 dark:bg-slate-700 dark:group-hover:bg-slate-600">
          <Mail className="h-3 w-3 text-slate-500 dark:text-slate-400" />
        </span>
        <span>Sign in to vote</span>
      </button>
    );
  }

  // Logged in state - Authenticated pill with dropdown
  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "group relative flex items-center gap-2 rounded-full px-3 py-2",
            "border border-teal-200 bg-teal-50/80 backdrop-blur-sm",
            "text-sm font-medium text-teal-700",
            "transition-all duration-200 ease-out",
            "hover:border-teal-300 hover:bg-teal-50 hover:shadow-sm",
            "focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:outline-none",
            "dark:border-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
            "dark:hover:border-teal-600 dark:hover:bg-teal-900/40",
            "data-[state=open]:border-teal-300 data-[state=open]:shadow-sm",
            "dark:data-[state=open]:border-teal-600"
          )}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 transition-transform group-hover:scale-105 dark:bg-teal-600">
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          </span>
          <span className="max-w-[140px] truncate">{contributor.email}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 rounded-xl border-slate-200 p-1.5 shadow-lg dark:border-slate-700"
      >
        <div className="px-3 py-2.5">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
            Signed in as
          </p>
          <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-white">
            {contributor.email}
          </p>
        </div>
        <DropdownMenuSeparator className="mx-1 my-1" />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="mx-1 cursor-pointer rounded-lg px-3 py-2 text-slate-600 transition-colors focus:bg-slate-100 focus:text-slate-900 dark:text-slate-300 dark:focus:bg-slate-800 dark:focus:text-white"
        >
          <LogOut className="mr-2.5 h-4 w-4" />
          <span>{isLoggingOut ? "Signing out..." : "Sign out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
