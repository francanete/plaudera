import { notFound } from "next/navigation";
import { Suspense, cache } from "react";
import { db } from "@/lib/db";
import { votes, workspaces } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getContributor } from "@/lib/contributor-auth";
import { queryPublicIdeas } from "@/lib/idea-queries";
import { EmbedBoard } from "./embed-board";
import type { Metadata } from "next";

type PageProps = { params: Promise<{ workspaceId: string }> };

// Cached to avoid duplicate queries between generateMetadata and page render
const getWorkspace = cache(async (workspaceId: string) => {
  return db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { workspaceId } = await params;
  const workspace = await getWorkspace(workspaceId);

  if (!workspace) {
    return { title: "Feedback Widget" };
  }

  return {
    title: `${workspace.name} - Feedback`,
    description:
      workspace.description || `Submit feedback for ${workspace.name}`,
  };
}

const MAX_EMBED_IDEAS = 10;

async function EmbedContent({ workspaceId }: { workspaceId: string }) {
  const workspace = await getWorkspace(workspaceId);

  if (!workspace) {
    notFound();
  }

  // Check if contributor is authenticated
  const contributor = await getContributor();

  const workspaceIdeas = await queryPublicIdeas(workspace.id, {
    contributorId: contributor?.id,
    limit: MAX_EMBED_IDEAS,
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

  // Transform ideas for the client component (compact version)
  const ideasWithVoteStatus = workspaceIdeas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    status: idea.status,
    roadmapStatus: idea.roadmapStatus,
    voteCount: idea.voteCount,
    hasVoted: votedIdeaIds.has(idea.id),
  }));

  return (
    <EmbedBoard
      workspaceName={workspace.name}
      workspaceDescription={workspace.description}
      workspaceId={workspace.id}
      workspaceSlug={workspace.slug}
      initialIdeas={ideasWithVoteStatus}
      initialContributor={
        contributor ? { email: contributor.email, id: contributor.id } : null
      }
    />
  );
}

export default async function EmbedPage({ params }: PageProps) {
  const { workspaceId } = await params;

  return (
    <Suspense fallback={<EmbedSkeleton />}>
      <EmbedContent workspaceId={workspaceId} />
    </Suspense>
  );
}

function EmbedSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-muted h-10 w-full animate-pulse rounded" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-muted h-12 w-full animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}
