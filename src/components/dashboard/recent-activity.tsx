import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ChevronUp, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { IdeaStatus } from "@/lib/db/schema";

interface TopIdea {
  id: string;
  title: string;
  voteCount: number;
  status: IdeaStatus;
}

interface RecentActivityProps {
  topIdeas: TopIdea[];
}

const statusConfig: Record<
  IdeaStatus,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  PUBLISHED: { label: "Published", variant: "default" },
  UNDER_REVIEW: { label: "Under Review", variant: "secondary" },
  DECLINED: { label: "Declined", variant: "destructive" },
  MERGED: { label: "Merged", variant: "outline" },
};

export function RecentActivity({ topIdeas }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="text-muted-foreground h-5 w-5" />
          Top Voted Ideas
        </CardTitle>
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
          <div className="space-y-3">
            {topIdeas.map((idea, index) => (
              <Link
                key={idea.id}
                href={`/dashboard/ideas`}
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-all hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-900"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{idea.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge
                      variant={statusConfig[idea.status].variant}
                      className="text-xs"
                    >
                      {statusConfig[idea.status].label}
                    </Badge>
                  </div>
                </div>
                <div className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
                  <ChevronUp className="h-4 w-4" />
                  {idea.voteCount}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
