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
    <Card
      id="tour-public-board"
      className="border-gray-200 bg-gray-50 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
    >
      <CardContent className="flex flex-col items-start gap-4 py-4 sm:flex-row sm:items-center">
        <div className="rounded-full bg-gray-200 p-3 dark:bg-gray-700">
          <Globe className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Your Public Board</h3>
          <p className="text-muted-foreground truncate text-sm">{boardUrl}</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex-1 sm:flex-none"
          >
            {copied ? (
              <>
                <Check className="mr-1 h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1 h-4 w-4" />
                Copy
              </>
            )}
          </Button>
          <Button size="sm" asChild className="flex-1 sm:flex-none">
            <a href={boardUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" />
              Open
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
