import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, strategicTags } from "@/lib/db";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getUserWorkspace } from "@/lib/workspace";
import { NotFoundError, ConflictError } from "@/lib/errors";

const createTagSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color")
    .optional(),
});

export const GET = protectedApiRouteWrapper(
  async (_request, { session }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) throw new NotFoundError("Workspace not found");

    const tags = await db
      .select()
      .from(strategicTags)
      .where(eq(strategicTags.workspaceId, workspace.id))
      .orderBy(strategicTags.name);

    return NextResponse.json({ tags });
  },
  { requirePaid: false }
);

export const POST = protectedApiRouteWrapper(
  async (request, { session }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) throw new NotFoundError("Workspace not found");

    const body = await request.json();
    const { name, color } = createTagSchema.parse(body);

    try {
      const [tag] = await db
        .insert(strategicTags)
        .values({
          workspaceId: workspace.id,
          name,
          color: color || "#6B7280",
        })
        .returning();

      return NextResponse.json({ tag }, { status: 201 });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "23505"
      ) {
        throw new ConflictError("A tag with this name already exists");
      }
      throw error;
    }
  },
  { requirePaid: false }
);
