import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ideas, votes } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getContributor } from "@/lib/contributor-auth";
import { handleApiError } from "@/lib/api-utils";
import { NotFoundError, UnauthorizedError, RateLimitError } from "@/lib/errors";
import { checkVoteRateLimit } from "@/lib/contributor-rate-limit";

type RouteParams = { params: Promise<{ id: string }> };

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

    // Check contributor authentication
    const contributor = await getContributor();
    if (!contributor) {
      throw new UnauthorizedError("Please verify your email to vote");
    }

    // Check rate limit for voting
    const rateLimitResult = checkVoteRateLimit(contributor.id);
    if (!rateLimitResult.allowed) {
      throw new RateLimitError(
        "You're voting too quickly. Please slow down.",
        rateLimitResult.resetAt!,
        0
      );
    }

    // Find the idea
    const idea = await db.query.ideas.findFirst({
      where: eq(ideas.id, ideaId),
    });

    if (!idea) {
      throw new NotFoundError("Idea not found");
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
      // Remove vote (toggle off)
      // Note: Using separate queries since neon-http doesn't support transactions
      await db
        .delete(votes)
        .where(
          and(
            eq(votes.ideaId, ideaId),
            eq(votes.contributorId, contributor.id)
          )
        );

      const [updated] = await db
        .update(ideas)
        .set({ voteCount: sql`GREATEST(${ideas.voteCount} - 1, 0)` })
        .where(eq(ideas.id, ideaId))
        .returning({ voteCount: ideas.voteCount });

      voted = false;
      newVoteCount = updated.voteCount;
    } else {
      // Add vote (toggle on)
      try {
        await db.insert(votes).values({
          ideaId,
          contributorId: contributor.id,
        });

        const [updated] = await db
          .update(ideas)
          .set({ voteCount: sql`${ideas.voteCount} + 1` })
          .where(eq(ideas.id, ideaId))
          .returning({ voteCount: ideas.voteCount });

        voted = true;
        newVoteCount = updated.voteCount;
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

    return NextResponse.json({
      voted,
      voteCount: newVoteCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
