import { NextResponse } from "next/server";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { slugSchema } from "@/lib/slug-validation";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { getUserWorkspace } from "@/lib/workspace";
import { validateDashboardOrigin } from "@/lib/cors";

export const GET = protectedApiRouteWrapper(
  async (request, { session }) => {
    // Validate request comes from our own app (defense-in-depth against cross-origin enumeration)
    if (!validateDashboardOrigin(request)) {
      return NextResponse.json(
        { available: false, error: "Forbidden" },
        { status: 403 }
      );
    }

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

    // Exclude user's own workspace from the check
    const existing = await db.query.workspaces.findFirst({
      where: userWorkspace
        ? and(eq(workspaces.slug, slug), ne(workspaces.id, userWorkspace.id))
        : eq(workspaces.slug, slug),
      columns: { id: true },
    });

    return NextResponse.json({
      available: !existing,
      error: existing ? "This slug is already taken" : undefined,
    });
  },
  { requirePaid: false }
);
