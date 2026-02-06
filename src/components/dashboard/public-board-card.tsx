"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, Check, Globe } from "lucide-react";
import { toast } from "sonner";

interface PublicBoardCardProps {
  boardUrl: string;
}

export function PublicBoardCard({ boardUrl }: PublicBoardCardProps) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(boardUrl);
      setCopied(true);
      toast.success("Copied to clipboard!");
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("[PublicBoardCard] Failed to copy:", error);
      toast.error("Failed to copy");
    }
  };

  return (
    <Card id="tour-public-board">
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Globe className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            Your Public Board
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="text-muted-foreground min-w-0 truncate rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">
              {boardUrl}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground shrink-0 rounded p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={copied ? "Copied" : "Copy URL"}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
        <Button size="sm" asChild className="w-full shrink-0 sm:w-auto">
          <a href={boardUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open Board
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
