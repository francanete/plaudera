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
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="bg-primary/10 rounded-full p-3">
          <Globe className="text-primary h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Your Public Board</h3>
          <p className="text-muted-foreground truncate text-sm">{boardUrl}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
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
          <Button size="sm" asChild>
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
