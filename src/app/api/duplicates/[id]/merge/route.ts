import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql, or, and, ne } from "drizzle-orm";
import {
  db,
  duplicateSuggestions,
  ideas,
  votes,
  ideaEmbeddings,
  dedupeEvents,
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

    // Validation: roadmap ideas cannot be merged away (only kept as parent)
    const mergeIdea =
      keepIdeaId === suggestion.sourceIdeaId
        ? suggestion.duplicateIdea
        : suggestion.sourceIdea;

    if (mergeIdea.roadmapStatus !== "NONE") {
      throw new BadRequestError(
        "Cannot merge a roadmap idea. Roadmap ideas can only be kept, not merged away."
      );
    }

    // Execute merge in a transaction with row-level locking
    await db.transaction(async (tx) => {
      // Acquire row lock and re-check status to prevent concurrent merges
      const lockResult = await tx.execute(sql`
        SELECT status FROM duplicate_suggestions
        WHERE id = ${params.id} AND workspace_id = ${workspace.id}
        FOR UPDATE
      `);

      const locked = lockResult.rows[0] as { status: string } | undefined;
      if (!locked || locked.status !== "PENDING") {
        throw new BadRequestError("Suggestion has already been processed");
      }

      // 1. Transfer votes from merged idea to kept idea in bulk (preserve original timestamps, skip duplicates)
      await tx.execute(sql`
        INSERT INTO votes (id, idea_id, contributor_id, created_at, is_inherited)
        SELECT
          'vote_' || gen_random_uuid()::text,
          ${keepIdeaId},
          contributor_id,
          created_at,
          true
        FROM votes
        WHERE idea_id = ${mergeIdeaId}
        ON CONFLICT (idea_id, contributor_id) DO NOTHING
      `);

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
          voteCount: 0,
        })
        .where(eq(ideas.id, mergeIdeaId));

      // 4. Remove obsolete votes from merged idea
      await tx.delete(votes).where(eq(votes.ideaId, mergeIdeaId));

      // 5. Delete embedding of merged idea (no longer needed for comparison)
      await tx
        .delete(ideaEmbeddings)
        .where(eq(ideaEmbeddings.ideaId, mergeIdeaId));

      // 6. Mark this suggestion as MERGED
      await tx
        .update(duplicateSuggestions)
        .set({
          status: "MERGED",
          reviewedAt: new Date(),
        })
        .where(eq(duplicateSuggestions.id, params.id));

      // 7. Auto-dismiss other PENDING suggestions involving the merged idea
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

    // Record telemetry before responding
    await db.insert(dedupeEvents).values({
      workspaceId: workspace.id,
      ideaId: keepIdeaId,
      relatedIdeaId: mergeIdeaId,
      eventType: "dashboard_merged",
      similarity: suggestion.similarity,
    });

    return NextResponse.json({
      success: true,
      keptIdeaId: keepIdeaId,
      mergedIdeaId: mergeIdeaId,
    });
  },
  { requirePaid: false }
);
