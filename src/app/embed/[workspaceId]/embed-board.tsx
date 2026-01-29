"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ContributorAuthDialog } from "@/components/board/contributor-auth-dialog";
import { IdeaSubmissionDialog } from "@/components/board/idea-submission-dialog";
import { ChevronUp, Plus, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IdeaStatus } from "@/lib/db/schema";
import { IDEA_STATUS_CONFIG } from "@/lib/idea-status-config";
import { appConfig } from "@/lib/config";

type PendingAction =
  | { type: "vote"; ideaId: string }
  | { type: "submit" }
  | null;

interface CompactIdea {
  id: string;
  title: string;
  status: IdeaStatus;
  voteCount: number;
  hasVoted: boolean;
}

interface EmbedBoardProps {
  workspaceName: string;
  workspaceId: string;
  workspaceSlug: string;
  initialIdeas: CompactIdea[];
  initialContributor: { email: string; id: string } | null;
}

export function EmbedBoard({
  workspaceName,
  workspaceId,
  workspaceSlug,
  initialIdeas,
  initialContributor,
}: EmbedBoardProps) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [contributor, setContributor] = useState(initialContributor);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = contributor !== null;

  // Refresh data after auth/actions
  const refreshData = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/${workspaceId}/ideas`);
      if (!res.ok) return;
      const data = await res.json();
      setIdeas(
        data.ideas
          .slice(0, 10)
          .map((idea: CompactIdea & { description?: string }) => ({
            id: idea.id,
            title: idea.title,
            status: idea.status,
            voteCount: idea.voteCount,
            hasVoted: idea.hasVoted,
          }))
      );
      if (data.contributor) {
        setContributor(data.contributor);
      }
    } catch (error) {
      // Log error for debugging but don't disrupt UX - user can refresh manually
      console.error("[EmbedBoard] Failed to refresh data:", error);
    }
  }, [workspaceId]);

  // Build callback URL with intent params for post-verification redirect
  const getCallbackUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (pendingAction?.type === "vote") {
      params.set("action", "vote");
      params.set("ideaId", pendingAction.ideaId);
    } else if (pendingAction?.type === "submit") {
      params.set("action", "submit");
    }
    const search = params.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, pendingAction]);

  // Shared vote execution logic
  const executeVote = useCallback(
    async (ideaId: string, currentIdea: CompactIdea | undefined) => {
      if (!currentIdea) return;

      const wasVoted = currentIdea.hasVoted;

      // Optimistic update
      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === ideaId
            ? {
                ...idea,
                hasVoted: !wasVoted,
                voteCount: wasVoted ? idea.voteCount - 1 : idea.voteCount + 1,
              }
            : idea
        )
      );

      try {
        const res = await fetch(`/api/public/ideas/${ideaId}/vote`, {
          method: "POST",
        });

        if (!res.ok) {
          throw new Error("Vote failed");
        }

        const data = await res.json();
        setIdeas((prev) =>
          prev.map((idea) =>
            idea.id === ideaId
              ? { ...idea, hasVoted: data.voted, voteCount: data.voteCount }
              : idea
          )
        );

        // Only show toast for post-auth votes (new votes)
        if (!wasVoted) {
          toast.success("Vote recorded!");
        }
      } catch {
        // Revert optimistic update
        setIdeas((prev) =>
          prev.map((idea) =>
            idea.id === ideaId
              ? {
                  ...idea,
                  hasVoted: wasVoted,
                  voteCount: wasVoted ? idea.voteCount + 1 : idea.voteCount - 1,
                }
              : idea
          )
        );
        toast.error("Failed to vote. Please try again.");
      }
    },
    []
  );

  /**
   * Verification callback handler - processes URL params after email
   * verification Note: `ideas` intentionally excluded from deps - refreshData()
   * fetches fresh data before usage
   */
  useEffect(() => {
    const verified = searchParams.get("verified");
    const error = searchParams.get("error");
    const action = searchParams.get("action");
    const ideaId = searchParams.get("ideaId");

    // Track if effect is still active for cleanup
    let isActive = true;

    const handleVerificationCallback = async () => {
      if (error) {
        // Clear error param
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("error");
        const newUrl = newParams.toString()
          ? `${pathname}?${newParams.toString()}`
          : pathname;
        router.replace(newUrl);

        // Show specific error message based on error type
        const errorMessages: Record<string, string> = {
          invalid_token:
            "Verification link expired or invalid. Please request a new one.",
          verification_failed: "Email verification failed. Please try again.",
        };
        toast.error(
          errorMessages[error] || "Email verification failed. Please try again."
        );
        return;
      }

      if (verified === "true") {
        await refreshData();

        // Guard against state updates after unmount
        if (!isActive) return;

        // Handle pending action from callback URL
        if (action === "vote" && ideaId) {
          const idea = ideas.find((i) => i.id === ideaId);
          await executeVote(
            ideaId,
            idea || {
              id: ideaId,
              hasVoted: false,
              voteCount: 0,
              title: "",
              status: "UNDER_REVIEW" as const,
            }
          );
        } else if (action === "submit") {
          setSubmitDialogOpen(true);
        } else {
          toast.success("Email verified! You can now vote and submit ideas.");
        }

        // Guard against state updates after unmount
        if (!isActive) return;

        // Clear all verification-related query params
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("verified");
        newParams.delete("action");
        newParams.delete("ideaId");
        const newUrl = newParams.toString()
          ? `${pathname}?${newParams.toString()}`
          : pathname;
        router.replace(newUrl);
      }
    };

    handleVerificationCallback();

    return () => {
      isActive = false;
    };
    /** `ideas` intentionally excluded, see comment above */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pathname, router, refreshData, executeVote]);

  // Vote handler
  const handleVote = async (ideaId: string) => {
    if (!isAuthenticated) {
      setPendingAction({ type: "vote", ideaId });
      setAuthDialogOpen(true);
      return;
    }

    const idea = ideas.find((i) => i.id === ideaId);
    await executeVote(ideaId, idea);
  };

  // Submit handler
  const handleSubmitClick = () => {
    if (!isAuthenticated) {
      setPendingAction({ type: "submit" });
      setAuthDialogOpen(true);
      return;
    }
    setSubmitDialogOpen(true);
  };

  const handleSubmitSuccess = async () => {
    setSubmitDialogOpen(false);
    await refreshData();
    toast.success("Idea submitted!");
    // Notify parent to potentially close panel
    notifyParent({ type: "plaudera:submitted" });
  };

  // Notify parent window
  // Security: Use document.referrer to determine parent origin instead of wildcard
  const notifyParent = (message: { type: string; [key: string]: unknown }) => {
    if (window.parent !== window) {
      // Get parent origin from referrer for secure messaging
      // This prevents message leakage to potentially malicious parent frames
      const parentOrigin = document.referrer
        ? new URL(document.referrer).origin
        : null;

      if (parentOrigin) {
        window.parent.postMessage(message, parentOrigin);
      } else {
        // Fallback: if no referrer (privacy settings), log but don't send to wildcard
        console.warn(
          "[Plaudera] Cannot determine parent origin, skipping postMessage"
        );
      }
    }
  };

  const boardUrl = `${appConfig.seo.siteUrl}/b/${workspaceSlug}`;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{workspaceName}</h1>
        <Button size="sm" onClick={handleSubmitClick}>
          <Plus className="mr-1 h-4 w-4" />
          Submit Idea
        </Button>
      </div>

      {/* Ideas list */}
      <div className="flex-1 space-y-2 overflow-auto">
        {ideas.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No ideas yet. Be the first to submit one!
          </div>
        ) : (
          ideas.map((idea) => (
            <CompactIdeaRow
              key={idea.id}
              idea={idea}
              onVote={() => handleVote(idea.id)}
            />
          ))
        )}
      </div>

      {/* View all link */}
      <div className="mt-4 border-t pt-3 text-center">
        <a
          href={boardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground inline-flex items-center text-xs transition-colors"
        >
          View all ideas
          <ExternalLink className="ml-1 h-3 w-3" />
        </a>
      </div>

      {/* Dialogs */}
      <ContributorAuthDialog
        open={authDialogOpen}
        onOpenChange={(open) => {
          setAuthDialogOpen(open);
          if (!open) setPendingAction(null);
        }}
        callbackUrl={getCallbackUrl()}
      />

      <IdeaSubmissionDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        onSubmit={async (title, description) => {
          const res = await fetch(`/api/public/${workspaceId}/ideas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Failed to submit idea");
          }
          await handleSubmitSuccess();
        }}
      />
    </div>
  );
}

// Compact idea row component
function CompactIdeaRow({
  idea,
  onVote,
}: {
  idea: CompactIdea;
  onVote: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const statusConfig = IDEA_STATUS_CONFIG[idea.status];

  return (
    <div className="bg-card flex items-center gap-3 rounded-lg border p-3">
      {/* Vote button */}
      <button
        onClick={() => startTransition(() => onVote())}
        disabled={isPending}
        className={cn(
          "flex flex-col items-center rounded-lg px-2 py-1 transition-colors",
          idea.hasVoted
            ? "bg-primary/10 text-primary"
            : "bg-muted hover:bg-muted/80 text-muted-foreground"
        )}
      >
        <ChevronUp className="h-4 w-4" />
        <span className="text-sm font-medium">{idea.voteCount}</span>
      </button>

      {/* Title and status */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{idea.title}</p>
        <span
          className={cn(
            "text-xs",
            statusConfig.variant === "destructive" && "text-destructive",
            statusConfig.variant === "default" && "text-primary",
            statusConfig.variant === "secondary" && "text-muted-foreground",
            statusConfig.variant === "outline" && "text-muted-foreground"
          )}
        >
          {statusConfig.label}
        </span>
      </div>
    </div>
  );
}
