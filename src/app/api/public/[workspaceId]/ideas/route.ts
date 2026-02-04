import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ideas, votes, workspaces } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { queryPublicIdeas } from "@/lib/idea-queries";
import { getContributor } from "@/lib/contributor-auth";
import { handleApiError } from "@/lib/api-utils";
import { NotFoundError, UnauthorizedError, RateLimitError, ForbiddenError } from "@/lib/errors";
import { validateRequestOrigin } from "@/lib/csrf";
import { checkIdeaRateLimit } from "@/lib/contributor-rate-limit";
import {
  getWorkspaceCorsHeaders,
  applyWorkspaceCorsHeaders,
} from "@/lib/cors";

const createIdeaSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().max(2000, "Description is too long").optional(),
});

type RouteParams = { params: Promise<{ workspaceId: string }> };

/**
 * OPTIONS /api/public/[workspaceId]/ideas
 * Handle CORS preflight requests for widget embed
 */
export async function OPTIONS(
  request: NextRequest,
  { params }: RouteParams
) {
  const { workspaceId } = await params;
  const origin = request.headers.get("origin");
  const headers = await getWorkspaceCorsHeaders(origin, workspaceId, "GET, POST, OPTIONS");
  return new NextResponse(null, {
    status: 204,
    headers,
  });
}

/**
 * GET /api/public/[workspaceId]/ideas
 * List all ideas for a workspace (public)
 * If contributor is authenticated, includes hasVoted per idea
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    // Check if contributor is authenticated
    const contributor = await getContributor();

    const workspaceIdeas = await queryPublicIdeas(workspace.id, {
      contributorId: contributor?.id,
    });

    // If authenticated, get their votes to determine hasVoted
    let votedIdeaIds: Set<string> = new Set();
    if (contributor && workspaceIdeas.length > 0) {
      const ideaIds = workspaceIdeas.map((idea) => idea.id);
      const contributorVotes = await db
        .select({ ideaId: votes.ideaId })
        .from(votes)
        .where(
          and(
            inArray(votes.ideaId, ideaIds),
            eq(votes.contributorId, contributor.id)
          )
        );
      votedIdeaIds = new Set(contributorVotes.map((v) => v.ideaId));
    }

    // Transform ideas with hasVoted and isOwn fields
    // Note: internalNote is NOT included (private to workspace owner)
    const ideasWithVoteStatus = workspaceIdeas.map((idea) => ({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      status: idea.status,
      roadmapStatus: idea.roadmapStatus,
      publicUpdate: idea.publicUpdate,
      featureDetails: idea.featureDetails,
      voteCount: idea.voteCount,
      hasVoted: votedIdeaIds.has(idea.id),
      createdAt: idea.createdAt,
      // Mark if this is the contributor's own submission
      isOwn: contributor ? idea.contributorId === contributor.id : false,
    }));

    const origin = request.headers.get("origin");
    const corsHeaders = await getWorkspaceCorsHeaders(origin, workspaceId, "GET, POST, OPTIONS");
    return NextResponse.json(
      {
        workspace: {
          name: workspace.name,
          slug: workspace.slug,
        },
        ideas: ideasWithVoteStatus,
        contributor: contributor
          ? { email: contributor.email, id: contributor.id }
          : null,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    const { workspaceId } = await params;
    const origin = request.headers.get("origin");
    const errorResponse = handleApiError(error);
    await applyWorkspaceCorsHeaders(errorResponse, origin, workspaceId, "GET, POST, OPTIONS");
    return errorResponse;
  }
}

/**
 * POST /api/public/[workspaceId]/ideas
 * Submit a new idea (requires contributor auth)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;

    // CSRF protection: Validate request origin against workspace allowlist
    const csrfResult = await validateRequestOrigin(request, workspaceId);
    if (!csrfResult.valid) {
      throw new ForbiddenError("Request origin not allowed");
    }

    // Check contributor authentication
    const contributor = await getContributor();
    if (!contributor) {
      throw new UnauthorizedError(
        "Please verify your email to submit an idea"
      );
    }

    // Check rate limit for idea submissions
    const rateLimitResult = checkIdeaRateLimit(contributor.id);
    if (!rateLimitResult.allowed) {
      throw new RateLimitError(
        "You've submitted too many ideas. Please try again later.",
        rateLimitResult.resetAt!,
        0
      );
    }

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    // Validate request body
    const body = await request.json();
    const { title, description } = createIdeaSchema.parse(body);

    // Create the idea (defaults to PENDING status for admin review)
    const [newIdea] = await db
      .insert(ideas)
      .values({
        workspaceId: workspace.id,
        contributorId: contributor.id,
        title,
        description: description || null,
        // status defaults to PENDING from schema
        voteCount: 0,
        authorEmail: contributor.email,
      })
      .returning();

    const origin = request.headers.get("origin");
    const corsHeaders = await getWorkspaceCorsHeaders(origin, workspaceId, "GET, POST, OPTIONS");
    return NextResponse.json(
      {
        idea: {
          id: newIdea.id,
          title: newIdea.title,
          description: newIdea.description,
          status: newIdea.status,
          roadmapStatus: newIdea.roadmapStatus,
          publicUpdate: newIdea.publicUpdate,
          featureDetails: newIdea.featureDetails,
          voteCount: newIdea.voteCount,
          hasVoted: false,
          createdAt: newIdea.createdAt,
          isOwn: true, // Always true for newly created ideas (creator is viewing)
        },
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    const { workspaceId } = await params;
    const origin = request.headers.get("origin");
    const errorResponse = handleApiError(error);
    await applyWorkspaceCorsHeaders(errorResponse, origin, workspaceId, "GET, POST, OPTIONS");
    return errorResponse;
  }
}
