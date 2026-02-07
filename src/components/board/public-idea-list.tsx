"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useContributorLogout } from "@/hooks/use-contributor-logout";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { IdeaCard, type IdeaCardData } from "./idea-card";
import { BoardHeader, type BoardView } from "./board-header";
import { RoadmapGroupedView } from "./roadmap-grouped-view";
import { PublicRoadmapListView } from "./public-roadmap-list-view";
import { ContributorAuthDialog } from "./contributor-auth-dialog";
import { IdeaSubmissionDialog } from "./idea-submission-dialog";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { isOnRoadmap } from "@/lib/roadmap-status-config";

interface PublicIdeaListProps {
  workspaceName: string;
  workspaceDescription: string | null;
  workspaceId: string;
  workspaceSlug: string;
  initialIdeas: IdeaCardData[];
  initialContributor: { email: string; id: string } | null;
  roadmapDefaultListView: boolean;
}

type PendingAction =
  | { type: "vote"; ideaId: string }
  | { type: "submit" }
  | null;

export function PublicIdeaList({
  workspaceName,
  workspaceDescription,
  workspaceId,
  workspaceSlug: _workspaceSlug,
  initialIdeas,
  initialContributor,
  roadmapDefaultListView,
}: PublicIdeaListProps) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [contributor, setContributor] = useState(initialContributor);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = contributor !== null;

  // View state from URL
  const viewParam = searchParams.get("view");
  const activeView: BoardView = viewParam === "roadmap" ? "roadmap" : "ideas";

  const handleViewChange = useCallback(
    (view: BoardView) => {
      const newParams = new URLSearchParams(searchParams);
      if (view === "roadmap") {
        newParams.set("view", "roadmap");
      } else {
        newParams.delete("view");
      }
      const newUrl = newParams.toString()
        ? `${pathname}?${newParams.toString()}`
        : pathname;
      router.push(newUrl);
    },
    [searchParams, pathname, router]
  );

  // Split ideas: board shows non-roadmap, roadmap tab shows roadmap-only
  const boardIdeas = ideas.filter((idea) => !isOnRoadmap(idea.roadmapStatus));
  const roadmapIdeas = ideas.filter((idea) => isOnRoadmap(idea.roadmapStatus));

  // Declare functions BEFORE the useEffect that uses them
  const refreshData = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/${workspaceId}/ideas`);
      if (!res.ok) {
        toast.error("Failed to refresh data. Please reload the page.");
        return;
      }
      const data = await res.json();
      setIdeas(data.ideas);
      setContributor(data.contributor);
    } catch (error) {
      console.error("Failed to refresh data:", error);
      toast.error("Network error. Please check your connection.");
    }
  }, [workspaceId]);

  const handleVoteAfterAuth = useCallback(async (ideaId: string) => {
    try {
      const res = await fetch(`/api/public/ideas/${ideaId}/vote`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to record your vote");
        return;
      }

      const { voted, voteCount } = await res.json();
      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === ideaId ? { ...idea, hasVoted: voted, voteCount } : idea
        )
      );
      toast.success(voted ? "Vote added!" : "Vote removed");
    } catch (error) {
      console.error("Vote failed:", error);
      toast.error("Network error. Please try again.");
    }
  }, []);

  // Handle callback params from verification redirect
  useEffect(() => {
    const verified = searchParams.get("verified");
    const error = searchParams.get("error");
    const action = searchParams.get("action");
    const ideaId = searchParams.get("ideaId");

    // Use async IIFE to handle async operations properly
    const handleVerificationCallback = async () => {
      if (verified === "true") {
        // Refresh data to get contributor info
        await refreshData();

        // Handle pending action from callback URL
        if (action === "vote" && ideaId) {
          // Auto-vote after verification
          await handleVoteAfterAuth(ideaId);
        } else if (action === "submit") {
          setSubmitDialogOpen(true);
        }

        // Clean up URL params
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("verified");
        newParams.delete("action");
        newParams.delete("ideaId");
        const newUrl = newParams.toString()
          ? `${pathname}?${newParams.toString()}`
          : pathname;
        router.replace(newUrl);
      }

      if (error) {
        if (error === "invalid_token") {
          toast.error(
            "Verification link expired or invalid. Please try again."
          );
        } else {
          toast.error("Verification failed. Please try again.");
        }

        // Clean up URL params
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("error");
        const newUrl = newParams.toString()
          ? `${pathname}?${newParams.toString()}`
          : pathname;
        router.replace(newUrl);
      }
    };

    handleVerificationCallback();
  }, [searchParams, pathname, router, refreshData, handleVoteAfterAuth]);

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

      // Update local state
      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === ideaId ? { ...idea, hasVoted: voted, voteCount } : idea
        )
      );

      return { voted, voteCount };
    },
    []
  );

  const handleRequireAuth = useCallback((action: PendingAction) => {
    setPendingAction(action);
    setAuthDialogOpen(true);
  }, []);

  const handleSubmitIdea = () => {
    if (!isAuthenticated) {
      handleRequireAuth({ type: "submit" });
      return;
    }
    setSubmitDialogOpen(true);
  };

  const handleLogin = useCallback(() => {
    setPendingAction(null);
    setAuthDialogOpen(true);
  }, []);

  // Logout handler - uses shared hook for proper cross-origin cookie handling
  const { logout: handleLogout } = useContributorLogout({
    onSuccess: () => setContributor(null),
  });

  const handleIdeaSubmit = async (title: string, description?: string) => {
    const res = await fetch(`/api/public/${workspaceId}/ideas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to submit idea");
    }

    const { idea } = await res.json();

    // Add new idea to list at the top (it's new, so low votes)
    setIdeas((prev) => [idea, ...prev]);
    toast.success("Idea submitted successfully!");
  };

  // Build callback URL for auth dialog (SSR-safe - no window access)
  const getCallbackUrl = () => {
    const params = new URLSearchParams();
    if (pendingAction?.type === "vote") {
      params.set("action", "vote");
      params.set("ideaId", pendingAction.ideaId);
    } else if (pendingAction?.type === "submit") {
      params.set("action", "submit");
    }
    const search = params.toString();
    return search ? `${pathname}?${search}` : pathname;
  };

  // Ideas are already sorted by vote count (highest first) from the server
  // No need for client-side sorting

  return (
    <div className="w-full">
      {/* Full-width sticky header */}
      <div className="-mx-4 sm:-mx-6">
        <BoardHeader
          workspaceName={workspaceName}
          workspaceDescription={workspaceDescription}
          onSubmitIdea={handleSubmitIdea}
          contributor={contributor}
          onLogout={handleLogout}
          onLogin={handleLogin}
          activeView={activeView}
          onViewChange={handleViewChange}
        />
      </div>

      {/* Constrained content area */}
      <div
        className={cn(
          "mx-auto w-full pt-6 transition-all duration-200",
          activeView === "roadmap" ? "max-w-full" : "max-w-4xl"
        )}
      >
        {activeView === "roadmap" ? (
          roadmapDefaultListView ? (
            <PublicRoadmapListView ideas={roadmapIdeas} />
          ) : (
            <>
              <div className="block lg:hidden">
                <PublicRoadmapListView ideas={roadmapIdeas} />
              </div>
              <div className="hidden lg:block">
                <RoadmapGroupedView ideas={roadmapIdeas} />
              </div>
            </>
          )
        ) : boardIdeas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 dark:border-slate-600 dark:bg-slate-800">
            <Lightbulb className="mb-4 h-12 w-12 text-slate-400 dark:text-slate-500" />
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
              No ideas yet
            </h3>
            <p className="mb-4 max-w-md text-center text-slate-600 dark:text-slate-400">
              Be the first to share a feature request or suggestion!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {boardIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                isAuthenticated={isAuthenticated}
                onVote={handleVote}
                onRequireAuth={() =>
                  handleRequireAuth({ type: "vote", ideaId: idea.id })
                }
              />
            ))}
          </div>
        )}
      </div>

      <ContributorAuthDialog
        open={authDialogOpen}
        onOpenChange={(open) => {
          setAuthDialogOpen(open);
          if (!open) setPendingAction(null);
        }}
        callbackUrl={getCallbackUrl()}
        title="Verify your email"
        description="We need to verify your email to record your vote."
      />

      <IdeaSubmissionDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        onSubmit={handleIdeaSubmit}
      />
    </div>
  );
}
