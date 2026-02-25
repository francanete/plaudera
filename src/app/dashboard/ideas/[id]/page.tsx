import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { ideas, duplicateSuggestions } from "@/lib/db/schema";
import { eq, and, ne, or, desc } from "drizzle-orm";
import {
  queryIdeaSignals,
  buildConfidenceSignals,
  queryDecisionTimeline,
} from "@/lib/idea-queries";
import { computeConfidence } from "@/lib/confidence";
import { IdeaDetail } from "./idea-detail";
import type { DuplicateSuggestionForView } from "./components";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function IdeaDetailPage({ params }: PageProps) {
  const { id } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    notFound();
  }

  // Fetch idea with workspace and merged children
  const idea = await db.query.ideas.findFirst({
    where: eq(ideas.id, id),
    with: {
      workspace: true,
      mergedFrom: {
        columns: { id: true, title: true },
      },
    },
  });

  // Check if idea exists and user owns the workspace
  if (!idea || idea.workspace.ownerId !== session.user.id) {
    notFound();
  }

  // Roadmap ideas should be viewed on the roadmap detail page
  if (idea.roadmapStatus !== "NONE") {
    redirect(`/dashboard/roadmap/${idea.id}`);
  }

  // Fetch published ideas, duplicate suggestions, confidence signals, and timeline in parallel
  const [publishedIdeas, rawDupSuggestions, signalsMap, decisionTimeline] =
    await Promise.all([
      db
        .select({ id: ideas.id, title: ideas.title })
        .from(ideas)
        .where(
          and(
            eq(ideas.workspaceId, idea.workspaceId),
            eq(ideas.status, "PUBLISHED"),
            ne(ideas.id, id)
          )
        ),
      db.query.duplicateSuggestions.findMany({
        where: and(
          eq(duplicateSuggestions.workspaceId, idea.workspaceId),
          eq(duplicateSuggestions.status, "PENDING"),
          or(
            eq(duplicateSuggestions.sourceIdeaId, id),
            eq(duplicateSuggestions.duplicateIdeaId, id)
          )
        ),
        with: {
          sourceIdea: {
            columns: {
              id: true,
              title: true,
              description: true,
              status: true,
              roadmapStatus: true,
              voteCount: true,
              createdAt: true,
            },
          },
          duplicateIdea: {
            columns: {
              id: true,
              title: true,
              description: true,
              status: true,
              roadmapStatus: true,
              voteCount: true,
              createdAt: true,
            },
          },
        },
        orderBy: [desc(duplicateSuggestions.similarity)],
      }),
      queryIdeaSignals([id]),
      queryDecisionTimeline(id),
    ]);

  // Transform: for each suggestion, pick the "other" idea (not the current one)
  // and filter out suggestions where the other idea has been merged
  const dupSuggestionsForView: DuplicateSuggestionForView[] = rawDupSuggestions
    .map((s) => {
      const otherIdea = s.sourceIdeaId === id ? s.duplicateIdea : s.sourceIdea;
      return {
        suggestionId: s.id,
        similarity: s.similarity,
        otherIdea,
      };
    })
    .filter((s) => s.otherIdea.status !== "MERGED");

  // Compute confidence score
  const rawSignals = signalsMap.get(id);
  const confidence = rawSignals
    ? computeConfidence(buildConfidenceSignals(rawSignals, idea))
    : undefined;

  return (
    <IdeaDetail
      idea={idea}
      mergedChildren={idea.mergedFrom}
      publishedIdeas={publishedIdeas}
      duplicateSuggestions={dupSuggestionsForView}
      confidence={confidence}
      decisionTimeline={decisionTimeline}
    />
  );
}
