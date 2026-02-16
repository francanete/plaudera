import { NextResponse } from "next/server";
import { eq, desc, asc, ne } from "drizzle-orm";
import { db, ideas, type IdeaStatus } from "@/lib/db";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getUserWorkspace } from "@/lib/workspace";
import { NotFoundError } from "@/lib/errors";
import { toDashboardIdea } from "@/lib/api-utils";
import { ALL_IDEA_STATUSES } from "@/lib/idea-status-config";
import { createIdea, createIdeaSchema } from "@/lib/idea-updates";

type SortOption = "newest" | "oldest" | "votes";

// GET /api/ideas - List ideas for user's workspace
export const GET = protectedApiRouteWrapper(
  async (request, { session }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    const { searchParams } = new URL(request.url);
    const sort = (searchParams.get("sort") as SortOption) || "newest";
    const status = searchParams.get("status") as IdeaStatus | null;

    // Build order by clause
    let orderBy;
    switch (sort) {
      case "oldest":
        orderBy = asc(ideas.createdAt);
        break;
      case "votes":
        orderBy = desc(ideas.voteCount);
        break;
      case "newest":
      default:
        orderBy = desc(ideas.createdAt);
    }

    // Build where clause - always exclude MERGED ideas and roadmap items
    const whereConditions = [
      eq(ideas.workspaceId, workspace.id),
      ne(ideas.status, "MERGED"),
      eq(ideas.roadmapStatus, "NONE"),
    ];
    if (status && ALL_IDEA_STATUSES.includes(status)) {
      whereConditions.push(eq(ideas.status, status));
    }

    const userIdeas = await db.query.ideas.findMany({
      where:
        whereConditions.length === 1
          ? whereConditions[0]
          : (ideas, { and }) => and(...whereConditions),
      orderBy: [orderBy],
    });

    return NextResponse.json({
      ideas: userIdeas.map(toDashboardIdea),
      workspaceSlug: workspace.slug,
    });
  },
  { requirePaid: false }
);

// POST /api/ideas - Create a new idea
export const POST = protectedApiRouteWrapper(
  async (request, { session }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    const body = await request.json();
    const data = createIdeaSchema.parse(body);

    const newIdea = await createIdea(workspace.id, session.user.id, data);

    return NextResponse.json(
      { idea: toDashboardIdea(newIdea) },
      { status: 201 }
    );
  },
  { requirePaid: false }
);
