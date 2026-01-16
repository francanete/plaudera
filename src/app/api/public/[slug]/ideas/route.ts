import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ideas, votes, workspaces, PUBLIC_VISIBLE_STATUSES } from "@/lib/db/schema";
import { eq, desc, and, or, inArray } from "drizzle-orm";
import { getContributor } from "@/lib/contributor-auth";
import { handleApiError } from "@/lib/api-utils";
import { NotFoundError, UnauthorizedError, RateLimitError } from "@/lib/errors";
import { checkIdeaRateLimit } from "@/lib/contributor-rate-limit";

const createIdeaSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().max(2000, "Description is too long").optional(),
});

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * GET /api/public/[slug]/ideas
 * List all ideas for a workspace (public)
 * If contributor is authenticated, includes hasVoted per idea
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    // Find the workspace
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.slug, slug),
    });

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    // Check if contributor is authenticated
    const contributor = await getContributor();

    // Build query: public-visible statuses + contributor's own PENDING ideas
    const whereClause = contributor
      ? and(
          eq(ideas.workspaceId, workspace.id),
          or(
            // Public visible statuses (for everyone)
            inArray(ideas.status, PUBLIC_VISIBLE_STATUSES),
            // Contributor's own PENDING ideas (only visible to them)
            and(
              eq(ideas.status, "PENDING"),
              eq(ideas.contributorId, contributor.id)
            )
          )
        )
      : and(
          eq(ideas.workspaceId, workspace.id),
          inArray(ideas.status, PUBLIC_VISIBLE_STATUSES)
        );

    const workspaceIdeas = await db.query.ideas.findMany({
      where: whereClause,
      orderBy: [desc(ideas.voteCount), desc(ideas.createdAt)],
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
    const ideasWithVoteStatus = workspaceIdeas.map((idea) => ({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      status: idea.status,
      voteCount: idea.voteCount,
      hasVoted: votedIdeaIds.has(idea.id),
      createdAt: idea.createdAt,
      // Mark if this is the contributor's own submission
      isOwn: contributor ? idea.contributorId === contributor.id : false,
    }));

    return NextResponse.json({
      workspace: {
        name: workspace.name,
        slug: workspace.slug,
      },
      ideas: ideasWithVoteStatus,
      contributor: contributor
        ? { email: contributor.email, id: contributor.id }
        : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/public/[slug]/ideas
 * Submit a new idea (requires contributor auth)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

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

    // Find the workspace
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.slug, slug),
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

    return NextResponse.json(
      {
        idea: {
          id: newIdea.id,
          title: newIdea.title,
          description: newIdea.description,
          status: newIdea.status,
          voteCount: newIdea.voteCount,
          hasVoted: false,
          createdAt: newIdea.createdAt,
          isOwn: true, // Always true for newly created ideas (creator is viewing)
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
