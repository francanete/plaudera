import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc, asc, ne } from "drizzle-orm";
import { db, ideas, roadmapStatusChanges, type IdeaStatus } from "@/lib/db";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getUserWorkspace } from "@/lib/workspace";
import { NotFoundError } from "@/lib/errors";
import { toDashboardIdea } from "@/lib/api-utils";
import { ALL_IDEA_STATUSES } from "@/lib/idea-status-config";
import { VISIBLE_ROADMAP_STATUSES } from "@/lib/roadmap-status-config";
import { updateIdeaEmbedding } from "@/lib/ai/embeddings";

const createIdeaSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(5000, "Description too long").optional(),
  roadmapStatus: z.enum(["PLANNED", "IN_PROGRESS", "RELEASED"]).optional(),
  featureDetails: z.string().max(2000, "Feature details too long").optional(),
});

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

    const isRoadmapIdea =
      data.roadmapStatus &&
      VISIBLE_ROADMAP_STATUSES.includes(data.roadmapStatus);

    let newIdea;

    if (isRoadmapIdea) {
      // Transactional insert: idea + audit log entry
      newIdea = await db.transaction(async (tx) => {
        const [idea] = await tx
          .insert(ideas)
          .values({
            workspaceId: workspace.id,
            title: data.title,
            description: data.description || null,
            status: "PUBLISHED",
            roadmapStatus: data.roadmapStatus!,
            featureDetails: data.featureDetails || null,
            voteCount: 0,
          })
          .returning();

        await tx.insert(roadmapStatusChanges).values({
          ideaId: idea.id,
          fromStatus: "NONE",
          toStatus: data.roadmapStatus!,
          changedBy: session.user.id,
        });

        return idea;
      });
    } else {
      [newIdea] = await db
        .insert(ideas)
        .values({
          workspaceId: workspace.id,
          title: data.title,
          description: data.description || null,
          status: "PUBLISHED",
          voteCount: 0,
        })
        .returning();
    }

    // Generate embedding for duplicate detection (fire-and-forget, don't block response)
    updateIdeaEmbedding(newIdea.id, newIdea.title).catch((err) =>
      console.error("Failed to generate embedding for idea:", err)
    );

    return NextResponse.json(
      { idea: toDashboardIdea(newIdea) },
      { status: 201 }
    );
  },
  { requirePaid: false }
);
