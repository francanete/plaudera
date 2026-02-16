import { eq, and, or } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  ideas,
  roadmapStatusChanges,
  duplicateSuggestions,
  type IdeaStatus,
  type RoadmapStatus,
} from "@/lib/db";
import { NotFoundError, ForbiddenError, BadRequestError } from "@/lib/errors";
import { ALL_IDEA_STATUSES } from "@/lib/idea-status-config";
import { ALL_ROADMAP_STATUSES } from "@/lib/roadmap-status-config";
import { updateIdeaEmbedding } from "@/lib/ai/embeddings";

export const createIdeaSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(5000, "Description too long").optional(),
  roadmapStatus: z.enum(["PLANNED", "IN_PROGRESS", "RELEASED"]).optional(),
  featureDetails: z.string().max(2000, "Feature details too long").optional(),
});

export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;

/**
 * Create a new idea, optionally placing it directly on the roadmap.
 * When roadmapStatus is provided, uses a transaction to atomically
 * insert the idea and its audit log entry.
 */
export async function createIdea(
  workspaceId: string,
  userId: string,
  data: CreateIdeaInput
) {
  const isRoadmapIdea = !!data.roadmapStatus;

  let newIdea;

  if (isRoadmapIdea) {
    newIdea = await db.transaction(async (tx) => {
      const [idea] = await tx
        .insert(ideas)
        .values({
          workspaceId,
          title: data.title,
          description: data.description || null,
          status: "PUBLISHED",
          roadmapStatus: data.roadmapStatus!,
          featureDetails: data.featureDetails || null,
          voteCount: 0,
        })
        .returning();

      await tx.insert(roadmapStatusChanges).values({
        ideaId: idea.id,
        fromStatus: "NONE",
        toStatus: data.roadmapStatus!,
        changedBy: userId,
      });

      return idea;
    });
  } else {
    [newIdea] = await db
      .insert(ideas)
      .values({
        workspaceId,
        title: data.title,
        description: data.description || null,
        status: "PUBLISHED",
        voteCount: 0,
      })
      .returning();
  }

  // Generate embedding for duplicate detection (fire-and-forget)
  updateIdeaEmbedding(newIdea.id, newIdea.title).catch((err) =>
    console.error("Failed to generate embedding for idea:", err)
  );

  return newIdea;
}

export const updateIdeaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(ALL_IDEA_STATUSES as [IdeaStatus, ...IdeaStatus[]]).optional(),
  roadmapStatus: z
    .enum(ALL_ROADMAP_STATUSES as [RoadmapStatus, ...RoadmapStatus[]])
    .optional(),
  internalNote: z.string().max(2000).optional().nullable(),
  publicUpdate: z.string().max(1000).optional().nullable(),
  featureDetails: z.string().max(2000).optional().nullable(),
  showPublicUpdateOnRoadmap: z.boolean().optional(),
});

export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>;

/**
 * Verify idea exists and belongs to the user's workspace.
 * Throws NotFoundError or ForbiddenError on failure.
 */
export async function getIdeaWithOwnerCheck(ideaId: string, userId: string) {
  const idea = await db.query.ideas.findFirst({
    where: eq(ideas.id, ideaId),
    with: {
      workspace: { columns: { ownerId: true } },
    },
  });

  if (!idea) {
    throw new NotFoundError("Idea not found");
  }

  if (idea.workspace.ownerId !== userId) {
    throw new ForbiddenError("You don't have access to this idea");
  }

  return idea;
}

/**
 * Update an idea with full business rule enforcement:
 * - Irreversibility guard (cannot remove from roadmap)
 * - Auto-publish (UNDER_REVIEW -> PUBLISHED when moving to roadmap)
 * - Audit logging for roadmap status changes
 * - Auto-dismiss pending duplicate suggestions when moving to roadmap
 * - Embedding regeneration on title/description change
 */
