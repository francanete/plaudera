"use client";

import { useState, useCallback, useEffect, useTransition, useRef } from "react";
import { useContributorLogout } from "@/hooks/use-contributor-logout";
import { toast } from "sonner";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ContributorAuthDialog } from "@/components/board/contributor-auth-dialog";
import { IdeaSubmissionDialog } from "@/components/board/idea-submission-dialog";
import { ChevronUp, Plus, ExternalLink, User, LogOut, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IdeaStatus, RoadmapStatus } from "@/lib/db/schema";
import { IDEA_STATUS_CONFIG } from "@/lib/idea-status-config";
import {
  ROADMAP_STATUS_CONFIG,
  isOnRoadmap,
} from "@/lib/roadmap-status-config";
import { appConfig } from "@/lib/config";
import { getBoardUrl } from "@/lib/board-url";

type PendingAction =
  | { type: "vote"; ideaId: string }
  | { type: "submit" }
  | null;

interface CompactIdea {
  id: string;
  title: string;
  status: IdeaStatus;
  roadmapStatus: RoadmapStatus;
  voteCount: number;
  hasVoted: boolean;
}

interface EmbedBoardProps {
  workspaceName: string;
  workspaceDescription: string | null;
  workspaceId: string;
  workspaceSlug: string;
  initialIdeas: CompactIdea[];
  initialContributor: { email: string; id: string } | null;
}

