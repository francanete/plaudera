"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useContributorLogout } from "@/hooks/use-contributor-logout";
import { BoardHeader } from "@/components/board/board-header";
import { ContributorAuthDialog } from "@/components/board/contributor-auth-dialog";
import { IdeaSubmissionDialog } from "@/components/board/idea-submission-dialog";
import type { BoardView } from "@/components/board/board-header";
import { BoardProvider } from "./board-context";

type PendingAction =
  | { type: "vote"; ideaId: string }
  | { type: "submit" }
  | null;

interface BoardLayoutClientProps {
  slug: string;
  workspaceName: string;
  workspaceDescription: string | null;
  workspaceId: string;
  isSubdomain: boolean;
  initialContributor: { email: string; id: string } | null;
  children: React.ReactNode;
}

export function BoardLayoutClient({
  slug,
  workspaceName,
  workspaceDescription,
  workspaceId,
  isSubdomain,
  initialContributor,
  children,
}: BoardLayoutClientProps) {
  const [contributor, setContributor] = useState(initialContributor);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isAuthenticated = contributor !== null;
  const activeView: BoardView = pathname.endsWith("/roadmap")
    ? "roadmap"
    : "ideas";

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/${workspaceId}/ideas`);
      if (!res.ok) {
        toast.error("Failed to refresh data. Please reload the page.");
        return;
      }
      const data = await res.json();
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

      const { voted } = await res.json();
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

    const handleVerificationCallback = async () => {
      if (verified === "true") {
        await refreshData();
        router.refresh();

        if (action === "vote" && ideaId) {
          await handleVoteAfterAuth(ideaId);
        } else if (action === "submit") {
          setSubmitDialogOpen(true);
        }

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

    toast.success("Idea submitted successfully!");
    router.refresh();
  };

  const getCallbackUrl = () => {
    const params = new URLSearchParams();
    if (pendingAction?.type === "vote") {
      params.set("action", "vote");
      params.set("ideaId", pendingAction.ideaId);
    } else if (pendingAction?.type === "submit") {
      params.set("action", "submit");
    }
    const search = params.toString();
    // Use canonical /b/{slug} path instead of pathname — on subdomain routing
    // pathname is "/" which fails callback URL validation
    const boardPath = `/b/${slug}`;
    return search ? `${boardPath}?${search}` : boardPath;
  };

  return (
    <div className="w-full">
      <div className="-mx-4 sm:-mx-6">
        <BoardHeader
          workspaceName={workspaceName}
          workspaceDescription={workspaceDescription}
          onSubmitIdea={handleSubmitIdea}
          contributor={contributor}
          onLogout={handleLogout}
          onLogin={handleLogin}
          activeView={activeView}
          slug={slug}
          isSubdomain={isSubdomain}
        />
      </div>

      <BoardProvider
        value={{
          contributor,
          workspaceId,
          isSubdomain,
          requireAuth: handleRequireAuth,
        }}
      >
        {children}
      </BoardProvider>

      <ContributorAuthDialog
        open={authDialogOpen}
        onOpenChange={(open) => {
          setAuthDialogOpen(open);
          if (!open) setPendingAction(null);
        }}
        callbackUrl={getCallbackUrl()}
        workspaceId={workspaceId}
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
