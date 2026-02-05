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
}

const COLUMNS: ColumnConfig[] = [
  {
    status: "PLANNED",
    title: "Planned",
    icon: Clock,
    emptyMessage: "No planned items yet",
    iconColor: "text-blue-600 dark:text-blue-400",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  {
    status: "IN_PROGRESS",
    title: "In Progress",
    icon: Rocket,
    emptyMessage: "No items in progress",
    iconColor: "text-orange-600 dark:text-orange-400",
    textColor: "text-orange-600 dark:text-orange-400",
  },
  {
    status: "RELEASED",
    title: "Released",
    icon: CheckCircle2,
    emptyMessage: "No released items yet",
    iconColor: "text-green-600 dark:text-green-400",
    textColor: "text-green-600 dark:text-green-400",
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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
      {COLUMNS.map((column) => {
        const columnIdeas = groupedIdeas[column.status];
        const Icon = column.icon;

        return (
          <div key={column.status} className="flex flex-col gap-4">
            {/* Column Header */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <Icon className={cn("h-5 w-5", column.iconColor)} />
                <span className={cn("font-semibold", column.textColor)}>
                  {column.title}
                </span>
              </div>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                {columnIdeas.length}
              </span>
            </div>

            {/* Column Content */}
            <div className="flex flex-col gap-4">
              {columnIdeas.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center dark:border-slate-700 dark:bg-slate-900/50">
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
