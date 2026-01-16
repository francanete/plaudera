import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { ideas, votes, workspaces } from "@/lib/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
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
  // Find the workspace
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
  });

  if (!workspace) {
    notFound();
  }

  // Get all ideas for the workspace
  const workspaceIdeas = await db.query.ideas.findMany({
    where: eq(ideas.workspaceId, workspace.id),
    orderBy: [desc(ideas.voteCount), desc(ideas.createdAt)],
  });

  // Check if contributor is authenticated
  const contributor = await getContributor();

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
  }));

  return (
    <PublicIdeaList
      workspaceName={workspace.name}
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
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="bg-muted h-8 w-48 animate-pulse rounded" />
          <div className="bg-muted h-4 w-64 animate-pulse rounded" />
        </div>
        <div className="bg-muted h-10 w-32 animate-pulse rounded" />
      </div>

      {/* Idea cards skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card flex items-center gap-4 rounded-lg border p-4"
          >
            <div className="bg-muted h-16 w-16 animate-pulse rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="bg-muted h-5 w-3/4 animate-pulse rounded" />
              <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
              <div className="bg-muted h-5 w-24 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
