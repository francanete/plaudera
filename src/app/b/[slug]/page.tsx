import { Suspense } from "react";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { votes } from "@/lib/db/schema";
import { getContributor } from "@/lib/contributor-auth";
import { queryPublicIdeas } from "@/lib/idea-queries";
import { BoardIdeasView } from "@/components/board/board-ideas-view";
import { getWorkspaceBySlug } from "@/lib/workspace";
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
    title: workspace.name,
    description:
      workspace.description ||
      `Vote on features and share your ideas for ${workspace.name}`,
  };
}

async function BoardContent({ slug }: { slug: string }) {
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) return null;

  const contributor = await getContributor();

  const ideas = await queryPublicIdeas(workspace.id, {
    contributorId: contributor?.id,
  });

  let votedIdeaIds: Set<string> = new Set();
  if (contributor && ideas.length > 0) {
    const ideaIds = ideas.map((idea) => idea.id);
    const contributorVotes = await db
      .select({ ideaId: votes.ideaId })
      .from(votes)
      .where(
        and(
          inArray(votes.ideaId, ideaIds),
          eq(votes.contributorId, contributor.id)
        )
      );
    votedIdeaIds = new Set(contributorVotes.map((v) => v.ideaId));
  }

  const ideasWithVoteStatus = ideas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    description: idea.description,
    status: idea.status,
    roadmapStatus: idea.roadmapStatus,
    publicUpdate: idea.publicUpdate,
    showPublicUpdateOnRoadmap: idea.showPublicUpdateOnRoadmap,
    featureDetails: idea.featureDetails,
    voteCount: idea.voteCount,
    hasVoted: votedIdeaIds.has(idea.id),
    createdAt: idea.createdAt,
    isOwn: contributor ? idea.contributorId === contributor.id : false,
  }));

  return <BoardIdeasView initialIdeas={ideasWithVoteStatus} />;
}

export default async function BoardPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <Suspense fallback={<BoardSkeleton />}>
      <BoardContent slug={slug} />
    </Suspense>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-6 pt-6">
      <div className="mx-auto max-w-4xl space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="h-19 w-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="flex gap-3">
                <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="h-6 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
