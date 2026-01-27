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
        "flex w-16 flex-col items-center justify-center rounded-lg border py-3 transition-all duration-200",
        optimisticState.hasVoted
          ? "border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-400"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:bg-slate-700",
        isPending && "opacity-50"
      )}
      aria-label={
        optimisticState.hasVoted ? "Remove vote" : "Vote for this idea"
      }
    >
      <ChevronUp
        className={cn(
          "h-5 w-5",
          optimisticState.hasVoted
            ? "text-blue-600 dark:text-blue-400"
            : "text-slate-400 dark:text-slate-500"
        )}
        strokeWidth={2.5}
      />
      <span
        className={cn(
          "text-lg font-semibold",
          optimisticState.hasVoted
            ? "text-blue-600 dark:text-blue-400"
            : "text-slate-900 dark:text-slate-100"
        )}
      >
        {optimisticState.voteCount}
      </span>
      <span
        className={cn(
          "text-xs",
          optimisticState.hasVoted
            ? "text-blue-500 dark:text-blue-400"
            : "text-slate-500 dark:text-slate-400"
        )}
      >
        votes
      </span>
    </button>
  );
}
