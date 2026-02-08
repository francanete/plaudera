"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { IdeaCard, type IdeaCardData } from "./idea-card";
import { Lightbulb } from "lucide-react";
import { useBoardContext } from "@/app/b/[slug]/board-context";

interface BoardIdeasViewProps {
  initialIdeas: IdeaCardData[];
}

export function BoardIdeasView({ initialIdeas }: BoardIdeasViewProps) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const { contributor, requireAuth } = useBoardContext();
  const isAuthenticated = contributor !== null;

  const handleVote = useCallback(
    async (ideaId: string): Promise<{ voted: boolean; voteCount: number }> => {
      const res = await fetch(`/api/public/ideas/${ideaId}/vote`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to vote");
      }

      const { voted, voteCount } = await res.json();

      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === ideaId ? { ...idea, hasVoted: voted, voteCount } : idea
        )
      );

      return { voted, voteCount };
    },
    []
  );

  if (ideas.length === 0) {
    return (
      <div className="mx-auto max-w-4xl pt-6">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 dark:border-slate-600 dark:bg-slate-800">
          <Lightbulb className="mb-4 h-12 w-12 text-slate-400 dark:text-slate-500" />
          <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
            No ideas yet
          </h3>
          <p className="mb-4 max-w-md text-center text-slate-600 dark:text-slate-400">
            Be the first to share a feature request or suggestion!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3 pt-6">
      {ideas.map((idea) => (
        <IdeaCard
          key={idea.id}
          idea={idea}
          isAuthenticated={isAuthenticated}
          onVote={handleVote}
          onRequireAuth={() => requireAuth({ type: "vote", ideaId: idea.id })}
        />
      ))}
    </div>
  );
}
