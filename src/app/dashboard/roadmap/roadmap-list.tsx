"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ThumbsUp, Map } from "lucide-react";
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
import type { Idea, RoadmapStatus } from "@/lib/db/schema";
import {
  VISIBLE_ROADMAP_STATUSES,
  ROADMAP_STATUS_CONFIG,
} from "@/lib/roadmap-status-config";

interface RoadmapListProps {
  ideas: Idea[];
}

type TabValue = "all" | RoadmapStatus;

export function RoadmapList({ ideas }: RoadmapListProps) {
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
      <div className="border-border bg-card rounded-xl border-2 border-dashed">
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <div className="mb-4 rounded-lg bg-indigo-100 p-3 dark:bg-indigo-900/30">
            <Map className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-foreground mb-2 text-lg font-semibold">
            No items on your roadmap
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md text-center">
            Move ideas from the Ideas page to start building your roadmap. Once
            an idea is on the roadmap, it will appear here grouped by status.
          </p>
        </div>
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
            <span className="bg-foreground/10 ml-1 rounded-full px-1.5 py-0.5 text-xs tabular-nums">
              {countByStatus.all}
            </span>
          </TabsTrigger>
          {VISIBLE_ROADMAP_STATUSES.map((status) => {
            const config = ROADMAP_STATUS_CONFIG[status];
            return (
              <TabsTrigger key={status} value={status}>
                {config.label}
                <span className="bg-foreground/10 ml-1 rounded-full px-1.5 py-0.5 text-xs tabular-nums">
                  {countByStatus[status]}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      <TabsContent value={activeTab}>
        <div className="border-border bg-card rounded-xl border">
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
                      <Link
                        href={`/dashboard/roadmap/${idea.id}`}
                        className="text-foreground group-hover:text-primary font-semibold transition-colors"
                      >
                        {idea.title}
                      </Link>
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
                      <div className="text-muted-foreground flex items-center gap-1">
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium tabular-nums">
                          {idea.voteCount}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-xs sm:table-cell">
                      {previewText && (
                        <p className="text-muted-foreground truncate text-sm">
                          {previewText}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="text-muted-foreground border-t px-4 py-3 text-center text-xs">
            Showing {filteredIdeas.length} of {ideas.length} total ideas
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
