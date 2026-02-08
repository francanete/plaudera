import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { boardSettings } from "@/lib/db/schema";
import { queryPublicRoadmapIdeas } from "@/lib/idea-queries";
import { RoadmapGroupedView } from "@/components/board/roadmap-grouped-view";
import { PublicRoadmapListView } from "@/components/board/public-roadmap-list-view";
import { getWorkspaceBySlug } from "../layout";
import type { Metadata } from "next";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);

  if (!workspace) {
    return { title: "Not Found" };
  }

  return {
    title: `Roadmap - ${workspace.name}`,
    description: `See what's planned, in progress, and completed for ${workspace.name}`,
  };
}

async function RoadmapContent({ slug }: { slug: string }) {
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) return null;

  const [roadmapIdeas, boardSettingsRow] = await Promise.all([
    queryPublicRoadmapIdeas(workspace.id),
    db.query.boardSettings.findFirst({
      where: eq(boardSettings.workspaceId, workspace.id),
      columns: { roadmapDefaultListView: true },
    }),
  ]);

  const ideas = roadmapIdeas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    description: idea.description,
    roadmapStatus: idea.roadmapStatus,
    featureDetails: idea.featureDetails,
    publicUpdate: idea.publicUpdate,
    showPublicUpdateOnRoadmap: idea.showPublicUpdateOnRoadmap,
    voteCount: idea.voteCount,
  }));

  const useListView = boardSettingsRow?.roadmapDefaultListView ?? false;

  if (useListView) {
    return (
      <div className="w-full pt-6">
        <PublicRoadmapListView ideas={ideas} />
      </div>
    );
  }

  return (
    <div className="w-full pt-6">
      <div className="block lg:hidden">
        <PublicRoadmapListView ideas={ideas} />
      </div>
      <div className="hidden lg:block">
        <RoadmapGroupedView ideas={ideas} />
      </div>
    </div>
  );
}

export default async function RoadmapPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <Suspense fallback={<RoadmapSkeleton />}>
      <RoadmapContent slug={slug} />
    </Suspense>
  );
}

function RoadmapSkeleton() {
  return (
    <div className="w-full space-y-4 pt-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((col) => (
          <div key={col} className="space-y-3">
            <div className="h-6 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
