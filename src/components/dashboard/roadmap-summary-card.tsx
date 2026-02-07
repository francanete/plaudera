import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  ROADMAP_STATUS_CONFIG,
  VISIBLE_ROADMAP_STATUSES,
} from "@/lib/roadmap-status-config";

interface PipelineCounts {
  PLANNED: number;
  IN_PROGRESS: number;
  RELEASED: number;
}

interface WeeklyMomentum {
  PLANNED: number;
  IN_PROGRESS: number;
  RELEASED: number;
}

interface RoadmapSummaryCardProps {
  pipelineCounts: PipelineCounts;
  weeklyMomentum: WeeklyMomentum;
}

function buildMomentumText(momentum: WeeklyMomentum): string {
  const parts: string[] = [];

  if (momentum.RELEASED > 0) {
    parts.push(`${momentum.RELEASED} released`);
  }
  if (momentum.IN_PROGRESS > 0) {
    parts.push(`${momentum.IN_PROGRESS} moved to in progress`);
  }
  if (momentum.PLANNED > 0) {
    parts.push(`${momentum.PLANNED} planned`);
  }

  if (parts.length === 0) {
    return "No roadmap changes this week";
  }

  // Capitalize first letter and join with commas
  const sentence = parts.join(", ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export function RoadmapSummaryCard({
  pipelineCounts,
  weeklyMomentum,
}: RoadmapSummaryCardProps) {
  const totalOnRoadmap =
    pipelineCounts.PLANNED +
    pipelineCounts.IN_PROGRESS +
    pipelineCounts.RELEASED;

  const momentumText = buildMomentumText(weeklyMomentum);
  const hasActivity =
    weeklyMomentum.PLANNED +
      weeklyMomentum.IN_PROGRESS +
      weeklyMomentum.RELEASED >
    0;

  if (totalOnRoadmap === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
            <Map className="text-muted-foreground h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-medium">No roadmap items yet</p>
          <p className="text-muted-foreground text-xs">
            Move ideas to your{" "}
            <Link
              href="/dashboard/ideas"
              className="text-foreground underline underline-offset-2"
            >
              roadmap
            </Link>{" "}
            to track progress here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Map className="text-muted-foreground h-5 w-5" />
          Roadmap
        </CardTitle>
        <Link
          href="/dashboard/roadmap"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Pipeline Overview */}
          <div className="flex gap-3">
            {VISIBLE_ROADMAP_STATUSES.map((status) => {
              const config = ROADMAP_STATUS_CONFIG[status];
              const Icon = config.icon;
              const count = pipelineCounts[status as keyof PipelineCounts];

              return (
                <Link
                  key={status}
                  href={`/dashboard/roadmap?status=${status}`}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 transition-all hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-900"
                >
                  <Icon className={`h-4 w-4 ${config.textColor}`} />
                  <div>
                    <p className="text-lg leading-tight font-semibold">
                      {count}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {config.shortLabel}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Weekly Momentum */}
          <div className="text-sm">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              This week
            </p>
            <p
              className={
                hasActivity
                  ? "text-foreground mt-0.5 font-medium"
                  : "text-muted-foreground mt-0.5"
              }
            >
              {momentumText}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
