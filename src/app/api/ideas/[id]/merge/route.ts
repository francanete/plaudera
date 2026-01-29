import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DASHBOARD_ROUTES } from "@/lib/routes";
import { eq, count, and, or } from "drizzle-orm";
import {
  db,
  ideas,
  votes,
  ideaEmbeddings,
  duplicateSuggestions,
} from "@/lib/db";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { NotFoundError, ForbiddenError, BadRequestError } from "@/lib/errors";

const mergeSchema = z.object({
  parentIdeaId: z.string().min(1),
});

type RouteParams = { id: string };

// POST /api/ideas/[id]/merge - Merge this idea into a parent
export const POST = protectedApiRouteWrapper<RouteParams>(
  async (request, { session, params }) => {
    const body = await request.json();
    const { parentIdeaId } = mergeSchema.parse(body);

    if (parentIdeaId === params.id) {
      throw new BadRequestError("Cannot merge an idea into itself");
    }

    // Fetch both ideas with workspace ownership check
    const [sourceIdea, parentIdea] = await Promise.all([
      db.query.ideas.findFirst({
        where: eq(ideas.id, params.id),
        with: { workspace: true, mergedFrom: { columns: { id: true } } },
      }),
      db.query.ideas.findFirst({
        where: eq(ideas.id, parentIdeaId),
        with: { workspace: true, mergedFrom: { columns: { id: true } } },
      }),
    ]);

    if (!sourceIdea) {
      throw new NotFoundError("Idea not found");
    }
    if (sourceIdea.workspace.ownerId !== session.user.id) {
      throw new ForbiddenError("You don't have access to this idea");
    }

    if (!parentIdea) {
      throw new NotFoundError("Parent idea not found");
    }
    if (parentIdea.workspace.ownerId !== session.user.id) {
      throw new ForbiddenError("You don't have access to the parent idea");
    }

    // Validation: source must not already be merged
    if (sourceIdea.status === "MERGED") {
      throw new BadRequestError("This idea is already merged");
    }

    // Validation: source must not have children (can't merge a parent)
    if (sourceIdea.mergedFrom && sourceIdea.mergedFrom.length > 0) {
      throw new BadRequestError(
        "Cannot merge an idea that has other ideas merged into it"
      );
    }

    // Validation: parent must be PUBLISHED
    if (parentIdea.status !== "PUBLISHED") {
      throw new BadRequestError("Parent idea must be in Published status");
    }

    // Validation: parent must not have a parent (prevent chains)
    if (parentIdea.mergedIntoId) {
      throw new BadRequestError(
        "Cannot merge into an idea that is itself merged"
      );
    }

    // Perform merge in a transaction
    await db.transaction(async (tx) => {
      // Transfer votes: insert source votes into parent, preserve original timestamps, skip duplicates
      const sourceVotes = await tx
        .select({
          contributorId: votes.contributorId,
          createdAt: votes.createdAt,
        })
        .from(votes)
        .where(eq(votes.ideaId, params.id));

      for (const vote of sourceVotes) {
        await tx
          .insert(votes)
          .values({
            ideaId: parentIdeaId,
            contributorId: vote.contributorId,
            createdAt: vote.createdAt,
          })
          .onConflictDoNothing();
      }

      // Delete source idea's votes
      await tx.delete(votes).where(eq(votes.ideaId, params.id));

      // Recalculate parent vote count
      const [voteResult] = await tx
        .select({ total: count() })
        .from(votes)
        .where(eq(votes.ideaId, parentIdeaId));

      await tx
        .update(ideas)
        .set({ voteCount: voteResult.total, updatedAt: new Date() })
        .where(eq(ideas.id, parentIdeaId));

      // Set source idea as MERGED
      await tx
        .update(ideas)
        .set({
          status: "MERGED",
          mergedIntoId: parentIdeaId,
          voteCount: 0,
          updatedAt: new Date(),
        })
        .where(eq(ideas.id, params.id));

      // Delete source idea's embedding
      await tx
        .delete(ideaEmbeddings)
        .where(eq(ideaEmbeddings.ideaId, params.id));

      // Auto-dismiss pending duplicate suggestions involving the merged idea
      await tx
        .update(duplicateSuggestions)
        .set({
          status: "DISMISSED",
          reviewedAt: new Date(),
        })
        .where(
          and(
            eq(duplicateSuggestions.workspaceId, sourceIdea.workspaceId),
            eq(duplicateSuggestions.status, "PENDING"),
            or(
              eq(duplicateSuggestions.sourceIdeaId, params.id),
              eq(duplicateSuggestions.duplicateIdeaId, params.id)
            )
          )
        );
    });

    // Invalidate caches: duplicates page + dashboard layout (for sidebar badge count)
    revalidatePath(DASHBOARD_ROUTES.DUPLICATES);
    revalidatePath(DASHBOARD_ROUTES.ROOT, "layout");

    return NextResponse.json({ success: true });
  },
  { requirePaid: false }
);