export function EmbedBoard({
  workspaceName,
  workspaceDescription,
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

  const verifiedParentOriginRef = useRef<string | null>(null);
  const isAuthenticated = contributor !== null;

  // Refresh data after auth/actions
  const refreshData = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/${workspaceId}/ideas`);
      if (!res.ok) return;
      const data = await res.json();
      setIdeas(
        data.ideas
          .filter(
            (idea: CompactIdea & { description?: string }) =>
              !isOnRoadmap(idea.roadmapStatus)
          )
          .slice(0, 10)
          .map((idea: CompactIdea & { description?: string }) => ({
            id: idea.id,
            title: idea.title,
            status: idea.status,
            roadmapStatus: idea.roadmapStatus,
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
  // Redirect to public board (/b/{slug}) instead of embed page, because the
  // verification link opens in a full browser tab — the embed page looks broken
  // outside the customer's iframe, while the public board is a proper full-page view.
  const getCallbackUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (pendingAction?.type === "vote") {
      params.set("action", "vote");
      params.set("ideaId", pendingAction.ideaId);
    } else if (pendingAction?.type === "submit") {
      params.set("action", "submit");
    }
    const search = params.toString();
    const boardPath = `/b/${workspaceSlug}`;
    return search ? `${boardPath}?${search}` : boardPath;
  }, [workspaceSlug, pendingAction]);

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
              roadmapStatus: "NONE" as const,
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

  // Notify parent window
  // Security: Prefer server-verified origin, fall back to document.referrer,
  // and only use '*' for the non-sensitive ready signal as a last resort.
  const notifyParent = useCallback(
    (message: { type: string; [key: string]: unknown }) => {
      if (window.parent === window) return;

      // 1. Prefer the server-verified origin (set after a successful identify call)
      const verified = verifiedParentOriginRef.current;
      if (verified) {
        window.parent.postMessage(message, verified);
        return;
      }

      // 2. Fall back to document.referrer (works when Referrer-Policy allows it)
      const referrerOrigin = document.referrer
        ? new URL(document.referrer).origin
        : null;
      if (referrerOrigin) {
        window.parent.postMessage(message, referrerOrigin);
        return;
      }

      // 3. For the non-sensitive ready signal only, use '*' so the parent
      //    can initiate the identify handshake even without a referrer
      if (message.type === "plaudera:ready") {
        window.parent.postMessage(message, "*");
        return;
      }

      console.warn(
        "[Plaudera] Cannot determine parent origin, skipping postMessage"
      );
    },
    []
  );

  // Emit ready signal to parent when mounted
  useEffect(() => {
    notifyParent({ type: "plaudera:ready" });
  }, [notifyParent]);

  // Listen for incoming messages from parent (e.g. identify)
  // No document.referrer gate — the server validates callerOrigin against the
  // workspace's allowlist, so we can safely accept messages from any origin.
  useEffect(() => {
    const handleParentMessage = async (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;

      if (event.data.type === "plaudera:identify") {
        const { email, name } = event.data.payload || {};
        if (!email || typeof email !== "string") return;

        // Skip if already authenticated with the same email
        if (contributor && contributor.email === email.toLowerCase().trim()) {
          notifyParent({
            type: "plaudera:identified",
            payload: { email: contributor.email, id: contributor.id },
          });
          return;
        }

        try {
          const res = await fetch("/api/contributor/identify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              name: name || undefined,
              workspaceId,
              callerOrigin: event.origin,
            }),
          });

          if (!res.ok) {
            console.error("[EmbedBoard] Trusted identify failed:", res.status);
            return;
          }

          const data = await res.json();
          if (data.contributor) {
            // Server confirmed this origin is in the workspace allowlist —
            // safe to use for future postMessage targeting
            verifiedParentOriginRef.current = event.origin;
            setContributor(data.contributor);
            await refreshData();
            notifyParent({
              type: "plaudera:identified",
              payload: data.contributor,
            });
          }
        } catch (error) {
          console.error("[EmbedBoard] Trusted identify error:", error);
        }
      }
    };

    window.addEventListener("message", handleParentMessage);
    return () => window.removeEventListener("message", handleParentMessage);
  }, [contributor, workspaceId, notifyParent, refreshData]);

  // Logout handler - uses shared hook for proper cross-origin cookie handling
  const { logout: handleLogout, isLoggingOut } = useContributorLogout({
    onSuccess: () => {
      setContributor(null);
      notifyParent({ type: "plaudera:logout" });
    },
  });

  const handleSubmitSuccess = async () => {
    setSubmitDialogOpen(false);
    await refreshData();
    toast.success("Idea submitted!");
    // Notify parent to potentially close panel
    notifyParent({ type: "plaudera:submitted" });
  };

  const boardUrl = getBoardUrl(workspaceSlug);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="truncate text-lg font-semibold">{workspaceName}</h1>
          <Button size="sm" onClick={handleSubmitClick}>
            <Plus className="mr-1 h-4 w-4" />
            Submit Idea
          </Button>
        </div>

        {/* Description */}
        {workspaceDescription && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {workspaceDescription}
          </p>
        )}

        {/* Auth UI */}
        {contributor ? (
          <div className="bg-muted/50 flex items-center justify-between rounded-md border px-2 py-1.5 text-xs">
            <span className="text-muted-foreground max-w-40 truncate">
              <User className="mr-1 inline-block h-3 w-3" />
              {contributor.email}
            </span>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-muted-foreground hover:text-destructive ml-2 shrink-0 transition-colors disabled:opacity-50"
            >
              <LogOut className="h-3 w-3" />
              <span className="sr-only">Sign out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAuthDialogOpen(true)}
            className="bg-muted/50 hover:bg-muted flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <User className="h-3 w-3" />
            Sign in
          </button>
        )}
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

      {/* Footer links */}
      <div className="mt-4 flex items-center justify-center gap-4 border-t pt-3">
        <a
          href={boardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground inline-flex items-center text-xs transition-colors"
        >
          View all ideas
          <ExternalLink className="ml-1 h-3 w-3" />
        </a>
        <a
          href={`${boardUrl}/roadmap`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground inline-flex items-center text-xs transition-colors"
        >
          <Map className="mr-1 h-3 w-3" />
          View roadmap
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
        workspaceId={workspaceId}
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
  const showRoadmapBadge = isOnRoadmap(idea.roadmapStatus);
  const roadmapConfig = showRoadmapBadge
    ? ROADMAP_STATUS_CONFIG[idea.roadmapStatus]
    : null;

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
        <div className="flex items-center gap-2">
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
          {roadmapConfig && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                roadmapConfig.badgeClassName
              )}
            >
              <roadmapConfig.icon className="h-2.5 w-2.5" />
              {roadmapConfig.shortLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
