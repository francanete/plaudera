"use client";

import { Clock, Rocket, CheckCircle2, Inbox } from "lucide-react";
import { RoadmapIdeaCard, type RoadmapIdeaCardData } from "./roadmap-idea-card";
import type { RoadmapStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

interface RoadmapGroupedViewProps {
  ideas: RoadmapIdeaCardData[];
}

interface ColumnConfig {
  status: RoadmapStatus;
  title: string;
  icon: typeof Clock;
  emptyMessage: string;
  iconColor: string;
  textColor: string;
  countBg: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    status: "PLANNED",
    title: "Planned",
    icon: Clock,
    emptyMessage: "No planned items yet",
    iconColor: "text-blue-600 dark:text-blue-400",
    textColor: "text-blue-600 dark:text-blue-400",
    countBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
  },
  {
    status: "IN_PROGRESS",
    title: "In Progress",
    icon: Rocket,
    emptyMessage: "No items in progress",
    iconColor: "text-orange-600 dark:text-orange-400",
    textColor: "text-orange-600 dark:text-orange-400",
    countBg:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400",
  },
  {
    status: "RELEASED",
    title: "Released",
    icon: CheckCircle2,
    emptyMessage: "No released items yet",
    iconColor: "text-green-600 dark:text-green-400",
    textColor: "text-green-600 dark:text-green-400",
    countBg:
      "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
  },
];

export function RoadmapGroupedView({ ideas }: RoadmapGroupedViewProps) {
  // Group ideas by roadmap status
  const groupedIdeas = COLUMNS.reduce(
    (acc, column) => {
      acc[column.status] = ideas
        .filter((idea) => idea.roadmapStatus === column.status)
        .sort((a, b) => b.voteCount - a.voteCount);
      return acc;
    },
    {} as Record<RoadmapStatus, RoadmapIdeaCardData[]>
  );

  // Check if roadmap is completely empty
  const totalItems = COLUMNS.reduce(
    (sum, col) => sum + groupedIdeas[col.status].length,
    0
  );

  if (totalItems === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 dark:border-slate-600 dark:bg-slate-800">
        <Inbox className="mb-4 h-12 w-12 text-slate-400 dark:text-slate-500" />
        <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
          No items on roadmap
        </h3>
        <p className="max-w-md text-center text-slate-600 dark:text-slate-400">
          Items will appear here when they&apos;re added to the roadmap.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:justify-center lg:gap-6 lg:overflow-x-auto lg:pb-2">
      {COLUMNS.map((column) => {
        const columnIdeas = groupedIdeas[column.status];
        const Icon = column.icon;

        return (
          <div
            key={column.status}
            className="flex shrink-0 flex-col gap-3 lg:max-w-md lg:min-w-[320px] lg:flex-1"
          >
            {/* Column Header */}
            <div className="mb-1 flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <Icon className={cn("h-4 w-4", column.iconColor)} />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {column.title}
                </span>
                <span
                  className={cn(
                    "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium",
                    column.countBg
                  )}
                >
                  {columnIdeas.length}
                </span>
              </div>
            </div>

            {/* Column Content */}
            <div className="flex flex-col gap-3">
              {columnIdeas.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/30 text-center dark:border-slate-700 dark:bg-slate-900/50">
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    {column.emptyMessage}
                  </p>
                </div>
              ) : (
                columnIdeas.map((idea) => (
                  <RoadmapIdeaCard key={idea.id} idea={idea} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
