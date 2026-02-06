import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, boardSettings } from "@/lib/db";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getUserWorkspace } from "@/lib/workspace";
import { NotFoundError } from "@/lib/errors";

const updateSettingsSchema = z.object({
  roadmapDefaultListView: z.boolean(),
});

// GET /api/board/settings - Get board settings
export const GET = protectedApiRouteWrapper(
  async (_, { session }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    const settings = await db.query.boardSettings.findFirst({
      where: eq(boardSettings.workspaceId, workspace.id),
    });

    return NextResponse.json({
      roadmapDefaultListView: settings?.roadmapDefaultListView ?? false,
    });
  },
  { requirePaid: false }
);

// PATCH /api/board/settings - Update board settings
export const PATCH = protectedApiRouteWrapper(
  async (request, { session }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    const body = await request.json();
    const data = updateSettingsSchema.parse(body);

    const [updated] = await db
      .insert(boardSettings)
      .values({
        workspaceId: workspace.id,
        roadmapDefaultListView: data.roadmapDefaultListView,
      })
      .onConflictDoUpdate({
        target: boardSettings.workspaceId,
        set: {
          roadmapDefaultListView: data.roadmapDefaultListView,
          updatedAt: new Date(),
        },
      })
      .returning({
        roadmapDefaultListView: boardSettings.roadmapDefaultListView,
      });

    return NextResponse.json({
      roadmapDefaultListView: updated.roadmapDefaultListView,
    });
  },
  { requirePaid: false }
);
