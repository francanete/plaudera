import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ideas, votes } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  getContributor,
  hasContributorWorkspaceMembership,
} from "@/lib/contributor-auth";
import { handleApiError } from "@/lib/api-utils";
import { NotFoundError, UnauthorizedError, RateLimitError, ForbiddenError } from "@/lib/errors";
import { validateRequestOrigin } from "@/lib/csrf";
import { checkVoteRateLimit } from "@/lib/contributor-rate-limit";
import {
  getWorkspaceCorsHeaders,
  applyWorkspaceCorsHeaders,
} from "@/lib/cors";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * OPTIONS /api/public/ideas/[id]/vote
 * Handle CORS preflight requests for widget embed
 */
export async function OPTIONS(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id: ideaId } = await params;
  const origin = request.headers.get("origin");

  // Query idea to get workspace context for CORS validation
  const idea = await db.query.ideas.findFirst({
    where: eq(ideas.id, ideaId),
    columns: { workspaceId: true },
  });

  // If idea not found, return restrictive CORS (will fail on actual request anyway)
  if (!idea) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "null",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        Vary: "Origin",
      },
    });
  }

  const headers = await getWorkspaceCorsHeaders(origin, idea.workspaceId, "POST, OPTIONS");
  return new NextResponse(null, {
    status: 204,
    headers,
  });
}

/**
 * Check if an error is a PostgreSQL unique constraint violation.
 */
function isUniqueConstraintError(error: unknown): boolean {
  // PostgreSQL unique violation error code is 23505
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Error & { code?: string }).code === "23505"
  );
}

/**
 * POST /api/public/ideas/[id]/vote
 * Toggle vote on an idea (requires contributor auth)
 * Uses contributorId from cookie
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: ideaId } = await params;

    // Find the idea first (used for CSRF validation and vote logic)
    const idea = await db.query.ideas.findFirst({
      where: eq(ideas.id, ideaId),
    });

    if (!idea) {
      throw new NotFoundError("Idea not found");
    }

    // CSRF protection: Validate request origin against workspace allowlist
    const csrfResult = await validateRequestOrigin(request, idea.workspaceId);
    if (!csrfResult.valid) {
      throw new ForbiddenError("Request origin not allowed");
    }

    // Check contributor authentication
    const contributor = await getContributor();
    if (!contributor) {
      throw new UnauthorizedError("Please verify your email to vote");
    }

    const hasWorkspaceMembership = await hasContributorWorkspaceMembership(
      contributor.id,
      idea.workspaceId
    );

    if (!hasWorkspaceMembership) {
      throw new ForbiddenError("Please verify your email for this workspace");
    }

    // Check rate limit for voting
    const rateLimitResult = await checkVoteRateLimit(contributor.id);
    if (!rateLimitResult.allowed) {
      throw new RateLimitError(
        "You're voting too quickly. Please slow down.",
        rateLimitResult.resetAt!,
        0
      );
    }

    // Check if already voted
    const existingVote = await db.query.votes.findFirst({
      where: and(
        eq(votes.ideaId, ideaId),
        eq(votes.contributorId, contributor.id)
      ),
    });

    let voted: boolean;
    let newVoteCount: number;

    if (existingVote) {
      // Remove vote (toggle off) - use transaction for atomicity
      const result = await db.transaction(async (tx) => {
        await tx
          .delete(votes)
          .where(
            and(
              eq(votes.ideaId, ideaId),
              eq(votes.contributorId, contributor.id)
            )
          );

        const [updated] = await tx
          .update(ideas)
          .set({ voteCount: sql`GREATEST(${ideas.voteCount} - 1, 0)` })
          .where(eq(ideas.id, ideaId))
          .returning({ voteCount: ideas.voteCount });

        return { voted: false, voteCount: updated.voteCount };
      });

      voted = result.voted;
      newVoteCount = result.voteCount;
    } else {
      // Add vote (toggle on) - use transaction for atomicity
      try {
        const result = await db.transaction(async (tx) => {
          await tx.insert(votes).values({
            ideaId,
            contributorId: contributor.id,
          });

          const [updated] = await tx
            .update(ideas)
            .set({ voteCount: sql`${ideas.voteCount} + 1` })
            .where(eq(ideas.id, ideaId))
            .returning({ voteCount: ideas.voteCount });

          return { voted: true, voteCount: updated.voteCount };
        });

        voted = result.voted;
        newVoteCount = result.voteCount;
      } catch (error) {
        // Only handle unique constraint violation (race condition)
        if (isUniqueConstraintError(error)) {
          // Race condition - vote was inserted by concurrent request
          const currentIdea = await db.query.ideas.findFirst({
            where: eq(ideas.id, ideaId),
          });
          voted = true;
          newVoteCount = currentIdea?.voteCount ?? idea.voteCount;
        } else {
          // Re-throw other errors (DB connection issues, etc.)
          throw error;
        }
      }
    }

    const origin = request.headers.get("origin");
    const corsHeaders = await getWorkspaceCorsHeaders(
      origin,
      idea.workspaceId,
      "POST, OPTIONS"
    );
    return NextResponse.json(
      {
        voted,
        voteCount: newVoteCount,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    // For error responses, we may not have the idea/workspace context
    // Query it if possible for proper CORS, fallback to restrictive if not found
    const { id: ideaId } = await params;
    const origin = request.headers.get("origin");
    const errorResponse = handleApiError(error);

    // Try to get workspace context for CORS headers
    const ideaForCors = await db.query.ideas.findFirst({
      where: eq(ideas.id, ideaId),
      columns: { workspaceId: true },
    });

    if (ideaForCors) {
      await applyWorkspaceCorsHeaders(
        errorResponse,
        origin,
        ideaForCors.workspaceId,
        "POST, OPTIONS"
      );
    } else {
      // Fallback to restrictive CORS if idea not found
      errorResponse.headers.set("Access-Control-Allow-Origin", "null");
      errorResponse.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      errorResponse.headers.set("Access-Control-Allow-Headers", "Content-Type");
      errorResponse.headers.set("Vary", "Origin");
    }

    return errorResponse;
  }
}
