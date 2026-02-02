import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db, ideas, roadmapStatusChanges } from "@/lib/db";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

type RouteParams = { id: string };

// GET /api/ideas/[id]/roadmap-history - Get roadmap status change history
export const GET = protectedApiRouteWrapper<RouteParams>(
  async (_request, { session, params }) => {
    // Verify idea exists and user has access
    const idea = await db.query.ideas.findFirst({
      where: eq(ideas.id, params.id),
      with: {
        workspace: true,
      },
    });

    if (!idea) {
      throw new NotFoundError("Idea not found");
    }

    if (idea.workspace.ownerId !== session.user.id) {
      throw new ForbiddenError("You don't have access to this idea");
    }

    // Fetch roadmap status changes for this idea
    const changes = await db.query.roadmapStatusChanges.findMany({
      where: eq(roadmapStatusChanges.ideaId, params.id),
      orderBy: [desc(roadmapStatusChanges.changedAt)],
    });

    return NextResponse.json({
      changes: changes.map((change) => ({
        id: change.id,
        fromStatus: change.fromStatus,
        toStatus: change.toStatus,
        changedAt: change.changedAt.toISOString(),
      })),
    });
  },
  { requirePaid: false }
);
