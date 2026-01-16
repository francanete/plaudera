"use client";

import { useOptimistic, useTransition } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoteButtonProps {
  ideaId: string;
  voteCount: number;
  hasVoted: boolean;
  isAuthenticated: boolean;
  onVote: (ideaId: string) => Promise<{ voted: boolean; voteCount: number }>;
  onRequireAuth: () => void;
}

export function VoteButton({
  ideaId,
  voteCount,
  hasVoted,
  isAuthenticated,
  onVote,
  onRequireAuth,
}: VoteButtonProps) {
  const [isPending, startTransition] = useTransition();

  const [optimisticState, setOptimisticState] = useOptimistic(
    { voteCount, hasVoted },
    (state, newHasVoted: boolean) => ({
      hasVoted: newHasVoted,
      voteCount: newHasVoted ? state.voteCount + 1 : state.voteCount - 1,
    })
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    startTransition(async () => {
      // Optimistically update
      setOptimisticState(!optimisticState.hasVoted);

      try {
        await onVote(ideaId);
      } catch (error) {
        console.error("Vote failed:", error);
        // On error, the optimistic state will revert on next render
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "flex min-w-[60px] flex-col items-center rounded-lg px-3 py-2 transition-colors",
        optimisticState.hasVoted
          ? "bg-primary/10 text-primary border-primary border"
          : "bg-muted/50 hover:bg-muted",
        isPending && "opacity-50"
      )}
      aria-label={
        optimisticState.hasVoted ? "Remove vote" : "Vote for this idea"
      }
    >
      <ChevronUp
        className={cn(
          "h-4 w-4",
          optimisticState.hasVoted ? "text-primary" : "text-muted-foreground"
        )}
      />
      <span className="text-lg font-semibold">{optimisticState.voteCount}</span>
      <span
        className={cn(
          "text-xs",
          optimisticState.hasVoted ? "text-primary" : "text-muted-foreground"
        )}
      >
        votes
      </span>
    </button>
  );
}
