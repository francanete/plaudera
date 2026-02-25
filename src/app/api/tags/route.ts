import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, strategicTags } from "@/lib/db";
import { handleApiError } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getUserWorkspace } from "@/lib/workspace";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";

const createTagSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color")
    .optional(),
});

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new UnauthorizedError("Not authenticated");

    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) throw new NotFoundError("Workspace not found");

    const tags = await db
      .select()
      .from(strategicTags)
      .where(eq(strategicTags.workspaceId, workspace.id))
      .orderBy(strategicTags.name);

    return NextResponse.json({ tags });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new UnauthorizedError("Not authenticated");

    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) throw new NotFoundError("Workspace not found");

    const body = await request.json();
    const { name, color } = createTagSchema.parse(body);

    const [tag] = await db
      .insert(strategicTags)
      .values({
        workspaceId: workspace.id,
        name,
        color: color || "#6B7280",
      })
      .returning();

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
