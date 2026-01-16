import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ideas, votes } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getContributor } from "@/lib/contributor-auth";
import { handleApiError } from "@/lib/api-utils";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";

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
      // Remove vote (toggle off) - use transaction for consistency
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
      // Add vote (toggle on) - use transaction for consistency
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

    return NextResponse.json({
      voted,
      voteCount: newVoteCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
