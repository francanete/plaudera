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
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight">{workspaceName}</h1>
        <p className="text-muted-foreground mt-1">
          Vote on features and share your ideas
        </p>
      </div>
      <div className="flex items-center gap-2">
        {contributor && onLogout && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="max-w-[200px]">
                <User className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{contributor.email}</span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="text-muted-foreground px-2 py-1.5 text-xs">
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
        <Button onClick={onSubmitIdea}>
          <Plus className="mr-2 h-4 w-4" />
          Submit Idea
        </Button>
      </div>
    </div>
  );
}
