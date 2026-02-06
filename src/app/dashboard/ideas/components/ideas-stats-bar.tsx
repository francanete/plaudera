import { Search, Check, ThumbsUp, Lightbulb } from "lucide-react";
import type { Idea } from "@/lib/db/schema";

interface IdeasStatsBarProps {
  ideas: Idea[];
}

const stats = [
  {
    label: "Total Ideas",
    key: "total" as const,
    icon: Lightbulb,
    iconClassName: "text-blue-600 dark:text-blue-400",
    bgClassName: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    label: "Under Review",
    key: "underReview" as const,
    icon: Search,
    iconClassName: "text-amber-600 dark:text-amber-400",
    bgClassName: "bg-amber-100 dark:bg-amber-900/30",
  },
  {
    label: "Published",
    key: "published" as const,
    icon: Check,
    iconClassName: "text-emerald-600 dark:text-emerald-400",
    bgClassName: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    label: "Total Votes",
    key: "votes" as const,
    icon: ThumbsUp,
    iconClassName: "text-violet-600 dark:text-violet-400",
    bgClassName: "bg-violet-100 dark:bg-violet-900/30",
  },
];

function computeCounts(ideas: Idea[]) {
  let underReview = 0;
  let published = 0;
  let votes = 0;

  for (const idea of ideas) {
    if (idea.status === "UNDER_REVIEW") underReview++;
    if (idea.status === "PUBLISHED") published++;
    votes += idea.voteCount;
  }

  return { total: ideas.length, underReview, published, votes };
}

export function IdeasStatsBar({ ideas }: IdeasStatsBarProps) {
  const counts = computeCounts(ideas);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.key}
            className="border-border bg-card flex items-center gap-3 rounded-lg border px-4 py-3"
          >
            <div className={`rounded-md p-1.5 ${stat.bgClassName}`}>
              <Icon className={`h-4 w-4 ${stat.iconClassName}`} />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{stat.label}</p>
              <p className="text-foreground text-xl font-bold tabular-nums">
                {counts[stat.key]}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
