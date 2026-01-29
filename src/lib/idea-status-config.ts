import type { IdeaStatus } from "@/lib/db/schema";
import { Check, GitMerge, Search, XCircle } from "lucide-react";

/**
 * All valid idea statuses in order.
 * Use this for validation and complete status lists.
 */
export const ALL_IDEA_STATUSES: IdeaStatus[] = [
  "UNDER_REVIEW",
  "PUBLISHED",
  "DECLINED",
  "MERGED",
];

/**
 * Statuses available for manual selection in dropdowns.
 * MERGED is excluded because it requires the dedicated merge flow.
 */
export const SELECTABLE_IDEA_STATUSES: IdeaStatus[] = [
  "UNDER_REVIEW",
  "PUBLISHED",
  "DECLINED",
];

/**
 * Unified status configuration for display across the app.
 * Includes label, badge variant (for dashboard), badgeClassName (for public board), and icon.
 */
export const IDEA_STATUS_CONFIG: Record<
  IdeaStatus,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    icon: typeof Search;
    badgeClassName: string;
  }
> = {
  UNDER_REVIEW: {
    label: "Under Review",
    variant: "outline",
    icon: Search,
    badgeClassName:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-400",
  },
  PUBLISHED: {
    label: "Open for voting",
    variant: "default",
    icon: Check,
    badgeClassName:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
  },
  DECLINED: {
    label: "Declined",
    variant: "destructive",
    icon: XCircle,
    badgeClassName:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-400",
  },
  MERGED: {
    label: "Merged",
    variant: "secondary",
    icon: GitMerge,
    badgeClassName:
      "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-400",
  },
};
