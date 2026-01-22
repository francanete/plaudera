import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql, or, and, ne } from "drizzle-orm";
import {
  db,
  duplicateSuggestions,
  ideas,
  votes,
  ideaEmbeddings,
} from "@/lib/db";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getUserWorkspace } from "@/lib/workspace";
import { NotFoundError, BadRequestError } from "@/lib/errors";

const mergeSchema = z.object({
  keepIdeaId: z.string().min(1, "keepIdeaId is required"),
});

// POST /api/duplicates/[id]/merge - Merge two ideas (keep one, soft-delete the other)
export const POST = protectedApiRouteWrapper<{ id: string }>(
  async (request, { session, params }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    const body = await request.json();
    const { keepIdeaId } = mergeSchema.parse(body);

    // Fetch the suggestion with related ideas
    const suggestion = await db.query.duplicateSuggestions.findFirst({
      where: and(
        eq(duplicateSuggestions.id, params.id),
        eq(duplicateSuggestions.workspaceId, workspace.id)
      ),
      with: {
        sourceIdea: true,
        duplicateIdea: true,
      },
    });

    if (!suggestion) {
      throw new NotFoundError("Suggestion not found");
    }

    if (suggestion.status !== "PENDING") {
      throw new BadRequestError("Suggestion has already been processed");
    }

    // Validate that keepIdeaId is one of the two ideas
    const validIds = [suggestion.sourceIdeaId, suggestion.duplicateIdeaId];
    if (!validIds.includes(keepIdeaId)) {
      throw new BadRequestError(
        "keepIdeaId must be one of the suggested ideas"
      );
    }

    // Determine which idea to merge (the one NOT being kept)
    const mergeIdeaId =
      keepIdeaId === suggestion.sourceIdeaId
        ? suggestion.duplicateIdeaId
        : suggestion.sourceIdeaId;

    // Execute merge in a transaction
    await db.transaction(async (tx) => {
      // 1. Transfer votes from merged idea to kept idea (skip duplicates)
      // Get votes from the merged idea
      const votesToTransfer = await tx
        .select({ contributorId: votes.contributorId })
        .from(votes)
        .where(eq(votes.ideaId, mergeIdeaId));

      // Insert votes for kept idea (ON CONFLICT DO NOTHING to skip duplicates)
      for (const vote of votesToTransfer) {
        await tx
          .insert(votes)
          .values({
            ideaId: keepIdeaId,
            contributorId: vote.contributorId,
          })
          .onConflictDoNothing();
      }

      // 2. Recalculate vote count for kept idea
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(votes)
        .where(eq(votes.ideaId, keepIdeaId));

      await tx
        .update(ideas)
        .set({ voteCount: count })
        .where(eq(ideas.id, keepIdeaId));

      // 3. Soft delete merged idea (status = MERGED, mergedIntoId = keepIdeaId)
      await tx
        .update(ideas)
        .set({
          status: "MERGED",
          mergedIntoId: keepIdeaId,
        })
        .where(eq(ideas.id, mergeIdeaId));

      // 4. Delete embedding of merged idea (no longer needed for comparison)
      await tx
        .delete(ideaEmbeddings)
        .where(eq(ideaEmbeddings.ideaId, mergeIdeaId));

      // 5. Mark this suggestion as MERGED
      await tx
        .update(duplicateSuggestions)
        .set({
          status: "MERGED",
          reviewedAt: new Date(),
        })
        .where(eq(duplicateSuggestions.id, params.id));

      // 6. Auto-dismiss other PENDING suggestions involving the merged idea
      await tx
        .update(duplicateSuggestions)
        .set({
          status: "DISMISSED",
          reviewedAt: new Date(),
        })
        .where(
          and(
            eq(duplicateSuggestions.workspaceId, workspace.id),
            eq(duplicateSuggestions.status, "PENDING"),
            ne(duplicateSuggestions.id, params.id),
            or(
              eq(duplicateSuggestions.sourceIdeaId, mergeIdeaId),
              eq(duplicateSuggestions.duplicateIdeaId, mergeIdeaId)
            )
          )
        );
    });

    return NextResponse.json({
      success: true,
      keptIdeaId: keepIdeaId,
      mergedIdeaId: mergeIdeaId,
    });
  },
  { requirePaid: false }
);
