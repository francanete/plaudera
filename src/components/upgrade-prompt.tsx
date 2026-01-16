"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UpgradePromptProps {
  title?: string;
  description?: string;
  compact?: boolean;
}

export function UpgradePrompt({
  title = "Upgrade to unlock",
  description = "This feature requires a paid plan.",
  compact,
}: UpgradePromptProps) {
  if (compact) {
    return (
      <div className="text-muted-foreground flex items-center gap-2">
        <Lock className="h-4 w-4" />
        <span>Paid feature</span>
        <Button variant="link" size="sm" asChild>
          <Link href="/pricing">Upgrade</Link>
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{description}</p>
        <Button asChild>
          <Link href="/pricing">View Plans</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
