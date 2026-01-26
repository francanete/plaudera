import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import {
  ideas,
  votes,
  workspaces,
  PUBLIC_VISIBLE_STATUSES,
} from "@/lib/db/schema";
import { eq, desc, and, or, inArray } from "drizzle-orm";
import { getContributor } from "@/lib/contributor-auth";
import { PublicIdeaList } from "@/components/board/public-idea-list";
import type { Metadata } from "next";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
  });

  if (!workspace) {
    return { title: "Not Found" };
  }

  return {
    title: workspace.name,
    description: `Vote on features and share your ideas for ${workspace.name}`,
  };
}

async function BoardContent({ slug }: { slug: string }) {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
  });

  if (!workspace) {
    notFound();
  }

  // Check if contributor is authenticated
  const contributor = await getContributor();

  // Build query: public-visible statuses + contributor's own PENDING ideas
  const whereClause = contributor
    ? and(
        eq(ideas.workspaceId, workspace.id),
        or(
          // Public visible statuses (for everyone)
          inArray(ideas.status, PUBLIC_VISIBLE_STATUSES),
          // Contributor's own UNDER_REVIEW ideas (only visible to them)
          and(
            eq(ideas.status, "UNDER_REVIEW"),
            eq(ideas.contributorId, contributor.id)
          )
        )
      )
    : and(
        eq(ideas.workspaceId, workspace.id),
        inArray(ideas.status, PUBLIC_VISIBLE_STATUSES)
      );

  const workspaceIdeas = await db.query.ideas.findMany({
    where: whereClause,
    orderBy: [desc(ideas.voteCount), desc(ideas.createdAt)],
  });

  // If authenticated, get their votes
  let votedIdeaIds: Set<string> = new Set();
  if (contributor && workspaceIdeas.length > 0) {
    const ideaIds = workspaceIdeas.map((idea) => idea.id);
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

  // Transform ideas for the client component
  const ideasWithVoteStatus = workspaceIdeas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    description: idea.description,
    status: idea.status,
    voteCount: idea.voteCount,
    hasVoted: votedIdeaIds.has(idea.id),
    createdAt: idea.createdAt,
    // Mark if this is the contributor's own submission
    isOwn: contributor ? idea.contributorId === contributor.id : false,
  }));

  return (
    <PublicIdeaList
      workspaceName={workspace.name}
      workspaceId={workspace.id}
      workspaceSlug={workspace.slug}
      initialIdeas={ideasWithVoteStatus}
      initialContributor={
        contributor ? { email: contributor.email, id: contributor.id } : null
      }
    />
  );
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
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>

      {/* Idea cards skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="h-[76px] w-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
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
