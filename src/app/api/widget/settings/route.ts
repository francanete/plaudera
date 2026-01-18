import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, widgetSettings, type WidgetPosition } from "@/lib/db";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getUserWorkspace } from "@/lib/workspace";
import { NotFoundError } from "@/lib/errors";

const updateSettingsSchema = z.object({
  position: z.enum(["bottom-right", "bottom-left"]),
});

// GET /api/widget/settings - Get widget settings
export const GET = protectedApiRouteWrapper(
  async (_, { session }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    const settings = await db.query.widgetSettings.findFirst({
      where: eq(widgetSettings.workspaceId, workspace.id),
    });

    return NextResponse.json({
      position: (settings?.position ?? "bottom-right") as WidgetPosition,
    });
  },
  { requirePaid: false }
);

// PATCH /api/widget/settings - Update widget settings
export const PATCH = protectedApiRouteWrapper(
  async (request, { session }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    const body = await request.json();
    const data = updateSettingsSchema.parse(body);

    // Upsert: insert if not exists, update if exists
    const [updated] = await db
      .insert(widgetSettings)
      .values({
        workspaceId: workspace.id,
        position: data.position,
      })
      .onConflictDoUpdate({
        target: widgetSettings.workspaceId,
        set: {
          position: data.position,
        },
      })
      .returning({ position: widgetSettings.position });

    return NextResponse.json({
      position: updated.position,
    });
  },
  { requirePaid: false }
);
