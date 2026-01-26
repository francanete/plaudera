"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, GitMerge } from "lucide-react";

interface MergedChild {
  id: string;
  title: string;
}

interface IdeaMergedChildrenProps {
  items: MergedChild[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IdeaMergedChildren({
  items,
  isOpen,
  onOpenChange,
}: IdeaMergedChildrenProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <GitMerge className="h-4 w-4" />
          <Badge
            variant="secondary"
            className="border-slate-200 bg-slate-100 text-slate-700"
          >
            {items.length} idea{items.length > 1 ? "s" : ""} merged into this
          </Badge>
          {isOpen ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-1 pl-6">
        {items.map((child) => (
          <Link
            key={child.id}
            href={`/dashboard/ideas/${child.id}`}
            className="block text-sm text-slate-500 transition-colors hover:text-slate-900"
          >
            &bull; {child.title}
          </Link>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
