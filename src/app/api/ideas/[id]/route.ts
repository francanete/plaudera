import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, or } from "drizzle-orm";
import {
  db,
  ideas,
  roadmapStatusChanges,
  duplicateSuggestions,
  type IdeaStatus,
  type RoadmapStatus,
} from "@/lib/db";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { NotFoundError, ForbiddenError, BadRequestError } from "@/lib/errors";
import { ALL_IDEA_STATUSES } from "@/lib/idea-status-config";
import { ALL_ROADMAP_STATUSES } from "@/lib/roadmap-status-config";
import { updateIdeaEmbedding } from "@/lib/ai/embeddings";

const updateIdeaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(ALL_IDEA_STATUSES as [IdeaStatus, ...IdeaStatus[]]).optional(),
  roadmapStatus: z
    .enum(ALL_ROADMAP_STATUSES as [RoadmapStatus, ...RoadmapStatus[]])
    .optional(),
  internalNote: z.string().max(2000).optional().nullable(),
  publicUpdate: z.string().max(1000).optional().nullable(),
  featureDetails: z.string().max(2000).optional().nullable(),
});

type RouteParams = { id: string };

// Helper to verify idea ownership
async function getIdeaWithOwnerCheck(ideaId: string, userId: string) {
  const idea = await db.query.ideas.findFirst({
    where: eq(ideas.id, ideaId),
    with: {
      workspace: true,
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

// GET /api/ideas/[id] - Get a single idea
export const GET = protectedApiRouteWrapper<RouteParams>(
  async (_request, { session, params }) => {
    const idea = await getIdeaWithOwnerCheck(params.id, session.user.id);

    return NextResponse.json({ idea });
  },
  { requirePaid: false }
);

// PATCH /api/ideas/[id] - Update an idea
export const PATCH = protectedApiRouteWrapper<RouteParams>(
  async (request, { session, params }) => {
    const idea = await getIdeaWithOwnerCheck(params.id, session.user.id);

    const body = await request.json();
    const data = updateIdeaSchema.parse(body);

    if (data.status === "MERGED") {
      throw new BadRequestError("Use the merge endpoint to merge ideas");
    }

    // Build update object with only provided fields
    // Always set updatedAt for explicit timestamp tracking
    const updateData: Partial<{
      title: string;
      description: string | null;
      status: IdeaStatus;
      roadmapStatus: RoadmapStatus;
      internalNote: string | null;
      publicUpdate: string | null;
      featureDetails: string | null;
      mergedIntoId: string | null;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.internalNote !== undefined)
      updateData.internalNote = data.internalNote;
    if (data.publicUpdate !== undefined)
      updateData.publicUpdate = data.publicUpdate;
    if (data.featureDetails !== undefined)
      updateData.featureDetails = data.featureDetails;

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
      updateData.status = data.status;
      // Clear mergedIntoId when changing away from MERGED (CHECK constraint requires it)
      if (idea.status === "MERGED") {
        updateData.mergedIntoId = null;
      }

      // Auto-reset roadmap status when DECLINED
      if (data.status === "DECLINED" && idea.roadmapStatus !== "NONE") {
        updateData.roadmapStatus = "NONE";
        roadmapStatusChanged = true;
      }
    }

    const [updatedIdea] = await db
      .update(ideas)
      .set(updateData)
      .where(eq(ideas.id, params.id))
      .returning();

    // Log roadmap status change to audit table
    if (
      roadmapStatusChanged &&
      updatedIdea.roadmapStatus !== previousRoadmapStatus
    ) {
      await db.insert(roadmapStatusChanges).values({
        ideaId: idea.id,
        fromStatus: previousRoadmapStatus,
        toStatus: updatedIdea.roadmapStatus,
        changedBy: session.user.id,
      });
    }

    // Auto-dismiss pending duplicate suggestions when moving to roadmap
    if (
      previousRoadmapStatus === "NONE" &&
      updatedIdea.roadmapStatus !== "NONE"
    ) {
      await db
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

    // Regenerate embedding if title or description changed (fire-and-forget)
    if (data.title !== undefined || data.description !== undefined) {
      updateIdeaEmbedding(
        updatedIdea.id,
        updatedIdea.title,
        updatedIdea.description
      ).catch((err) =>
        console.error("Failed to update embedding for idea:", err)
      );
    }

    return NextResponse.json({ idea: updatedIdea });
  },
  { requirePaid: false }
);

// DELETE /api/ideas/[id] - Soft-delete an idea (set status to DECLINED)
export const DELETE = protectedApiRouteWrapper<RouteParams>(
  async (_request, { session, params }) => {
    const idea = await getIdeaWithOwnerCheck(params.id, session.user.id);

    // Auto-reset roadmap status when declining
    const shouldResetRoadmap = idea.roadmapStatus !== "NONE";

    await db
      .update(ideas)
      .set({
        status: "DECLINED",
        roadmapStatus: "NONE",
        updatedAt: new Date(),
      })
      .where(eq(ideas.id, params.id));

    // Log roadmap status change if it was on roadmap
    if (shouldResetRoadmap) {
      await db.insert(roadmapStatusChanges).values({
        ideaId: idea.id,
        fromStatus: idea.roadmapStatus,
        toStatus: "NONE",
        changedBy: session.user.id,
      });
    }

    return NextResponse.json({ success: true });
  },
  { requirePaid: false }
);
