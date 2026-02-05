"use client";

import Link from "next/link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, GitMerge } from "lucide-react";

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
      <CollapsibleTrigger className="group text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
        <ChevronRight
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
        />
        <GitMerge className="h-4 w-4" />
        <span className="text-sm">
          <span className="font-mono tabular-nums">{items.length}</span>
          {" merged idea"}
          {items.length > 1 ? "s" : ""}
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-border mt-2 ml-1 space-y-0 border-l pl-5">
          {items.map((child) => (
            <Link
              key={child.id}
              href={`/dashboard/ideas/${child.id}`}
              className="text-muted-foreground hover:text-foreground relative block py-1.5 text-sm transition-colors"
            >
              <div className="bg-border absolute top-1/2 -left-[17px] h-1.5 w-1.5 -translate-y-1/2 rounded-full" />
              {child.title}
            </Link>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
