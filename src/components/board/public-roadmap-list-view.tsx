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
import { RoadmapDetailPanel } from "./roadmap-detail-panel";
import { cn } from "@/lib/utils";

interface PublicRoadmapListViewProps {
  ideas: RoadmapIdeaCardData[];
}

type TabValue = "all" | RoadmapStatus;

export function PublicRoadmapListView({ ideas }: PublicRoadmapListViewProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  // Derive the selected idea from the array — stays in sync automatically
  const selectedIdea = selectedIdeaId
    ? (ideas.find((i) => i.id === selectedIdeaId) ?? null)
    : null;

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

  const handleRowClick = (idea: RoadmapIdeaCardData) => {
    setSelectedIdeaId((prev) => (prev === idea.id ? null : idea.id));
  };

  const handleClosePanel = () => {
    setSelectedIdeaId(null);
  };

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
    <>
      <div className="flex gap-4">
        {/* List side */}
        <div className="min-w-0 flex-1">
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
                      const previewText =
                        idea.featureDetails || idea.description;

                      return (
                        <TableRow
                          key={idea.id}
                          tabIndex={0}
                          role="button"
                          aria-expanded={selectedIdea?.id === idea.id}
                          className={cn(
                            "group cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:outline-none",
                            selectedIdea?.id === idea.id
                              ? "bg-slate-100 dark:bg-slate-700/50"
                              : "hover:bg-slate-50 dark:hover:bg-slate-700/30"
                          )}
                          onClick={() => handleRowClick(idea)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleRowClick(idea);
                            }
                          }}
                        >
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
        </div>

        {/* Desktop detail panel — inline, sticky */}
        {selectedIdea && (
          <div className="sticky top-20 hidden w-[400px] shrink-0 self-start sm:block">
            <div className="max-h-[calc(100vh-100px)] overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
              <RoadmapDetailPanel
                idea={selectedIdea}
                onClose={handleClosePanel}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile full-screen overlay */}
      {selectedIdea && (
        <div className="fixed inset-0 z-50 bg-white sm:hidden dark:bg-slate-900">
          <RoadmapDetailPanel idea={selectedIdea} onClose={handleClosePanel} />
        </div>
      )}
    </>
  );
}
