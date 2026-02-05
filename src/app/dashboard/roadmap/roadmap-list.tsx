"use client";

import Link from "next/link";
import { ThumbsUp, Map } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Idea, RoadmapStatus } from "@/lib/db/schema";
import {
  VISIBLE_ROADMAP_STATUSES,
  ROADMAP_STATUS_CONFIG,
} from "@/lib/roadmap-status-config";

interface RoadmapListProps {
  ideas: Idea[];
}

export function RoadmapList({ ideas }: RoadmapListProps) {
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

  const groupedIdeas = VISIBLE_ROADMAP_STATUSES.reduce(
    (groups, status) => {
      groups[status] = ideas.filter((idea) => idea.roadmapStatus === status);
      return groups;
    },
    {} as Record<RoadmapStatus, Idea[]>
  );

  return (
    <div className="space-y-10">
      {VISIBLE_ROADMAP_STATUSES.map((status) => {
        const items = groupedIdeas[status];
        if (items.length === 0) return null;

        const config = ROADMAP_STATUS_CONFIG[status];
        const Icon = config.icon;

        return (
          <section key={status}>
            <div className="mb-4 flex items-center gap-2">
              <Icon className="h-5 w-5 opacity-70" />
              <h2 className="text-foreground text-lg font-semibold">
                {config.label}
              </h2>
              <span className="text-muted-foreground font-mono text-sm tabular-nums">
                ({items.length})
              </span>
            </div>

            <div className="space-y-4">
              {items.map((idea) => (
                <RoadmapCard key={idea.id} idea={idea} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function RoadmapCard({ idea }: { idea: Idea }) {
  const config = ROADMAP_STATUS_CONFIG[idea.roadmapStatus];
  const previewText = idea.featureDetails || idea.description;

  return (
    <Link href={`/dashboard/roadmap/${idea.id}`} className="block">
      <article className="group border-border bg-card hover:border-primary/30 rounded-xl border p-5 transition-all duration-200 hover:shadow-md">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="text-foreground truncate text-base font-semibold">
            {idea.title}
          </h3>
        </div>

        {previewText && (
          <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
            {previewText}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <Badge variant="outline" className={config.badgeClassName}>
            {(() => {
              const Icon = config.icon;
              return <Icon className="mr-1 h-3 w-3" />;
            })()}
            {config.shortLabel}
          </Badge>
          <div className="text-muted-foreground flex items-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{idea.voteCount}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
