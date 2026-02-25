import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { votes, workspaces } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { queryPublicIdeas, queryPublicRoadmapIdeas } from "@/lib/idea-queries";
import {
  getContributor,
  hasContributorWorkspaceMembership,
} from "@/lib/contributor-auth";
import { handleApiError } from "@/lib/api-utils";
import { createIdea, createIdeaSchema } from "@/lib/idea-updates";
import { NotFoundError, UnauthorizedError, RateLimitError, ForbiddenError } from "@/lib/errors";
import { validateRequestOrigin } from "@/lib/csrf";
import { checkIdeaRateLimit } from "@/lib/contributor-rate-limit";
import {
  getWorkspaceCorsHeaders,
  applyWorkspaceCorsHeaders,
} from "@/lib/cors";

// Extend the shared schema for public submissions:
// - Require problemStatement
// - Strip owner-only fields (roadmapStatus, featureDetails)
const publicCreateIdeaSchema = createIdeaSchema
  .omit({ roadmapStatus: true, featureDetails: true })
  .extend({
    problemStatement: z
      .string()
      .min(1, "Problem statement is required")
      .max(2000, "Problem statement is too long"),
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

    const [workspaceIdeas, roadmapIdeas] = await Promise.all([
      queryPublicIdeas(workspace.id, { contributorId: contributor?.id }),
      queryPublicRoadmapIdeas(workspace.id),
    ]);

    const allIdeas = [...workspaceIdeas, ...roadmapIdeas];

    // If authenticated, get their votes to determine hasVoted
    let votedIdeaIds: Set<string> = new Set();
    if (contributor && allIdeas.length > 0) {
      const ideaIds = allIdeas.map((idea) => idea.id);
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
    const ideasWithVoteStatus = allIdeas.map((idea) => ({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      problemStatement: idea.problemStatement,
      status: idea.status,
      roadmapStatus: idea.roadmapStatus,
      publicUpdate: idea.publicUpdate,
      showPublicUpdateOnRoadmap: idea.showPublicUpdateOnRoadmap,
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

    const hasWorkspaceMembership = await hasContributorWorkspaceMembership(
      contributor.id,
      workspaceId
    );

    if (!hasWorkspaceMembership) {
      throw new ForbiddenError("Please verify your email for this workspace");
    }

    // Check rate limit for idea submissions
    const rateLimitResult = await checkIdeaRateLimit(contributor.id);
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
    const data = publicCreateIdeaSchema.parse(body);

    // Create the idea via shared createIdea (handles embedding generation)
    const newIdea = await createIdea(workspace.id, null, data, {
      contributorId: contributor.id,
      authorEmail: contributor.email,
      defaultStatus: "UNDER_REVIEW",
    });

    const origin = request.headers.get("origin");
    const corsHeaders = await getWorkspaceCorsHeaders(origin, workspaceId, "GET, POST, OPTIONS");
    return NextResponse.json(
      {
        idea: {
          id: newIdea.id,
          title: newIdea.title,
          description: newIdea.description,
          problemStatement: newIdea.problemStatement,
          status: newIdea.status,
          roadmapStatus: newIdea.roadmapStatus,
          publicUpdate: newIdea.publicUpdate,
          showPublicUpdateOnRoadmap: newIdea.showPublicUpdateOnRoadmap,
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
