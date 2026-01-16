"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface BoardHeaderProps {
  workspaceName: string;
  onSubmitIdea: () => void;
}

export function BoardHeader({ workspaceName, onSubmitIdea }: BoardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{workspaceName}</h1>
        <p className="text-muted-foreground mt-1">
          Vote on features and share your ideas
        </p>
      </div>
      <Button onClick={onSubmitIdea}>
        <Plus className="mr-2 h-4 w-4" />
        Submit Idea
      </Button>
    </div>
  );
}
