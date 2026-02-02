"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ExpandableTextProps {
  children: ReactNode;
  maxLines?: number;
  className?: string;
}

export function ExpandableText({
  children,
  maxLines = 3,
  className,
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      // Check if content is clamped (overflowing)
      setIsClamped(el.scrollHeight > el.clientHeight);
    }
  }, [children]);

  return (
    <div className={className}>
      <div
        ref={contentRef}
        className={cn(!isExpanded && "line-clamp-[var(--max-lines)]")}
        style={{ "--max-lines": maxLines } as React.CSSProperties}
      >
        {children}
      </div>
      {isClamped && !isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="mt-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Show more
        </button>
      )}
      {isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="mt-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Show less
        </button>
      )}
    </div>
  );
}
