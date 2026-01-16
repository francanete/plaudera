"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  Clock,
  CheckCircle,
  XCircle,
  PlayCircle,
  Search,
} from "lucide-react";
import { VoteButton } from "./vote-button";
import type { IdeaStatus } from "@/lib/db/schema";

const statusConfig: Record<
  IdeaStatus,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    icon: typeof Clock;
  }
> = {
  NEW: { label: "New", variant: "default", icon: Lightbulb },
  UNDER_REVIEW: { label: "Under Review", variant: "secondary", icon: Search },
  PLANNED: { label: "Planned", variant: "outline", icon: Clock },
  IN_PROGRESS: { label: "In Progress", variant: "secondary", icon: PlayCircle },
  DONE: { label: "Done", variant: "default", icon: CheckCircle },
  DECLINED: { label: "Declined", variant: "destructive", icon: XCircle },
};

export interface IdeaCardData {
  id: string;
  title: string;
  description: string | null;
  status: IdeaStatus;
  voteCount: number;
  hasVoted: boolean;
  createdAt: Date | string;
}

interface IdeaCardProps {
  idea: IdeaCardData;
  isAuthenticated: boolean;
  onVote: (ideaId: string) => Promise<{ voted: boolean; voteCount: number }>;
  onRequireAuth: () => void;
}

export function IdeaCard({
  idea,
  isAuthenticated,
  onVote,
  onRequireAuth,
}: IdeaCardProps) {
  const status = statusConfig[idea.status];
  const StatusIcon = status.icon;

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="flex items-center gap-4 py-4">
        <VoteButton
          ideaId={idea.id}
          voteCount={idea.voteCount}
          hasVoted={idea.hasVoted}
          isAuthenticated={isAuthenticated}
          onVote={onVote}
          onRequireAuth={onRequireAuth}
        />

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{idea.title}</h3>
          {idea.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {idea.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={status.variant} className="text-xs">
              <StatusIcon className="mr-1 h-3 w-3" />
              {status.label}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {new Date(idea.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
