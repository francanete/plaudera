"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PollResponseItem {
  id: string;
  response: string;
  createdAt: string | Date;
  contributor: { id: string; email: string; name: string | null } | null;
  linkedIdea: { id: string; title: string } | null;
}

interface PollResponseListProps {
  responses: PollResponseItem[];
  pollId: string;
}

export function PollResponseList({ responses, pollId }: PollResponseListProps) {
  if (responses.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
        No responses yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {responses.map((response) => (
        <ResponseCard key={response.id} response={response} pollId={pollId} />
      ))}
    </div>
  );
}

function ResponseCard({
  response,
  pollId,
}: {
  response: PollResponseItem;
  pollId: string;
}) {
  const router = useRouter();
  const [isLinking, setIsLinking] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [ideaId, setIdeaId] = useState("");

  const handleLink = async () => {
    if (!ideaId.trim()) return;
    setIsLinking(true);

    try {
      const res = await fetch(`/api/polls/${pollId}/responses/${response.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedIdeaId: ideaId.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to link");
      }

      toast.success("Linked to idea");
      setShowLinkInput(false);
      setIdeaId("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to link");
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async () => {
    setIsLinking(true);
    try {
      const res = await fetch(`/api/polls/${pollId}/responses/${response.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedIdeaId: null }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to unlink");
      }

      toast.success("Unlinked");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unlink");
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm">{response.response}</p>
          <p className="text-muted-foreground mt-2 text-xs">
            {response.contributor?.email ?? "Unknown"} ·{" "}
            {new Date(response.createdAt).toLocaleDateString()}
          </p>
          {response.linkedIdea && (
            <p className="mt-1 text-xs">
              <Link2 className="mr-1 inline-block h-3 w-3" />
              Linked to: {response.linkedIdea.title}
              <button
                onClick={handleUnlink}
                disabled={isLinking}
                className="text-muted-foreground hover:text-destructive ml-1"
              >
                <X className="inline-block h-3 w-3" />
              </button>
            </p>
          )}
        </div>

        {!response.linkedIdea && !showLinkInput && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLinkInput(true)}
          >
            <Link2 className="mr-1 h-4 w-4" />
            Link
          </Button>
        )}
      </div>

      {showLinkInput && (
        <div className="mt-3 flex items-center gap-2">
          <Input
            placeholder="Paste idea ID"
            value={ideaId}
            onChange={(e) => setIdeaId(e.target.value)}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            onClick={handleLink}
            disabled={isLinking || !ideaId.trim()}
          >
            {isLinking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowLinkInput(false);
              setIdeaId("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
