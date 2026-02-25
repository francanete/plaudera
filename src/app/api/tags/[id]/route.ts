import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, strategicTags } from "@/lib/db";
import { handleApiError } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getUserWorkspace } from "@/lib/workspace";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new UnauthorizedError("Not authenticated");

    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) throw new NotFoundError("Workspace not found");

    const body = await request.json();
    const data = updateTagSchema.parse(body);

    const [updated] = await db
      .update(strategicTags)
      .set(data)
      .where(
        and(
          eq(strategicTags.id, id),
          eq(strategicTags.workspaceId, workspace.id)
        )
      )
      .returning();

    if (!updated) throw new NotFoundError("Tag not found");

    return NextResponse.json({ tag: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new UnauthorizedError("Not authenticated");

    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) throw new NotFoundError("Workspace not found");

    const [deleted] = await db
      .delete(strategicTags)
      .where(
        and(
          eq(strategicTags.id, id),
          eq(strategicTags.workspaceId, workspace.id)
        )
      )
      .returning();

    if (!deleted) throw new NotFoundError("Tag not found");

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
