import { NextResponse } from "next/server";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { slugSchema } from "@/lib/slug-validation";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { getUserWorkspace } from "@/lib/workspace";

export const GET = protectedApiRouteWrapper(
  async (request, { session }) => {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { available: false, error: "Slug is required" },
        { status: 400 }
      );
    }

    // Validate format
    const parsed = slugSchema.safeParse(slug);
    if (!parsed.success) {
      return NextResponse.json({
        available: false,
        error: parsed.error.issues[0].message,
      });
    }

    // Check if it's the user's own current slug (no-op change)
    const userWorkspace = await getUserWorkspace(session.user.id);
    if (userWorkspace?.slug === slug) {
      return NextResponse.json({ available: true });
    }

    // Check if any workspace uses this as current or previous slug
    const existing = await db.query.workspaces.findFirst({
      where: or(eq(workspaces.slug, slug), eq(workspaces.previousSlug, slug)),
      columns: { id: true },
    });

    return NextResponse.json({
      available: !existing,
      error: existing ? "This slug is already taken" : undefined,
    });
  },
  { requirePaid: false }
);
