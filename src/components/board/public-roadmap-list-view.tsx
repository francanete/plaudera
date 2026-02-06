"use client";

import { useMemo, useState } from "react";
import { ThumbsUp, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { RoadmapStatus } from "@/lib/db/schema";
import type { RoadmapIdeaCardData } from "./roadmap-idea-card";
import {
  VISIBLE_ROADMAP_STATUSES,
  ROADMAP_STATUS_CONFIG,
} from "@/lib/roadmap-status-config";

interface PublicRoadmapListViewProps {
  ideas: RoadmapIdeaCardData[];
}

type TabValue = "all" | RoadmapStatus;

export function PublicRoadmapListView({ ideas }: PublicRoadmapListViewProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("all");

  const filteredIdeas = useMemo(
    () =>
      activeTab === "all"
        ? ideas
        : ideas.filter((idea) => idea.roadmapStatus === activeTab),
    [ideas, activeTab]
  );

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: ideas.length };
    for (const status of VISIBLE_ROADMAP_STATUSES) {
      counts[status] = ideas.filter(
        (idea) => idea.roadmapStatus === status
      ).length;
    }
    return counts;
  }, [ideas]);

  if (ideas.length === 0) {
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
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as TabValue)}
    >
      <div className="overflow-x-auto">
        <TabsList>
          <TabsTrigger value="all">
            All
            <span className="ml-1 rounded-full bg-slate-200/60 px-1.5 py-0.5 text-xs tabular-nums dark:bg-slate-700">
              {countByStatus.all}
            </span>
          </TabsTrigger>
          {VISIBLE_ROADMAP_STATUSES.map((status) => {
            const config = ROADMAP_STATUS_CONFIG[status];
            return (
              <TabsTrigger key={status} value={status}>
                {config.label}
                <span className="ml-1 rounded-full bg-slate-200/60 px-1.5 py-0.5 text-xs tabular-nums dark:bg-slate-700">
                  {countByStatus[status]}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      <TabsContent value={activeTab}>
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Feature</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Votes</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Description
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIdeas.map((idea) => {
                const config = ROADMAP_STATUS_CONFIG[idea.roadmapStatus];
                const Icon = config.icon;
                const previewText = idea.featureDetails || idea.description;

                return (
                  <TableRow key={idea.id} className="group">
                    <TableCell className="pl-4">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {idea.title}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={config.badgeClassName}
                      >
                        <Icon className="mr-1 h-3 w-3" />
                        {config.shortLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium tabular-nums">
                          {idea.voteCount}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-xs sm:table-cell">
                      {previewText && (
                        <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                          {previewText}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="border-t border-slate-200 px-4 py-3 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Showing {filteredIdeas.length} of {ideas.length} total items
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
