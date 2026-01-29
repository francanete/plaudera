"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  CheckCircle,
  Search,
  XCircle,
  GitMerge,
} from "lucide-react";
import type { IdeaStatus } from "@/lib/db/schema";
import {
  SELECTABLE_IDEA_STATUSES,
  IDEA_STATUS_CONFIG,
} from "@/lib/idea-status-config";

// Status configuration with semantic colors
// Using satisfies for exhaustiveness checking - TypeScript will error if new IdeaStatus values are added
const STATUS_STYLES = {
  UNDER_REVIEW: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    iconColor: "text-amber-500",
  },
  PUBLISHED: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    iconColor: "text-emerald-500",
  },
  DECLINED: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
    iconColor: "text-red-500",
  },
  MERGED: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    iconColor: "text-slate-500",
  },
} satisfies Record<IdeaStatus, { bg: string; text: string; iconColor: string }>;

const STATUS_ICONS = {
  UNDER_REVIEW: Search,
  PUBLISHED: CheckCircle,
  DECLINED: XCircle,
  MERGED: GitMerge,
} satisfies Record<IdeaStatus, typeof CheckCircle>;

export interface StatusBadgeProps {
  status: IdeaStatus;
  onChange?: (status: IdeaStatus) => void;
  disabled?: boolean;
}

export function StatusBadge({
  status,
  onChange,
  disabled = false,
}: StatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const styles = STATUS_STYLES[status];
  const Icon = STATUS_ICONS[status];
  const config = IDEA_STATUS_CONFIG[status];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!disabled) setIsOpen(!isOpen);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelect = (newStatus: IdeaStatus) => {
    onChange?.(newStatus);
    setIsOpen(false);
  };

  if (disabled) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${styles.bg} ${styles.text}`}
      >
        <Icon className={`h-3.5 w-3.5 ${styles.iconColor}`} />
        <span>{config.label}</span>
      </span>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onKeyDown={handleKeyDown}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 ${styles.bg} ${styles.text} focus:ring-primary hover:opacity-80 focus:ring-2 focus:ring-offset-2 focus:outline-none`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Icon className={`h-3.5 w-3.5 ${styles.iconColor}`} />
        <span>{config.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className="border-border bg-popover absolute top-full left-0 z-50 mt-1 w-40 rounded-lg border py-1 shadow-lg"
          role="listbox"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {SELECTABLE_IDEA_STATUSES.map((statusKey) => {
            const itemStyles = STATUS_STYLES[statusKey];
            const ItemIcon = STATUS_ICONS[statusKey];
            const itemConfig = IDEA_STATUS_CONFIG[statusKey];
            return (
              <button
                key={statusKey}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(statusKey);
                }}
                className={`hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${status === statusKey ? "bg-accent" : ""}`}
                role="option"
                aria-selected={status === statusKey}
              >
                <ItemIcon className={`h-4 w-4 ${itemStyles.iconColor}`} />
                <span className={itemStyles.text}>{itemConfig.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
