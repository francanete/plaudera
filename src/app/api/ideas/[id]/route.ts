import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, ideas, type IdeaStatus } from "@/lib/db";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { ALL_IDEA_STATUSES } from "@/lib/idea-status-config";
import { updateIdeaEmbedding } from "@/lib/ai/embeddings";

const updateIdeaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(ALL_IDEA_STATUSES as [IdeaStatus, ...IdeaStatus[]]).optional(),
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
    await getIdeaWithOwnerCheck(params.id, session.user.id);

    const body = await request.json();
    const data = updateIdeaSchema.parse(body);

    // Build update object with only provided fields
    // Always set updatedAt for explicit timestamp tracking
    const updateData: Partial<{
      title: string;
      description: string | null;
      status: IdeaStatus;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;

    const [updatedIdea] = await db
      .update(ideas)
      .set(updateData)
      .where(eq(ideas.id, params.id))
      .returning();

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

// DELETE /api/ideas/[id] - Delete an idea
export const DELETE = protectedApiRouteWrapper<RouteParams>(
  async (_request, { session, params }) => {
    await getIdeaWithOwnerCheck(params.id, session.user.id);

    await db.delete(ideas).where(eq(ideas.id, params.id));

    return NextResponse.json({ success: true });
  },
  { requirePaid: false }
);
