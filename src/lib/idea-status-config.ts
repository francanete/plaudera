import type { IdeaStatus } from "@/lib/db/schema";
import { CheckCircle, GitMerge, Search, XCircle } from "lucide-react";

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
 * Includes label, badge variant, and icon for each status.
 */
export const IDEA_STATUS_CONFIG: Record<
  IdeaStatus,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    icon: typeof Search;
  }
> = {
  UNDER_REVIEW: { label: "Under Review", variant: "outline", icon: Search },
  PUBLISHED: { label: "Published", variant: "default", icon: CheckCircle },
  DECLINED: { label: "Declined", variant: "destructive", icon: XCircle },
  MERGED: { label: "Merged", variant: "secondary", icon: GitMerge },
};
