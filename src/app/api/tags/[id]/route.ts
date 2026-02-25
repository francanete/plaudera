import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, strategicTags } from "@/lib/db";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getUserWorkspace } from "@/lib/workspace";
import { NotFoundError, ConflictError, BadRequestError } from "@/lib/errors";

const updateTagSchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.color !== undefined, {
    message: "At least one field (name or color) is required",
  });

type Params = { id: string };

export const PATCH = protectedApiRouteWrapper<Params>(
  async (request, { session, params }) => {
    const { id } = params;
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) throw new NotFoundError("Workspace not found");

    const body = await request.json();
    const data = updateTagSchema.parse(body);

    try {
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

export const DELETE = protectedApiRouteWrapper<Params>(
  async (_request, { session, params }) => {
    const { id } = params;
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
  },
  { requirePaid: false }
);