export async function updateIdea(
  ideaId: string,
  userId: string,
  data: UpdateIdeaInput
) {
  const idea = await getIdeaWithOwnerCheck(ideaId, userId);

  if (data.status === "MERGED") {
    throw new BadRequestError("Use the merge endpoint to merge ideas");
  }

  if (idea.status === "MERGED") {
    throw new BadRequestError("Cannot modify a merged idea");
  }

  // Build update object with only provided fields
  const updateData: Partial<{
    title: string;
    description: string | null;
    status: IdeaStatus;
    roadmapStatus: RoadmapStatus;
    internalNote: string | null;
    publicUpdate: string | null;
    featureDetails: string | null;
    showPublicUpdateOnRoadmap: boolean;
    mergedIntoId: string | null;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.internalNote !== undefined)
    updateData.internalNote = data.internalNote;
  if (data.publicUpdate !== undefined)
    updateData.publicUpdate = data.publicUpdate;
  if (data.featureDetails !== undefined)
    updateData.featureDetails = data.featureDetails;
  if (data.showPublicUpdateOnRoadmap !== undefined)
    updateData.showPublicUpdateOnRoadmap = data.showPublicUpdateOnRoadmap;

  // Track roadmap status changes for audit log
  let roadmapStatusChanged = false;
  const previousRoadmapStatus = idea.roadmapStatus;

  if (data.roadmapStatus !== undefined) {
    // Irreversibility guard: ideas cannot be removed from the roadmap
    if (idea.roadmapStatus !== "NONE" && data.roadmapStatus === "NONE") {
      throw new BadRequestError("Ideas cannot be removed from the roadmap");
    }

    updateData.roadmapStatus = data.roadmapStatus;
    roadmapStatusChanged = data.roadmapStatus !== idea.roadmapStatus;

    // Auto-publish: when moving to roadmap, publish if still under review
    if (
      roadmapStatusChanged &&
      idea.roadmapStatus === "NONE" &&
      data.roadmapStatus !== "NONE" &&
      idea.status === "UNDER_REVIEW"
    ) {
      updateData.status = "PUBLISHED";
    }
  }

  if (data.status !== undefined) {
    // Block declining ideas that are on the roadmap
    const effectiveRoadmapStatus = data.roadmapStatus ?? idea.roadmapStatus;
    if (data.status === "DECLINED" && effectiveRoadmapStatus !== "NONE") {
      throw new BadRequestError(
        "Cannot decline an idea that is on the roadmap"
      );
    }

    updateData.status = data.status;
  }

  const updatedIdea = await db.transaction(async (tx) => {
    const [result] = await tx
      .update(ideas)
      .set(updateData)
      .where(eq(ideas.id, ideaId))
      .returning();

    // Log roadmap status change to audit table
    if (
      roadmapStatusChanged &&
      result.roadmapStatus !== previousRoadmapStatus
    ) {
      await tx.insert(roadmapStatusChanges).values({
        ideaId: idea.id,
        fromStatus: previousRoadmapStatus,
        toStatus: result.roadmapStatus,
        changedBy: userId,
      });
    }

    // Auto-dismiss pending duplicate suggestions when moving to roadmap
    if (previousRoadmapStatus === "NONE" && result.roadmapStatus !== "NONE") {
      await tx
        .update(duplicateSuggestions)
        .set({ status: "DISMISSED" })
        .where(
          and(
            eq(duplicateSuggestions.status, "PENDING"),
            or(
              eq(duplicateSuggestions.sourceIdeaId, idea.id),
              eq(duplicateSuggestions.duplicateIdeaId, idea.id)
            )
          )
        );
    }

    return result;
  });

  // Regenerate embedding if title or description changed (fire-and-forget)
  if (data.title !== undefined || data.description !== undefined) {
    updateIdeaEmbedding(updatedIdea.id, updatedIdea.title).catch((err) =>
      console.error("Failed to update embedding for idea:", err)
    );
  }

  return updatedIdea;
}

/**
 * Soft-delete an idea (set status to DECLINED).
 * Blocks deletion of ideas that are on the roadmap.
 */
export async function deleteIdea(ideaId: string, userId: string) {
  const idea = await getIdeaWithOwnerCheck(ideaId, userId);

  if (idea.roadmapStatus !== "NONE") {
    throw new BadRequestError("Cannot delete an idea that is on the roadmap");
  }

  await db
    .update(ideas)
    .set({
      status: "DECLINED",
      updatedAt: new Date(),
    })
    .where(eq(ideas.id, ideaId));
}
