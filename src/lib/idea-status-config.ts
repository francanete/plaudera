import type { IdeaStatus } from "@/lib/db/schema";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  GitMerge,
  Lightbulb,
  PlayCircle,
  Search,
  XCircle,
} from "lucide-react";

/**
 * All valid idea statuses in order.
 * Use this for validation and complete status lists.
 */
export const ALL_IDEA_STATUSES: IdeaStatus[] = [
  "PENDING",
  "NEW",
  "UNDER_REVIEW",
  "PLANNED",
  "IN_PROGRESS",
  "DONE",
  "DECLINED",
  "MERGED",
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
    icon: typeof AlertCircle;
  }
> = {
  PENDING: { label: "Pending Review", variant: "outline", icon: AlertCircle },
  NEW: { label: "New", variant: "default", icon: Lightbulb },
  UNDER_REVIEW: { label: "Under Review", variant: "secondary", icon: Search },
  PLANNED: { label: "Planned", variant: "outline", icon: Clock },
  IN_PROGRESS: { label: "In Progress", variant: "secondary", icon: PlayCircle },
  DONE: { label: "Done", variant: "default", icon: CheckCircle },
  DECLINED: { label: "Declined", variant: "destructive", icon: XCircle },
  MERGED: { label: "Merged", variant: "secondary", icon: GitMerge },
};
