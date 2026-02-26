"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Square } from "lucide-react";
import { toast } from "sonner";

interface PollActionsProps {
  pollId: string;
  status: string;
}

export function PollActions({ pollId, status }: PollActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: "activate" | "close") => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/polls/${pollId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${action} poll`);
      }

      toast.success(action === "activate" ? "Poll activated!" : "Poll closed");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "closed") return null;

  return (
    <>
      {status === "draft" && (
        <Button
          size="sm"
          onClick={() => handleAction("activate")}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-1 h-4 w-4" />
          )}
          Activate
        </Button>
      )}
      {status === "active" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction("close")}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Square className="mr-1 h-4 w-4" />
          )}
          Close
        </Button>
      )}
    </>
  );
}
