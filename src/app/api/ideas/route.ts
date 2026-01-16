import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc, asc } from "drizzle-orm";
import { db, ideas, type IdeaStatus } from "@/lib/db";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getUserWorkspace } from "@/lib/workspace";
import { NotFoundError } from "@/lib/errors";

const createIdeaSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(5000, "Description too long").optional(),
});

type SortOption = "newest" | "oldest" | "votes";

const statusOptions: IdeaStatus[] = [
  "NEW",
  "UNDER_REVIEW",
  "PLANNED",
  "IN_PROGRESS",
  "DONE",
  "DECLINED",
];

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

    // Build where clause
    const whereConditions = [eq(ideas.workspaceId, workspace.id)];
    if (status && statusOptions.includes(status)) {
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
      ideas: userIdeas,
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

    const [newIdea] = await db
      .insert(ideas)
      .values({
        workspaceId: workspace.id,
        title: data.title,
        description: data.description || null,
        status: "NEW",
        voteCount: 0,
      })
      .returning();

    return NextResponse.json({ idea: newIdea }, { status: 201 });
  },
  { requirePaid: false }
);
