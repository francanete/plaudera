import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronUp, Clock, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { IdeaStatus, RoadmapStatus } from "@/lib/db/schema";
import {
  ROADMAP_STATUS_CONFIG,
  isOnRoadmap,
} from "@/lib/roadmap-status-config";

interface TopIdea {
  id: string;
  title: string;
  voteCount: number;
  status: IdeaStatus;
  roadmapStatus: RoadmapStatus;
}

interface RecentActivityProps {
  topIdeas: TopIdea[];
}

const STATUS_LABEL: Record<IdeaStatus, string> = {
  PUBLISHED: "Published",
  UNDER_REVIEW: "Under Review",
  DECLINED: "Declined",
  MERGED: "Merged",
};

export function RecentActivity({ topIdeas }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="text-muted-foreground h-5 w-5" />
          Top Voted Ideas
        </CardTitle>
        <Link
          href="/dashboard/ideas"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {topIdeas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
              <Clock className="text-muted-foreground h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-medium">No ideas yet</p>
            <p className="text-muted-foreground text-xs">
              Ideas will appear here once submitted
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {topIdeas.map((idea) => {
              const onRoadmap = isOnRoadmap(idea.roadmapStatus);
              const RoadmapIcon = onRoadmap
                ? ROADMAP_STATUS_CONFIG[idea.roadmapStatus].icon
                : null;
              const roadmapColor = onRoadmap
                ? ROADMAP_STATUS_CONFIG[idea.roadmapStatus].textColor
                : "";
              const roadmapLabel = onRoadmap
                ? ROADMAP_STATUS_CONFIG[idea.roadmapStatus].shortLabel
                : null;

              return (
                <Link
                  key={idea.id}
                  href={`/dashboard/ideas/${idea.id}`}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  {/* Vote count — the hero element */}
                  <div className="flex min-w-[3rem] flex-col items-center rounded-md bg-gray-100 px-2 py-1.5 transition-colors group-hover:bg-gray-200 dark:bg-gray-800 dark:group-hover:bg-gray-700">
                    <ChevronUp className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm leading-tight font-semibold">
                      {idea.voteCount}
                    </span>
                  </div>

                  {/* Title + meta */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{idea.title}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {STATUS_LABEL[idea.status]}
                      </span>
                      {onRoadmap && RoadmapIcon && (
                        <>
                          <span className="text-muted-foreground text-xs">
                            ·
                          </span>
                          <span
                            className={`flex items-center gap-1 text-xs ${roadmapColor}`}
                          >
                            <RoadmapIcon className="h-3 w-3" />
                            {roadmapLabel}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
