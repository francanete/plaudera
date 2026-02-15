import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DASHBOARD_ROUTES } from "@/lib/routes";
import { eq, count, and, or, sql } from "drizzle-orm";
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

type LockedIdeaRow = {
  id: string;
  workspaceId: string;
  status: string;
  roadmapStatus: string;
  mergedIntoId: string | null;
};

// POST /api/ideas/[id]/merge - Merge this idea into a parent
export const POST = protectedApiRouteWrapper<RouteParams>(
  async (request, { session, params }) => {
    const body = await request.json();
    const { parentIdeaId } = mergeSchema.parse(body);
    const sourceIdeaId = params.id;

    if (parentIdeaId === sourceIdeaId) {
      throw new BadRequestError("Cannot merge an idea into itself");
    }

    // Fetch both ideas with workspace ownership check
    const [sourceIdea, parentIdea] = await Promise.all([
      db.query.ideas.findFirst({
        where: eq(ideas.id, sourceIdeaId),
        with: { workspace: true },
      }),
      db.query.ideas.findFirst({
        where: eq(ideas.id, parentIdeaId),
        with: { workspace: true },
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

    // Perform merge in a transaction
    await db.transaction(async (tx) => {
      // Lock both ideas in deterministic order to prevent deadlocks
      const lockedResult = await tx.execute(sql`
        SELECT
          id,
          workspace_id AS "workspaceId",
          status,
          roadmap_status AS "roadmapStatus",
          merged_into_id AS "mergedIntoId"
        FROM ideas
        WHERE id IN (${sourceIdeaId}, ${parentIdeaId})
        ORDER BY id
        FOR UPDATE
      `);

      const lockedIdeas = new Map(
        (lockedResult.rows as LockedIdeaRow[]).map((row) => [row.id, row])
      );

      const lockedSourceIdea = lockedIdeas.get(sourceIdeaId);
      const lockedParentIdea = lockedIdeas.get(parentIdeaId);

      if (!lockedSourceIdea) {
        throw new NotFoundError("Idea not found");
      }

      if (!lockedParentIdea) {
        throw new NotFoundError("Parent idea not found");
      }

      if (
        lockedSourceIdea.workspaceId !== sourceIdea.workspaceId ||
        lockedParentIdea.workspaceId !== parentIdea.workspaceId ||
        lockedSourceIdea.workspaceId !== lockedParentIdea.workspaceId
      ) {
        throw new BadRequestError("Ideas must belong to the same workspace");
      }

      // Validation: source must not already be merged
      if (lockedSourceIdea.status === "MERGED") {
        throw new BadRequestError("This idea is already merged");
      }

      // Validation: source must not have children (can't merge a parent)
      const [childrenResult] = await tx
        .select({ total: count() })
        .from(ideas)
        .where(eq(ideas.mergedIntoId, sourceIdeaId));

      if (childrenResult.total > 0) {
        throw new BadRequestError(
          "Cannot merge an idea that has other ideas merged into it"
        );
      }

      // Validation: roadmap ideas cannot be merged away (only kept as parent)
      if (lockedSourceIdea.roadmapStatus !== "NONE") {
        throw new BadRequestError(
          "Cannot merge a roadmap idea. Remove it from the roadmap first."
        );
      }

      // Validation: parent must be PUBLISHED
      if (lockedParentIdea.status !== "PUBLISHED") {
        throw new BadRequestError("Parent idea must be in Published status");
      }

      // Validation: parent must not have a parent (prevent chains)
      if (lockedParentIdea.mergedIntoId) {
        throw new BadRequestError(
          "Cannot merge into an idea that is itself merged"
        );
      }

      // Transfer votes: insert source votes into parent, preserve timestamps, skip duplicates
      await tx.execute(sql`
        INSERT INTO votes (id, idea_id, contributor_id, created_at)
        SELECT
          'vote_' || gen_random_uuid()::text,
          ${parentIdeaId},
          contributor_id,
          created_at
        FROM votes
        WHERE idea_id = ${sourceIdeaId}
        ON CONFLICT (idea_id, contributor_id) DO NOTHING
      `);

      // Delete source idea's votes
      await tx.delete(votes).where(eq(votes.ideaId, sourceIdeaId));

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
        .where(eq(ideas.id, sourceIdeaId));

      // Delete source idea's embedding
      await tx
        .delete(ideaEmbeddings)
        .where(eq(ideaEmbeddings.ideaId, sourceIdeaId));

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
              eq(duplicateSuggestions.sourceIdeaId, sourceIdeaId),
              eq(duplicateSuggestions.duplicateIdeaId, sourceIdeaId)
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
