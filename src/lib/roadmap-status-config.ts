import type { RoadmapStatus } from "@/lib/db/schema";
import { CheckCircle2, Circle, Clock, Rocket } from "lucide-react";

/**
 * All valid roadmap statuses in order of progression.
 * Use this for validation and complete status lists.
 */
export const ALL_ROADMAP_STATUSES: RoadmapStatus[] = [
  "NONE",
  "PLANNED",
  "IN_PROGRESS",
  "RELEASED",
];

/**
 * Roadmap statuses that indicate an idea is on the roadmap.
 * Excludes NONE (not on roadmap).
 * Used for public board filtering and roadmap view display.
 */
export const VISIBLE_ROADMAP_STATUSES: RoadmapStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "RELEASED",
];

/**
 * Unified roadmap status configuration for display across the app.
 * Includes label, badge variant, icon, and className for styling.
 */
export const ROADMAP_STATUS_CONFIG: Record<
  RoadmapStatus,
  {
    label: string;
    shortLabel: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    icon: typeof Circle;
    badgeClassName: string;
    textColor: string;
  }
> = {
  NONE: {
    label: "Not on roadmap",
    shortLabel: "None",
    variant: "outline",
    icon: Circle,
    badgeClassName:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
    textColor: "text-slate-600 dark:text-slate-400",
  },
  PLANNED: {
    label: "Planned",
    shortLabel: "Planned",
    variant: "default",
    icon: Clock,
    badgeClassName:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-400",
    textColor: "text-blue-700 dark:text-blue-400",
  },
  IN_PROGRESS: {
    label: "In Progress",
    shortLabel: "In Progress",
    variant: "default",
    icon: Rocket,
    badgeClassName:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400",
    textColor: "text-amber-700 dark:text-amber-400",
  },
  RELEASED: {
    label: "Released",
    shortLabel: "Released",
    variant: "default",
    icon: CheckCircle2,
    badgeClassName:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-400",
    textColor: "text-green-700 dark:text-green-400",
  },
};

/**
 * Icon background/text color pairs for roadmap status selector UI.
 * Used in the status dropdown across roadmap create and detail pages.
 */
export const ROADMAP_ICON_COLORS: Record<
  RoadmapStatus,
  { bg: string; text: string }
> = {
  NONE: {
    bg: "bg-slate-100 dark:bg-slate-900/50",
    text: "text-slate-600 dark:text-slate-400",
  },
  PLANNED: {
    bg: "bg-blue-100 dark:bg-blue-900/50",
    text: "text-blue-600 dark:text-blue-400",
  },
  IN_PROGRESS: {
    bg: "bg-amber-100 dark:bg-amber-900/50",
    text: "text-amber-600 dark:text-amber-400",
  },
  RELEASED: {
    bg: "bg-green-100 dark:bg-green-900/50",
    text: "text-green-600 dark:text-green-400",
  },
};

/**
 * Check if a roadmap status is visible (on the roadmap).
 */
export function isOnRoadmap(status: RoadmapStatus): boolean {
  return status !== "NONE";
}
