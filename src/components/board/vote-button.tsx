"use client";

import { useOptimistic, useTransition } from "react";
import { ThumbsUp } from "lucide-react";
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
        "flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border transition-all duration-200",
        optimisticState.hasVoted
          ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950"
          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500 dark:hover:bg-slate-700",
        isPending && "opacity-50"
      )}
      aria-label={
        optimisticState.hasVoted ? "Remove vote" : "Vote for this idea"
      }
    >
      <ThumbsUp
        className={cn(
          "h-4 w-4",
          optimisticState.hasVoted
            ? "text-blue-600 dark:text-blue-400"
            : "text-slate-500 dark:text-slate-400"
        )}
      />
      <span
        className={cn(
          "text-sm font-semibold",
          optimisticState.hasVoted
            ? "text-blue-600 dark:text-blue-400"
            : "text-slate-700 dark:text-slate-200"
        )}
      >
        {optimisticState.voteCount}
      </span>
    </button>
  );
}
